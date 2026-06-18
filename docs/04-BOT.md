# 04 — Telegram Bot — To'liq Kod

## Papka Tuzilishi

```
bot/
├── main.py
├── config.py
├── api_client.py
├── requirements.txt
├── Dockerfile
├── handlers/
│   ├── __init__.py
│   ├── start.py
│   ├── stadiums.py
│   ├── booking.py
│   └── admin.py
└── keyboards/
    ├── __init__.py
    ├── main_menu.py
    ├── stadium_menu.py
    └── booking_menu.py
```

---

## `bot/requirements.txt`

```txt
python-telegram-bot==21.3
httpx==0.27.0
python-dotenv==1.0.1
```

---

## `bot/config.py`

```python
from dotenv import load_dotenv
import os

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000") + "/api/v1"
WEBHOOK_URL = os.getenv("TELEGRAM_WEBHOOK_URL", "")
ADMIN_TELEGRAM_IDS = os.getenv("ADMIN_TELEGRAM_IDS", "").split(",")

# Conversation states
(
    CHOOSING_ACTION,
    CHOOSING_STADIUM,
    CHOOSING_DATE,
    CHOOSING_TIME,
    CONFIRMING_BOOKING,
    ENTERING_PHONE,
    ENTERING_NAME,
    ENTERING_PASSWORD,
) = range(8)
```

---

## `bot/api_client.py`

```python
"""Backend API bilan muloqot qiluvchi client"""
import httpx
from typing import Optional
from config import API_URL


async def get_stadiums(search: str = None, limit: int = 10) -> list:
    async with httpx.AsyncClient() as client:
        params = {"limit": limit}
        if search:
            params["search"] = search
        try:
            resp = await client.get(f"{API_URL}/stadiums/", params=params, timeout=10)
            return resp.json() if resp.status_code == 200 else []
        except Exception:
            return []


async def get_stadium(slug: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{API_URL}/stadiums/{slug}", timeout=10)
            return resp.json() if resp.status_code == 200 else None
        except Exception:
            return None


async def get_availability(stadium_id: int, date: str) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{API_URL}/stadiums/{stadium_id}/availability",
                params={"date": date},
                timeout=10,
            )
            return resp.json() if resp.status_code == 200 else {}
        except Exception:
            return {}


async def register_user(full_name: str, phone: str, password: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/auth/register",
                json={"full_name": full_name, "phone": phone, "password": password},
                timeout=10,
            )
            return resp.json() if resp.status_code == 200 else None
        except Exception:
            return None


async def login_user(phone: str, password: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/auth/login",
                json={"phone": phone, "password": password},
                timeout=10,
            )
            return resp.json() if resp.status_code == 200 else None
        except Exception:
            return None


async def telegram_auth(telegram_id: str, username: str, full_name: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/auth/telegram-auth",
                params={"telegram_id": telegram_id, "username": username or "", "full_name": full_name},
                timeout=10,
            )
            return resp.json() if resp.status_code == 200 else None
        except Exception:
            return None


async def create_booking(token: str, data: dict) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/bookings/",
                json=data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 409:
                return {"error": "Bu vaqt allaqachon band"}
            return None
        except Exception:
            return None


async def get_my_bookings(token: str) -> list:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{API_URL}/bookings/my",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            return resp.json() if resp.status_code == 200 else []
        except Exception:
            return []


async def cancel_booking(token: str, booking_id: int) -> bool:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.patch(
                f"{API_URL}/bookings/{booking_id}/cancel",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False


def format_price(amount: int) -> str:
    return f"{amount:,} so'm".replace(",", " ")
```

---

## `bot/keyboards/main_menu.py`

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup


def main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            ["⚽ Stadionlar", "📅 Bron qilish"],
            ["📋 Bronlarim", "👤 Profil"],
            ["📞 Aloqa", "❓ Yordam"],
        ],
        resize_keyboard=True,
        input_field_placeholder="Kerakli bo'limni tanlang...",
    )


