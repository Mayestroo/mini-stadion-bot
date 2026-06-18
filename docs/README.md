# ⚽ Andijan Mini Futbol — To'liq Loyiha Hujjati

> **Stack:** Next.js 14 (App Router) · FastAPI · SQLite3 · python-telegram-bot  
> **Design:** Apple HIG + Minimalist UX/UI  
> **Til:** O'zbek / Rus

---

## 📁 Loyiha Tuzilishi

```
andijan-futbol/
├── frontend/               ← Next.js 14 web app
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── public/
├── backend/                ← FastAPI + SQLite
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── core/
│   ├── alembic/
│   └── main.py
├── bot/                    ← Telegram Bot
│   ├── handlers/
│   ├── keyboards/
│   └── main.py
├── docs/                   ← Hujjatlar
│   ├── 01-SETUP.md
│   ├── 02-BACKEND.md
│   ├── 03-FRONTEND.md
│   ├── 04-BOT.md
│   ├── 05-DATABASE.md
│   ├── 06-API-REFERENCE.md
│   ├── 07-DEPLOYMENT.md
│   └── 08-DESIGN-SYSTEM.md
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🚀 Tezkor Ishga Tushirish

```bash
# 1. Reponi clone qiling
git clone https://github.com/your-org/andijan-futbol.git
cd andijan-futbol

# 2. Environment o'rnating
cp .env.example .env
# .env faylini tahrirlang

# 3. Docker bilan
docker-compose up --build

# Yoki qo'lda:
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
# Frontend
cd frontend && npm install && npm run dev
# Bot
cd bot && python main.py
```

---

## 📖 Hujjatlar

| Fayl | Tavsif |
|------|--------|
| [01-SETUP.md](docs/01-SETUP.md) | Muhit sozlash, requirements |
| [02-BACKEND.md](docs/02-BACKEND.md) | FastAPI arxitekturasi, barcha kodlar |
| [03-FRONTEND.md](docs/03-FRONTEND.md) | Next.js komponentlari, sahifalar |
| [04-BOT.md](docs/04-BOT.md) | Telegram bot handlers, komandalar |
| [05-DATABASE.md](docs/05-DATABASE.md) | SQLite sxemasi, migratsiyalar |
| [06-API-REFERENCE.md](docs/06-API-REFERENCE.md) | Barcha API endpointlar |
| [07-DEPLOYMENT.md](docs/07-DEPLOYMENT.md) | VPS, Nginx, SSL, CI/CD |
| [08-DESIGN-SYSTEM.md](docs/08-DESIGN-SYSTEM.md) | Dizayn tizimi, ranglar, tipografiya |

---

## 🎯 Asosiy Funksiyalar

- ✅ Stadionlar ro'yxati (rasm, manzil, telefon, narx)
- ✅ Real-vaqt band bo'lish tizimi
- ✅ Google Maps integratsiyasi
- ✅ Telegram bot orqali bron qilish
- ✅ Admin panel (stadion qo'shish/tahrirlash)
- ✅ Bron tasdiqlash/bekor qilish
- ✅ SMS/Telegram bildirishnomalar

---

## 🌐 Foydalanuvchi Rollari

| Rol | Vakolatlar |
|-----|-----------|
| `guest` | Ko'rish, stadion qidirish |
| `user` | Bron qilish, tarixi ko'rish |
| `admin` | Stadion boshqarish, bronlarni tasdiqlash |
| `superadmin` | Barcha ruxsatlar |
