from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.notification import Notification
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
    limit = min(max(limit, 1), 100)
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if type and type != "all":
        query = query.filter(Notification.type == type)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Notification.title.ilike(pattern), Notification.message.ilike(pattern)))
    total_count = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    unread_count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    return {"unread_count": unread_count, "total_count": total_count, "notifications": notifications}


@router.get("/unread-count")
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"unread_count": db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()}


@router.patch("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "Barcha xabarlar o'qildi"}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Xabar topilmadi")
    notification.is_read = True
    db.commit()
    return {"message": "Xabar o'qildi"}
