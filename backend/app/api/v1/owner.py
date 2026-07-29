from datetime import date, datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.analytics import track_event
from app.core.database import get_db
from app.core.dependencies import get_current_owner
from app.services.notifications import (
    notify_admins,
    notify_user,
    get_notifications_for_user,
    get_unread_count_for_user,
    mark_all_read_for_user,
    mark_notification_read_for_user,
)
from app.models.booking import Booking, BookingStatus
from app.models.moderation import (
    BookingCancelRequest,
    ModerationStatus,
    StadiumDraft,
    StadiumDraftType,
    StadiumImageAction,
    StadiumImageDraft,
)
from app.models.notification import NotificationType
from app.models.stadium import Stadium
from app.models.user import User
from app.schemas.booking import BookingResponse
from app.schemas.notification import NotificationListResponse
from app.schemas.owner import (
    BookingCancelRequestCreate,
    BookingCancelRequestResponse,
    ImageDraftCreate,
    ImageDraftResponse,
    OwnerMe,
    OwnerStats,
    StadiumDraftCreate,
    StadiumDraftResponse,
    StadiumDraftUpdate,
)

router = APIRouter(prefix="/owner", tags=["Owner"])

STADIUM_DRAFT_FIELDS = [
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


@router.get("/me", response_model=OwnerMe)
def get_owner_me(owner: User = Depends(get_current_owner)):
    return {"user": owner, "must_change_password": owner.must_change_password}


@router.get("/stats", response_model=OwnerStats)
def get_owner_stats(
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    today = date.today().isoformat()
    month_prefix = today[:7]
    stadium_ids = [row.id for row in db.query(Stadium.id).filter(Stadium.owner_id == owner.id).all()]

    if not stadium_ids:
        return {
            "today_bookings": 0,
            "pending_bookings": 0,
            "monthly_revenue": 0,
            "active_stadiums": 0,
            "pending_moderation": 0,
        }

    today_bookings = db.query(func.count(Booking.id)).filter(
        Booking.stadium_id.in_(stadium_ids),
        Booking.date == today,
    ).scalar() or 0
    pending_bookings = db.query(func.count(Booking.id)).filter(
        Booking.stadium_id.in_(stadium_ids),
        Booking.status == BookingStatus.pending,
    ).scalar() or 0
    monthly_revenue = db.query(func.coalesce(func.sum(Booking.total_price), 0)).filter(
        Booking.stadium_id.in_(stadium_ids),
        Booking.date.like(f"{month_prefix}%"),
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.completed]),
    ).scalar() or 0
    pending_drafts = db.query(StadiumDraft).filter(
        StadiumDraft.owner_id == owner.id,
        StadiumDraft.status == ModerationStatus.pending,
    ).count()
    pending_images = db.query(StadiumImageDraft).filter(
        StadiumImageDraft.owner_id == owner.id,
        StadiumImageDraft.status == ModerationStatus.pending,
    ).count()
    pending_cancellations = db.query(BookingCancelRequest).filter(
        BookingCancelRequest.owner_id == owner.id,
        BookingCancelRequest.status == ModerationStatus.pending,
    ).count()

    return {
        "today_bookings": today_bookings,
        "pending_bookings": pending_bookings,
        "monthly_revenue": monthly_revenue,
        "active_stadiums": db.query(Stadium).filter(Stadium.owner_id == owner.id, Stadium.is_active == True).count(),
        "pending_moderation": pending_drafts + pending_images + pending_cancellations,
    }


