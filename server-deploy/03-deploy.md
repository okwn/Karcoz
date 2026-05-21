# Deploy KARÇÖZ

## Prerequisites

- Docker + Docker Compose installed ([01-install-docker.md](01-install-docker.md))
- Environment variables configured ([02-env-setup.md](02-env-setup.md))
- Nginx configured with domain ([02-env-setup.md](02-env-setup.md))
- TLS certificate obtained ([04-nginx-ssl.md](04-nginx-ssl.md))

## First-time deployment

```bash
cd /opt/karcoz

# 1. Start database and redis only
docker compose -f infra/docker/docker-compose.prod.yml up -d db redis

# 2. Wait for postgres to be ready (about 15s)
sleep 15

# 3. Run database migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate deploy

# 4. Verify migrations ran
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate status

# 5. Start all services
docker compose -f infra/docker/docker-compose.prod.yml up -d

# 6. Verify all services are running
docker compose -f infra/docker/docker-compose.prod.yml ps
```

All services should show status `healthy` or `running`.

## Verify all services

```bash
docker compose -f infra/docker/docker-compose.prod.yml ps

# Check API health
curl http://localhost:8132/health
# Expected: {"status":"ok","timestamp":...}
```

## View logs

```bash
# All services
docker compose -f infra/docker/docker-compose.prod.yml logs -f

# Specific service
docker compose -f infra/docker/docker-compose.prod.yml logs -f api
docker compose -f infra/docker/docker-compose.prod.yml logs -f web
docker compose -f infra/docker/docker-compose.prod.yml logs -f db
docker compose -f infra/docker/docker-compose.prod.yml logs -f redis
docker compose -f infra/docker/docker-compose.prod.yml logs -f telegram-bot
```

## Smoke test

```bash
# Against local Docker API
bash scripts/smoke-api.sh http://localhost:8132

# Against production domain (after TLS)
bash scripts/smoke-api.sh https://yourdomain.com
```

Expected output: all checks pass (green PASS). Any red FAIL indicates a problem.

## Restart after reboot

Docker services do not auto-start after server reboot by default. To enable:

```bash
sudo systemctl enable docker
sudo systemctl start docker

# Then start KARÇÖZ
cd /opt/karcoz
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

Or use a process manager (systemd, supervisord) to keep containers running.

## Full stop (without removing data)

```bash
docker compose -f infra/docker/docker-compose.prod.yml stop
```

## Full stop and remove containers (keeps volumes)

```bash
docker compose -f infra/docker/docker-compose.prod.yml down
```

## Restart after code update

```bash
cd /opt/karcoz
git pull origin main
docker compose -f infra/docker/docker-compose.prod.yml build --parallel
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## Services

| Service | Container | Internal Port | Healthcheck |
|---------|-----------|---------------|-------------|
| API | `karcoz_api` | 8000 | `GET /health` |
| Web | `karcoz_web` | 3000 | `GET /` |
| PostgreSQL | `karcoz_db` | 5432 | `pg_isready` |
| Redis | `karcoz_redis` | 6379 | `redis-cli ping` |
| Telegram Bot | `karcoz_telegram` | 8080 | `GET /health` |

## Volumes

| Volume | Purpose |
|--------|---------|
| `karcoz_pgdata` | PostgreSQL data |
| `karcoz_redisdata` | Redis AOF data |
| `uploads` | User-uploaded images |

These volumes persist data across restarts. To delete them (loses all data):
```bash
docker compose -f infra/docker/docker-compose.prod.yml down -v
```