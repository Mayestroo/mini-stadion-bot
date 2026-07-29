from fastapi import APIRouter, Depends, HTTPException, Header, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update, WebAppInfo

from app.core.database import SessionLocal, get_db
from app.core.analytics import track_event
from app.core.config import settings
from app.services.notifications import notify_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.notification import NotificationType
from app.schemas.booking import BookingResponse

router = APIRouter(prefix="/bot", tags=["Bot Internal"])


def _build_mini_app_url(user) -> str:
    username = user.username or ""
    full_name = f"{user.first_name} {user.last_name or ''}".strip()
    return f"{settings.MINI_APP_URL}?tg_id={user.id}&username={username}&full_name={full_name}"


async def _send_mini_app_entry(bot: Bot, chat_id: int, user) -> None:
    webapp_url = _build_mini_app_url(user)
    text = (
        f"Assalomu alaykum, {user.first_name}! 👋\n\n"
        "🏟 *Sportly* — mini futbol stadionlarini "
        "topish va bron qilish uchun qulay platforma.\n\n"
        "Quyidagi tugmani bosib Mini Appni oching 👇"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("⚽ Sportly ochish", web_app=WebAppInfo(url=webapp_url))]
    ])
    await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown", reply_markup=keyboard)


async def _send_help(bot: Bot, chat_id: int, user) -> None:
    webapp_url = _build_mini_app_url(user)
    text = (
        "📖 *Yordam*\n\n"
        "Mini App orqali siz:\n"
        "• Stadionlarni ko'rishingiz\n"
        "• Bron qilishingiz\n"
        "• Bronlaringizni kuzatishingiz mumkin\n\n"
        "*Komandalar:*\n"
        "/start — Mini Appni ochish\n"
        "/yordam — Yordam"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("⚽ Ochish", web_app=WebAppInfo(url=webapp_url))]
    ])
    await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown", reply_markup=keyboard)


def _process_booking_confirm(booking_id: int, telegram_user_id: int) -> str:
    db = SessionLocal()
    try:
        owner = db.query(User).filter(User.telegram_id == str(telegram_user_id)).first()
        booking = db.query(Booking).options(joinedload(Booking.stadium), joinedload(Booking.user)).filter(Booking.id == booking_id).first()
        if not owner or not booking or not booking.stadium.owner_id == owner.id:
            return "forbidden"
        if booking.status != BookingStatus.pending:
            return "not_pending"
        booking.status = BookingStatus.confirmed
        notify_user(
            db,
            booking.user,
            "✅ Bron tasdiqlandi",
            f"Kod: {booking.booking_code}\n"
            f"Stadion: {booking.stadium.name}\n"
            f"Sana: {booking.date}\n"
            f"Vaqt: {booking.start_time}-{booking.end_time}",
            NotificationType.booking,
        )
        track_event(db, "telegram_booking_confirmed", telegram_id=telegram_user_id, user_id=owner.id, metadata={"booking_id": booking.id})
        db.commit()
        return "confirmed"
    finally:
        db.close()


