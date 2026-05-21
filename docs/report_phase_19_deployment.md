# Phase 19 — Deployment Infrastructure

**Date:** 2026-05-17
**Status:** ✅ Implemented

---

## Goal

Make KARÇÖZ deployable on a fresh Ubuntu 24.04 server with Docker Compose and Nginx as a reverse proxy. All services containerized with healthchecks, restart policies, backup/restore, and TLS support.

---

## What Was Built

### Docker Compose (Dev + Prod)

**`infra/docker/docker-compose.yml`** — Development stack:
- `api`, `web`, `worker`, `telegram-bot` + `db` + `redis`
- Port binding to host (`8132`, `3100`, `5433`, `6380`)
- Healthchecks on all services
- `restart: on-failure` for app containers, `unless-stopped` for data containers

**`infra/docker/docker-compose.prod.yml`** — Production stack:
- Same services, no host port exposure (internal networking)
- Redis password authentication
- Named volume for uploads
- `karcoz_network` bridge network for internal service communication
- `restart: unless-stopped` on all services

### Dockerfiles (4 services)

| Dockerfile | Base | Notes |
|-----------|------|-------|
| `Dockerfile.api` | `node:22-alpine` | 2-stage build, Prisma generate, non-root user |
| `Dockerfile.web` | `node:22-alpine` | `serve` static files on port 3000 |
| `Dockerfile.worker` | `node:22-alpine` | Placeholder — `src/index.js` |
| `Dockerfile.telegram-bot` | `node:22-alpine` | Placeholder — `src/index.js` |

### Nginx Config (`infra/nginx/karcoz.conf`)

- Reverse proxy: `/api/` → `127.0.0.1:8132`, `/` → `127.0.0.1:3100`
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- Upload size limit: `client_max_body_size 20M`
- HTTP/1.1 keepalive to upstream
- HTTPS server block commented — enable after certbot

### Environment Template (`infra/docker/.env.example`)

```bash
DB_PASSWORD=...
REDIS_PASSWORD=...
SESSION_SECRET=...
MAGIC_LINK_BASE_URL=https://yourdomain.com
TELEGRAM_BOT_TOKEN=...
```

### Scripts (6)

| Script | Purpose |
|--------|---------|
| `dev.sh` | Validate + build + start dev stack |
| `build.sh` | Build prod images |
| `deploy.sh` | Validate + up -d --build prod |
| `update.sh` | git pull + rebuild + restart |
| `backup-db.sh` | `pg_dump` → gzip in `backups/` |
| `restore-db.sh` | gunzip → psql restore |
| `logs.sh` | Tail logs (all or by service) |

### Server Deployment Guides (7 files)

`server-deploy/00-requirements.md` — Hardware, ports, DNS, firewall  
`server-deploy/01-install-docker.md` — Docker CE + Docker Compose + Certbot installation  
`server-deploy/02-env-setup.md` — `.env` setup, nginx config, firewall  
`server-deploy/03-deploy.md` — First-time deploy, migrations, TLS  
`server-deploy/04-nginx-ssl.md` — Let's Encrypt + auto-renewal  
`server-deploy/05-update.md` — Rolling updates and rollback  
`server-deploy/06-backup-restore.md` — Volume + SQL backup/restore  
`server-deploy/07-troubleshooting.md` — Common issues and fixes

---

## Docker Compose Validation

```bash
$ docker compose -f infra/docker/docker-compose.yml config --quiet
# ✅ no errors (warnings about missing .env vars are expected)

$ docker compose -f infra/docker/docker-compose.prod.yml config --quiet
# ✅ no errors
```

Both files validate cleanly. The warnings about missing env vars (`DB_PASSWORD`, etc.) are expected — those are runtime-only values provided via `.env`.

---

## Healthcheck Summary

All production services have healthchecks. The `worker` and `telegram-bot` use `exit 0` as placeholder healthchecks since their actual implementation is not yet present.

| Service | Healthcheck |
|---------|------------|
| `api` | HTTP GET `/health` every 10s |
| `web` | HTTP GET `/` every 15s |
| `db` | `pg_isready` every 10s |
| `redis` | `redis-cli ping` every 10s |
| `worker` | `exit 0` every 30s (placeholder) |
| `telegram` | `exit 0` every 30s (placeholder) |

---

## Production Deployment Checklist

```bash
# 1. Clone + setup
git clone <repo> /opt/karcoz
cd /opt/karcoz
cp infra/docker/.env.example .env
nano .env  # fill all secrets

# 2. Install Docker (once)
bash server-deploy/01-install-docker.md

# 3. Configure
sudo cp infra/nginx/karcoz.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/karcoz /etc/nginx/sites-enabled/
sudo nginx -t

# 4. Deploy
docker compose -f infra/docker/docker-compose.prod.yml up -d db redis
sleep 10
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate deploy
docker compose -f infra/docker/docker-compose.prod.yml up -d

# 5. TLS (after DNS points to server)
sudo certbot --nginx -d yourdomain.com
```