from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.analytics import track_event
from app.core.audit import write_audit
from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.services.notifications import notify_user
from app.core.ratelimit import rate_limit
from app.models.booking import BookingStatus
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
from app.models.training import Training, TrainingDraft, TrainingDraftType
from app.models.user import User
from app.schemas.owner import (
    BookingCancelRequestResponse,
    ImageDraftResponse,
    ModerationReview,
    StadiumDraftResponse,
)
from app.schemas.training import AdminTrainingUpdate, TrainingDraftResponse, TrainingResponse
from app.services.slugs import generate_slug

router = APIRouter(prefix="/admin", tags=["Superadmin"])

STADIUM_APPLY_FIELDS = [
    "name",
    "description",
    "address",
    "region",
    "district",
    "latitude",
    "longitude",
    "google_map_link",
    "yandex_map_link",
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

TRAINING_APPLY_FIELDS = [
    "title",
    "sport",
    "description",
    "coach_name",
    "schedule_text",
    "price_text",
    "age_group",
    "stadium_id",
    "phone",
    "telegram",
    "instagram",
    "cover_image",
    "images",
]


def _parse_status_filter(status: str | None) -> ModerationStatus | None:
    if status is None:
        return None
    try:
        return ModerationStatus(status)
    except ValueError:
        raise HTTPException(status_code=422, detail="Noto'g'ri status")


@router.get("/moderation/stadium-drafts", response_model=List[StadiumDraftResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_stadium_drafts(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(StadiumDraft)
    status_filter = _parse_status_filter(status)
    if status_filter:
        query = query.filter(StadiumDraft.status == status_filter)
    return query.order_by(StadiumDraft.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.post("/moderation/stadium-drafts/{draft_id}/approve", response_model=StadiumDraftResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
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
    draft.reviewed_at = datetime.now(timezone.utc)
    track_event(db, "superadmin_stadium_draft_approved", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "stadium_draft_approved", superadmin, "stadium_draft", draft.id)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/moderation/stadium-drafts/{draft_id}/reject", response_model=StadiumDraftResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
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
    draft.reviewed_at = datetime.now(timezone.utc)
    track_event(db, "superadmin_stadium_draft_rejected", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "stadium_draft_rejected", superadmin, "stadium_draft", draft.id, {"review_note": review.review_note})
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/moderation/image-drafts", response_model=List[ImageDraftResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_image_drafts(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(StadiumImageDraft)
    status_filter = _parse_status_filter(status)
    if status_filter:
        query = query.filter(StadiumImageDraft.status == status_filter)
    return query.order_by(StadiumImageDraft.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.post("/moderation/image-drafts/{draft_id}/approve", response_model=ImageDraftResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
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
    draft.reviewed_at = datetime.now(timezone.utc)
    track_event(db, "superadmin_image_draft_approved", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "image_draft_approved", superadmin, "image_draft", draft.id)
    db.commit()
    db.refresh(draft)
    return draft


@router.post("/moderation/image-drafts/{draft_id}/reject", response_model=ImageDraftResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
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
    draft.reviewed_at = datetime.now(timezone.utc)
    track_event(db, "superadmin_image_draft_rejected", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "image_draft_rejected", superadmin, "image_draft", draft.id, {"review_note": review.review_note})
    db.commit()
    db.refresh(draft)
    return draft


@router.get("/moderation/cancel-requests", response_model=List[BookingCancelRequestResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_cancel_requests(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(BookingCancelRequest)
    status_filter = _parse_status_filter(status)
    if status_filter:
        query = query.filter(BookingCancelRequest.status == status_filter)
    return query.order_by(BookingCancelRequest.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.post("/moderation/cancel-requests/{request_id}/approve", response_model=BookingCancelRequestResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
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
    request.reviewed_at = datetime.now(timezone.utc)
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


@router.post("/moderation/cancel-requests/{request_id}/reject", response_model=BookingCancelRequestResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
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
    request.reviewed_at = datetime.now(timezone.utc)
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


# ---------- Training drafts (mashg'ulot draftlari) ----------


@router.get("/moderation/training-drafts", response_model=List[TrainingDraftResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_training_drafts(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(TrainingDraft)
    status_filter = _parse_status_filter(status)
    if status_filter:
        query = query.filter(TrainingDraft.status == status_filter)
    return query.order_by(TrainingDraft.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.post("/moderation/training-drafts/{draft_id}/approve", response_model=TrainingDraftResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def approve_training_draft(
    draft_id: int,
    review: ModerationReview | None = None,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    draft = db.query(TrainingDraft).filter(TrainingDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft topilmadi")
    if draft.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending draft tasdiqlanadi")

    if draft.draft_type == TrainingDraftType.create:
        slug = _unique_training_slug(db, draft.title)
        training = Training(owner_id=draft.owner_id, slug=slug)
        db.add(training)
    else:
        training = db.query(Training).filter(Training.id == draft.training_id, Training.owner_id == draft.owner_id).first()
        if not training:
            raise HTTPException(status_code=404, detail="Mashg'ulot topilmadi")
        if training.title != draft.title:
            training.slug = _unique_training_slug(db, draft.title, training.id)

    linked_stadium = None
    if draft.stadium_id is not None:
        linked_stadium = db.query(Stadium).filter(Stadium.id == draft.stadium_id, Stadium.owner_id == draft.owner_id).first()
        if not linked_stadium:
            raise HTTPException(status_code=400, detail="Bog'langan stadion topilmadi")

    for field in TRAINING_APPLY_FIELDS:
        setattr(training, field, getattr(draft, field))

    if linked_stadium:
        training.address = linked_stadium.address
        training.district = linked_stadium.district
        training.latitude = linked_stadium.latitude
        training.longitude = linked_stadium.longitude
    else:
        training.address = draft.address
        training.district = draft.district
        training.latitude = draft.latitude
        training.longitude = draft.longitude

    draft.status = ModerationStatus.approved
    draft.reviewed_by = superadmin.id
    draft.review_note = review.review_note if review else None
    draft.reviewed_at = datetime.now(timezone.utc)
    track_event(db, "superadmin_training_draft_approved", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "training_draft_approved", superadmin, "training_draft", draft.id)
    db.commit()
    db.refresh(draft)
    notify_user(
        db,
        draft.owner,
        "✅ Mashg'ulot tasdiqlandi",
        f"'{draft.title}' mashg'uloti endi umumiy ro'yxatda ko'rinadi",
        NotificationType.moderation,
    )
    db.commit()
    return draft


@router.post("/moderation/training-drafts/{draft_id}/reject", response_model=TrainingDraftResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def reject_training_draft(
    draft_id: int,
    review: ModerationReview,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    draft = db.query(TrainingDraft).filter(TrainingDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft topilmadi")
    if draft.status != ModerationStatus.pending:
        raise HTTPException(status_code=400, detail="Faqat pending draft rad etiladi")
    draft.status = ModerationStatus.rejected
    draft.reviewed_by = superadmin.id
    draft.review_note = review.review_note
    draft.reviewed_at = datetime.now(timezone.utc)
    track_event(db, "superadmin_training_draft_rejected", user_id=superadmin.id, metadata={"draft_id": draft.id})
    write_audit(db, "training_draft_rejected", superadmin, "training_draft", draft.id, {"review_note": review.review_note})
    db.commit()
    db.refresh(draft)
    notify_user(
        db,
        draft.owner,
        "❌ Mashg'ulot rad etildi",
        f"'{draft.title}' mashg'uloti rad etildi\nSabab: {draft.review_note or '—'}",
        NotificationType.moderation,
    )
    db.commit()
    return draft


@router.get("/trainings", response_model=List[TrainingResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_admin_trainings(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    trainings = db.query(Training).order_by(Training.created_at.desc()).offset(skip).limit(min(limit, 100)).all()
    return [TrainingResponse.from_model(t) for t in trainings]


@router.patch("/trainings/{training_id}", response_model=TrainingResponse)
def update_admin_training(
    training_id: int,
    patch: AdminTrainingUpdate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    training = db.query(Training).filter(Training.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Mashg'ulot topilmadi")
    for field, value in patch.model_dump(exclude_none=True).items():
        setattr(training, field, value)
    track_event(db, "superadmin_training_updated", user_id=superadmin.id, metadata={"training_id": training.id})
    write_audit(db, "training_updated", superadmin, "training", training.id, patch.model_dump(exclude_none=True))
    db.commit()
    db.refresh(training)
    return TrainingResponse.from_model(training)


def _unique_slug(db: Session, name: str, current_stadium_id: int | None = None) -> str:
    slug = generate_slug(name)
    base_slug = slug
    counter = 1
    for _ in range(1000):
        query = db.query(Stadium).filter(Stadium.slug == slug)
        if current_stadium_id is not None:
            query = query.filter(Stadium.id != current_stadium_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug + "-" + str(int(datetime.now(timezone.utc).timestamp()))


def _unique_training_slug(db: Session, title: str, current_training_id: int | None = None) -> str:
    slug = generate_slug(title)
    base_slug = slug
    counter = 1
    for _ in range(1000):
        query = db.query(Training).filter(Training.slug == slug)
        if current_training_id is not None:
            query = query.filter(Training.id != current_training_id)
        if not query.first():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug + "-" + str(int(datetime.now(timezone.utc).timestamp()))
