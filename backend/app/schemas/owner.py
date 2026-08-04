from datetime import datetime
from typing import List, Optional

import re
from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.stadium import StadiumCreate, _check_region
from app.schemas.user import PrivateUserResponse, UserResponse


class OwnerLogin(BaseModel):
    owner_login: str
    password: str


class OwnerChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value):
        if len(value) < 8:
            raise ValueError("Yangi parol kamida 8 ta belgidan iborat bo'lishi kerak")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Parol 72 belgidan oshmasligi kerak")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Parolda kamida bitta katta harf bo'lishi kerak")
        if not re.search(r"[a-z]", value):
            raise ValueError("Parolda kamida bitta kichik harf bo'lishi kerak")
        if not re.search(r"\d", value):
            raise ValueError("Parolda kamida bitta raqam bo'lishi kerak")
        return value


class OwnerCreate(BaseModel):
    full_name: str
    telegram_id: str
    owner_login: str
    temporary_password: str
    phone: Optional[str] = None

    @field_validator("temporary_password")
    @classmethod
    def validate_temporary_password(cls, value):
        if len(value) < 8:
            raise ValueError("Vaqtinchalik parol kamida 8 ta belgidan iborat bo'lishi kerak")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Parol 72 belgidan oshmasligi kerak")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Parolda kamida bitta katta harf bo'lishi kerak")
        if not re.search(r"[a-z]", value):
            raise ValueError("Parolda kamida bitta kichik harf bo'lishi kerak")
        if not re.search(r"\d", value):
            raise ValueError("Parolda kamida bitta raqam bo'lishi kerak")
        return value


class OwnerUpdate(BaseModel):
    full_name: Optional[str] = None
    telegram_id: Optional[str] = None
    owner_login: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    temporary_password: Optional[str] = None


class OwnerMe(BaseModel):
    user: PrivateUserResponse
    must_change_password: bool


class OwnerStats(BaseModel):
    today_bookings: int
    pending_bookings: int
    monthly_revenue: int
    active_stadiums: int
    pending_moderation: int


class OwnerCustomerResponse(BaseModel):
    """Safe public projection of a customer for the owner panel.

    Never expose the full User model: it contains hashed_password,
    failed_login_attempts, locked_until and other sensitive columns.
    """
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: Optional[str]


class StadiumDraftCreate(StadiumCreate):
    pass


class StadiumDraftUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_map_link: Optional[str] = None
    yandex_map_link: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    telegram: Optional[str] = None
    price_per_hour: Optional[int] = None
    price_weekend: Optional[int] = None
    price_night: Optional[int] = None
    width: Optional[float] = None
    length: Optional[float] = None
    surface: Optional[str] = None
    has_lighting: Optional[bool] = None
    has_changing_room: Optional[bool] = None
    has_shower: Optional[bool] = None
    has_parking: Optional[bool] = None
    has_cafe: Optional[bool] = None
    has_tribunes: Optional[bool] = None
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    working_days: Optional[List[int]] = None
    cover_image: Optional[str] = None
    images: Optional[List[str]] = None

    @field_validator("region")
    @classmethod
    def validate_region(cls, v):
        return _check_region(v)


class StadiumDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    stadium_id: Optional[int]
    draft_type: str
    status: str
    name: str
    description: Optional[str]
    address: str
    region: Optional[str] = None
    district: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    google_map_link: Optional[str] = None
    yandex_map_link: Optional[str] = None
    phone: str
    phone2: Optional[str]
    telegram: Optional[str]
    price_per_hour: int
    price_weekend: Optional[int]
    price_night: Optional[int]
    width: Optional[float]
    length: Optional[float]
    surface: Optional[str]
    has_lighting: bool
    has_changing_room: bool
    has_shower: bool
    has_parking: bool
    has_cafe: bool
    has_tribunes: bool
    open_time: str
    close_time: str
    working_days: List[int]
    cover_image: Optional[str]
    images: List[str]
    reviewed_by: Optional[int]
    review_note: Optional[str]
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]


class ImageDraftCreate(BaseModel):
    action: str
    image_url: str

    @field_validator("action")
    @classmethod
    def validate_action(cls, value):
        if value not in {"add", "delete", "set_cover"}:
            raise ValueError("Rasm amali add, delete yoki set_cover bo'lishi kerak")
        return value


class ImageDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    stadium_id: int
    action: str
    image_url: str
    status: str
    reviewed_by: Optional[int]
    review_note: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]


class BookingCancelRequestCreate(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value):
        if len(value.strip()) < 3:
            raise ValueError("Bekor qilish sababi kamida 3 ta belgidan iborat bo'lishi kerak")
        return value.strip()


class ModerationReview(BaseModel):
    review_note: Optional[str] = None

    @field_validator("review_note")
    @classmethod
    def limit_review_note(cls, v):
        if v is not None:
            v = v.strip()[:500]
            if not v:
                return None
        return v


class BookingCancelRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    booking_id: int
    owner_id: int
    reason: str
    status: str
    reviewed_by: Optional[int]
    review_note: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]