def back_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup([["🔙 Orqaga"]], resize_keyboard=True)
```

---

## `bot/keyboards/stadium_menu.py`

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from typing import List


def stadiums_inline(stadiums: List[dict]) -> InlineKeyboardMarkup:
    buttons = []
    for s in stadiums:
        price = f"{s['price_per_hour']:,}".replace(",", " ")
        buttons.append([
            InlineKeyboardButton(
                f"⚽ {s['name']} — {price} so'm/soat",
                callback_data=f"stadium:{s['slug']}",
            )
        ])
    buttons.append([InlineKeyboardButton("🔙 Orqaga", callback_data="back_main")])
    return InlineKeyboardMarkup(buttons)


def stadium_detail_inline(stadium_id: int, slug: str, phone: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("📅 Bron qilish", callback_data=f"book:{stadium_id}")],
        [InlineKeyboardButton(f"📞 {phone}", url=f"tel:{phone}")],
        [InlineKeyboardButton("🗺 Xaritada ko'rish", callback_data=f"map:{stadium_id}")],
        [InlineKeyboardButton("🔙 Orqaga", callback_data="back_stadiums")],
    ])
```

---

## `bot/keyboards/booking_menu.py`

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from typing import List
from datetime import datetime, timedelta


def date_picker_inline() -> InlineKeyboardMarkup:
    """Keyingi 7 kun uchun sana tanlash"""
    today = datetime.now().date()
    buttons = []
    row = []

    for i in range(7):
        date = today + timedelta(days=i)
        day_names = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]
        label = f"{day_names[date.weekday()]} {date.day}/{date.month}"
        row.append(InlineKeyboardButton(label, callback_data=f"date:{date.isoformat()}"))
        if len(row) == 3:
            buttons.append(row)
            row = []

    if row:
        buttons.append(row)
    buttons.append([InlineKeyboardButton("❌ Bekor", callback_data="cancel_booking")])
    return InlineKeyboardMarkup(buttons)


def time_slots_inline(slots: List[dict]) -> InlineKeyboardMarkup:
    """Soatlik vaqt slotlari"""
    buttons = []
    row = []

    for slot in slots:
        if slot["available"]:
            label = f"✅ {slot['time']}"
        else:
            label = f"❌ {slot['time']}"
        row.append(InlineKeyboardButton(label, callback_data=f"slot:{slot['time']}:{int(slot['available'])}"))
        if len(row) == 4:
            buttons.append(row)
            row = []

    if row:
        buttons.append(row)

    buttons.append([
        InlineKeyboardButton("✓ Tasdiqlash", callback_data="confirm_time"),
        InlineKeyboardButton("❌ Bekor", callback_data="cancel_booking"),
    ])
    return InlineKeyboardMarkup(buttons)


def duration_inline() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("1 soat", callback_data="dur:1"),
            InlineKeyboardButton("2 soat", callback_data="dur:2"),
            InlineKeyboardButton("3 soat", callback_data="dur:3"),
        ],
        [InlineKeyboardButton("❌ Bekor", callback_data="cancel_booking")],
    ])


def booking_confirm_inline(price: int) -> InlineKeyboardMarkup:
    formatted = f"{price:,}".replace(",", " ")
    return InlineKeyboardMarkup([
        [InlineKeyboardButton(f"✅ Tasdiqlash — {formatted} so'm", callback_data="confirm_booking")],
        [InlineKeyboardButton("❌ Bekor qilish", callback_data="cancel_booking")],
    ])


def my_bookings_inline(bookings: List[dict]) -> InlineKeyboardMarkup:
    status_icons = {
        "pending": "🟡",
        "confirmed": "🟢",
        "cancelled": "🔴",
        "completed": "✅",
        "no_show": "⚫",
    }
    buttons = []
    for b in bookings[:10]:
        icon = status_icons.get(b["status"], "⚪")
        label = f"{icon} {b['date']} {b['start_time']}–{b['end_time']} | {b['stadium_name'][:20]}"
        buttons.append([InlineKeyboardButton(label, callback_data=f"mybooking:{b['id']}")])

    buttons.append([InlineKeyboardButton("🔙 Orqaga", callback_data="back_main")])
    return InlineKeyboardMarkup(buttons)
