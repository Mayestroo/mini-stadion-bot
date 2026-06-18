from datetime import datetime
import enum

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship

from app.core.database import Base


class ModerationStatus(str, enum.Enum):
    draft = "draft"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class StadiumDraftType(str, enum.Enum):
    create = "create"
    update = "update"


class StadiumImageAction(str, enum.Enum):
    add = "add"
    delete = "delete"
    set_cover = "set_cover"


class StadiumDraft(Base):
    __tablename__ = "stadium_drafts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=True, index=True)
    draft_type = Column(Enum(StadiumDraftType), nullable=False)
    status = Column(Enum(ModerationStatus), default=ModerationStatus.draft, nullable=False, index=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String(300), nullable=False)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    phone = Column(String(20), nullable=False)
    phone2 = Column(String(20), nullable=True)
    telegram = Column(String(100), nullable=True)

    price_per_hour = Column(Integer, nullable=False)
    price_weekend = Column(Integer, nullable=True)
    price_night = Column(Integer, nullable=True)

    width = Column(Float, nullable=True)
    length = Column(Float, nullable=True)
    surface = Column(String(50), nullable=True)

    has_lighting = Column(Boolean, default=False)
    has_changing_room = Column(Boolean, default=False)
    has_shower = Column(Boolean, default=False)
    has_parking = Column(Boolean, default=False)
    has_cafe = Column(Boolean, default=False)
    has_tribunes = Column(Boolean, default=False)

    open_time = Column(String(5), default="08:00")
    close_time = Column(String(5), default="23:00")
    working_days = Column(JSON, default=list)

    cover_image = Column(String(300), nullable=True)
    images = Column(JSON, default=list)

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="stadium_drafts", foreign_keys=[owner_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    stadium = relationship("Stadium", back_populates="drafts")


class StadiumImageDraft(Base):
    __tablename__ = "stadium_image_drafts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=False, index=True)
    action = Column(Enum(StadiumImageAction), nullable=False)
    image_url = Column(String(300), nullable=False)
    status = Column(Enum(ModerationStatus), default=ModerationStatus.pending, nullable=False, index=True)

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="image_drafts", foreign_keys=[owner_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    stadium = relationship("Stadium", back_populates="image_drafts")


class BookingCancelRequest(Base):
    __tablename__ = "booking_cancel_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(Enum(ModerationStatus), default=ModerationStatus.pending, nullable=False, index=True)

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)

    booking = relationship("Booking", back_populates="cancel_requests")
    owner = relationship("User", back_populates="booking_cancel_requests", foreign_keys=[owner_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
