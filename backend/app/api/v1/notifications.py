from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.notifications import (
    get_notifications_for_user,
    get_unread_count_for_user,
    mark_all_read_for_user,
    mark_notification_read_for_user,
)
from app.models.user import User
from app.schemas.notification import NotificationListResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationListResponse)
def get_notifications(
    q: str | None = None,
    type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_notifications_for_user(db, current_user.id, q, type, skip, limit)


@router.get("/unread-count")
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"unread_count": get_unread_count_for_user(db, current_user.id)}


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mark_all_read_for_user(db, current_user.id)
    return {"message": "Barcha xabarlar o'qildi"}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = mark_notification_read_for_user(db, current_user.id, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    return {"message": "Xabar o'qildi"}
