import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
from jose import JWTError, jwt

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.migrations import ensure_runtime_schema
from app.api.router import api_router
from app import models

if settings.SENTRY_DSN:
    import sentry_sdk
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("sportly")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Sportly API server")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    try:
        ensure_runtime_schema()
        logger.info("Runtime schema applied")
    except Exception as e:
        logger.warning("Runtime schema migration failed: %s", e)
    yield
    logger.info("Shutting down Sportly API server")


app = FastAPI(
    title="Sportly API",
    version="1.0.0",
    description="Mini futbol stadionlarini bron qilish tizimi",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Telegram-Bot-Api-Secret-Token"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Cache-Control"] = "no-store"
    return response


os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Sportly API ishlamoqda"}


@app.get("/health")
async def health():
    from sqlalchemy import text
    db_ok = False
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        pass
    return {"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "disconnected"}
