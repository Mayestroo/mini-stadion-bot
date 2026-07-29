from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base, utcnow


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show = "no_show"


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint('stadium_id', 'date', 'start_time', name='uq_booking_slot'),
        Index('ix_bookings_stadium_date_status', 'stadium_id', 'date', 'status'),
    )

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(20), unique=True, nullable=False, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=False)

    date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    duration_hours = Column(Integer, nullable=False)

    total_price = Column(Integer, nullable=False)

    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    note = Column(Text, nullable=True)
    admin_note = Column(Text, nullable=True)

    telegram_message_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="bookings")
    stadium = relationship("Stadium", back_populates="bookings")
    cancel_requests = relationship("BookingCancelRequest", back_populates="booking", lazy="dynamic")
