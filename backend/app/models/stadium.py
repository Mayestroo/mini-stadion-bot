from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.core.database import Base, utcnow


class Stadium(Base):
    __tablename__ = "stadiums"
    __table_args__ = (
        Index('ix_stadiums_active_featured', 'is_active', 'is_featured'),
    )

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    address = Column(String(300), nullable=False)
    # Canonical viloyat (see app/core/regions.py); district is the free-text
    # sub-region (Tashkent district name, city, or tuman).
    region = Column(String(80), nullable=True, index=True)
    district = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    # Optional custom map URLs entered by the owner/admin. When absent, the
    # *_url properties below generate both links from latitude/longitude.
    google_map_link = Column(String(500), nullable=True)
    yandex_map_link = Column(String(500), nullable=True)

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

    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    rating = Column(Float, default=0.0)
    total_bookings = Column(Integer, default=0)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    @property
    def google_maps_url(self) -> str | None:
        if self.google_map_link:
            return self.google_map_link
        if self.latitude is not None and self.longitude is not None:
            return f"https://www.google.com/maps?q={self.latitude},{self.longitude}"
        return None

    @property
    def yandex_maps_url(self) -> str | None:
        if self.yandex_map_link:
            return self.yandex_map_link
        if self.latitude is not None and self.longitude is not None:
            # Yandex expects coordinates in lng,lat order.
            return f"https://yandex.com/maps/?pt={self.longitude},{self.latitude}&z=16&l=map"
        return None

    bookings = relationship("Booking", back_populates="stadium", lazy="dynamic")
    trainings = relationship("Training", back_populates="stadium", lazy="dynamic")
    owner = relationship("User", back_populates="stadiums", foreign_keys=[owner_id])
    drafts = relationship("StadiumDraft", back_populates="stadium", lazy="dynamic")
    image_drafts = relationship("StadiumImageDraft", back_populates="stadium", lazy="dynamic")
