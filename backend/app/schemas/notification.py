from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    unread_count: int
    total_count: int
    notifications: list[NotificationResponse]


class BroadcastCreate(BaseModel):
    audience: Literal["users", "owners", "all", "booked_users", "stadium_customers"] = "users"
    stadium_id: int | None = None
    title: str
    message: str
    image_url: str | None = None
    cta_text: str | None = None
    cta_url: str | None = None
    parse_mode: Literal["HTML", "Markdown"] | None = None

    @field_validator("title", "message")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Matn bo'sh bo'lmasligi kerak")
        return value

    @field_validator("image_url", "cta_text", "cta_url", "parse_mode")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class BroadcastResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    image_url: str | None
    cta_text: str | None
    cta_url: str | None
    parse_mode: str | None
    audience: str
    stadium_id: int | None
    status: str
    total_count: int
    sent_count: int
    failed_count: int
    created_at: datetime
    updated_at: datetime


class BroadcastRecipientResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    status: str
    error: str | None
    attempt_count: int
    sent_at: datetime | None
    created_at: datetime
