from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.audit import write_audit
from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.core.ratelimit import rate_limit
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.owner import OwnerCreate, OwnerUpdate
from app.schemas.user import AdminUserResponse

router = APIRouter(prefix="/admin", tags=["Superadmin"])


@router.get("/owners", response_model=List[AdminUserResponse])
def get_owners(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    return db.query(User).filter(User.role == UserRole.owner).order_by(User.created_at.desc()).offset(skip).limit(min(limit, 100)).all()


@router.post("/owners", response_model=AdminUserResponse, dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def create_owner(
    owner_data: OwnerCreate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    existing_user = db.query(User).filter(User.telegram_id == owner_data.telegram_id).first()
    if existing_user and existing_user.role not in {UserRole.user, UserRole.guest}:
        raise HTTPException(status_code=400, detail="Bu Telegram ID allaqachon owner yoki admin hisobga bog'langan")

    owner_login_query = db.query(User).filter(User.owner_login == owner_data.owner_login)
    if existing_user:
        owner_login_query = owner_login_query.filter(User.id != existing_user.id)
    if owner_login_query.first():
        raise HTTPException(status_code=400, detail="Bu owner login allaqachon ishlatilgan")

    phone_query = db.query(User).filter(User.phone == owner_data.phone)
    if existing_user:
        phone_query = phone_query.filter(User.id != existing_user.id)
    if owner_data.phone and phone_query.first():
        raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ishlatilgan")

    if existing_user:
        existing_user.full_name = owner_data.full_name
        existing_user.owner_login = owner_data.owner_login
        existing_user.hashed_password = get_password_hash(owner_data.temporary_password)
        existing_user.role = UserRole.owner
        existing_user.must_change_password = True
        if owner_data.phone:
            existing_user.phone = owner_data.phone
        write_audit(db, "owner_upgraded", superadmin, "user", existing_user.id, {"owner_login": owner_data.owner_login})
        db.commit()
        db.refresh(existing_user)
        return existing_user

    owner = User(
        full_name=owner_data.full_name,
        telegram_id=owner_data.telegram_id,
        owner_login=owner_data.owner_login,
        phone=owner_data.phone,
        hashed_password=get_password_hash(owner_data.temporary_password),
        role=UserRole.owner,
        must_change_password=True,
    )
    db.add(owner)
    write_audit(db, "owner_created", superadmin, "user", None, {"owner_login": owner_data.owner_login})
    db.commit()
    db.refresh(owner)
    return owner


@router.patch("/owners/{owner_id}", response_model=AdminUserResponse, dependencies=[Depends(rate_limit(max_requests=30, window_seconds=60))])
def update_owner(
    owner_id: int,
    owner_data: OwnerUpdate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    owner = db.query(User).filter(User.id == owner_id, User.role == UserRole.owner).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner topilmadi")

    for field in ["full_name", "telegram_id", "owner_login", "phone", "is_active"]:
        value = getattr(owner_data, field)
        if value is not None:
            existing = None
            if field in {"telegram_id", "owner_login", "phone"}:
                existing = db.query(User).filter(getattr(User, field) == value, User.id != owner.id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Bu {field} allaqachon ishlatilgan")
            setattr(owner, field, value)
    if owner_data.temporary_password:
        if not verify_password(owner_data.temporary_password, owner.hashed_password):
            owner.hashed_password = get_password_hash(owner_data.temporary_password)
            owner.must_change_password = True
            # Invalidate all sessions issued before the password reset.
            owner.token_version = (owner.token_version or 0) + 1

    write_audit(db, "owner_updated", superadmin, "user", owner.id, owner_data.model_dump(exclude_none=True, exclude={"temporary_password"}))
    db.commit()
    db.refresh(owner)
    return owner
