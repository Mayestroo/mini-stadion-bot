# Maydoncha VPS Deploy

Target VPS already runs the `ielts-prod` Docker Compose project and `ielts-nginx` owns ports 80/443. This project must be deployed as a separate Compose project and routed through the existing Nginx container.

## DNS

Point these records to your VPS IP:

```text
A      @      <VPS_IP>
A      api    <VPS_IP>
CNAME  www    <DOMAIN>
```

## Safe Deploy Outline

1. Clone repo to `/srv/maydoncha`.
2. Create `/srv/maydoncha/.env` from `.env.example` and set real secrets.
3. Build and start:

```bash
cd /srv/maydoncha
docker compose -p maydoncha -f docker-compose.prod.yml build
docker compose -p maydoncha -f docker-compose.prod.yml up -d
```

4. Issue certificates after DNS resolves:

```bash
certbot certonly --webroot -w /var/www/certbot -d <DOMAIN> -d www.<DOMAIN>
certbot certonly --webroot -w /var/www/certbot -d api.<DOMAIN>
```

5. Add the Maydoncha Nginx config as a separate file when the existing Nginx mounts `/srv/ielts/deploy/vps/nginx/conf.d`:

```bash
cp /srv/maydoncha/deploy/nginx-pentestlab.conf /srv/ielts/deploy/vps/nginx/conf.d/maydoncha-pentestlab.conf
```

If the existing Nginx does not include all `conf.d/*.conf` files, back up the current config and append `deploy/nginx-pentestlab.conf` instead:

```bash
cp /srv/ielts/deploy/vps/nginx/conf.d/ielts.conf /srv/ielts/deploy/vps/nginx/conf.d/ielts.conf.bak.$(date +%F-%H%M%S)
cat /srv/maydoncha/deploy/nginx-pentestlab.conf >> /srv/ielts/deploy/vps/nginx/conf.d/ielts.conf
```

6. Validate and reload only if valid:

```bash
docker exec ielts-nginx nginx -t
docker exec ielts-nginx nginx -s reload
```

7. Set Telegram webhook:

```bash
curl -X POST https://api.<DOMAIN>/api/v1/bot/set-webhook \
  -H "Authorization: Bearer $BOT_API_SECRET"
```

## Production Env Values

Required values in `.env`:

```env
NEXT_PUBLIC_API_URL=https://api.<DOMAIN>
NEXT_PUBLIC_APP_URL=https://<DOMAIN>
TELEGRAM_WEBHOOK_URL=https://api.<DOMAIN>/api/v1/bot/webhook
MINI_APP_URL=https://<DOMAIN>/miniapp
ALLOWED_ORIGINS=https://<DOMAIN>,https://www.<DOMAIN>
DATABASE_URL=postgresql+psycopg://andijan:<POSTGRES_PASSWORD>@maydoncha_postgres:5432/maydoncha
```

Rotate Telegram bot token before production if it was shared in chat or committed anywhere.
