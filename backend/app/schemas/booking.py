from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class BookingCreate(BaseModel):
    stadium_id: int
    date: str
    start_time: str
    end_time: str
    note: Optional[str] = None

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

    class Config:
        from_attributes = True
