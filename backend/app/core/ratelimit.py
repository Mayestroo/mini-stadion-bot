import time
from collections import defaultdict
from functools import wraps
from typing import Callable

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter."""

    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        window_start = now - window_seconds
        self._windows[key] = [t for t in self._windows[key] if t > window_start]
        if len(self._windows[key]) >= max_requests:
            return False
        self._windows[key].append(now)
        return True

    def cleanup(self):
        now = time.time()
        for key in list(self._windows.keys()):
            self._windows[key] = [t for t in self._windows[key] if t > now - 300]
            if not self._windows[key]:
                del self._windows[key]


limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int, window_seconds: int = 60):
    """Decorator for rate limiting endpoints by client IP."""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            request = _find_request(kwargs)
            client_ip = _client_ip(request)
            key = f"{func.__name__}:{client_ip}"
            if not limiter.check(key, max_requests, window_seconds):
                raise HTTPException(
                    status_code=429,
                    detail=f"Juda ko'p so'rov. Iltimos {window_seconds} soniyadan keyin urinib ko'ring",
                )
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            request = _find_request(kwargs)
            client_ip = _client_ip(request)
            key = f"{func.__name__}:{client_ip}"
            if not limiter.check(key, max_requests, window_seconds):
                raise HTTPException(
                    status_code=429,
                    detail=f"Juda ko'p so'rov. Iltimos {window_seconds} soniyadan keyin urinib ko'ring",
                )
            return func(*args, **kwargs)

        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global per-IP rate limiting middleware (optional, applied to all routes)."""

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith(("/api/v1/bot/webhook", "/health", "/")):
            return await call_next(request)

        client_ip = _client_ip(request)
        if not limiter.check(f"global:{client_ip}", self.max_requests, self.window_seconds):
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={"detail": "Juda ko'p so'rov. Iltimos bir ozdan keyin urinib ko'ring"},
            )
        return await call_next(request)


def _find_request(kwargs: dict) -> Request | None:
    for value in kwargs.values():
        if isinstance(value, Request):
            return value
    return None


def _client_ip(request: Request | None) -> str:
    if request:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    return "unknown"


def _is_coroutine(func: Callable) -> bool:
    import inspect
    return inspect.iscoroutinefunction(func)
