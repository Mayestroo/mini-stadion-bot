from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime

ALLOWED_STADIUM_FIELDS = {
    "name", "description", "address", "district", "latitude", "longitude",
    "phone", "phone2", "telegram", "price_per_hour", "price_weekend", "price_night",
    "width", "length", "surface", "has_lighting", "has_changing_room", "has_shower",
    "has_parking", "has_cafe", "has_tribunes", "open_time", "close_time", "working_days",
}


class StadiumCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: str
    phone2: Optional[str] = None
    telegram: Optional[str] = None
    price_per_hour: int
    price_weekend: Optional[int] = None
    price_night: Optional[int] = None
    width: Optional[float] = None
    length: Optional[float] = None
    surface: Optional[str] = "artificial"
    has_lighting: bool = False
    has_changing_room: bool = False
    has_shower: bool = False
    has_parking: bool = False
    has_cafe: bool = False
    has_tribunes: bool = False
    open_time: str = "08:00"
    close_time: str = "23:00"
    working_days: List[int] = [0, 1, 2, 3, 4, 5, 6]

    @field_validator("name", "address", "phone")
    @classmethod
    def strip_and_limit(cls, v):
        if not isinstance(v, str):
            return v
        v = v.strip()[:200]
        if not v:
            raise ValueError("Maydon bo'sh bo'lmasligi kerak")
        return v

    @field_validator("description")
    @classmethod
    def limit_description(cls, v):
        if v is not None:
            return v.strip()[:2000]
        return v


class StadiumUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
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

    @field_validator("name", "address", "phone")
    @classmethod
    def strip_and_limit(cls, v):
        if v is not None:
            return v.strip()[:200]
        return v


class StadiumResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: Optional[str]
    address: str
    district: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
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
    is_active: bool
    is_featured: bool
    rating: float
    total_bookings: int
    created_at: datetime


class AvailabilitySlot(BaseModel):
    time: str
    available: bool
