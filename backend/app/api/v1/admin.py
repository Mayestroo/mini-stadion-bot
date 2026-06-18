from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.v1.stadiums import generate_slug
from app.core.analytics import track_event
from app.core.audit import write_audit
from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.core.notifications import broadcast_target_count, create_broadcast, notify_user, retry_failed_recipients
from app.core.security import get_password_hash
from app.models.analytics import AnalyticsEvent
from app.models.audit import AuditLog
from app.models.booking import Booking, BookingStatus
from app.models.moderation import (
    BookingCancelRequest,
    ModerationStatus,
    StadiumDraft,
    StadiumDraftType,
    StadiumImageAction,
    StadiumImageDraft,
)
from app.models.notification import Broadcast, BroadcastAudience, BroadcastRecipient, BroadcastStatus, NotificationType
from app.models.stadium import Stadium
from app.models.user import User, UserRole
from app.schemas.notification import BroadcastCreate, BroadcastRecipientResponse, BroadcastResponse
from app.schemas.audit import AuditLogResponse
from app.schemas.owner import (
    BookingCancelRequestResponse,
    ImageDraftResponse,
    ModerationReview,
    OwnerCreate,
    OwnerUpdate,
    StadiumDraftResponse,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Superadmin"])

STADIUM_APPLY_FIELDS = [
    "name",
    "description",
    "address",
    "district",
    "latitude",
    "longitude",
    "phone",
    "phone2",
    "telegram",
    "price_per_hour",
    "price_weekend",
    "price_night",
    "width",
    "length",
    "surface",
    "has_lighting",
    "has_changing_room",
    "has_shower",
    "has_parking",
    "has_cafe",
    "has_tribunes",
    "open_time",
    "close_time",
    "working_days",
    "cover_image",
    "images",
]


@router.get("/owners", response_model=List[UserResponse])
def get_owners(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(User).filter(User.role == UserRole.owner).order_by(User.created_at.desc()).all()


@router.get("/audit", response_model=List[AuditLogResponse])
def get_audit_logs(
    q: str | None = None,
    action: str | None = None,
    actor_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    limit = min(max(limit, 1), 200)
    query = db.query(AuditLog)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(AuditLog.action.ilike(pattern), AuditLog.entity_type.ilike(pattern)))
    if action:
        query = query.filter(AuditLog.action == action)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if date_from:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(date_to))
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return [
        {
            "id": log.id,
            "actor_id": log.actor_id,
            "actor_name": log.actor.full_name if log.actor else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "metadata_json": log.metadata_json,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.post("/broadcasts/preview")
def preview_broadcast_targets(
    data: BroadcastCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return {"target_count": broadcast_target_count(db, BroadcastAudience(data.audience), data.stadium_id)}


@router.get("/statistics")
def get_statistics(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    now = datetime.utcnow()
    starts = {
        "today": now.replace(hour=0, minute=0, second=0, microsecond=0),
        "week": now - timedelta(days=7),
        "month": now - timedelta(days=30),
        "year": now - timedelta(days=365),
    }

    revenue_statuses = [BookingStatus.confirmed, BookingStatus.completed]
    revenue = {
        "total": _revenue_sum(db.query(Booking).filter(Booking.status.in_(revenue_statuses))),
        "bot_total": _revenue_sum(
            db.query(Booking).join(User, Booking.user_id == User.id).filter(
                Booking.status.in_(revenue_statuses),
                User.telegram_id.isnot(None),
            )
        ),
    }

    for key, start in starts.items():
        revenue[key] = _revenue_sum(
            db.query(Booking).filter(Booking.status.in_(revenue_statuses), Booking.created_at >= start)
        )
        revenue[f"bot_{key}"] = _revenue_sum(
            db.query(Booking).join(User, Booking.user_id == User.id).filter(
                Booking.status.in_(revenue_statuses),
                User.telegram_id.isnot(None),
                Booking.created_at >= start,
            )
        )

    booking_statuses = {
        status.value: db.query(Booking).filter(Booking.status == status).count()
        for status in BookingStatus
    }
    total_bookings = db.query(Booking).count()
    average_booking_price = int((db.query(func.avg(Booking.total_price)).scalar() or 0))

    bot_events = {}
    for key, start in starts.items():
        bot_events[key] = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.event_type.in_(["bot_start", "miniapp_auth"]),
            AnalyticsEvent.created_at >= start,
        ).count()
    unique_telegram_users = db.query(func.count(func.distinct(AnalyticsEvent.telegram_id))).filter(
        AnalyticsEvent.telegram_id.isnot(None)
    ).scalar() or 0

    conversion = {
        "bot_start": db.query(AnalyticsEvent).filter(AnalyticsEvent.event_type == "bot_start").count(),
        "phone_or_auth": db.query(AnalyticsEvent).filter(AnalyticsEvent.event_type.in_(["bot_save_phone", "miniapp_auth"])).count(),
        "booking_created": db.query(AnalyticsEvent).filter(AnalyticsEvent.event_type == "booking_created").count(),
    }

    top_by_bookings = [
        {"stadium_id": row.stadium_id, "name": row.name, "bookings": row.bookings}
        for row in db.query(Stadium.id.label("stadium_id"), Stadium.name, func.count(Booking.id).label("bookings"))
        .join(Booking, Booking.stadium_id == Stadium.id)
        .group_by(Stadium.id, Stadium.name)
        .order_by(func.count(Booking.id).desc())
        .limit(10)
        .all()
    ]
    top_by_revenue = [
        {"stadium_id": row.stadium_id, "name": row.name, "revenue": int(row.revenue or 0)}
        for row in db.query(Stadium.id.label("stadium_id"), Stadium.name, func.sum(Booking.total_price).label("revenue"))
        .join(Booking, Booking.stadium_id == Stadium.id)
        .filter(Booking.status.in_(revenue_statuses))
        .group_by(Stadium.id, Stadium.name)
        .order_by(func.sum(Booking.total_price).desc())
        .limit(10)
        .all()
    ]

    pending_moderation = {
        "stadium_drafts": db.query(StadiumDraft).filter(StadiumDraft.status == ModerationStatus.pending).count(),
        "image_drafts": db.query(StadiumImageDraft).filter(StadiumImageDraft.status == ModerationStatus.pending).count(),
        "cancel_requests": db.query(BookingCancelRequest).filter(BookingCancelRequest.status == ModerationStatus.pending).count(),
    }

    return {
        "revenue": revenue,
        "booking_statuses": booking_statuses,
        "total_bookings": total_bookings,
        "average_booking_price": average_booking_price,
        "bot_events": bot_events,
        "unique_telegram_users": unique_telegram_users,
        "new_users": {key: db.query(User).filter(User.created_at >= start).count() for key, start in starts.items()},
        "conversion": conversion,
        "top_by_bookings": top_by_bookings,
        "top_by_revenue": top_by_revenue,
        "pending_moderation": pending_moderation,
    }


@router.get("/broadcasts", response_model=List[BroadcastResponse])
def get_broadcasts(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(Broadcast).order_by(Broadcast.created_at.desc()).limit(30).all()


@router.post("/broadcasts", response_model=BroadcastResponse)
def create_broadcast_message(
    data: BroadcastCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    recent = db.query(Broadcast).filter(Broadcast.created_by == superadmin.id, Broadcast.created_at >= datetime.utcnow() - timedelta(minutes=1)).first()
    if recent:
        raise HTTPException(status_code=429, detail="1 daqiqada faqat bitta ommaviy xabar yuborish mumkin")

    active = db.query(Broadcast).filter(Broadcast.status.in_([BroadcastStatus.queued, BroadcastStatus.sending])).first()
    if active:
        raise HTTPException(status_code=400, detail="Avvalgi ommaviy xabar hali yuborilmoqda")

    broadcast = create_broadcast(
        db,
        superadmin,
        BroadcastAudience(data.audience),
        data.title,
        data.message,
        data.image_url,
        data.cta_text,
        data.cta_url,
        data.parse_mode,
        data.stadium_id,
    )
    track_event(db, "superadmin_broadcast_created", user_id=superadmin.id, metadata={"broadcast_id": broadcast.id, "audience": data.audience})
    write_audit(db, "broadcast_created", superadmin, "broadcast", broadcast.id, {"audience": data.audience, "stadium_id": data.stadium_id})
    db.commit()
    db.refresh(broadcast)
    return broadcast


@router.post("/broadcasts/{broadcast_id}/retry-failed", response_model=BroadcastResponse)
def retry_broadcast_failed(
    broadcast_id: int,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    broadcast = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
    if not broadcast:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    retried_count = retry_failed_recipients(db, broadcast)
    if retried_count == 0:
        raise HTTPException(status_code=400, detail="Qayta yuboriladigan failed recipient yo'q")
    track_event(db, "superadmin_broadcast_retry_failed", user_id=superadmin.id, metadata={"broadcast_id": broadcast.id, "retried_count": retried_count})
    write_audit(db, "broadcast_retry_failed", superadmin, "broadcast", broadcast.id, {"retried_count": retried_count})
    db.commit()
    db.refresh(broadcast)
    return broadcast


@router.get("/broadcasts/{broadcast_id}/recipients", response_model=List[BroadcastRecipientResponse])
def get_broadcast_recipients(
    broadcast_id: int,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    broadcast = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
    if not broadcast:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    recipients = db.query(BroadcastRecipient).filter(BroadcastRecipient.broadcast_id == broadcast.id).order_by(BroadcastRecipient.status.asc(), BroadcastRecipient.id.asc()).limit(200).all()
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "user_name": item.user.full_name,
            "telegram_id": item.user.telegram_id,
            "status": item.status.value,
            "error": item.error,
            "attempt_count": item.attempt_count,
            "sent_at": item.sent_at,
            "created_at": item.created_at,
        }
        for item in recipients
    ]

@router.post("/owners", response_model=UserResponse)
def create_owner(
    owner_data: OwnerCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    existing_user = db.query(User).filter(User.telegram_id == owner_data.telegram_id).first()
    if existing_user and existing_user.role not in {UserRole.user, UserRole.guest}:
        raise HTTPException(status_code=400, detail="Bu Telegram ID allaqachon owner yoki admin hisobga bog'langan")

    owner_login_query = db.query(User).filter(User.owner_login == owner_data.owner_login)
    if existing_user:
        owner_login_query = owner_login_query.filter(User.id != existing_user.id)
    if owner_login_query.first():
        raise HTTPException(status_code=400, detail="Bu owner login allaqachon ishlatilgan")

    phone_query = db.query(User).filter(User.phone == owner_data.phone)
    if existing_user:
        phone_query = phone_query.filter(User.id != existing_user.id)
    if owner_data.phone and phone_query.first():
        raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ishlatilgan")

    if existing_user:
        existing_user.full_name = owner_data.full_name
        existing_user.owner_login = owner_data.owner_login
        existing_user.hashed_password = get_password_hash(owner_data.temporary_password)
        existing_user.role = UserRole.owner
        existing_user.must_change_password = True
        if owner_data.phone:
            existing_user.phone = owner_data.phone
        write_audit(db, "owner_upgraded", superadmin, "user", existing_user.id, {"owner_login": owner_data.owner_login})
        db.commit()
        db.refresh(existing_user)
        return existing_user

    owner = User(
        full_name=owner_data.full_name,
        telegram_id=owner_data.telegram_id,
        owner_login=owner_data.owner_login,
        phone=owner_data.phone,
        hashed_password=get_password_hash(owner_data.temporary_password),
        role=UserRole.owner,
        must_change_password=True,
    )
    db.add(owner)
    write_audit(db, "owner_created", superadmin, "user", None, {"owner_login": owner_data.owner_login})
    db.commit()
    db.refresh(owner)
    return owner


@router.patch("/owners/{owner_id}", response_model=UserResponse)
def update_owner(
    owner_id: int,
    owner_data: OwnerUpdate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    owner = db.query(User).filter(User.id == owner_id, User.role == UserRole.owner).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner topilmadi")

    for field in ["full_name", "telegram_id", "owner_login", "phone", "is_active"]:
        value = getattr(owner_data, field)
        if value is not None:
            existing = None
            if field in {"telegram_id", "owner_login", "phone"}:
                existing = db.query(User).filter(getattr(User, field) == value, User.id != owner.id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Bu {field} allaqachon ishlatilgan")
            setattr(owner, field, value)
    if owner_data.temporary_password:
        owner.hashed_password = get_password_hash(owner_data.temporary_password)
        owner.must_change_password = True

    write_audit(db, "owner_updated", superadmin, "user", owner.id, owner_data.model_dump(exclude_none=True, exclude={"temporary_password"}))
    db.commit()
    db.refresh(owner)
    return owner


@router.get("/moderation/stadium-drafts", response_model=List[StadiumDraftResponse])
def get_stadium_drafts(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(StadiumDraft).order_by(StadiumDraft.created_at.desc()).all()


@router.post("/moderation/stadium-drafts/{draft_id}/approve", response_model=StadiumDraftResponse)
def approve_stadium_draft(
    draft_id: int,
    review: ModerationReview | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    draft = db.query(StadiumDraft).filter(StadiumDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft topilmadi")
    if draft.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending draft tasdiqlanadi")

    if draft.draft_type == StadiumDraftType.create:
        slug = _unique_slug(db, draft.name)
        stadium = Stadium(owner_id=draft.owner_id, slug=slug)
        db.add(stadium)
    else:
        stadium = db.query(Stadium).filter(Stadium.id == draft.stadium_id, Stadium.owner_id == draft.owner_id).first()
        if not stadium:
            raise HTTPException(status_code=404, detail="Stadion topilmadi")
        if stadium.name != draft.name:
            stadium.slug = _unique_slug(db, draft.name, stadium.id)

    for field in STADIUM_APPLY_FIELDS:
        setattr(stadium, field, getattr(draft, field))

    draft.status = ModerationStatus.approved
    draft.reviewed_by = superadmin.id
    draft.review_note = review.review_note if review else None
    draft.reviewed_at = datetime.utcnow()
    track_event(db, "superadmin_stadium_draft_approved", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "stadium_draft_approved", superadmin, "stadium_draft", draft.id)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/moderation/stadium-drafts/{draft_id}/reject", response_model=StadiumDraftResponse)
def reject_stadium_draft(
    draft_id: int,
    review: ModerationReview,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    draft = db.query(StadiumDraft).filter(StadiumDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft topilmadi")
    if draft.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending draft rad etiladi")
    draft.status = ModerationStatus.rejected
    draft.reviewed_by = superadmin.id
    draft.review_note = review.review_note
    draft.reviewed_at = datetime.utcnow()
    track_event(db, "superadmin_stadium_draft_rejected", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "stadium_draft_rejected", superadmin, "stadium_draft", draft.id, {"review_note": review.review_note})
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/moderation/image-drafts", response_model=List[ImageDraftResponse])
def get_image_drafts(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(StadiumImageDraft).order_by(StadiumImageDraft.created_at.desc()).all()


@router.post("/moderation/image-drafts/{draft_id}/approve", response_model=ImageDraftResponse)
def approve_image_draft(
    draft_id: int,
    review: ModerationReview | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    draft = db.query(StadiumImageDraft).filter(StadiumImageDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Rasm drafti topilmadi")
    if draft.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending rasm drafti tasdiqlanadi")
    stadium = db.query(Stadium).filter(Stadium.id == draft.stadium_id, Stadium.owner_id == draft.owner_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    images = stadium.images or []
    if draft.action == StadiumImageAction.add and draft.image_url not in images:
        images.append(draft.image_url)
    elif draft.action == StadiumImageAction.delete:
        images = [image for image in images if image != draft.image_url]
        if stadium.cover_image == draft.image_url:
            stadium.cover_image = images[0] if images else None
    elif draft.action == StadiumImageAction.set_cover:
        if draft.image_url not in images:
            images.append(draft.image_url)
        stadium.cover_image = draft.image_url
    stadium.images = images

    draft.status = ModerationStatus.approved
    draft.reviewed_by = superadmin.id
    draft.review_note = review.review_note if review else None
    draft.reviewed_at = datetime.utcnow()
    track_event(db, "superadmin_image_draft_approved", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "image_draft_approved", superadmin, "image_draft", draft.id)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/moderation/image-drafts/{draft_id}/reject", response_model=ImageDraftResponse)
def reject_image_draft(
    draft_id: int,
    review: ModerationReview,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    draft = db.query(StadiumImageDraft).filter(StadiumImageDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Rasm drafti topilmadi")
    if draft.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending rasm drafti rad etiladi")
    draft.status = ModerationStatus.rejected
    draft.reviewed_by = superadmin.id
    draft.review_note = review.review_note
    draft.reviewed_at = datetime.utcnow()
    track_event(db, "superadmin_image_draft_rejected", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "image_draft_rejected", superadmin, "image_draft", draft.id, {"review_note": review.review_note})
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/moderation/cancel-requests", response_model=List[BookingCancelRequestResponse])
def get_cancel_requests(
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(BookingCancelRequest).order_by(BookingCancelRequest.created_at.desc()).all()


@router.post("/moderation/cancel-requests/{request_id}/approve", response_model=BookingCancelRequestResponse)
def approve_cancel_request(
    request_id: int,
    review: ModerationReview | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    request = db.query(BookingCancelRequest).filter(BookingCancelRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Bekor qilish so'rovi topilmadi")
    if request.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending so'rov tasdiqlanadi")
    if request.booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        raise HTTPException(status_code=400, detail="Bu bronni bekor qilib bo'lmaydi")

    request.booking.status = BookingStatus.cancelled
    request.status = ModerationStatus.approved
    request.reviewed_by = superadmin.id
    request.review_note = review.review_note if review else None
    request.reviewed_at = datetime.utcnow()
    track_event(db, "superadmin_cancel_request_approved", user_id=superadmin.id, metadata={"request_id": request.id, "booking_id": request.booking_id})
    write_audit(db, "cancel_request_approved", superadmin, "cancel_request", request.id, {"booking_id": request.booking_id})
    db.commit()
    db.refresh(request)
    notify_user(
        db,
        request.booking.user,
        "❌ Bron bekor qilindi",
        f"Kod: {request.booking.booking_code}\n"
        f"Stadion: {request.booking.stadium.name}\n"
        f"Vaqt: {request.booking.date} {request.booking.start_time}-{request.booking.end_time}",
        NotificationType.booking,
    )
    notify_user(
        db,
        request.owner,
        "✅ Bekor qilish so'rovi tasdiqlandi",
        f"Bron: {request.booking.booking_code}\n"
        f"Stadion: {request.booking.stadium.name}",
        NotificationType.moderation,
    )
    db.commit()
    return request


@router.post("/moderation/cancel-requests/{request_id}/reject", response_model=BookingCancelRequestResponse)
def reject_cancel_request(
    request_id: int,
    review: ModerationReview,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    request = db.query(BookingCancelRequest).filter(BookingCancelRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Bekor qilish so'rovi topilmadi")
    if request.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending so'rov rad etiladi")
    request.status = ModerationStatus.rejected
    request.reviewed_by = superadmin.id
    request.review_note = review.review_note
    request.reviewed_at = datetime.utcnow()
    track_event(db, "superadmin_cancel_request_rejected", user_id=superadmin.id, metadata={"request_id": request.id, "booking_id": request.booking_id})
    write_audit(db, "cancel_request_rejected", superadmin, "cancel_request", request.id, {"booking_id": request.booking_id, "review_note": review.review_note})
    db.commit()
    db.refresh(request)
    notify_user(
        db,
        request.booking.user,
        "ℹ️ Bekor qilish so'rovi rad etildi",
        f"Kod: {request.booking.booking_code}\n"
        f"Stadion: {request.booking.stadium.name}\n"
        "Bron holati o'zgarishsiz qoldi",
        NotificationType.moderation,
    )
    notify_user(
        db,
        request.owner,
        "❌ Bekor qilish so'rovi rad etildi",
        f"Bron: {request.booking.booking_code}\n"
        f"Sabab: {request.review_note or '—'}",
        NotificationType.moderation,
    )
    db.commit()
    return request


def _unique_slug(db: Session, name: str, current_stadium_id: int | None = None) -> str:
    slug = generate_slug(name)
    base_slug = slug
    counter = 1
    while True:
        query = db.query(Stadium).filter(Stadium.slug == slug)
        if current_stadium_id is not None:
            query = query.filter(Stadium.id != current_stadium_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def _revenue_sum(query) -> int:
    return int(query.with_entities(func.sum(Booking.total_price)).scalar() or 0)
