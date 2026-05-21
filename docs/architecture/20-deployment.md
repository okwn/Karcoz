# Deployment Architecture

**Phase:** 19
**Status:** Implemented

---

## Overview

KARÇÖZ runs as a set of Docker containers behind an Nginx reverse proxy on Ubuntu 24.04. PostgreSQL and Redis run as Docker services; the API, web dashboard, worker, and Telegram bot each run in their own containers.

## Architecture Diagram

```
                     ┌─────────────────────────────────────────────┐
Internet ── port 80/443 ──►│  Nginx (karcoz.conf)                    │
                             │  /api/  → karcoz_api:8000             │
                             │  /      → karcoz_web:3000              │
                             └──────────┬────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
              ┌─────▼─────┐      ┌──────▼──────┐    ┌──────▼──────┐
              │ karcoz_api│      │ karcoz_web  │    │ karcoz_worker│
              │  port 8000│      │  port 3000  │    │              │
              │ (Fastify) │      │  (static)   │    │  (placeholder│
              └─────┬─────┘      └─────────────┘    └──────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
  ┌─────▼─────┐ ┌───▼────┐ ┌───▼────┐
  │karcoz_db  │ │redis   │ │telegram│
  │postgres:16│ │redis:7 │ │  bot   │
  └───────────┘ └────────┘ └────────┘
```

## Container Layout

| Container | Image | Internal Port | Purpose |
|-----------|-------|---------------|---------|
| `karcoz_api` | Custom (Dockerfile.api) | 8000 | Fastify REST API |
| `karcoz_web` | Custom (Dockerfile.web) | 3000 | Static SPA dashboard |
| `karcoz_worker` | Custom (Dockerfile.worker) | — | Background job processor |
| `karcoz_telegram` | Custom (Dockerfile.telegram-bot) | — | Telegram bot |
| `karcoz_db` | `postgres:16-alpine` | 5432 | PostgreSQL 16 |
| `karcoz_redis` | `redis:7-alpine` | 6379 | Redis 7 |

## Environment Variables

### Production secrets (`.env`)

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | PostgreSQL password |
| `DATABASE_URL` | Full connection string |
| `REDIS_PASSWORD` | Redis auth password |
| `REDIS_URL` | Full Redis connection string |
| `SESSION_SECRET` | 32+ char secret for session cookies |
| `MAGIC_LINK_BASE_URL` | Public URL for auth links |
| `TELEGRAM_BOT_TOKEN` | BotFather token |

### Ports (host mapping)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | 8132 | Host port for API |
| `WEB_PORT` | 3100 | Host port for dashboard |
| `DB_PORT` | 5433 | Host port for PostgreSQL |
| `REDIS_PORT` | 6380 | Host port for Redis |

## Healthchecks

| Service | Check | Interval |
|---------|-------|----------|
| `api` | `wget /health` → 200 | 10s |
| `web` | `wget /` → 200 | 15s |
| `db` | `pg_isready -U karcoz` | 10s |
| `redis` | `redis-cli ping` | 10s |
| `worker` | `exit 0` (always pass — placeholder) | 30s |
| `telegram` | `exit 0` (always pass — placeholder) | 30s |

## Restart Policies

| Service | Policy | Reason |
|---------|--------|--------|
| `api` | `unless-stopped` | Critical — should auto-recover |
| `web` | `unless-stopped` | Should auto-recover |
| `worker` | `on-failure` | Placeholder — no critical failure mode |
| `telegram` | `on-failure` | Placeholder — no critical failure mode |
| `db` | `unless-stopped` | Data service — don't restart unnecessarily |
| `redis` | `unless-stopped` | Data service — don't restart unnecessarily |

## Volumes

| Volume | Container | Purpose |
|--------|-----------|---------|
| `karcoz_pgdata` | `karcoz_db` | PostgreSQL data |
| `karcoz_redisdata` | `karcoz_redis` | Redis AOF + data |
| `uploads` | `karcoz_api` | User-uploaded images |

## Deployment Commands

```bash
# Development
bash scripts/dev.sh

# Production deploy
bash scripts/deploy.sh

# Update
bash scripts/update.sh

# View logs
bash scripts/logs.sh            # all
bash scripts/logs.sh --api       # api only

# Backup / Restore
bash scripts/backup-db.sh
bash scripts/restore-db.sh <file>
```

## Update / Rollback Flow

```
git pull → docker compose build → docker compose up -d
                                └── rollback: docker compose down -v && up -d
```

## TLS Setup

1. Edit `infra/nginx/karcoz.conf` → uncomment HTTPS server block
2. Run `sudo certbot --nginx -d yourdomain.com`
3. Certbot auto-configures HTTPS and redirects HTTP → HTTPS

## File Structure

```
infra/
├── docker/
│   ├── docker-compose.yml           # Dev
│   ├── docker-compose.prod.yml      # Production
│   ├── Dockerfile.api              # API container
│   ├── Dockerfile.web              # Web container
│   ├── Dockerfile.worker           # Worker container
│   ├── Dockerfile.telegram-bot    # Telegram container
│   └── .env.example                # Secrets template
├── nginx/
│   └── karcoz.conf                 # Nginx reverse proxy config
scripts/
├── dev.sh           # Start dev environment
├── build.sh         # Build production images
├── deploy.sh       # Deploy to production
├── update.sh        # Pull + rebuild + restart
├── backup-db.sh    # Backup PostgreSQL
├── restore-db.sh   # Restore PostgreSQL
└── logs.sh          # Tail service logs
server-deploy/
├── 00-requirements.md   # Hardware, ports, DNS
├── 01-install-docker.md  # Docker installation guide
├── 02-env-setup.md       # Environment configuration
├── 03-deploy.md          # First-time deployment
├── 04-nginx-ssl.md       # TLS setup
├── 05-update.md          # Update procedure
├── 06-backup-restore.md  # Backup guide
└── 07-troubleshooting.md # Common issues
```