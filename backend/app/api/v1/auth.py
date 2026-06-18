from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from app.core.database import get_db
from app.core.analytics import track_event
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.models.user import UserRole
from app.schemas.owner import OwnerChangePassword, OwnerLogin
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
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
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == credentials.phone).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Telefon yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Hisob faol emas")

    token = create_access_token({"sub": str(user.id)})
    track_event(db, "user_login", telegram_id=user.telegram_id, user_id=user.id)
    db.commit()
    return {"access_token": token, "user": user}


@router.post("/owner-login", response_model=TokenResponse)
def owner_login(credentials: OwnerLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.owner_login == credentials.owner_login).first()
    if not user or user.role != UserRole.owner or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Owner hisobi faol emas")

    token = create_access_token({"sub": str(user.id)})
    track_event(db, "owner_login", telegram_id=user.telegram_id, user_id=user.id)
    db.commit()
    return {"access_token": token, "user": user}


@router.post("/owner-change-password", response_model=UserResponse)
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


@router.post("/telegram-auth")
def telegram_auth(
    telegram_id: str,
    username: str,
    full_name: str,
    phone: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Telegram orqali login/register"""
    if phone:
        normalized_phone = phone if phone.startswith("+") else f"+{phone}"
        phone_owner = db.query(User).filter(User.phone == normalized_phone).first()
        if phone_owner and phone_owner.telegram_id and phone_owner.telegram_id != telegram_id:
            raise HTTPException(status_code=400, detail="Bu telefon raqam boshqa Telegram hisobga ulangan")
    else:
        normalized_phone = None

    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user:
        if normalized_phone and phone_owner:
            user = phone_owner
            user.telegram_id = telegram_id
            user.telegram_username = username
            user.full_name = full_name or user.full_name
            db.commit()
            db.refresh(user)
            token = create_access_token({"sub": str(user.id)})
            track_event(db, "miniapp_auth", telegram_id=telegram_id, user_id=user.id)
            db.commit()
            return {"access_token": token, "user": UserResponse.model_validate(user)}

        user = User(
            full_name=full_name,
            phone=normalized_phone,
            hashed_password=get_password_hash(telegram_id + settings.SECRET_KEY),
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

    admin_ids = [i.strip() for i in settings.ADMIN_TELEGRAM_IDS.split(",") if i.strip()]
    if telegram_id in admin_ids and user.role != UserRole.superadmin:
        user.role = UserRole.superadmin
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    track_event(db, "miniapp_auth", telegram_id=telegram_id, user_id=user.id)
    db.commit()
    return {"access_token": token, "user": UserResponse.model_validate(user)}


@router.put("/me", response_model=UserResponse)
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


@router.get("/me", response_model=UserResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user
