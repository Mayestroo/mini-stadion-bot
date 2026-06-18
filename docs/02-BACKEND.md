# 02 — Backend (FastAPI) — To'liq Kod

## Papka Tuzilishi

```
backend/
├── main.py
├── seed.py
├── requirements.txt
├── Dockerfile
├── app/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── dependencies.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── stadium.py
│   │   └── booking.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── stadium.py
│   │   └── booking.py
│   └── api/
│       ├── __init__.py
│       ├── v1/
│       │   ├── __init__.py
│       │   ├── auth.py
│       │   ├── stadiums.py
│       │   ├── bookings.py
│       │   ├── users.py
│       │   └── uploads.py
│       └── router.py
└── uploads/
```

---

## `backend/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.api.router import api_router
from app import models  # noqa: F401 — modellarni ro'yxatdan o'tkazish


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    # Shutdown


app = FastAPI(
    title="Andijan Futbol API",
    version="1.0.0",
    description="Andijondagi mini futbol stadionlarini bron qilish tizimi",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static fayllar (rasmlar)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Andijan Futbol API ishlamoqda", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./andijan_futbol.db"

    # Security
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 kun

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # Uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 10

    # Admin
    FIRST_ADMIN_EMAIL: str = "admin@andijanfutbol.uz"
    FIRST_ADMIN_PASSWORD: str = "Admin123!"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

---

## `backend/app/core/database.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# SQLite uchun connect_args kerak
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,  # True qilsangiz SQL loglar ko'rinadi
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## `backend/app/core/security.py`

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```

---

## `backend/app/core/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Token kerak")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token noto'g'ri yoki muddati o'tgan")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token yaroqsiz")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Foydalanuvchi faol emas")

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin huquqi kerak")
    return current_user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
```

---

## `backend/app/models/user.py`

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class UserRole(str, enum.Enum):
    guest = "guest"
    user = "user"
    admin = "admin"
    superadmin = "superadmin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=True, index=True)
    hashed_password = Column(String(200), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True)
    telegram_id = Column(String(50), unique=True, nullable=True, index=True)
    telegram_username = Column(String(100), nullable=True)
    avatar_url = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bookings = relationship("Booking", back_populates="user", lazy="dynamic")
```

---

## `backend/app/models/stadium.py`

```python
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Stadium(Base):
    __tablename__ = "stadiums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Manzil
    address = Column(String(300), nullable=False)
    district = Column(String(100), nullable=True)   # Tuman
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Aloqa
    phone = Column(String(20), nullable=False)
    phone2 = Column(String(20), nullable=True)
    telegram = Column(String(100), nullable=True)   # @username

    # Narx (soatlik, so'm)
    price_per_hour = Column(Integer, nullable=False)
    price_weekend = Column(Integer, nullable=True)   # Dam olish kunlari narxi
    price_night = Column(Integer, nullable=True)     # Kechki narx (20:00+)

    # Maydon
    width = Column(Float, nullable=True)   # metr
    length = Column(Float, nullable=True)  # metr
    surface = Column(String(50), nullable=True)  # grass, artificial, concrete

    # Imkoniyatlar
    has_lighting = Column(Boolean, default=False)
    has_changing_room = Column(Boolean, default=False)
    has_shower = Column(Boolean, default=False)
    has_parking = Column(Boolean, default=False)
    has_cafe = Column(Boolean, default=False)
    has_tribunes = Column(Boolean, default=False)

    # Ish vaqti
    open_time = Column(String(5), default="08:00")   # HH:MM
    close_time = Column(String(5), default="23:00")  # HH:MM
    working_days = Column(JSON, default=list)        # [0,1,2,3,4,5,6] — 0=Dushanba

    # Rasmlar
    cover_image = Column(String(300), nullable=True)
    images = Column(JSON, default=list)   # ["/uploads/img1.jpg", ...]

    # Holat
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    rating = Column(Float, default=0.0)
    total_bookings = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bookings = relationship("Booking", back_populates="stadium", lazy="dynamic")
```

---

