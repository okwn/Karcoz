# 12 — Deployment and DevOps Review

## Purpose
Analyze Dockerfiles, docker-compose configurations, environment management, deployment scripts, and production readiness.

---

## Docker Files Inventory

| File | Status | Service |
|---|---|---|
| `infra/docker/Dockerfile.api` | ✅ Valid | API server |
| `infra/docker/Dockerfile.web` | ✅ Valid (comment notes replacement) | Static web |
| `infra/docker/Dockerfile.telegram-bot` | ✅ Valid | Telegram bot |
| `infra/docker/Dockerfile.worker` | ❌ No-op placeholder | None (empty) |
| `infra/docker/docker-compose.yml` | ✅ Valid | Dev stack |
| `infra/docker/docker-compose.prod.yml` | ⚠️ Path issue | Prod stack |

---

## Dockerfile.api — Analysis

**Two-stage build:**
1. **Builder:** `node:22-alpine` → `npm install` → `prisma generate` → `tsc`
2. **Runtime:** `node:22-alpine` → copies builder output → creates `karcoz` user → `node dist/server.js`

**Good practices:**
- Non-root user (`karcoz`)
- Multi-stage build (small final image)
- Prisma client generation at build time
- Healthcheck: `wget -qO- http://localhost:8000/health`
- Exposes port 8000

**Evidence:** `infra/docker/Dockerfile.api`

---

## Dockerfile.web — Analysis

**Single-stage:** Uses `npx serve public -l 3000`

**Issue:** Comment states: `"Simple static file server — replace with nginx serving built files in real deployment."`

**Status: ✅ Works for dev** but needs replacement for production.

---

## Dockerfile.telegram-bot — Analysis

**Single-stage:** Builds from `apps/api` context, compiles `telegram-bot.ts` separately.

**Good:**
- Healthcheck on port 8080
- Creates `karcoz` user
- Graceful shutdown handler

**Note:** The telegram bot is compiled from `apps/api/src/telegram-bot.ts`, not from `apps/telegram-bot/` (which is empty).

---

## Dockerfile.worker — Analysis

```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN addgroup -S karcoz && adduser -S karcoz -G karcoz
USER karcoz
HEALTHCHECK CMD exit 0
CMD ["tail", "-f", "/dev/null"]
```

**Status: ❌ COMPLETE NO-OP** — `apps/worker/` is empty; worker service does not exist.

---

## Docker Compose — Dev

**File:** `infra/docker/docker-compose.yml`

**Services:**
| Service | Port | Healthcheck | Depends_on |
|---|---|---|---|
| `api` | 8132:8000 | `/health` | db, redis |
| `web` | 3100:3000 | `/` | None |
| `telegram-bot` | None (internal) | None | db, redis |
| `db` | 5433:5432 | `pg_isready` | None |
| `redis` | 6380:6379 | `redis-cli ping` | None |

**Volumes:**
- `uploads:/app/uploads` — for user-uploaded images

**Status: ✅ Functional dev stack**

**Issue:** Telegram bot port 8080 is exposed in container but not mapped to host.

---

## Docker Compose — Prod

**File:** `infra/docker/docker-compose.prod.yml`

### ⚠️ CRITICAL PATH MISMATCH

```yaml
api:
  build:
    context: ../apps/api        # ← Resolves to /home/oguz/Masaüstü/KarÇÖZ/apps/api
    dockerfile: ../infra/docker/Dockerfile.api  # ← Resolves to /home/oguz/Masaüstü/KarÇÖZ/infra/docker/Dockerfile.api
```

**Problem:** `context: ../apps/api` is a directory, but `Dockerockerfile.api` is at `infra/docker/Dockerfile.api`. Docker will look for the Dockerfile inside `apps/api`, not at the specified path.

**Evidence:** `docker compose -f infra/docker/docker-compose.prod.yml config` output:
```yaml
build:
  context: /home/oguz/Masaüstü/KarÇÖZ/infra/apps/api  # WRONG PATH
  dockerfile: ../infra/docker/Dockerfile.api
```

**Same issue for `telegram-bot` service** (build context `../apps/api`, dockerfile `../infra/docker/Dockerfile.telegram-bot`).

**Fix needed:** Either:
1. Move Dockerfiles into `apps/api/` directory, OR
2. Change build context to `../` and set dockerfile to `infra/docker/Dockerfile.api`

---

## Environment Variables

### Dev (`infra/docker/.env.example`)
All variables documented with comments. Default values for development.

