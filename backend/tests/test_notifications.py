from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.notifications import create_broadcast, create_notification
from app.models.booking import Booking
from app.models.notification import BroadcastAudience
from app.models.stadium import Stadium
from app.models.user import User, UserRole
from app import models


def make_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_create_notification_defaults_unread():
    db = make_db()
    user = User(full_name="User", telegram_id="100", hashed_password="x", role=UserRole.user)
    db.add(user)
    db.commit()
    db.refresh(user)

    notification = create_notification(db, user.id, "Title", "Message")
    db.commit()
    db.refresh(notification)

    assert notification.user_id == user.id
    assert notification.is_read is False


def test_broadcast_stadium_customers_targets_only_matching_stadium():
    db = make_db()
    owner = User(full_name="Owner", telegram_id="200", hashed_password="x", role=UserRole.owner)
    user_a = User(full_name="A", telegram_id="101", hashed_password="x", role=UserRole.user)
    user_b = User(full_name="B", telegram_id="102", hashed_password="x", role=UserRole.user)
    db.add_all([owner, user_a, user_b])
    db.commit()
    db.refresh(owner)
    db.refresh(user_a)
    db.refresh(user_b)

    stadium_a = Stadium(owner_id=owner.id, name="A", slug="a", address="A", phone="1", price_per_hour=1)
    stadium_b = Stadium(owner_id=owner.id, name="B", slug="b", address="B", phone="2", price_per_hour=1)
    db.add_all([stadium_a, stadium_b])
    db.commit()
    db.refresh(stadium_a)
    db.refresh(stadium_b)

    db.add_all([
        Booking(booking_code="A1", user_id=user_a.id, stadium_id=stadium_a.id, date="2026-06-17", start_time="10:00", end_time="11:00", duration_hours=1, total_price=1),
        Booking(booking_code="B1", user_id=user_b.id, stadium_id=stadium_b.id, date="2026-06-17", start_time="10:00", end_time="11:00", duration_hours=1, total_price=1),
    ])
    db.commit()

    broadcast = create_broadcast(db, owner, BroadcastAudience.stadium_customers, "Title", "Message", stadium_id=stadium_a.id)
    db.commit()

    assert broadcast.total_count == 1