## `backend/app/models/booking.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"       # Kutilmoqda
    confirmed = "confirmed"   # Tasdiqlangan
    cancelled = "cancelled"   # Bekor qilingan
    completed = "completed"   # Tugallangan
    no_show = "no_show"       # Kelmadi


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_code = Column(String(20), unique=True, nullable=False, index=True)

    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=False)

    # Vaqt
    date = Column(String(10), nullable=False)        # YYYY-MM-DD
    start_time = Column(String(5), nullable=False)   # HH:MM
    end_time = Column(String(5), nullable=False)     # HH:MM
    duration_hours = Column(Integer, nullable=False)

    # Narx
    total_price = Column(Integer, nullable=False)    # so'm

    # Holat
    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    note = Column(Text, nullable=True)               # Mijoz izohi
    admin_note = Column(Text, nullable=True)         # Admin izohi

    # Telegram
    telegram_message_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="bookings")
    stadium = relationship("Stadium", back_populates="bookings")
```

---

## `backend/app/models/__init__.py`

```python
from app.models.user import User, UserRole
from app.models.stadium import Stadium
from app.models.booking import Booking, BookingStatus

__all__ = ["User", "UserRole", "Stadium", "Booking", "BookingStatus"]
```

---

## `backend/app/schemas/user.py`

```python
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


class UserCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[EmailStr] = None
    password: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        # +998XXXXXXXXX formatida
        if not re.match(r"^\+998\d{9}$", v):
            raise ValueError("Telefon +998XXXXXXXXX formatida bo'lishi kerak")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
        return v


class UserLogin(BaseModel):
    phone: str
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    email: Optional[str]
    role: str
    is_active: bool
    telegram_id: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
```

---

## `backend/app/schemas/stadium.py`

```python
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
    time: str          # "09:00"
    available: bool
    booking_id: Optional[int] = None
```

---

## `backend/app/schemas/booking.py`

```python
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class BookingCreate(BaseModel):
    stadium_id: int
    date: str         # YYYY-MM-DD
    start_time: str   # HH:MM
    end_time: str     # HH:MM
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


class BookingResponse(BaseModel):
    id: int
    booking_code: str
    stadium_id: int
    stadium_name: str
    user_id: int
    user_name: str
    user_phone: str
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
```

---

## `backend/app/api/v1/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Telefon raqam tekshirish
    if db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")

    # Email tekshirish
    if user_data.email and db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Bu email allaqachon ro'yxatdan o'tgan")

    user = User(
        full_name=user_data.full_name,
        phone=user_data.phone,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": user}


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == credentials.phone).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Telefon yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Hisob faol emas")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": user}


@router.post("/telegram-auth")
def telegram_auth(telegram_id: str, username: str, full_name: str, db: Session = Depends(get_db)):
    """Telegram bot orqali login/register"""
    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        # Yangi foydalanuvchi
        user = User(
            full_name=full_name,
            phone=f"tg_{telegram_id}",
            hashed_password=get_password_hash(telegram_id + settings.SECRET_KEY),
            telegram_id=telegram_id,
            telegram_username=username,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": UserResponse.model_validate(user)}
```

---

## `backend/app/api/v1/stadiums.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import re

from app.core.database import get_db
from app.core.dependencies import get_current_admin, get_optional_user
from app.models.stadium import Stadium
from app.models.booking import Booking, BookingStatus
from app.models.user import User
from app.schemas.stadium import StadiumCreate, StadiumUpdate, StadiumResponse, AvailabilitySlot

router = APIRouter(prefix="/stadiums", tags=["Stadiums"])


def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    return slug


@router.get("/", response_model=List[StadiumResponse])
def get_stadiums(
    search: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    has_lighting: Optional[bool] = None,
    has_parking: Optional[bool] = None,
    featured: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Stadium).filter(Stadium.is_active == True)

    if search:
        query = query.filter(Stadium.name.ilike(f"%{search}%"))
    if district:
        query = query.filter(Stadium.district == district)
    if min_price:
        query = query.filter(Stadium.price_per_hour >= min_price)
    if max_price:
        query = query.filter(Stadium.price_per_hour <= max_price)
    if has_lighting is not None:
        query = query.filter(Stadium.has_lighting == has_lighting)
    if has_parking is not None:
        query = query.filter(Stadium.has_parking == has_parking)
    if featured:
        query = query.filter(Stadium.is_featured == True)

    stadiums = query.order_by(Stadium.is_featured.desc(), Stadium.rating.desc()).offset(skip).limit(limit).all()
    return stadiums


@router.get("/{slug}", response_model=StadiumResponse)
def get_stadium(slug: str, db: Session = Depends(get_db)):
    stadium = db.query(Stadium).filter(Stadium.slug == slug, Stadium.is_active == True).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")
    return stadium


@router.get("/{stadium_id}/availability")
def get_availability(
    stadium_id: int,
    date: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """Ma'lum kun uchun bo'sh vaqt slotlarini qaytaradi"""
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    # O'sha kun bron qilingan vaqtlar
    bookings = db.query(Booking).filter(
        Booking.stadium_id == stadium_id,
        Booking.date == date,
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending]),
    ).all()

    booked_ranges = [(b.start_time, b.end_time, b.id) for b in bookings]

    # Slotlar yaratish (soatlik)
    slots = []
    open_h, open_m = map(int, stadium.open_time.split(":"))
    close_h, close_m = map(int, stadium.close_time.split(":"))

    for hour in range(open_h, close_h):
        slot_time = f"{hour:02d}:00"
        slot_end = f"{hour+1:02d}:00"
        available = True
        booking_id = None

        for start, end, bid in booked_ranges:
            if start <= slot_time < end:
                available = False
                booking_id = bid
                break

        slots.append(AvailabilitySlot(time=slot_time, available=available, booking_id=booking_id))

    return {"date": date, "stadium_id": stadium_id, "slots": slots}


