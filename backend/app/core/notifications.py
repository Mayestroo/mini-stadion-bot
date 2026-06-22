from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.telegram import send_telegram_broadcast, send_telegram_message
from app.models.notification import (
    Broadcast,
    BroadcastAudience,
    BroadcastRecipient,
    BroadcastRecipientStatus,
    BroadcastStatus,
    Notification,
    NotificationType,
)
from app.models.booking import Booking
from app.models.stadium import Stadium
from app.models.user import User, UserRole


def create_notification(
    db: Session,
    user_id: int | None,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.system,
) -> Notification | None:
    if not user_id:
        return None
    notification = Notification(user_id=user_id, title=title, message=message, type=notification_type)
    db.add(notification)
    return notification


def notify_user(
    db: Session,
    user: User | None,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.system,
    telegram: bool = True,
) -> None:
    if not user:
        return
    create_notification(db, user.id, title, message, notification_type)
    if telegram:
        send_telegram_message(user.telegram_id, f"{title}\n\n{message}")


def notify_admins(
    db: Session,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.system,
) -> None:
    admins = db.query(User).filter(
        User.role.in_([UserRole.moderator, UserRole.superadmin]),
        User.is_active == True,
    ).all()
    for admin in admins:
        notify_user(db, admin, title, message, notification_type)


def create_broadcast(
    db: Session,
    creator: User,
    audience: BroadcastAudience,
    title: str,
    message: str,
    image_url: str | None = None,
    cta_text: str | None = None,
    cta_url: str | None = None,
    parse_mode: str | None = None,
    stadium_id: int | None = None,
) -> Broadcast:
    targets = broadcast_targets(db, audience, stadium_id)
    broadcast = Broadcast(
        created_by=creator.id,
        audience=audience,
        title=title,
        message=message,
        image_url=image_url,
        cta_text=cta_text,
        cta_url=cta_url,
        parse_mode=parse_mode,
        stadium_id=stadium_id,
        total_count=len(targets),
        status=BroadcastStatus.queued,
    )
    db.add(broadcast)
    db.flush()
    for user in targets:
        db.add(BroadcastRecipient(broadcast_id=broadcast.id, user_id=user.id))
    return broadcast


def process_broadcast_queue(limit: int = 25) -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        recipients = (
            db.query(BroadcastRecipient)
            .join(Broadcast)
            .filter(
                BroadcastRecipient.status == BroadcastRecipientStatus.pending,
                BroadcastRecipient.attempt_count < 3,
            )
            .order_by(BroadcastRecipient.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(limit)
            .all()
        )
        for recipient in recipients:
            recipient.locked_at = now
            recipient.last_attempt_at = now
        db.commit()

        for recipient in recipients:
            db.refresh(recipient)
            broadcast = recipient.broadcast
            broadcast.status = BroadcastStatus.sending
            recipient.attempt_count += 1
            recipient.last_attempt_at = datetime.now(timezone.utc)
            try:
                create_notification(db, recipient.user_id, broadcast.title, broadcast.message, NotificationType.broadcast)
                sent = send_telegram_broadcast(
                    recipient.user.telegram_id,
                    broadcast.title,
                    broadcast.message,
                    broadcast.image_url,
                    broadcast.cta_text,
                    broadcast.cta_url,
                    broadcast.parse_mode,
                )
                if not sent:
                    raise RuntimeError(sent.error or "Telegram xabar yuborilmadi")
                recipient.status = BroadcastRecipientStatus.sent
                recipient.sent_at = datetime.now(timezone.utc)
                recipient.locked_at = None
                recipient.error = None
            except Exception as exc:
                recipient.status = BroadcastRecipientStatus.failed if recipient.attempt_count >= 3 else BroadcastRecipientStatus.pending
                recipient.error = str(exc)[:500]
                recipient.locked_at = None
            _refresh_broadcast_status(db, broadcast)
        db.commit()
    finally:
        db.close()


def broadcast_target_count(db: Session, audience: BroadcastAudience, stadium_id: int | None = None) -> int:
    return len(broadcast_targets(db, audience, stadium_id))


def broadcast_targets(db: Session, audience: BroadcastAudience, stadium_id: int | None = None) -> list[User]:
    query = db.query(User).filter(User.is_active == True, User.telegram_id.isnot(None))
    if audience == BroadcastAudience.users:
        query = query.filter(User.role == UserRole.user)
    elif audience == BroadcastAudience.owners:
        query = query.filter(User.role == UserRole.owner)
    elif audience == BroadcastAudience.booked_users:
        query = query.join(Booking, Booking.user_id == User.id).distinct()
    elif audience == BroadcastAudience.stadium_customers:
        if not stadium_id:
            return []
        query = query.join(Booking, Booking.user_id == User.id).filter(Booking.stadium_id == stadium_id).distinct()
    return query.order_by(User.id.asc()).all()


def _refresh_broadcast_status(db: Session, broadcast: Broadcast) -> None:
    db.flush()
    broadcast.sent_count = db.query(BroadcastRecipient).filter(
        BroadcastRecipient.broadcast_id == broadcast.id,
        BroadcastRecipient.status == BroadcastRecipientStatus.sent,
    ).count()
    broadcast.failed_count = db.query(BroadcastRecipient).filter(
        BroadcastRecipient.broadcast_id == broadcast.id,
        BroadcastRecipient.status == BroadcastRecipientStatus.failed,
    ).count()
    pending = db.query(BroadcastRecipient).filter(
        BroadcastRecipient.broadcast_id == broadcast.id,
        BroadcastRecipient.status == BroadcastRecipientStatus.pending,
    ).count()
    if pending == 0:
        broadcast.status = BroadcastStatus.completed if broadcast.failed_count == 0 else BroadcastStatus.failed
    else:
        broadcast.status = BroadcastStatus.queued


def retry_failed_recipients(db: Session, broadcast: Broadcast) -> int:
    count = db.query(BroadcastRecipient).filter(
        BroadcastRecipient.broadcast_id == broadcast.id,
        BroadcastRecipient.status == BroadcastRecipientStatus.failed,
    ).update({
        "status": BroadcastRecipientStatus.pending,
        "error": None,
        "locked_at": None,
    })
    broadcast.status = BroadcastStatus.queued
    _refresh_broadcast_status(db, broadcast)
    return count


def get_notifications_for_user(
    db: Session,
    user_id: int,
    q: str | None = None,
    type: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    limit = min(max(limit, 1), 100)
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if type and type != "all":
        query = query.filter(Notification.type == type)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(or_(Notification.title.ilike(pattern), Notification.message.ilike(pattern)))
    total_count = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    unread_count = db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()
    return {"unread_count": unread_count, "total_count": total_count, "notifications": notifications}


def get_unread_count_for_user(db: Session, user_id: int) -> int:
    return db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).count()


def mark_all_read_for_user(db: Session, user_id: int) -> None:
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()


def mark_notification_read_for_user(db: Session, user_id: int, notification_id: int) -> Notification | None:
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
    if not notification:
        return None
    notification.is_read = True
    db.commit()
    return notification
