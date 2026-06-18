# Andijon Arena VPS Deploy

Target VPS already runs the `ielts-prod` Docker Compose project and `ielts-nginx` owns ports 80/443. This project must be deployed as a separate Compose project and routed through the existing Nginx container.

## DNS

Point these records to the VPS IP `207.180.222.247`:

```text
A      @      207.180.222.247
A      api    207.180.222.247
CNAME  www    pentestlab.uz
```

## Safe Deploy Outline

1. Clone repo to `/srv/andijonarena`.
2. Create `/srv/andijonarena/.env` from `.env.example` and set real secrets.
3. Build and start:

```bash
cd /srv/andijonarena
docker compose -p andijonarena -f docker-compose.prod.yml build
docker compose -p andijonarena -f docker-compose.prod.yml up -d
```

4. Issue certificates after DNS resolves:

```bash
certbot certonly --webroot -w /var/www/certbot -d pentestlab.uz -d www.pentestlab.uz
certbot certonly --webroot -w /var/www/certbot -d api.pentestlab.uz
```

5. Back up current IELTS Nginx config before editing:

```bash
cp /srv/ielts/deploy/vps/nginx/conf.d/ielts.conf /srv/ielts/deploy/vps/nginx/conf.d/ielts.conf.bak.$(date +%F-%H%M%S)
```

6. Append `deploy/nginx-pentestlab.conf` to `/srv/ielts/deploy/vps/nginx/conf.d/ielts.conf`.
7. Validate and reload only if valid:

```bash
docker exec ielts-nginx nginx -t
docker exec ielts-nginx nginx -s reload
```

8. Set Telegram webhook:

```bash
curl -X POST https://api.pentestlab.uz/api/v1/bot/set-webhook \
  -H "Authorization: Bearer $BOT_API_SECRET"
```

## Production Env Values

Required values in `.env`:

```env
NEXT_PUBLIC_API_URL=https://api.pentestlab.uz
NEXT_PUBLIC_APP_URL=https://pentestlab.uz
TELEGRAM_WEBHOOK_URL=https://api.pentestlab.uz/api/v1/bot/webhook
MINI_APP_URL=https://pentestlab.uz/miniapp
ALLOWED_ORIGINS=https://pentestlab.uz,https://www.pentestlab.uz
DATABASE_URL=postgresql+psycopg://andijan:<POSTGRES_PASSWORD>@postgres:5432/andijan_futbol
```

Rotate Telegram bot token before production if it was shared in chat or committed anywhere.