@router.post("/", response_model=StadiumResponse)
def create_stadium(
    stadium_data: StadiumCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    slug = generate_slug(stadium_data.name)
    # Unique slug
    base_slug = slug
    counter = 1
    while db.query(Stadium).filter(Stadium.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    stadium = Stadium(**stadium_data.model_dump(), slug=slug)
    db.add(stadium)
    db.commit()
    db.refresh(stadium)
    return stadium


@router.put("/{stadium_id}", response_model=StadiumResponse)
def update_stadium(
    stadium_id: int,
    stadium_data: StadiumUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    for field, value in stadium_data.model_dump(exclude_none=True).items():
        setattr(stadium, field, value)

    db.commit()
    db.refresh(stadium)
    return stadium


@router.delete("/{stadium_id}")
def delete_stadium(
    stadium_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")
    stadium.is_active = False
    db.commit()
    return {"message": "Stadion o'chirildi"}
```

---

## `backend/app/api/v1/bookings.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import random
import string
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.booking import Booking, BookingStatus
from app.models.stadium import Stadium
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingStatusUpdate, BookingResponse

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def generate_booking_code() -> str:
    return "AF-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def calculate_price(stadium: Stadium, start_time: str, end_time: str, date: str) -> tuple[int, int]:
    """Narx va soatlar sonini hisoblash"""
    start_h = int(start_time.split(":")[0])
    end_h = int(end_time.split(":")[0])
    duration = end_h - start_h

    # Dam olish kuni
    weekday = datetime.strptime(date, "%Y-%m-%d").weekday()
    is_weekend = weekday in [5, 6]  # Shanba, Yakshanba

    # Kecha (20:00+)
    is_night = start_h >= 20

    if is_weekend and stadium.price_weekend:
        price_per_hour = stadium.price_weekend
    elif is_night and stadium.price_night:
        price_per_hour = stadium.price_night
    else:
        price_per_hour = stadium.price_per_hour

    return price_per_hour * duration, duration


@router.post("/", response_model=BookingResponse)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stadium = db.query(Stadium).filter(
        Stadium.id == booking_data.stadium_id,
        Stadium.is_active == True
    ).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    # Band bo'lganligini tekshirish
    conflict = db.query(Booking).filter(
        Booking.stadium_id == booking_data.stadium_id,
        Booking.date == booking_data.date,
        Booking.status.in_([BookingStatus.confirmed, BookingStatus.pending]),
        Booking.start_time < booking_data.end_time,
        Booking.end_time > booking_data.start_time,
    ).first()

    if conflict:
        raise HTTPException(status_code=409, detail="Bu vaqt allaqachon band qilingan")

    total_price, duration = calculate_price(
        stadium, booking_data.start_time, booking_data.end_time, booking_data.date
    )

    booking = Booking(
        booking_code=generate_booking_code(),
        user_id=current_user.id,
        stadium_id=booking_data.stadium_id,
        date=booking_data.date,
        start_time=booking_data.start_time,
        end_time=booking_data.end_time,
        duration_hours=duration,
        total_price=total_price,
        note=booking_data.note,
    )
    db.add(booking)
    stadium.total_bookings += 1
    db.commit()
    db.refresh(booking)

    return _booking_to_response(booking)


@router.get("/my", response_model=List[BookingResponse])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookings = db.query(Booking).filter(
        Booking.user_id == current_user.id
    ).order_by(Booking.created_at.desc()).all()
    return [_booking_to_response(b) for b in bookings]


@router.get("/{booking_code}", response_model=BookingResponse)
def get_booking(
    booking_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.booking_code == booking_code).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.user_id != current_user.id and current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    return _booking_to_response(booking)


@router.patch("/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Ruxsat yo'q")
    if booking.status not in (BookingStatus.pending, BookingStatus.confirmed):
        raise HTTPException(status_code=400, detail="Bekor qilib bo'lmaydi")

    booking.status = BookingStatus.cancelled
    db.commit()
    return {"message": "Bron bekor qilindi"}


# ─── Admin endpoints ─────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=List[BookingResponse])
def get_all_bookings(
    skip: int = 0,
    limit: int = 50,
    status: str = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    bookings = query.order_by(Booking.created_at.desc()).offset(skip).limit(limit).all()
    return [_booking_to_response(b) for b in bookings]


@router.patch("/admin/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    update_data: BookingStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")

    booking.status = update_data.status
    if update_data.admin_note:
        booking.admin_note = update_data.admin_note
    db.commit()
    return {"message": "Holat yangilandi", "status": update_data.status}


def _booking_to_response(b: Booking) -> BookingResponse:
    return BookingResponse(
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
```

---

## `backend/app/api/v1/uploads.py`

```python
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
from PIL import Image
import aiofiles

from app.core.config import settings
from app.core.dependencies import get_current_admin
from app.core.database import get_db
from app.models.stadium import Stadium
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = settings.MAX_FILE_SIZE_MB * 1024 * 1024


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Faqat JPG, PNG, WEBP ruxsat etilgan")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"Fayl hajmi {settings.MAX_FILE_SIZE_MB}MB dan oshmasligi kerak")

    ext = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    # Rasm o'lchamini kamaytirish
    try:
        img = Image.open(filepath)
        img.thumbnail((1200, 900), Image.LANCZOS)
        img.save(filepath, optimize=True, quality=85)
    except Exception:
        pass

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.post("/stadium/{stadium_id}/images")
async def upload_stadium_images(
    stadium_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stadium = db.query(Stadium).filter(Stadium.id == stadium_id).first()
    if not stadium:
        raise HTTPException(status_code=404, detail="Stadion topilmadi")

    urls = []
    for file in files[:10]:  # Max 10 ta rasm
        if file.content_type not in ALLOWED_TYPES:
            continue
        content = await file.read()
        if len(content) > MAX_SIZE:
            continue

        ext = file.filename.split(".")[-1].lower()
        filename = f"stadium_{stadium_id}_{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(settings.UPLOAD_DIR, filename)

        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)

        try:
            img = Image.open(filepath)
            img.thumbnail((1200, 900), Image.LANCZOS)
            img.save(filepath, optimize=True, quality=85)
        except Exception:
            pass

        url = f"/uploads/{filename}"
        urls.append(url)

    current_images = stadium.images or []
    stadium.images = current_images + urls
    if not stadium.cover_image and urls:
        stadium.cover_image = urls[0]

    db.commit()
    return {"uploaded": urls, "total": len(stadium.images)}
```

---

## `backend/app/api/router.py`

```python
from fastapi import APIRouter
from app.api.v1 import auth, stadiums, bookings, uploads

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(stadiums.router)
api_router.include_router(bookings.router)
api_router.include_router(uploads.router)
```

---

## `backend/seed.py`

```python
"""Boshlang'ich ma'lumotlar - Andijondagi haqiqiy stadionlar"""
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.stadium import Stadium
from app import models  # noqa

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Admin yaratish
admin = db.query(User).filter(User.role == UserRole.admin).first()
if not admin:
    admin = User(
        full_name="Admin",
        phone="+998901234567",
        email="admin@andijanfutbol.uz",
        hashed_password=get_password_hash("Admin123!"),
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    print("✅ Admin yaratildi: +998901234567 / Admin123!")

# Stadionlar
stadions_data = [
    {
        "name": "Green Park Mini Futbol",
        "description": "Andijondagi eng zamonaviy mini futbol maydoni. Sun'iy o'tlar qoplama, chiroq tizimi.",
        "address": "Andijan shahar, Bobur ko'chasi 45",
        "district": "Shaharsozlik",
        "latitude": 40.7821,
        "longitude": 72.3442,
        "phone": "+998901111111",
        "price_per_hour": 150000,
        "price_weekend": 200000,
        "price_night": 180000,
        "width": 25.0,
        "length": 45.0,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_shower": True,
        "has_parking": True,
        "open_time": "07:00",
        "close_time": "24:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": True,
        "rating": 4.8,
    },
    {
        "name": "Sport Arena Andijan",
        "description": "Katta hajmli sport markazi. 2 ta mini futbol maydoni, kiyinish xonalari.",
        "address": "Andijan shahar, Navoi ko'chasi 12",
        "district": "Asaka tumani",
        "latitude": 40.7754,
        "longitude": 72.3521,
        "phone": "+998902222222",
        "price_per_hour": 120000,
        "price_weekend": 160000,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_parking": False,
        "open_time": "08:00",
        "close_time": "23:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": True,
        "rating": 4.5,
    },
    {
        "name": "Champions Field",
        "description": "Professional darajadagi o'yin maydoni. Turnirlar uchun ideal.",
        "address": "Andijan shahar, Mustaqillik ko'chasi 78",
        "district": "Markaziy",
        "latitude": 40.7892,
        "longitude": 72.3398,
        "phone": "+998903333333",
        "telegram": "@championsfield_andijan",
        "price_per_hour": 200000,
        "price_weekend": 250000,
        "price_night": 220000,
        "width": 30.0,
        "length": 50.0,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_shower": True,
        "has_parking": True,
        "has_cafe": True,
        "has_tribunes": True,
        "open_time": "06:00",
        "close_time": "24:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": True,
        "rating": 4.9,
    },
    {
        "name": "Yoshlar Sport Klubi",
        "description": "Yoshlar uchun arzon va qulay mini futbol maydoni.",
        "address": "Andijan shahar, Yosh Gvardiya ko'chasi 5",
        "district": "Yangiqo'rg'on",
        "latitude": 40.7943,
        "longitude": 72.3612,
        "phone": "+998904444444",
        "price_per_hour": 80000,
        "surface": "concrete",
        "has_lighting": True,
        "has_changing_room": False,
        "open_time": "09:00",
        "close_time": "22:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "rating": 4.0,
    },
    {
        "name": "FC Andijan Mini Arena",
        "description": "FC Andijan klubi bilan hamkorlikda qurilgan maydon.",
        "address": "Andijan shahar, Sport majmuasi, 3-bino",
        "district": "Markaziy",
        "latitude": 40.7811,
        "longitude": 72.3468,
        "phone": "+998905555555",
        "phone2": "+998906666666",
        "price_per_hour": 175000,
        "price_weekend": 220000,
        "surface": "artificial",
        "has_lighting": True,
        "has_changing_room": True,
        "has_shower": True,
        "has_parking": True,
        "open_time": "07:00",
        "close_time": "23:00",
        "working_days": [0, 1, 2, 3, 4, 5, 6],
        "is_featured": False,
        "rating": 4.6,
    },
]

import re

def make_slug(name):
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    return slug

for data in stadions_data:
    slug = make_slug(data["name"])
    if not db.query(Stadium).filter(Stadium.slug == slug).first():
        s = Stadium(**data, slug=slug, images=[])
        db.add(s)
        print(f"✅ Stadion qo'shildi: {data['name']}")

db.commit()
db.close()
print("\n🎉 Seed muvaffaqiyatli bajarildi!")
```
