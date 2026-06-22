from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from typing import Optional
from pydantic import BaseModel
import hashlib

from app.core.database import get_db, utcnow
from app.core.analytics import track_event
from app.core.audit import write_audit
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.core.telegram import admin_telegram_ids, verify_telegram_init_data
from app.models.user import User
from app.models.user import UserRole
from app.schemas.owner import OwnerChangePassword, OwnerLogin
from app.schemas.user import PrivateUserResponse, UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
from app.core.dependencies import get_current_user
from app.core.ratelimit import rate_limit

router = APIRouter(prefix="/auth", tags=["Auth"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _telegram_password_seed(telegram_id: str) -> str:
    return hashlib.sha256(f"telegram:{telegram_id}:{settings.SECRET_KEY}".encode("utf-8")).hexdigest()


def _check_account_locked(user: User) -> None:
    if user.locked_until and datetime.now(timezone.utc).replace(tzinfo=None) < user.locked_until:
        remaining = int((user.locked_until - utcnow()).total_seconds() // 60)
        raise HTTPException(status_code=423, detail=f"Hisob vaqtincha bloklangan. {remaining} daqiqadan keyin urinib ko'ring")


def _record_failed_attempt(db: Session, user: User) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        user.locked_until = utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def _reset_login_attempts(db: Session, user: User) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()


@router.post("/register", response_model=TokenResponse)
@rate_limit(max_requests=5, window_seconds=300)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")

    user = User(
        full_name=user_data.full_name,
        phone=user_data.phone,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    track_event(db, "user_register", user_id=user.id)
    db.commit()
    return {"access_token": token, "user": user}


@router.post("/login", response_model=TokenResponse)
@rate_limit(max_requests=10, window_seconds=60)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == credentials.phone).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        if user:
            _record_failed_attempt(db, user)
        raise HTTPException(status_code=401, detail="Telefon yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Hisob faol emas")
    _check_account_locked(user)

    _reset_login_attempts(db, user)
    token = create_access_token({"sub": str(user.id)})
    track_event(db, "user_login", telegram_id=user.telegram_id, user_id=user.id)
    db.commit()
    return {"access_token": token, "user": user}


@router.post("/owner-login", response_model=TokenResponse)
@rate_limit(max_requests=10, window_seconds=60)
def owner_login(credentials: OwnerLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.owner_login == credentials.owner_login).first()
    if not user or user.role != UserRole.owner or not verify_password(credentials.password, user.hashed_password):
        if user:
            _record_failed_attempt(db, user)
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Owner hisobi faol emas")
    _check_account_locked(user)

    _reset_login_attempts(db, user)
    token = create_access_token({"sub": str(user.id)})
    track_event(db, "owner_login", telegram_id=user.telegram_id, user_id=user.id)
    db.commit()
    return {"access_token": token, "user": user}


@router.post("/owner-change-password", response_model=PrivateUserResponse)
@rate_limit(max_requests=5, window_seconds=300)
def owner_change_password(
    password_data: OwnerChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Owner huquqi kerak")
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Joriy parol noto'g'ri")

    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)
    return current_user


class TelegramAuthRequest(BaseModel):
    init_data: str
    phone: Optional[str] = None


@router.post("/telegram-auth")
@rate_limit(max_requests=10, window_seconds=60)
def telegram_auth(
    body: TelegramAuthRequest,
    db: Session = Depends(get_db),
):
    """Telegram orqali login/register with server-side initData verification."""
    parsed = verify_telegram_init_data(body.init_data, settings.TELEGRAM_BOT_TOKEN)
    if not parsed:
        raise HTTPException(status_code=401, detail="Telegram ma'lumotlari tasdiqlanmadi")

    user_json = parsed.get("user", "{}")
    try:
        import json
        user_data = json.loads(user_json)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=401, detail="Telegram foydalanuvchi ma'lumoti yaroqsiz")

    telegram_id = str(user_data.get("id", ""))
    username = user_data.get("username", "") or ""
    full_name = user_data.get("first_name", "") or ""
    if user_data.get("last_name"):
        full_name += " " + user_data["last_name"]
    full_name = full_name.strip() or "Foydalanuvchi"

    phone = body.phone

    normalized_phone = None
    phone_owner = None
    if phone:
        normalized_phone = phone if phone.startswith("+") else f"+{phone}"
        phone_owner = db.query(User).filter(User.phone == normalized_phone).first()
        if phone_owner and phone_owner.telegram_id and phone_owner.telegram_id != telegram_id:
            raise HTTPException(status_code=400, detail="Bu telefon raqam boshqa Telegram hisobga ulangan")

    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        if normalized_phone and phone_owner:
            user = phone_owner
            user.telegram_id = telegram_id
            user.telegram_username = username
            user.full_name = full_name or user.full_name
        else:
            user = User(
                full_name=full_name,
                phone=normalized_phone,
                hashed_password=get_password_hash(_telegram_password_seed(telegram_id)),
                telegram_id=telegram_id,
                telegram_username=username,
            )
            db.add(user)
        db.commit()
        db.refresh(user)
    elif normalized_phone and user.phone != normalized_phone:
        if phone_owner and phone_owner.id != user.id:
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")
        user.phone = normalized_phone
        user.telegram_username = username
        user.full_name = full_name or user.full_name
        db.commit()
        db.refresh(user)

    admin_ids = admin_telegram_ids()
    if telegram_id in admin_ids:
        if user.role != UserRole.superadmin:
            user.role = UserRole.superadmin
            write_audit(db, "superadmin_promoted", user, "user", user.id, {"telegram_id": telegram_id})
            track_event(db, "superadmin_promoted", telegram_id=telegram_id, user_id=user.id)
            db.commit()
            db.refresh(user)
    elif user.role == UserRole.superadmin:
        user.role = UserRole.user
        write_audit(db, "superadmin_demoted", user, "user", user.id, {"telegram_id": telegram_id})
        track_event(db, "superadmin_demoted", telegram_id=telegram_id, user_id=user.id)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    track_event(db, "miniapp_auth", telegram_id=telegram_id, user_id=user.id)
    db.commit()
    return {"access_token": token, "user": PrivateUserResponse.model_validate(user)}


@router.put("/me", response_model=PrivateUserResponse)
def update_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.phone is not None:
        existing = db.query(User).filter(User.phone == update_data.phone, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")
        current_user.phone = update_data.phone
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me", response_model=PrivateUserResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user
