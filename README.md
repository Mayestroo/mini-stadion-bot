# Sportly — Mini futbol bron qilish va sport mashg'ulotlari platformasi

Telegram bot + web ilova orqali:
1. **Mini stadionlar** — stadionlarni topish, solishtirish va onlayn bron qilish (to'liq booking tizimi).
2. **Sport mashg'ulotlari** — treninglarni topish va murabbiy bilan bevosita bog'lanish (telefon/Telegram/Instagram orqali, bron qilinsiz katalog).

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
git clone <repo> && cd sportly

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
sportly/
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

Bot: [@sportly_bot](https://t.me/sportly_bot)

Set webhook after deploy:
```bash
curl -X POST https://api.<domain>/api/v1/bot/set-webhook \
  -H "Authorization: Bearer $BOT_API_SECRET"
```

## Backup & Restore

Nightly logical dump of the Postgres container (runs on the VPS):

```bash
# /etc/cron.d/sportly-backup — keep 14 days
15 3 * * * root docker exec sportly_db pg_dump -U sportly sportly | gzip > /srv/sportly/backups/sportly_$(date +\%F).sql.gz && find /srv/sportly/backups -name 'sportly_*.sql.gz' -mtime +14 -delete
```

Manual backup right now:

```bash
mkdir -p /srv/sportly/backups
docker exec sportly_db pg_dump -U sportly sportly | gzip > /srv/sportly/backups/sportly_$(date +%F).sql.gz
```

Copy off-server (from your machine):

```bash
scp root@<VPS_IP>:/srv/sportly/backups/ ./backups/
```

Restore (rehearsed once is worth more than ten backups — stops the app first):

```bash
docker compose -p sportly -f docker-compose.prod.yml stop backend worker bot
gunzip -c backups/sportly_YYYY-MM-DD.sql.gz | docker exec -i sportly_db psql -U sportly sportly
docker compose -p sportly -f docker-compose.prod.yml start backend worker bot
```

Also back up `uploads/` (user images) — a compressed tarball weekly is enough:

```bash
tar -czf /srv/sportly/backups/uploads_$(date +%F).tar.gz -C /srv/sportly uploads
```
