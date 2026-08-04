from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.audit import write_audit
from app.core.database import get_db
from app.core.dependencies import get_current_superadmin
from app.core.ratelimit import rate_limit
from app.models.user import User, UserRole
from app.schemas.common import Page
from app.schemas.user import AdminUserResponse

router = APIRouter(prefix="/admin", tags=["Superadmin"])


class RoleUpdate(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        # Owner assigned here is Telegram-ID based (no login/password — the
        # owners flow at /admin/owners remains for credential-based owners).
        # superadmin stays env-controlled and is never assignable through the API.
        if value not in ("user", "moderator", "owner"):
            raise ValueError("Faqat user, moderator yoki owner roli belgilanadi")
        return value


@router.get("/users", response_model=Page[AdminUserResponse], dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_users(
    q: str | None = None,
    role: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    query = db.query(User)
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(pattern),
                User.phone.ilike(pattern),
                User.telegram_id.ilike(pattern),
                User.owner_login.ilike(pattern),
            )
        )
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=422, detail="Noto'g'ri rol")
    total = query.count()
    items = query.order_by(User.created_at.desc()).offset(skip).limit(min(limit, 100)).all()
    return {"items": items, "total": total}


@router.post("/users/{user_id}/block", response_model=AdminUserResponse, dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def toggle_user_block(
    user_id: int,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.id == superadmin.id:
        raise HTTPException(status_code=400, detail="O'zingizni bloklay olmaysiz")
    if user.role == UserRole.superadmin:
        raise HTTPException(status_code=400, detail="Superadminni bloklab bo'lmaydi")

    user.is_active = not user.is_active
    if not user.is_active:
        # Invalidate every active session of the blocked user immediately,
        # otherwise their JWT keeps working until it expires.
        user.token_version = (user.token_version or 0) + 1
    write_audit(
        db,
        "user_blocked" if not user.is_active else "user_unblocked",
        superadmin,
        "user",
        user.id,
        {"phone": user.phone},
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/role", response_model=AdminUserResponse, dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def set_user_role(
    user_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    superadmin: User = Depends(get_current_superadmin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.id == superadmin.id:
        raise HTTPException(status_code=400, detail="O'z rolingizni o'zgartira olmaysiz")
    if user.role == UserRole.superadmin:
        raise HTTPException(status_code=400, detail="Superadmin rolini o'zgartirib bo'lmaydi")

    new_role = UserRole(data.role)
    if user.role == new_role:
        raise HTTPException(status_code=400, detail="Bu rol allaqachon berilgan")
    if new_role == UserRole.owner and not user.telegram_id:
        # Owner access is Telegram-ID-auth only, so the role is meaningless
        # (and would widen attack surface) on an account with no Telegram link.
        raise HTTPException(status_code=400, detail="Owner rol faqat Telegram ID'ga ulangan foydalanuvchiga beriladi")

    old_role = user.role.value
    user.role = new_role
    # Role lives outside the JWT, but forcing re-login makes the client pick up
    # a clean session and immediately redirects the user to the right area.
    user.token_version = (user.token_version or 0) + 1
    write_audit(db, "role_changed", superadmin, "user", user.id, {"from": old_role, "to": new_role.value})
    db.commit()
    db.refresh(user)
    return user