```

---

## `bot/handlers/start.py`

```python
from telegram import Update
from telegram.ext import ContextTypes, CommandHandler, MessageHandler, filters, ConversationHandler
from keyboards.main_menu import main_menu_keyboard
from api_client import telegram_auth


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user

    # Telegram orqali avtorizatsiya
    auth_data = await telegram_auth(
        telegram_id=str(user.id),
        username=user.username or "",
        full_name=user.full_name,
    )

    if auth_data and "access_token" in auth_data:
        context.user_data["token"] = auth_data["access_token"]
        context.user_data["user"] = auth_data["user"]

    welcome_text = (
        f"Assalomu alaykum, {user.first_name}! 👋\n\n"
        "🏟 *Andijan Futbol Botiga xush kelibsiz!*\n\n"
        "Bu bot orqali siz:\n"
        "• Andijondagi mini futbol stadionlarini ko'rishingiz\n"
        "• Qulay vaqtni tanlashingiz\n"
        "• Online bron qilishingiz mumkin\n\n"
        "Quyidagi menyudan kerakli bo'limni tanlang 👇"
    )

    await update.message.reply_text(
        welcome_text,
        parse_mode="Markdown",
        reply_markup=main_menu_keyboard(),
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "📖 *Yordam*\n\n"
        "*Komandalar:*\n"
        "/start — Botni qayta ishga tushirish\n"
        "/stadionlar — Barcha stadionlar\n"
        "/bron — Bron qilish\n"
        "/bronlarim — Mening bronlarim\n"
        "/bekor — Bronni bekor qilish\n"
        "/yordam — Shu xabar\n\n"
        "*Aloqa:*\n"
        "📞 +998901234567\n"
        "🌐 andijanfutbol.uz"
    )
    await update.message.reply_text(text, parse_mode="Markdown")


async def contact(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "📞 *Aloqa ma'lumotlari*\n\n"
        "📱 Telefon: +998901234567\n"
        "📧 Email: info@andijanfutbol.uz\n"
        "🌐 Web: andijanfutbol.uz\n"
        "💬 Telegram: @andijanfutbol\n\n"
        "Ish vaqti: 09:00 — 21:00"
    )
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=main_menu_keyboard())
```

---

## `bot/handlers/stadiums.py`

```python
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
from api_client import get_stadiums, get_stadium, format_price
from keyboards.main_menu import main_menu_keyboard
from keyboards.stadium_menu import stadiums_inline, stadium_detail_inline


