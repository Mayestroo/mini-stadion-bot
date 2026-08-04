"""Maintenance-mode gate driven by the `maintenance_mode` runtime setting.

When enabled, API endpoints become unavailable (503) for everyone except
admin surfaces and infrastructure calls. The flag is cached briefly so
requests don't each hit the database; settings PATCH invalidates the cache.
"""
import time

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.database import SessionLocal
from app.core.settings import get_setting_bool

_CACHE_TTL_SECONDS = 10
_cache: tuple[float, bool] | None = None

# Paths that must keep working during maintenance: admin console, login (so
# admins can get in), bot/worker comms, and health checks.
_ALLOWED_PREFIXES = (
    "/health",
    "/docs",
    "/openapi",
    "/api/v1/auth/",
    "/api/v1/admin/",
    "/api/v1/bot/",
)


def _is_allowed(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in _ALLOWED_PREFIXES)


def invalidate_maintenance_cache() -> None:
    global _cache
    _cache = None


def _maintenance_enabled() -> bool:
    global _cache
    now = time.monotonic()
    if _cache and now - _cache[0] < _CACHE_TTL_SECONDS:
        return _cache[1]
    try:
        db = SessionLocal()
        try:
            enabled = get_setting_bool(db, "maintenance_mode")
        finally:
            db.close()
    except Exception:
        # If the flag can't be read (e.g. DB itself is down), fail open — the
        # endpoints will surface the real DB errors individually.
        enabled = False
    _cache = (now, enabled)
    return enabled


async def maintenance_middleware(request: Request, call_next):
    path = request.url.path
    if request.method == "OPTIONS" or not path.startswith("/api/") or _is_allowed(path):
        return await call_next(request)
    if _maintenance_enabled():
        return JSONResponse(
            {"detail": "Tizimda texnik ishlar olib borilmoqda. Birozdan so'ng urinib ko'ring."},
            status_code=503,
        )
    return await call_next(request)