@router.get("/stadium-drafts", response_model=List[StadiumDraftResponse])
def get_stadium_drafts(
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    return db.query(StadiumDraft).filter(StadiumDraft.owner_id == owner.id).order_by(StadiumDraft.created_at.desc()).all()


@router.post("/stadium-drafts", response_model=StadiumDraftResponse)
def create_stadium_draft(
    draft_data: StadiumDraftCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    draft = StadiumDraft(
        **draft_data.model_dump(),
        owner_id=owner.id,
        draft_type=StadiumDraftType.create,
        status=ModerationStatus.pending,
        submitted_at=datetime.now(timezone.utc),
        images=[],
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.put("/stadium-drafts/{draft_id}", response_model=StadiumDraftResponse)
def update_stadium_draft(
    draft_id: int,
    draft_data: StadiumDraftUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    draft = db.query(StadiumDraft).filter(StadiumDraft.id == draft_id, StadiumDraft.owner_id == owner.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft topilmadi")
    if draft.status == ModerationStatus.approved:
        raise HTTPException(status_code=400, detail="Tasdiqlangan draftni tahrirlab bo'lmaydi")

    for field, value in draft_data.model_dump(exclude_none=True).items():
        setattr(draft, field, value)
    draft.status = ModerationStatus.pending
    draft.submitted_at = datetime.now(timezone.utc)
    draft.review_note = None
    draft.reviewed_by = None
    draft.reviewed_at = None
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/stadium-drafts/{draft_id}/submit", response_model=StadiumDraftResponse)
def submit_stadium_draft(
    draft_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    draft = db.query(StadiumDraft).filter(StadiumDraft.id == draft_id, StadiumDraft.owner_id == owner.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft topilmadi")
    if draft.status == ModerationStatus.approved:
        raise HTTPException(status_code=400, detail="Tasdiqlangan draftni qayta yuborib bo'lmaydi")
    draft.status = ModerationStatus.pending
    draft.submitted_at = datetime.now(timezone.utc)
    draft.review_note = None
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/stadiums/{stadium_id}/draft", response_model=StadiumDraftResponse)
def create_update_draft(
    stadium_id: int,
    draft_data: StadiumDraftUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id, Stadium.owner_id == owner.id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    data = {field: getattr(stadium, field) for field in STADIUM_DRAFT_FIELDS}
    data.update(draft_data.model_dump(exclude_none=True))
    draft = StadiumDraft(
        **data,
        owner_id=owner.id,
        stadium_id=stadium.id,
        draft_type=StadiumDraftType.update,
        status=ModerationStatus.pending,
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/stadiums/{stadium_id}/image-drafts", response_model=ImageDraftResponse)
def create_image_draft(
    stadium_id: int,
    draft_data: ImageDraftCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id, Stadium.owner_id == owner.id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    draft = StadiumImageDraft(
        owner_id=owner.id,
        stadium_id=stadium.id,
        action=StadiumImageAction(draft_data.action),
        image_url=draft_data.image_url,
        status=ModerationStatus.pending,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/bookings", response_model=List[BookingResponse])
def get_owner_bookings(
    stadium_id: Optional[int] = None,
    status: Optional[str] = None,
    booking_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    query = db.query(Booking).join(Stadium).filter(Stadium.owner_id == owner.id)
    if stadium_id is not None:
        query = query.filter(Booking.stadium_id == stadium_id)
    if status:
        query = query.filter(Booking.status == status)
    if booking_date:
        query = query.filter(Booking.date == booking_date)
    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(min(limit, 100)).all()
    return [BookingResponse.from_model(booking) for booking in bookings]


@router.patch("/bookings/{booking_id}/confirm")
def confirm_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    booking = db.query(Booking).join(Stadium).filter(Booking.id == booking_id, Stadium.owner_id == owner.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.status != BookingStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending bron tasdiqlanadi")
    booking.status = BookingStatus.confirmed
    track_event(db, "owner_booking_confirmed", telegram_id=owner.telegram_id, user_id=owner.id, metadata={"booking_id": booking.id})
    db.commit()
    db.refresh(booking)
    notify_user(
        db,
        booking.user,
        "✅ Bron tasdiqlandi",
        f"Kod: {booking.booking_code}\n"
        f"Stadion: {booking.stadium.name}\n"
        f"Sana: {booking.date}\n"
        f"Vaqt: {booking.start_time}-{booking.end_time}",
        NotificationType.booking,
    )
    db.commit()
    return {"message": "Bron tasdiqlandi", "status": booking.status.value}


@router.post("/bookings/{booking_id}/cancel-request", response_model=BookingCancelRequestResponse)
def request_booking_cancel(
    booking_id: int,
    cancel_data: BookingCancelRequestCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    booking = db.query(Booking).join(Stadium).filter(Booking.id == booking_id, Stadium.owner_id == owner.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        raise HTTPException(status_code=400, detail="Bu bronni bekor qilish so'roviga yuborib bo'lmaydi")

    existing = db.query(BookingCancelRequest).filter(
        BookingCancelRequest.booking_id == booking.id,
        BookingCancelRequest.status == ModerationStatus.pending,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu bron uchun bekor qilish so'rovi allaqachon yuborilgan")

    request = BookingCancelRequest(
        booking_id=booking.id,
        owner_id=owner.id,
        reason=cancel_data.reason,
        status=ModerationStatus.pending,
    )
    db.add(request)
    track_event(db, "owner_booking_cancel_requested", telegram_id=owner.telegram_id, user_id=owner.id, metadata={"booking_id": booking.id})
    db.commit()
    db.refresh(request)
    notify_admins(
        db,
        "⚠️ Bekor qilish so'rovi",
        f"Bron: {booking.booking_code}\n"
        f"Stadion: {booking.stadium.name}\n"
        f"Vaqt: {booking.date} {booking.start_time}-{booking.end_time}\n"
        f"Owner: {owner.full_name}\n"
        f"Sabab: {request.reason}",
        NotificationType.moderation,
    )
    db.commit()
    return request


@router.get("/customers")
def get_owner_customers(
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    customers = db.query(User).join(Booking, Booking.user_id == User.id).join(Stadium).filter(
        Stadium.owner_id == owner.id
    ).distinct().all()
    return customers


@router.get("/notifications", response_model=NotificationListResponse)
def get_owner_notifications(
    q: str | None = None,
    type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    return get_notifications_for_user(db, owner.id, q, type, skip, limit)


@router.get("/notifications/unread-count")
def get_owner_unread_notifications(
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    return {"unread_count": get_unread_count_for_user(db, owner.id)}


@router.patch("/notifications/read-all")
def mark_all_owner_notifications_read(
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    mark_all_read_for_user(db, owner.id)
    return {"message": "Barcha xabarlar o'qildi"}


@router.patch("/notifications/{notification_id}/read")
def mark_owner_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    owner: User = Depends(get_current_owner),
):
    notification = mark_notification_read_for_user(db, owner.id, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    return {"message": "Xabar o'qildi"}
