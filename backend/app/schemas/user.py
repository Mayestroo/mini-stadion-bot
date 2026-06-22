from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class UserCreate(BaseModel):
    full_name: str
    phone: str
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if not re.match(r"^\+998\d{9}$", v):
            raise ValueError("Telefon +998XXXXXXXXX formatida bo'lishi kerak")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Parol kamida 8 ta belgidan iborat bo'lishi kerak")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Parolda kamida bitta katta harf bo'lishi kerak")
        if not re.search(r"[a-z]", v):
            raise ValueError("Parolda kamida bitta kichik harf bo'lishi kerak")
        if not re.search(r"\d", v):
            raise ValueError("Parolda kamida bitta raqam bo'lishi kerak")
        return v


class UserLogin(BaseModel):
    phone: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v is not None and not re.match(r"^\+998\d{9}$", v):
            raise ValueError("Telefon +998XXXXXXXXX formatida bo'lishi kerak")
        return v


class UserResponse(BaseModel):
    id: int
    full_name: str
    phone: Optional[str]
    owner_login: Optional[str]
    role: str
    is_active: bool
    must_change_password: bool
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PrivateUserResponse(UserResponse):
    telegram_id: Optional[str]

    class Config:
        from_attributes = True


class AdminUserResponse(UserResponse):
    telegram_id: Optional[str]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PrivateUserResponse
