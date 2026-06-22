import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base, utcnow


class NotificationType(str, enum.Enum):
    booking = "booking"
    moderation = "moderation"
    broadcast = "broadcast"
    system = "system"


class BroadcastAudience(str, enum.Enum):
    users = "users"
    owners = "owners"
    all = "all"
    booked_users = "booked_users"
    stadium_customers = "stadium_customers"


class BroadcastStatus(str, enum.Enum):
    queued = "queued"
    sending = "sending"
    completed = "completed"
    failed = "failed"


class BroadcastRecipientStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NotificationType), default=NotificationType.system, nullable=False, index=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class Broadcast(Base):
    __tablename__ = "broadcasts"

    id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    cta_text = Column(String(80), nullable=True)
    cta_url = Column(String(500), nullable=True)
    parse_mode = Column(String(20), nullable=True)
    audience = Column(Enum(BroadcastAudience), nullable=False, index=True)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=True, index=True)
    status = Column(Enum(BroadcastStatus), default=BroadcastStatus.queued, nullable=False, index=True)
    total_count = Column(Integer, default=0, nullable=False)
    sent_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by])
    stadium = relationship("Stadium")
    recipients = relationship("BroadcastRecipient", back_populates="broadcast", lazy="dynamic")


class BroadcastRecipient(Base):
    __tablename__ = "broadcast_recipients"

    id = Column(Integer, primary_key=True, index=True)
    broadcast_id = Column(Integer, ForeignKey("broadcasts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(BroadcastRecipientStatus), default=BroadcastRecipientStatus.pending, nullable=False, index=True)
    error = Column(Text, nullable=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    locked_at = Column(DateTime, nullable=True, index=True)
    last_attempt_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    broadcast = relationship("Broadcast", back_populates="recipients")
    user = relationship("User")