async def show_stadiums(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Barcha stadionlar ro'yxati"""
    await update.message.reply_text("🔍 Stadionlar yuklanmoqda...")

    stadiums = await get_stadiums(limit=20)

    if not stadiums:
        await update.message.reply_text(
            "😕 Hozircha stadionlar mavjud emas",
            reply_markup=main_menu_keyboard(),
        )
        return

    text = f"🏟 *Andijondagi Mini Futbol Stadionlari*\n_{len(stadiums)} ta topildi_\n\n"
    for i, s in enumerate(stadiums, 1):
        amenities = []
        if s.get("has_lighting"):
            amenities.append("💡")
        if s.get("has_parking"):
            amenities.append("🅿️")
        if s.get("has_shower"):
            amenities.append("🚿")

        text += (
            f"{i}. *{s['name']}*\n"
            f"   📍 {s['address']}\n"
            f"   💰 {format_price(s['price_per_hour'])}/soat\n"
            f"   ⭐ {s['rating']:.1f}"
        )
        if amenities:
            text += f"  {''.join(amenities)}"
        text += "\n\n"

    await update.message.reply_text(
        text,
        parse_mode="Markdown",
        reply_markup=stadiums_inline(stadiums),
    )


async def stadium_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Stadion tanlanganda detail ko'rsatish"""
    query = update.callback_query
    await query.answer()

    slug = query.data.split(":")[1]
    stadium = await get_stadium(slug)

    if not stadium:
        await query.edit_message_text("😕 Stadion topilmadi")
        return

    amenities = []
    if stadium.get("has_lighting"):
        amenities.append("💡 Chiroq")
    if stadium.get("has_changing_room"):
        amenities.append("🚪 Kiyinish xonasi")
    if stadium.get("has_shower"):
        amenities.append("🚿 Dush")
    if stadium.get("has_parking"):
        amenities.append("🅿️ Parking")
    if stadium.get("has_cafe"):
        amenities.append("☕ Kafe")

    text = (
        f"🏟 *{stadium['name']}*\n\n"
        f"📍 *Manzil:* {stadium['address']}\n"
        f"📞 *Telefon:* {stadium['phone']}\n"
        f"💰 *Narx:* {format_price(stadium['price_per_hour'])}/soat\n"
    )

    if stadium.get("price_weekend"):
        text += f"   Dam olish kuni: {format_price(stadium['price_weekend'])}/soat\n"
    if stadium.get("price_night"):
        text += f"   Kechasi (20:00+): {format_price(stadium['price_night'])}/soat\n"

    text += (
        f"\n⏰ *Ish vaqti:* {stadium['open_time']} — {stadium['close_time']}\n"
        f"⭐ *Reyting:* {stadium['rating']:.1f}/5.0\n"
        f"📊 *Jami bronlar:* {stadium['total_bookings']}\n"
    )

    if stadium.get("width") and stadium.get("length"):
        text += f"📐 *Maydon:* {stadium['width']}x{stadium['length']} m\n"

    if amenities:
        text += f"\n🎯 *Imkoniyatlar:*\n" + "\n".join(f"  • {a}" for a in amenities) + "\n"

    if stadium.get("description"):
        text += f"\n📝 {stadium['description']}\n"

    context.user_data["selected_stadium"] = stadium

    await query.edit_message_text(
        text,
        parse_mode="Markdown",
        reply_markup=stadium_detail_inline(stadium["id"], slug, stadium["phone"]),
    )


async def back_to_stadiums(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    stadiums = await get_stadiums()
    text = f"🏟 *Mini Futbol Stadionlari*\n_{len(stadiums)} ta topildi_"
    await query.edit_message_text(
        text,
        parse_mode="Markdown",
        reply_markup=stadiums_inline(stadiums),
    )


async def show_map(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Xaritada joylashuv"""
    query = update.callback_query
    await query.answer()

    data = query.data.split(":")
    stadium_id = int(data[1])

    stadium = context.user_data.get("selected_stadium")
    if not stadium:
        await query.answer("Stadion ma'lumotlari topilmadi", show_alert=True)
        return

    if stadium.get("latitude") and stadium.get("longitude"):
        await context.bot.send_location(
            chat_id=query.message.chat_id,
            latitude=stadium["latitude"],
            longitude=stadium["longitude"],
        )
        await context.bot.send_message(
            chat_id=query.message.chat_id,
            text=f"📍 *{stadium['name']}*\n{stadium['address']}",
            parse_mode="Markdown",
        )
    else:
        await query.answer("Xarita ma'lumotlari mavjud emas", show_alert=True)
```

---

## `bot/handlers/booking.py`

```python
from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler
from datetime import datetime, timedelta
from api_client import (
    get_stadiums, get_availability, create_booking, get_my_bookings,
    cancel_booking, format_price
)
from keyboards.main_menu import main_menu_keyboard
from keyboards.booking_menu import (
    date_picker_inline, time_slots_inline, duration_inline,
    booking_confirm_inline, my_bookings_inline
)
from config import CHOOSING_STADIUM, CHOOSING_DATE, CHOOSING_TIME, CONFIRMING_BOOKING


async def start_booking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bron qilishni boshlash"""
    if not context.user_data.get("token"):
        await update.message.reply_text(
            "⚠️ Bron qilish uchun avval kirish kerak.\n"
            "Bot /start orqali avtomatik ro'yxatdan o'tkazadi.",
            reply_markup=main_menu_keyboard(),
        )
        return

    stadiums = await get_stadiums()
    if not stadiums:
        await update.message.reply_text("😕 Stadionlar topilmadi")
        return

    text = "🏟 *Qaysi stadionni bron qilmoqchisiz?*\n\nStadion tanlang:"
    buttons = []
    for s in stadiums:
        buttons.append([{
            "text": f"{s['name']} — {format_price(s['price_per_hour'])}/soat",
            "callback_data": f"book_select:{s['id']}:{s['slug']}"
        }])

    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    kb = InlineKeyboardMarkup([
        [InlineKeyboardButton(
            f"⚽ {s['name']} — {format_price(s['price_per_hour'])}/soat",
            callback_data=f"book_select:{s['id']}:{s['slug']}"
        )] for s in stadiums
    ])

    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=kb)
    return CHOOSING_STADIUM


async def booking_select_stadium(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    parts = query.data.split(":")
    stadium_id = int(parts[1])
    slug = parts[2]

    context.user_data["booking"] = {"stadium_id": stadium_id, "stadium_slug": slug}

    await query.edit_message_text(
        "📅 *Qaysi kunga bron qilmoqchisiz?*",
        parse_mode="Markdown",
        reply_markup=date_picker_inline(),
    )
    return CHOOSING_DATE


async def booking_select_date(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    date = query.data.split(":")[1]
    context.user_data["booking"]["date"] = date

    stadium_id = context.user_data["booking"]["stadium_id"]
    availability = await get_availability(stadium_id, date)

    if not availability or not availability.get("slots"):
        await query.edit_message_text("😕 Bu kun uchun vaqt slotlari mavjud emas")
        return ConversationHandler.END

    slots = availability["slots"]
    context.user_data["booking"]["slots"] = slots
    context.user_data["booking"]["selected_slots"] = []

    available_count = sum(1 for s in slots if s["available"])
    text = (
        f"⏰ *Vaqt tanlang*\n"
        f"📅 Sana: {date}\n"
        f"✅ Bo'sh slotlar: {available_count} ta\n\n"
        "Boshlanish vaqtini tanlang:"
    )

    await query.edit_message_text(
        text, parse_mode="Markdown",
        reply_markup=time_slots_inline(slots),
    )
    return CHOOSING_TIME


async def booking_select_slot(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    parts = query.data.split(":")
    slot_time = parts[1]
    is_available = parts[2] == "1"

    if not is_available:
        await query.answer("❌ Bu vaqt band qilingan!", show_alert=True)
        return CHOOSING_TIME

    await query.answer(f"✅ {slot_time} tanlandi")

    booking = context.user_data["booking"]
    if not booking.get("start_time"):
        booking["start_time"] = slot_time
        await query.edit_message_text(
            f"⏰ Boshlanish: *{slot_time}*\n\nNeча soat o'ynaysiz?",
            parse_mode="Markdown",
            reply_markup=duration_inline(),
        )
    return CHOOSING_TIME


async def booking_select_duration(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    duration = int(query.data.split(":")[1])
    booking = context.user_data["booking"]
    start_h, start_m = map(int, booking["start_time"].split(":"))
    end_h = start_h + duration
    booking["end_time"] = f"{end_h:02d}:00"
    booking["duration"] = duration

    # Narx hisoblash (oddiy versiya)
    # Haqiqiy narx backend'dan keladi
    await query.edit_message_text(
        f"📋 *Bron ma'lumotlari*\n\n"
        f"📅 Sana: {booking['date']}\n"
        f"⏰ Vaqt: {booking['start_time']} — {booking['end_time']}\n"
        f"⏱ Muddat: {duration} soat\n\n"
        "Bron qilishni tasdiqlaysizmi?",
        parse_mode="Markdown",
        reply_markup=booking_confirm_inline(0),
    )
    return CONFIRMING_BOOKING


async def confirm_booking(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    booking = context.user_data.get("booking", {})
    token = context.user_data.get("token")

    result = await create_booking(token, {
        "stadium_id": booking["stadium_id"],
        "date": booking["date"],
        "start_time": booking["start_time"],
        "end_time": booking["end_time"],
    })

    if result and not result.get("error"):
        text = (
            f"🎉 *Bron muvaffaqiyatli yaratildi!*\n\n"
            f"🔖 Kod: `{result['booking_code']}`\n"
            f"📅 Sana: {result['date']}\n"
            f"⏰ Vaqt: {result['start_time']} — {result['end_time']}\n"
            f"💰 Narx: {format_price(result['total_price'])}\n"
            f"📊 Holat: ⏳ Kutilmoqda\n\n"
            "Administrator tez orada tasdiqlaydi."
        )
        await query.edit_message_text(text, parse_mode="Markdown")
    else:
        error_msg = result.get("error", "Xatolik yuz berdi") if result else "Server bilan aloqa yo'q"
        await query.edit_message_text(
            f"❌ *Xatolik:* {error_msg}\n\nQaytadan urinib ko'ring.",
            parse_mode="Markdown",
        )

    context.user_data.pop("booking", None)
    return ConversationHandler.END


async def cancel_booking_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer("❌ Bekor qilindi")
    context.user_data.pop("booking", None)
    await query.edit_message_text("❌ Bron bekor qilindi")
    return ConversationHandler.END


async def my_bookings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchining bronlari"""
    token = context.user_data.get("token")
    if not token:
        await update.message.reply_text("⚠️ Iltimos, /start orqali kirng")
        return

    bookings = await get_my_bookings(token)

    if not bookings:
        await update.message.reply_text(
            "📋 Sizda hali bron yo'q.\n\n"
            "Bron qilish uchun «📅 Bron qilish» tugmasini bosing.",
            reply_markup=main_menu_keyboard(),
        )
        return

    status_icons = {
        "pending": "⏳",
        "confirmed": "✅",
        "cancelled": "❌",
        "completed": "🏁",
        "no_show": "⚫",
    }
    status_labels = {
        "pending": "Kutilmoqda",
        "confirmed": "Tasdiqlangan",
        "cancelled": "Bekor qilingan",
        "completed": "Tugallangan",
        "no_show": "Kelmadi",
    }

    text = f"📋 *Sizning bronlaringiz* ({len(bookings)} ta)\n\n"
    for b in bookings[:5]:
        icon = status_icons.get(b["status"], "⚪")
        label = status_labels.get(b["status"], b["status"])
        text += (
            f"{icon} *{b['stadium_name']}*\n"
            f"   📅 {b['date']} | ⏰ {b['start_time']}–{b['end_time']}\n"
            f"   💰 {format_price(b['total_price'])} | {label}\n"
            f"   🔖 `{b['booking_code']}`\n\n"
        )

    await update.message.reply_text(
        text,
        parse_mode="Markdown",
        reply_markup=my_bookings_inline(bookings),
    )
```

---

## `bot/handlers/admin.py`

```python
"""Admin funksiyalari (faqat admin telegram ID lari uchun)"""
from telegram import Update
from telegram.ext import ContextTypes
import httpx
from config import API_URL, ADMIN_TELEGRAM_IDS


def is_admin(user_id: int) -> bool:
    return str(user_id) in ADMIN_TELEGRAM_IDS


async def admin_pending_bookings(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id):
        await update.message.reply_text("❌ Ruxsat yo'q")
        return

    token = context.user_data.get("token")
    if not token:
        await update.message.reply_text("Iltimos /start orqali kiring")
        return

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_URL}/bookings/admin/all",
            params={"status": "pending", "limit": 20},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )

    if resp.status_code != 200:
        await update.message.reply_text("❌ Ma'lumot olishda xatolik")
        return

    bookings = resp.json()
    if not bookings:
        await update.message.reply_text("✅ Kutilayotgan bronlar yo'q")
        return

    from telegram import InlineKeyboardButton, InlineKeyboardMarkup

    for b in bookings[:10]:
        text = (
            f"🆕 *Yangi bron*\n\n"
            f"🔖 Kod: `{b['booking_code']}`\n"
            f"👤 {b['user_name']} | 📞 {b['user_phone']}\n"
            f"🏟 {b['stadium_name']}\n"
            f"📅 {b['date']} | ⏰ {b['start_time']}–{b['end_time']}\n"
            f"💰 {b['total_price']:,} so'm\n"
        )
        if b.get("note"):
            text += f"📝 {b['note']}\n"

        kb = InlineKeyboardMarkup([
            [
                InlineKeyboardButton("✅ Tasdiqlash", callback_data=f"admin_confirm:{b['id']}"),
                InlineKeyboardButton("❌ Bekor", callback_data=f"admin_cancel:{b['id']}"),
            ]
        ])
        await update.message.reply_text(text, parse_mode="Markdown", reply_markup=kb)


async def admin_booking_action(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if not is_admin(query.from_user.id):
        await query.answer("❌ Ruxsat yo'q", show_alert=True)
        return

    parts = query.data.split(":")
    action = parts[0]
    booking_id = int(parts[1])
    token = context.user_data.get("token")

    status = "confirmed" if action == "admin_confirm" else "cancelled"

    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{API_URL}/bookings/admin/{booking_id}/status",
            json={"status": status},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )

    if resp.status_code == 200:
        icon = "✅" if status == "confirmed" else "❌"
        label = "tasdiqlandi" if status == "confirmed" else "bekor qilindi"
        await query.edit_message_text(
            f"{icon} Bron #{booking_id} {label}",
            parse_mode="Markdown",
        )
    else:
        await query.answer("❌ Xatolik yuz berdi", show_alert=True)
```

---

## `bot/main.py`

```python
import logging
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    filters,
)

from config import BOT_TOKEN, CHOOSING_STADIUM, CHOOSING_DATE, CHOOSING_TIME, CONFIRMING_BOOKING
from handlers.start import start, help_command, contact
from handlers.stadiums import (
    show_stadiums, stadium_callback, back_to_stadiums, show_map
)
from handlers.booking import (
    start_booking, booking_select_stadium, booking_select_date,
    booking_select_slot, booking_select_duration, confirm_booking,
    cancel_booking_callback, my_bookings
)
from handlers.admin import admin_pending_bookings, admin_booking_action

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def main():
    app = Application.builder().token(BOT_TOKEN).build()

    # Bron qilish conversation
    booking_conv = ConversationHandler(
        entry_points=[
            MessageHandler(filters.Regex("^📅 Bron qilish$"), start_booking),
            CommandHandler("bron", start_booking),
        ],
        states={
            CHOOSING_STADIUM: [CallbackQueryHandler(booking_select_stadium, pattern="^book_select:")],
            CHOOSING_DATE: [CallbackQueryHandler(booking_select_date, pattern="^date:")],
            CHOOSING_TIME: [
                CallbackQueryHandler(booking_select_slot, pattern="^slot:"),
                CallbackQueryHandler(booking_select_duration, pattern="^dur:"),
            ],
            CONFIRMING_BOOKING: [
                CallbackQueryHandler(confirm_booking, pattern="^confirm_booking$"),
            ],
        },
        fallbacks=[
            CallbackQueryHandler(cancel_booking_callback, pattern="^cancel_booking$"),
            CommandHandler("start", start),
        ],
        allow_reentry=True,
    )

    # Komandalar
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("yordam", help_command))
    app.add_handler(CommandHandler("stadionlar", show_stadiums))
    app.add_handler(CommandHandler("bronlarim", my_bookings))
    app.add_handler(CommandHandler("admin_bronlar", admin_pending_bookings))

    # Menyu tugmalari
    app.add_handler(MessageHandler(filters.Regex("^⚽ Stadionlar$"), show_stadiums))
    app.add_handler(MessageHandler(filters.Regex("^📋 Bronlarim$"), my_bookings))
    app.add_handler(MessageHandler(filters.Regex("^📞 Aloqa$"), contact))
    app.add_handler(MessageHandler(filters.Regex("^❓ Yordam$"), help_command))

    # Bron qilish
    app.add_handler(booking_conv)

    # Callback handlers
    app.add_handler(CallbackQueryHandler(stadium_callback, pattern="^stadium:"))
    app.add_handler(CallbackQueryHandler(back_to_stadiums, pattern="^back_stadiums$"))
    app.add_handler(CallbackQueryHandler(show_map, pattern="^map:"))
    app.add_handler(CallbackQueryHandler(admin_booking_action, pattern="^admin_(confirm|cancel):"))

    logger.info("🤖 Bot ishga tushdi...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
```
