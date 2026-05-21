# 08 — Deployment Review

**Docker & Deployment Setup Review**

---

## Docker Compose

### Development (docker-compose.yml)
- Services: api, web, worker (placeholder), db, redis, telegram-bot
- Ports: API 8132, Web 3100, DB 5433, Redis 6380
- No password on Redis (dev only)
- Healthchecks on db, redis, api, web

### Production (docker-compose.prod.yml)
- `restart: unless-stopped` on all services
- Redis requires `${REDIS_PASSWORD}`
- HTTPS-ready Nginx (TLS block commented out, ready for certbot)
- Healthchecks on all services

---

## Dockerfiles

| Dockerfile | Status | Notes |
|-----------|--------|-------|
| `Dockerfile.api` | ✅ OK | Multi-stage Node 22, prisma generate in builder |
| `Dockerfile.web` | ✅ OK | npx serve public -l 3000 |
| `Dockerfile.worker` | ❌ BROKEN | Runs `node src/index.js` — file does not exist |
| `Dockerfile.telegram-bot` | ⚠️ BROKEN | Runs `node src/index.js` — file does not exist |

---

## Nginx

`infra/nginx/karcoz.conf`:
- Reverse proxy: `/api/` → `127.0.0.1:8132`, `/` → `127.0.0.1:3100`
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- `client_max_body_size 20M`
- Timeouts and buffering configured
- HTTPS block commented out (ready for certbot)

---

## Deployment Scripts (server-deploy/)

| Step | File | Purpose |
|------|------|---------|
| 0 | 00-requirements.md | Ubuntu 24.04, 4GB RAM, ports 80/443/22 |
| 1 | 01-install-docker.md | Install Docker |
| 2 | 02-env-setup.md | Environment variables |
| 3 | 03-deploy.md | First-time deploy, prisma migrate |
| 4 | 04-nginx-ssl.md | TLS setup |
| 5 | 05-update.md | Rolling updates |
| 6 | 06-backup-restore.md | Backup/restore DB |
| 7 | 07-troubleshooting.md | Common issues |

---

## Additional Scripts (scripts/)

| Script | Purpose |
|--------|---------|
| deploy.sh | Production deploy |
| dev.sh | Development startup |
| build.sh | Build all packages |
| update.sh | Rolling update |
| backup-db.sh | PostgreSQL backup |
| restore-db.sh | Restore from backup |
| logs.sh | Tail logs |

---

## Environment Variables

Documented in `infra/docker/.env.example`:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `JWT_SECRET` — Session token secret
- `APP_BASE_URL` — App base URL for CORS/magic link
- `API_PORT` — API port (default 8132)
- `DB_PORT` — DB port (default 5433)
- `REDIS_PORT` — Redis port (default 6380)
- `SMTP_*` — Email settings
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` — AI provider keys

---

## Deployment Instructions

### Local
```bash
cp .env.example .env
# Fill in .env values
docker compose up -d
docker compose logs -f api
# Health: curl http://localhost:8132/health
```

### Production
```bash
scp docker-compose.prod.yml .env server:/opt/karcoz/
ssh server
cd /opt/karcoz
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

---

## Verdict

**DEPLOYABLE** — Docker Compose and Nginx are well-configured. Deployment scripts cover the full lifecycle. **Critical fix needed**: Worker and Telegram bot Dockerfiles reference non-existent `src/index.js`. Either fix the entry points or remove the containers.