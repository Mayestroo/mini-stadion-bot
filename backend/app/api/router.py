from fastapi import APIRouter
from app.api.v1 import admin, auth, bookings, bot, notifications, owner, stadiums, trainings, uploads

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(stadiums.router)
api_router.include_router(trainings.router)
api_router.include_router(bookings.router)
api_router.include_router(uploads.router)
api_router.include_router(bot.router)
api_router.include_router(notifications.router)
api_router.include_router(owner.router)
api_router.include_router(admin.router)