def _track_bot_event(event: str, telegram_id: int, metadata: dict | None = None) -> None:
    db = SessionLocal()
    try:
        track_event(db, event, telegram_id=telegram_id, metadata=metadata)
        db.commit()
    finally:
        db.close()


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(None),
):
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot token is not configured")

    if settings.TELEGRAM_WEBHOOK_SECRET and x_telegram_bot_api_secret_token != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    bot = Bot(settings.TELEGRAM_BOT_TOKEN)
    update = Update.de_json(await request.json(), bot)
    message = update.effective_message
    user = update.effective_user
    chat = update.effective_chat

    if update.callback_query and user:
        query = update.callback_query
        data = query.data or ""
        if data.startswith("confirm_booking:"):
            booking_id = int(data.split(":", 1)[1])
            result = await run_in_threadpool(_process_booking_confirm, booking_id, user.id)
            if result == "forbidden":
                await query.answer("Ruxsat yo'q", show_alert=True)
                return {"ok": True}
            if result == "not_pending":
                await query.answer("Bu bron pending emas", show_alert=True)
                return {"ok": True}
            await query.answer("Bron tasdiqlandi")
            await query.edit_message_reply_markup(reply_markup=None)
        return {"ok": True}

    if not message or not user or not chat:
        return {"ok": True}

    text = message.text or ""
    if text.startswith("/start"):
        await run_in_threadpool(_track_bot_event, "bot_start", user.id, {"username": user.username or ""})
        await _send_mini_app_entry(bot, chat.id, user)
    elif text.startswith("/help") or text.startswith("/yordam") or text == "❓ Yordam":
        await run_in_threadpool(_track_bot_event, "bot_help", user.id)
        await _send_help(bot, chat.id, user)
    elif text == "📞 Aloqa":
        await run_in_threadpool(_track_bot_event, "bot_contact", user.id)
        await bot.send_message(
            chat_id=chat.id,
            text=(
                "📞 *Aloqa ma'lumotlari*\n\n"
                f"🌐 Web: {settings.CONTACT_WEBSITE}\n"
                f"💬 Telegram: {settings.CONTACT_TELEGRAM}"
            ),
            parse_mode="Markdown",
        )

    return {"ok": True}


@router.post("/set-webhook")
async def set_telegram_webhook(authorization: str = Header(None)):
    if authorization != f"Bearer {settings.BOT_API_SECRET}":
        raise HTTPException(status_code=403, detail="Forbidden")
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_WEBHOOK_URL:
        raise HTTPException(status_code=400, detail="Telegram token or webhook URL is not configured")

    bot = Bot(settings.TELEGRAM_BOT_TOKEN)
    await bot.set_webhook(
        url=settings.TELEGRAM_WEBHOOK_URL,
        secret_token=settings.TELEGRAM_WEBHOOK_SECRET or None,
        allowed_updates=["message", "callback_query"],
    )
    return {"ok": True, "webhook_url": settings.TELEGRAM_WEBHOOK_URL}


class SavePhoneRequest(BaseModel):
    telegram_id: int
    phone: str
    full_name: str = ""


@router.post("/save-phone")
def save_phone(
    data: SavePhoneRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if authorization != f"Bearer {settings.BOT_API_SECRET}":
        raise HTTPException(status_code=403, detail="Forbidden")

    telegram_id = str(data.telegram_id)
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            full_name=data.full_name or "Foydalanuvchi",
            hashed_password="",
            phone=data.phone,
        )
        db.add(user)
        track_event(db, "bot_save_phone", telegram_id=telegram_id, metadata={"created_user": True})
        db.commit()
        db.refresh(user)
        return {"status": "created", "phone": data.phone}

    existing = db.query(User).filter(User.phone == data.phone, User.id != user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu telefon raqam boshqa foydalanuvchiga tegishli")

    user.phone = data.phone
    track_event(db, "bot_save_phone", telegram_id=telegram_id, user_id=user.id)
    db.commit()
    return {"status": "ok", "phone": data.phone}


class BotBookingAction(BaseModel):
    booking_id: int
    status: str


@router.get("/pending-bookings")
def bot_pending_bookings(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if authorization != f"Bearer {settings.BOT_API_SECRET}":
        raise HTTPException(status_code=403, detail="Forbidden")

    bookings = db.query(Booking).options(
        joinedload(Booking.stadium), joinedload(Booking.user)
    ).filter(
        Booking.status == BookingStatus.pending
    ).order_by(Booking.created_at.desc()).limit(20).all()

    return [BookingResponse.from_model(b) for b in bookings]


@router.patch("/booking-status")
def bot_update_booking_status(
    data: BotBookingAction,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if authorization != f"Bearer {settings.BOT_API_SECRET}":
        raise HTTPException(status_code=403, detail="Forbidden")

    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Bron topilmadi")

    valid = {"pending", "confirmed", "cancelled", "completed", "no_show"}
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status '{data.status}' noto'g'ri")

    booking.status = data.status
    db.commit()
    return {"message": "Holat yangilandi", "status": data.status}
