from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Index
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base, utcnow


class UserRole(str, enum.Enum):
    guest = "guest"
    user = "user"
    owner = "owner"
    moderator = "moderator"
    superadmin = "superadmin"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        Index('ix_users_role_active', 'role', 'is_active'),
    )

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=True, index=True)
    owner_login = Column(String(80), unique=True, nullable=True, index=True)
    hashed_password = Column(String(200), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    telegram_id = Column(String(50), unique=True, nullable=True, index=True)
    telegram_username = Column(String(100), nullable=True)
    avatar_url = Column(String(300), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    bookings = relationship("Booking", back_populates="user", lazy="dynamic")
    stadiums = relationship("Stadium", back_populates="owner", lazy="dynamic", foreign_keys="Stadium.owner_id")
    stadium_drafts = relationship("StadiumDraft", back_populates="owner", lazy="dynamic", foreign_keys="StadiumDraft.owner_id")
    image_drafts = relationship("StadiumImageDraft", back_populates="owner", lazy="dynamic", foreign_keys="StadiumImageDraft.owner_id")
    booking_cancel_requests = relationship("BookingCancelRequest", back_populates="owner", lazy="dynamic", foreign_keys="BookingCancelRequest.owner_id")
    notifications = relationship("Notification", back_populates="user", lazy="dynamic")
