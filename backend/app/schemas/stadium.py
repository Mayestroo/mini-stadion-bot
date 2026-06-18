from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


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


class StadiumUpdate(StadiumCreate):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    price_per_hour: Optional[int] = None


class StadiumResponse(BaseModel):
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

    class Config:
        from_attributes = True


class AvailabilitySlot(BaseModel):
    time: str
    available: bool
    booking_id: Optional[int] = None
