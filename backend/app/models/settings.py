from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base, utcnow


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(80), primary_key=True)
    value = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    updated_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
