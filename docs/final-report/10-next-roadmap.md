# 10 — Next Roadmap

**Recommended Improvements for v1.1+**

---

## Phase 1: Make It Real (MVP Release)

### 1.1 Replace Mocks with Real Providers
- Add real OpenAI API key → swap `provider: "mock"` to `provider: "openai"` in ModelConfig
- Add real Anthropic API key → `provider: "anthropic"`
- Validate eval pass rates drop below 80% before shipping

### 1.2 Fix Broken Dockerfiles
- Telegram bot: change entry point to `node dist/telegram-bot.js` or compile via tsx
- Worker: implement actual worker logic or remove container

### 1.3 Commit Prisma Migrations
```bash
cd apps/api
npx prisma migrate dev --name initial
git add prisma/migrations
```

---

## Phase 2: Production Hardening

### 2.1 Security
- Add brute-force protection on magic link verification
- Add per-IP rate limit on auth endpoints
- Enforce notes field max length server-side
- Add WAF (Web Application Firewall) rules to Nginx

### 2.2 Monitoring
- Add Prometheus metrics endpoint (`/metrics`)
- Add structured logging (pino)
- Set up Grafana dashboards
- Add uptime monitoring

### 2.3 Performance
- Add response compression (gzip)
- Add CDN for static assets (Cloudflare/CDN)
- Configure Prisma connection pooling
- Add Redis cluster mode for multi-instance

---

## Phase 3: Feature Completeness

### 3.1 Real Web Dashboard
- Replace static shell with React dashboard
- User settings page
- Usage statistics
- Telegram account management
- History browser

### 3.2 Real Worker
- Background solve queue (BullMQ)
- Scheduled reports
- Cleanup jobs

### 3.3 Practice Mode
- Add AI-generated practice questions
- Spaced repetition tracking
- Progress analytics

### 3.4 Real Billing
- Stripe integration for Pro/Team plans
- Usage-based billing
- Invoice generation

---

## Phase 4: Scale & Monetization

### 4.1 Scale
- Multi-region deployment
- Horizontal API scaling
- Database read replicas
- CDN edge caching

### 4.2 Monetization
- Usage-based pricing beyond plan limits
- Team seats billing
- API access for third-party developers
- White-label extension

---

## Immediate Next Steps (This Week)

1. **Add API keys to `.env`** — test with real OpenAI
2. **Fix Telegram bot Dockerfile** — change entry point to `dist/telegram-bot.js`
3. **Run eval against real providers** — measure actual accuracy
4. **Commit Prisma migrations** — version-control schema
5. **Install ESLint** — `npm install -D eslint`
6. **Fix `practice_generate` plan limits** — add enforcement in `rate-limit.ts`

---

## How to Run Locally

### Prerequisites
- Node.js 22+
- Docker + Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Setup
```bash
# Clone and install
npm install  # or: npm install from apps/* and packages/*

# Copy env
cp infra/docker/.env.example .env
# Fill in .env with real API keys

# Start infrastructure
docker compose -f infra/docker/docker-compose.yml up -d db redis

# Generate Prisma client
cd apps/api && npx prisma generate
cd apps/api && npx prisma db push

# Start API
cd apps/api && npm run dev

# Build extension
cd apps/extension && npm run build

# Load extension in Chrome: chrome://extensions → Load unpacked → apps/extension/dist

# Run tests
cd packages/ai-core && npm run test
cd packages/ocr-core && npm run test
cd packages/capture-core && npm run test
```

### Quick Test
```bash
# Health check
curl http://localhost:8132/health

# Solve an image
curl -X POST http://localhost:8132/api/solve/image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <extension-token>" \
  -d '{"imageBase64":"<base64>"}'
```

---

## How to Deploy

### Single Server
```bash
# On server
cd /opt/karcoz
cp infra/docker/docker-compose.prod.yml docker-compose.yml
cp infra/docker/.env.example .env
# Fill in PRODUCTION values including API keys

docker compose up -d --build

# Run migrations
docker compose exec api npx prisma migrate deploy

# Health check
curl https://yourdomain.com/api/health
```

### Docker Compose Prod Services
- api (Fastify, port 8132)
- web (static, port 3100)
- worker (placeholder)
- db (PostgreSQL 16, port 5433)
- redis (Redis 7, port 6380)
- telegram-bot (placeholder)
- nginx (reverse proxy, ports 80/443)