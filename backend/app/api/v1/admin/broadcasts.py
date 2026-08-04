from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.analytics import track_event
from app.core.audit import write_audit
from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.services.notifications import broadcast_target_count, create_broadcast, retry_failed_recipients
from app.core.ratelimit import rate_limit
from app.core.sanitize import sanitize_message
from app.core.settings import get_setting_int
from app.models.notification import Broadcast, BroadcastAudience, BroadcastRecipient, BroadcastStatus
from app.models.user import User
from app.schemas.notification import BroadcastCreate, BroadcastRecipientResponse, BroadcastResponse

router = APIRouter(prefix="/admin", tags=["Superadmin"])


@router.post("/broadcasts/preview", dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def preview_broadcast_targets(
    data: BroadcastCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return {"target_count": broadcast_target_count(db, BroadcastAudience(data.audience), data.stadium_id)}


@router.get("/broadcasts", response_model=List[BroadcastResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_broadcasts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(Broadcast).order_by(Broadcast.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.post("/broadcasts", response_model=BroadcastResponse, dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
def create_broadcast_message(
    data: BroadcastCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    interval = get_setting_int(db, "broadcast_interval_seconds")
    recent = db.query(Broadcast).filter(Broadcast.created_by == superadmin.id, Broadcast.created_at >= datetime.now(timezone.utc) - timedelta(seconds=interval)).first()
    if recent:
        raise HTTPException(status_code=429, detail=f"{interval} soniyada faqat bitta ommaviy xabar yuborish mumkin")

    active = db.query(Broadcast).filter(Broadcast.status.in_([BroadcastStatus.queued, BroadcastStatus.sending])).first()
    if active:
        raise HTTPException(status_code=400, detail="Avvalgi ommaviy xabar hali yuborilmoqda")

    sanitized_title = sanitize_message(data.title, data.parse_mode)
    sanitized_message = sanitize_message(data.message, data.parse_mode)

    broadcast = create_broadcast(
        db,
        superadmin,
        BroadcastAudience(data.audience),
        sanitized_title,
        sanitized_message,
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


@router.post("/broadcasts/{broadcast_id}/retry-failed", response_model=BroadcastResponse, dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
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


@router.get("/broadcasts/{broadcast_id}/recipients", response_model=List[BroadcastRecipientResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_broadcast_recipients(
    broadcast_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    broadcast = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
    if not broadcast:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    recipients = db.query(BroadcastRecipient).options(joinedload(BroadcastRecipient.user)).filter(BroadcastRecipient.broadcast_id == broadcast.id).order_by(BroadcastRecipient.status.asc(), BroadcastRecipient.id.asc()).offset(skip).limit(min(limit, 100)).all()
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "user_name": item.user.full_name,
            "status": item.status.value,
            "error": item.error,
            "attempt_count": item.attempt_count,
            "sent_at": item.sent_at,
            "created_at": item.created_at,
        }
        for item in recipients
    ]
