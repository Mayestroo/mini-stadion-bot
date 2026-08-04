import enum

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship

from app.core.database import Base, utcnow
from app.models.moderation import ModerationStatus


class TrainingDraftType(str, enum.Enum):
    create = "create"
    update = "update"


class Training(Base):
    """Sport mashg'uloti (training session) — directory listing.

    Unlike Stadium, Training has NO booking flow: users contact the
    provider directly via phone/telegram/instagram.
    """
    __tablename__ = "trainings"
    __table_args__ = (
        Index('ix_trainings_sport_active', 'sport', 'is_active'),
    )

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=True, index=True)

    title = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    sport = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    coach_name = Column(String(200), nullable=True)

    schedule_text = Column(String(300), nullable=True)
    price_text = Column(String(100), nullable=True)
    age_group = Column(String(20), nullable=True)

    # Location: when stadium_id is set, values are copied from the stadium
    # at moderation-approve time; otherwise entered by the owner.
    address = Column(String(300), nullable=False)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    phone = Column(String(20), nullable=False)
    telegram = Column(String(100), nullable=True)
    instagram = Column(String(100), nullable=True)

    cover_image = Column(String(300), nullable=True)
    images = Column(JSON, default=list)

    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="trainings", foreign_keys=[owner_id])
    stadium = relationship("Stadium", back_populates="trainings")
    drafts = relationship("TrainingDraft", back_populates="training", lazy="dynamic")


class TrainingDraft(Base):
    __tablename__ = "training_drafts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=True, index=True)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=True, index=True)
    draft_type = Column(Enum(TrainingDraftType), nullable=False)
    status = Column(Enum(ModerationStatus), default=ModerationStatus.draft, nullable=False, index=True)

    title = Column(String(200), nullable=False)
    sport = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    coach_name = Column(String(200), nullable=True)

    schedule_text = Column(String(300), nullable=True)
    price_text = Column(String(100), nullable=True)
    age_group = Column(String(20), nullable=True)

    address = Column(String(300), nullable=True)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    phone = Column(String(20), nullable=False)
    telegram = Column(String(100), nullable=True)
    instagram = Column(String(100), nullable=True)

    cover_image = Column(String(300), nullable=True)
    images = Column(JSON, default=list)

    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="training_drafts", foreign_keys=[owner_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    training = relationship("Training", back_populates="drafts")
    stadium = relationship("Stadium")
