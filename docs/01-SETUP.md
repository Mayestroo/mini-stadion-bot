# 01 — Muhit Sozlash (Setup)

## Talablar

| Texnologiya | Versiya | Izoh |
|-------------|---------|------|
| Node.js | ≥ 18.17 | Next.js uchun |
| Python | ≥ 3.11 | FastAPI uchun |
| SQLite | ≥ 3.39 | Ma'lumotlar bazasi |
| Docker | ≥ 24 | Ixtiyoriy, production uchun |

---

## 1. Loyihani Klonlash va Papka Tuzilishini Yaratish

```bash
mkdir andijan-futbol && cd andijan-futbol
mkdir -p frontend backend bot docs uploads
```

---

## 2. Environment Fayllari

### Root `.env.example` (barcha .env uchun asos)

```env
# ─── DATABASE ───────────────────────────────
DATABASE_URL=sqlite:///./andijan_futbol.db

# ─── BACKEND ────────────────────────────────
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
SECRET_KEY=your-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=43200
ALGORITHM=HS256

# ─── FRONTEND ───────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-api-key
NEXT_PUBLIC_APP_NAME=Andijan Futbol
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── TELEGRAM BOT ───────────────────────────
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# ─── UPLOADS ────────────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
ALLOWED_EXTENSIONS=jpg,jpeg,png,webp

# ─── CORS ───────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# ─── ADMIN ──────────────────────────────────
FIRST_ADMIN_EMAIL=admin@andijanfutbol.uz
FIRST_ADMIN_PASSWORD=Admin123!
```

---

## 3. Backend (FastAPI) Sozlash

```bash
cd backend

# Virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Dependency'lar
pip install -r requirements.txt
```

### `backend/requirements.txt`

```txt
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
aiofiles==23.2.1
pillow==10.3.0
python-dotenv==1.0.1
httpx==0.27.0
python-telegram-bot==21.3
apscheduler==3.10.4
```

### Backend ishga tushirish

```bash
cd backend

# Birinchi marta: DB yaratish
python -c "from app.core.database import engine, Base; from app.models import *; Base.metadata.create_all(bind=engine)"

# Seeder (boshlang'ich ma'lumotlar)
python seed.py

# Serverni ishga tushirish
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## 4. Frontend (Next.js) Sozlash

```bash
cd frontend

# Yangi Next.js loyihasi yaratish (agar noldan)
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Dependency'lar o'rnatish
npm install
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-toast
npm install @tanstack/react-query axios date-fns
npm install lucide-react clsx tailwind-merge
npm install @react-google-maps/api
npm install react-image-gallery
npm install zustand
npm install react-hook-form zod @hookform/resolvers
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-api-key
NEXT_PUBLIC_APP_NAME=Andijan Futbol
```

### Frontend ishga tushirish

```bash
cd frontend
npm run dev
# http://localhost:3000 da ochiladi
```

---

## 5. Telegram Bot Sozlash

```bash
cd bot

# Virtual env (backendniki ishlatsa ham bo'ladi)
pip install python-telegram-bot==21.3 httpx python-dotenv

# .env fayl
cp ../.env.example .env
```

### Bot ishga tushirish

```bash
cd bot
python main.py
```

---

## 6. Docker Compose (Production)

### `docker-compose.yml`

```yaml
version: '3.9'

services:
  backend:
    build: ./backend
    container_name: andijan_backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ./uploads:/app/uploads
      - ./andijan_futbol.db:/app/andijan_futbol.db
    env_file:
      - .env
    networks:
      - andijan_net

  frontend:
    build: ./frontend
    container_name: andijan_frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - backend
    networks:
      - andijan_net

  bot:
    build: ./bot
    container_name: andijan_bot
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      - backend
    networks:
      - andijan_net

networks:
  andijan_net:
    driver: bridge
```

### `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/uploads
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### `frontend/Dockerfile`

```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### `bot/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

---

## 7. Google Maps API Olish

1. [console.cloud.google.com](https://console.cloud.google.com) ga kiring
2. Yangi loyiha yarating: `andijan-futbol`
3. **APIs & Services → Enable APIs** ga o'ting
4. Quyidagilarni yoqing:
   - Maps JavaScript API
   - Places API
   - Geocoding API
5. **Credentials → Create API Key** bosing
6. API key ni `.env` ga qo'shing

---

## 8. Telegram Bot Yaratish

1. Telegramda `@BotFather` ga yozing
2. `/newbot` komandasi bering
3. Bot nomi: `Andijan Futbol Bot`
4. Bot username: `andijanfutbol_bot`
5. Token olasiz → `.env` ga qo'shing
6. `/setdescription` — bot tavsifi
7. `/setcommands` — komandalar:
   ```
   start - Botni ishga tushirish
   stadionlar - Barcha stadionlar
   bron - Bron qilish
   bronlarim - Mening bronlarim
   bekor - Bronni bekor qilish
   yordam - Yordam
   ```
