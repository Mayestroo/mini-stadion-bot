# Maydoncha — Andijonda mini futbol bron qilish platformasi

Telegram bot + web ilova orqali Andijondagi mini futbol stadionlarini topish, solishtirish va bron qilish.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI + SQLAlchemy + PostgreSQL |
| Frontend | Next.js 16 + React 19 + TypeScript |
| Bot | python-telegram-bot (webhook mode) |
| Async tasks | Background worker (APScheduler) |
| Container | Docker Compose |

## Quick Start

```bash
# 1. Clone and enter
git clone <repo> && cd maydoncha

# 2. Configure environment
cp .env.example .env
# Edit .env — set at minimum:
#   POSTGRES_PASSWORD
#   SECRET_KEY (python -c "import secrets; print(secrets.token_hex(32))")
#   TELEGRAM_BOT_TOKEN

# 3. Start everything
docker compose up --build
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API docs**: http://localhost:8000/docs

## Project Structure

```
maydoncha/
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── api/       # API routes (v1)
│   │   ├── core/      # Config, DB, security, telegram, etc.
│   │   ├── models/    # SQLAlchemy models
│   │   └── schemas/   # Pydantic schemas
│   ├── migrations/    # Alembic migrations
│   └── main.py        # FastAPI entry point
├── frontend/          # Next.js web app
│   ├── app/           # Pages (admin, miniapp, owner, etc.)
│   ├── components/    # UI components
│   ├── lib/           # API client, types, utils
│   └── store/         # Zustand state
├── deploy/            # Production deployment (Nginx, docs)
└── docker-compose.yml # Dev setup
```

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key (generate strong random) |
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps JS API key (for map features) |
| `SENTRY_DSN` | Sentry error tracking (optional) |

## Production Deploy

See [deploy/README.md](deploy/README.md) for VPS deployment instructions behind an existing Nginx reverse proxy.

## Telegram Bot

Bot: [@maydoncha_bot](https://t.me/maydoncha_bot)

Set webhook after deploy:
```bash
curl -X POST https://api.<domain>/api/v1/bot/set-webhook \
  -H "Authorization: Bearer $BOT_API_SECRET"
```
