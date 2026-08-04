from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, List
from datetime import datetime

# Storage keys for sport types. Uzbek labels live in the frontend.
SPORT_TYPES = [
    "football",
    "basketball",
    "volleyball",
    "tennis",
    "padel",
    "badminton",
    "swimming",
    "boxing",
    "wrestling",
    "fitness",
    "gymnastics",
    "chess",
    "other",
]

AGE_GROUPS = ["kids", "teens", "adults", "all"]

ALLOWED_TRAINING_FIELDS = {
    "title", "sport", "description", "coach_name", "schedule_text", "price_text",
    "age_group", "stadium_id", "address", "district", "latitude", "longitude",
    "phone", "telegram", "instagram", "cover_image", "images",
}


class TrainingCreate(BaseModel):
    title: str
    sport: str
    description: Optional[str] = None
    coach_name: Optional[str] = None
    schedule_text: Optional[str] = None
    price_text: Optional[str] = None
    age_group: Optional[str] = None
    stadium_id: Optional[int] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: str
    telegram: Optional[str] = None
    instagram: Optional[str] = None

    @field_validator("title", "phone")
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

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, v):
        if v not in SPORT_TYPES:
            raise ValueError("Sport turi noto'g'ri")
        return v

    @field_validator("age_group")
    @classmethod
    def validate_age_group(cls, v):
        if v is not None and v not in AGE_GROUPS:
            raise ValueError("Yosh guruhi noto'g'ri")
        return v

    @model_validator(mode="after")
    def require_address_without_stadium(self):
        # Address is optional only when the training is linked to a stadium
        # (location is then inherited from the stadium).
        if self.stadium_id is None:
            if not self.address or not self.address.strip():
                raise ValueError("Stadion tanlanmaganda manzil kiritilishi shart")
        return self


class TrainingUpdate(BaseModel):
    title: Optional[str] = None
    sport: Optional[str] = None
    description: Optional[str] = None
    coach_name: Optional[str] = None
    schedule_text: Optional[str] = None
    price_text: Optional[str] = None
    age_group: Optional[str] = None
    stadium_id: Optional[int] = None
    address: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    instagram: Optional[str] = None

    @field_validator("title", "phone")
    @classmethod
    def strip_and_limit(cls, v):
        if v is not None:
            return v.strip()[:200]
        return v

    @field_validator("sport")
    @classmethod
    def validate_sport(cls, v):
        if v is not None and v not in SPORT_TYPES:
            raise ValueError("Sport turi noto'g'ri")
        return v

    @field_validator("age_group")
    @classmethod
    def validate_age_group(cls, v):
        if v is not None and v not in AGE_GROUPS:
            raise ValueError("Yosh guruhi noto'g'ri")
        return v


class TrainingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: Optional[int]
    stadium_id: Optional[int]
    title: str
    slug: str
    sport: str
    description: Optional[str]
    coach_name: Optional[str]
    schedule_text: Optional[str]
    price_text: Optional[str]
    age_group: Optional[str]
    address: str
    district: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    phone: str
    telegram: Optional[str]
    instagram: Optional[str]
    cover_image: Optional[str]
    images: List[str]
    is_active: bool
    is_featured: bool
    created_at: datetime
    stadium_name: Optional[str] = None
    stadium_slug: Optional[str] = None

    @classmethod
    def from_model(cls, training) -> "TrainingResponse":
        data = {field: getattr(training, field) for field in cls.model_fields if hasattr(training, field)}
        if training.stadium:
            data["stadium_name"] = training.stadium.name
            data["stadium_slug"] = training.stadium.slug
        return cls(**data)


class AdminTrainingUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class TrainingDraftCreate(TrainingCreate):
    pass


class TrainingDraftUpdate(TrainingUpdate):
    pass


class TrainingDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    training_id: Optional[int]
    stadium_id: Optional[int]
    draft_type: str
    status: str
    title: str
    sport: str
    description: Optional[str]
    coach_name: Optional[str]
    schedule_text: Optional[str]
    price_text: Optional[str]
    age_group: Optional[str]
    address: Optional[str]
    district: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    phone: str
    telegram: Optional[str]
    instagram: Optional[str]
    cover_image: Optional[str]
    images: List[str]
    reviewed_by: Optional[int]
    review_note: Optional[str]
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]
