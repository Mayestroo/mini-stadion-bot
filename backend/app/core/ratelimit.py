import ipaddress
import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request


class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter.

    Per-process: limits reset on restart and are not shared between
    containers/workers. Sufficient for the current single-replica
    deployment; move to Redis if the API is ever scaled out.
    """

    def __init__(self):
        self._windows: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._check_count = 0

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        with self._lock:
            self._check_count += 1
            if self._check_count >= 100:
                self._check_count = 0
                self.cleanup()
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


def _client_ip(request: Request) -> str:
    """Resolve the client IP.

    X-Forwarded-For is only trusted when the direct peer is a
    loopback/private address (i.e. our reverse proxy). Otherwise a client
    could rotate the header and reset its own bucket.
    """
    peer = request.client.host if request.client else "unknown"
    try:
        trusted_proxy = ipaddress.ip_address(peer).is_private or ipaddress.ip_address(peer).is_loopback
    except ValueError:
        # Non-IP peer names (e.g. FastAPI TestClient's "testclient")
        trusted_proxy = True
    if trusted_proxy:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first
    return peer


def rate_limit(max_requests: int, window_seconds: int = 60):
    """FastAPI dependency factory: per-endpoint, per-client-IP rate limit.

    Usage:
        @router.post("/login", dependencies=[Depends(rate_limit(10, 60))])
    """
    def dependency(request: Request) -> None:
        route = request.scope.get("route")
        endpoint_key = getattr(route, "path", request.url.path)
        key = f"{endpoint_key}:{_client_ip(request)}"
        if not limiter.check(key, max_requests, window_seconds):
            raise HTTPException(
                status_code=429,
                detail=f"Juda ko'p so'rov. Iltimos {window_seconds} soniyadan keyin urinib ko'ring",
            )

    return dependency