### Prod env vars validated by `env.ts`:
- `DATABASE_URL` — Required in prod
- `REDIS_URL` — Required in prod
- `SESSION_SECRET` — Required, min 32 chars
- `APP_BASE_URL` — Required in prod
- `MAGIC_LINK_BASE_URL` — Required in prod
- `AI_PROVIDER` — Defaults to `mock`

**Production behavior:** Server exits with ASCII art error if critical vars are missing.

---

## Nginx Configuration

**File:** `infra/nginx/karcoz.conf`

**Upstreams:**
- `karcoz_api` → `127.0.0.1:8132`
- `karcoz_web` → `127.0.0.1:3100`

**HTTP server (port 80):**
- Redirects to HTTPS (commented out — needs manual uncomment)

**HTTPS server (port 443):**
- Commented out — needs manual uncomment after certbot

**Security headers:** ✅ All set

**Client max body size:** `20M` ✅ matches Fastify body limit

**Upstream keepalive:** `64` for API, `32` for web ✅

**Status: ✅ Good base config** — HTTPS block just needs to be uncommented.

---

## TLS / SSL

**Status: ⚠️ NOT CONFIGURED IN PRODUCTION**

Steps needed (from `server-deploy/04-nginx-ssl.md`):
1. Obtain certificate: `certbot --nginx -d yourdomain.com`
2. Uncomment HTTPS server block in `karcoz.conf`
3. Reload nginx: `systemctl reload nginx`

**No auto-renewal cron job configured.**

---

## Deployment Scripts

| Script | Status | Notes |
|---|---|---|
| `dev.sh` | ✅ Works | Validates compose, builds, starts, shows status |
| `build.sh` | ✅ Works | `docker compose -f infra/docker/docker-compose.prod.yml build --parallel` |
| `deploy.sh` | ✅ Works | Checks `.env`, validates, runs `docker compose up -d --build` |
| `backup-db.sh` | ✅ Works | `pg_dump` to timestamped `.sql.gz` |
| `restore-db.sh` | ✅ Works | Restores from `.sql.gz` |
| `logs.sh` | ✅ Works | `docker compose logs -f` with filters |
| `update.sh` | ✅ Works | `git pull` + rebuild |
| `smoke-api.sh` | ✅ Works | API smoke test suite |

---

## Healthchecks

| Service | Healthcheck | URL |
|---|---|---|
| `api` | `wget -qO- http://localhost:8000/health` | `GET /health` |
| `web` | `wget -qO- http://localhost:3000/` | `GET /` |
| `db` | `pg_isready -U karcoz -d karcoz_db` | PostgreSQL |
| `redis` | `redis-cli ping` (with `-a` password in prod) | Redis |

**API health endpoint (`apps/api/src/server.ts`):**
```typescript
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
```

**Status: ✅ All services have healthchecks**

---

## Production Readiness Issues

| Priority | Issue | Impact |
|---|---|---|
| **P0** | Docker build path mismatch | `docker compose -f infra/docker/docker-compose.prod.yml build` will FAIL |
| **P0** | TLS not configured | HTTPS not available |
| **P1** | `Dockerfile.web` uses `npx serve` | Needs nginx replacement for production |
| **P1** | No CI/CD pipeline | Manual deployments |
| **P1** | `Dockerfile.worker` is no-op | No background job processing |
| **P2** | Telegram bot not in separate repo | Built from API context, no standalone deploy |
| **P2** | No Docker healthcheck for telegram-bot | Container may fail silently |
| **P2** | No Prometheus metrics | No observability |
| **P3** | No backup rotation | `backup-db.sh` creates files but no cleanup |
| **P3** | No restore test | Backup never tested with actual restore |

---

## Backup / Restore

**Backup:** `scripts/backup-db.sh` → `pg_dump` → `.sql.gz` with timestamp

**Restore:** `scripts/restore-db.sh` → `gunzip -c | psql`

**Issues:**
- No automated backup schedule (should be cron)
- No backup retention policy
- No off-site backup
- No backup encryption
- No restore tested

---

## Server Requirements (from `server-deploy/00-requirements.md`)

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Disk | 40 GB | 100 GB SSD |
| OS | Ubuntu 24.04 | Ubuntu 24.04 LTS |
| Docker | 24+ | Latest |
| Docker Compose | 2.20+ | Latest |

---

## Shortest Path to Production

1. **Fix Docker path** in `docker-compose.prod.yml`
2. **Add `pnpm-workspace.yaml`** for proper workspace symlinks
3. **Set up `.env`** from `.env.example`
4. **Run `docker compose -f infra/docker/docker-compose.prod.yml build`**
5. **Set up TLS** with certbot
6. **Add GitHub Actions** for CI/CD
7. **Replace `npx serve`** with nginx for web in prod
8. **Test backup/restore** flow