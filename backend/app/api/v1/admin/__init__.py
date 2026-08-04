from fastapi import APIRouter

from app.api.v1.admin import audit, broadcasts, export, moderation, owners, settings, statistics, users

router = APIRouter()

router.include_router(audit.router)
router.include_router(broadcasts.router)
router.include_router(export.router)
router.include_router(moderation.router)
router.include_router(owners.router)
router.include_router(settings.router)
router.include_router(statistics.router)
router.include_router(users.router)
