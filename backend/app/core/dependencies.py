from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db, utcnow
from app.core.security import decode_token
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else access_token
    if not token:
        raise HTTPException(status_code=401, detail="Token kerak")

    payload = decode_token(token)
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
    if user.locked_until and datetime.now(timezone.utc).replace(tzinfo=None) < user.locked_until:
        remaining = int((user.locked_until - utcnow()).total_seconds() // 60)
        raise HTTPException(status_code=423, detail=f"Hisob vaqtincha bloklangan. {remaining} daqiqadan keyin urinib ko'ring")

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.moderator, UserRole.superadmin):
        raise HTTPException(status_code=403, detail="Moderator huquqi kerak")
    return current_user


def get_current_owner(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="Owner huquqi kerak")
    return current_user


def get_current_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.superadmin:
        raise HTTPException(status_code=403, detail="Superadmin huquqi kerak")
    return current_user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not credentials and not access_token:
        return None
    try:
        return get_current_user(credentials, access_token, db)
    except HTTPException:
        return None
