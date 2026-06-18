from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show = "no_show"


class Booking(Base):
    __tablename__ = "bookings"

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

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    stadium = relationship("Stadium", back_populates="bookings")
    cancel_requests = relationship("BookingCancelRequest", back_populates="booking", lazy="dynamic")
