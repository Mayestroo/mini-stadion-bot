from pydantic import BaseModel, ConfigDict, field_validator
from typing import Any, Optional
from datetime import datetime
import re


class BookingCreate(BaseModel):
    stadium_id: int
    date: str
    start_time: str
    end_time: str
    note: Optional[str] = None

    @field_validator("note")
    @classmethod
    def limit_note(cls, v):
        if v is not None:
            v = v.strip()[:500]
            if not v:
                return None
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v):
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Sana YYYY-MM-DD formatida bo'lishi kerak")
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time(cls, v):
        if not re.match(r"^\d{2}:\d{2}$", v):
            raise ValueError("Vaqt HH:MM formatida bo'lishi kerak")
        return v


class BookingStatusUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid = {"pending", "confirmed", "cancelled", "completed", "no_show"}
        if v not in valid:
            raise ValueError(f"Status {v} noto'g'ri. Tanlanganlar: {', '.join(sorted(valid))}")
        return v


class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_code: str
    stadium_id: int
    stadium_name: str
    user_id: int
    user_name: str
    user_phone: Optional[str]
    date: str
    start_time: str
    end_time: str
    duration_hours: int
    total_price: int
    status: str
    note: Optional[str]
    admin_note: Optional[str]
    created_at: datetime

    @classmethod
    def from_model(cls, b: Any) -> "BookingResponse":
        return cls(
            id=b.id,
            booking_code=b.booking_code,
            stadium_id=b.stadium_id,
            stadium_name=b.stadium.name,
            user_id=b.user_id,
            user_name=b.user.full_name,
            user_phone=b.user.phone,
            date=b.date,
            start_time=b.start_time,
            end_time=b.end_time,
            duration_hours=b.duration_hours,
            total_price=b.total_price,
            status=b.status.value,
            note=b.note,
            admin_note=b.admin_note,
            created_at=b.created_at,
        )
