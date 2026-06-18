# Telegram Mini App — Andijan Futbol

> **Date:** 2026-06-13
> **Stack:** Next.js 14 · FastAPI · python-telegram-bot
> **Tunnel:** jprq.io (HTTPS)

## 1. Maqsad

Hozirgi Python Telegram bot (inline keyboard conversation) ni **Telegram Mini App** ga almashtirish. Bot faqat Mini App ni ochuvchi tugma sifatida qoladi, barcha funksional frontend orqali ishlaydi.

## 2. Arxitektura

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Telegram      │────▶│  Bot (main)  │────▶│  WebApp tugma   │
│   Foydalanuvchi │     │  /start      │     │  (ReplyKeyboard)│
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────┐
                                           │  jprq.io tunnel   │
                                           │  (HTTPS)          │
                                           └────────┬─────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────┐
                                           │  Next.js /miniapp │
                                           │  Telegram WebApp  │
                                           │  SDK + auth       │
                                           └────────┬─────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────┐
                                           │  FastAPI Backend  │
                                           │  api/v1/*         │
                                           └──────────────────┘
```

### 2.1 Auth oqimi

1. Bot `/start` → `WebApp` tugma yuboradi
2. Tugma bosiladi → Telegram `https://<jprq>.jprq.io/miniapp` ni ochadi
3. Frontend `window.Telegram.WebApp.initDataUnsafe.user` ni o'qiydi
4. `POST /api/v1/auth/telegram-auth?telegram_id=...&username=...&full_name=...`
5. Backend JWT token qaytaradi, frontend `localStorage` ga saqlaydi
6. Barcha API call lar `Authorization: Bearer <token>` bilan

### 2.2 Routing

| Route | Sahifa |
|-------|--------|
| `/miniapp` | Bosh menyu (4 ta karta) |
| `/miniapp/stadiums` | Stadionlar ro'yxati |
| `/miniapp/stadiums/[slug]` | Stadion detail + bron |
| `/miniapp/bookings` | Mening bronlarim |
| `/miniapp/profile` | Profil |

## 3. Frontend

### 3.1 TelegramProvider

Global provider, `useEffect` da `Telegram.WebApp.ready()` chaqiradi. `useTelegram()` hook orqali quyidagilarni beradi:

- `user` — Telegram user object
- `theme` — color scheme (light/dark)
- `ready` — SDK tayyorligi
- `close()` — appni yopish
- `showAlert(msg)` — native alert

### 3.2 MiniAppLayout

Bottom navbar bilan mobil-first layout:

```
┌─────────────────────┐
│  Header (orqa str.) │
│                     │
│   Content           │
│                     │
│                     │
├─────────────────────┤
│ 🏟  📅  👤          │
│ Stad Bron Profil    │
└─────────────────────┘
```

3 tab: Stadiums, Bookings, Profile.

### 3.3 Sahifalar

**Bosh menyu** (`/miniapp`): 4 ta katta karta — Stadionlar, Bron qilish, Bronlarim, Profil.

**Stadionlar** (`/miniapp/stadiums`): Qidiruv input + karta grid/lista. Har bir kartada nom, narx, manzil, reyting.

**Stadion detail** (`/miniapp/stadiums/[slug]`): Rasm, ma'lumot, imkoniyatlar, sana tanlash, vaqt slotlari, bron tugmasi.

**Bronlarim** (`/miniapp/bookings`): Status bilan bronlar ro'yxati.

**Profil** (`/miniapp/profile`): Telegram ma'lumotlari, chiqish.

### 3.4 Telegram SDK integratsiyasi

Package: `@twa-dev/sdk` yoki global `window.Telegram.WebApp`

```ts
// hooks/useTelegram.ts
export function useTelegram() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null
  return {
    user: tg?.initDataUnsafe?.user,
    theme: tg?.colorScheme ?? 'light',
    ready: () => tg?.ready(),
    close: () => tg?.close(),
    showAlert: (msg: string) => tg?.showAlert(msg),
  }
}
```

## 4. Bot o'zgarishlari

### 4.1 O'chiriladigan kod

- `handlers/booking.py` — butunlay o'chadi (start_booking, booking_select_stadium, booking_select_date, booking_select_slot, booking_select_duration, confirm_booking, cancel_booking_callback)
- `handlers/stadiums.py` — show_stadiums, stadium_callback, back_to_stadiums, show_map o'chadi
- `keyboards/booking_menu.py`, `keyboards/stadium_menu.py` — o'chadi
- `main.py` — ConversationHandler, CallbackQueryHandler lar o'chadi

### 4.2 Yangi kod

- `/start` → `WebAppInfo` bilan `ReplyKeyboardMarkup` yuboradi
- `/help`, `/yordam` — saqlanadi
- `admin_bronlar`, `admin_booking_action` — saqlanadi (admin bildirishnomalari)

```python
from telegram import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup

async def start(update, context):
    kb = ReplyKeyboardMarkup([
        [KeyboardButton("⚽ Andijan Futbol", web_app=WebAppInfo(url=MiniApp_URL))]
    ], resize_keyboard=True)
    await update.message.reply_text("Assalomu alaykum! Boshlash uchun tugmani bosing 👇", reply_markup=kb)
```

### 4.3 `MiniApp_URL` konfiguratsiyasi

`.env` ga yangi o'zgaruvchi:
```
MINI_APP_URL=https://<subdomain>.jprq.io/miniapp
```

## 5. Backend

O'zgarishsiz. `POST /api/v1/auth/telegram-auth` endpointi allaqachon mavjud va Telegram orqali auth qiladi.

## 6. Setup (local test)

```bash
# 1. Frontend .env.local ga qo'shish
echo "NEXT_PUBLIC_MINI_APP_URL=https://<sub>.jprq.io/miniapp" >> frontend/.env.local

# 2. Tunnel ochish (1-terminal)
jprq http 3000

# 3. Bot ishga tushirish (2-terminal)
cd bot && python main.py

# 4. Frontend ishga tushirish (3-terminal)
cd frontend && npm run dev

# 5. BotFather da WebApp URL sozlash
# /setmenubutton → @botusername → URL: https://<sub>.jprq.io/miniapp
```

## 7. Self-review

- [x] Arxitektura aniq, komponentlar ajratilgan
- [x] Auth oqimi to'liq
- [x] Bot o'zgarishlari aniq
- [x] Local test uchun yo'riqnoma bor
- [x] YAGNI — faqat kerakli funksiyalar
