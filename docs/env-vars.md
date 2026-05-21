# Environment Variables Reference

All KARÇÖZ configuration is driven by environment variables. There are two `.env.example` files:

- **Root `.env.example`** — used for local development with `pnpm dev`
- **`infra/docker/.env.example`** — used for production Docker deployment

---

## Required Variables

| Variable | Description | Required In |
|----------|-------------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Dev + Prod |
| `DB_PASSWORD` | PostgreSQL password | Docker only |
| `SESSION_SECRET` | Min 32 chars — signs session cookies | Prod |
| `MAGIC_LINK_BASE_URL` | Public base URL of the web dashboard | Prod |
| `APP_BASE_URL` | Same as `MAGIC_LINK_BASE_URL` | Prod |
| `REDIS_PASSWORD` | Redis authentication password | Prod |
| `REDIS_URL` | Redis connection string | Dev + Prod |

---

## Variable Details

### `DATABASE_URL`

```
postgresql://karcoz:${DB_PASSWORD}@db:5432/karcoz_db
```

- Docker: use Docker service name `db` as hostname
- Local dev: use `localhost:5433`

**Example (Docker):**
```
DATABASE_URL=postgresql://karcoz:mysecretpass@db:5432/karcoz_db
```

**Example (local dev):**
```
DATABASE_URL=postgresql://karcoz:karcoz_dev_password@localhost:5433/karcoz_db
```

---

### `REDIS_URL`

```
redis://[:${REDIS_PASSWORD}]@redis:6379/0
```

- Dev without password: `redis://redis:6379/0`
- Prod with password: `redis://:${REDIS_PASSWORD}@redis:6379/0`

---

### `SESSION_SECRET`

Minimum 32 characters. Signs the session cookie.

```bash
openssl rand -base64 32
```

**Must be set in production.** The server refuses to start in production mode without it.

---

### `MAGIC_LINK_BASE_URL` / `APP_BASE_URL`

Must be the **public HTTPS URL** of your deployment (e.g., `https://karcoz.example.com`). Used for:

- Email magic link URLs
- Telegram bot callback URLs
- CORS origin validation

**Never use `localhost` in production.**

---

### `AI_PROVIDER`

| Value | Description |
|-------|-------------|
| `mock` | Mock AI — no API calls (default) |
| `openai` | OpenAI GPT-4 |
| `openrouter` | OpenRouter (access to multiple models) |

```bash
AI_PROVIDER=openai
AI_FALLBACK_PROVIDER=openrouter
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
```

---

### `REDIS_PASSWORD`

Redis requires a strong password in production.

```bash
openssl rand -base64 24
```

Set `REDIS_PASSWORD` in `.env` and `REDIS_URL` as:
```
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
```

The Docker Compose prod file passes this to the `redis-server --requirepass` flag.

**Fallback behavior when Redis is unavailable:** The API will log errors but continue running. Session storage will fail gracefully (users may need to re-authenticate). Rate limiting will not function. No data is lost — Redis is used for caching and sessions only.

---

## Production Validation

The API server validates required environment variables on startup.

In **production** (`NODE_ENV=production`), missing required variables cause the server to exit immediately with an error message listing all missing values.

In **development**, missing optional variables produce warnings but the server starts.

### Variables that block production startup

| Variable | Minimum Requirement |
|----------|---------------------|
| `DATABASE_URL` | Must be a valid PostgreSQL URL |
| `SESSION_SECRET` | Minimum 32 characters |
| `MAGIC_LINK_BASE_URL` | Must be a valid HTTPS URL in production |
| `REDIS_URL` | Must start with `redis://` |

---

## No localhost URLs in Production

The following variables **must not** contain `localhost` or `127.0.0.1` in production:

- `DATABASE_URL` — use Docker service name `db`
- `REDIS_URL` — use Docker service name `redis`
- `MAGIC_LINK_BASE_URL` — must be public HTTPS
- `APP_BASE_URL` — must be public HTTPS
