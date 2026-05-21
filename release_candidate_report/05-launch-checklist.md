# 05 — Launch Checklist

## Pre-Launch P1 Actions (Must Complete)

### P1-A: CORS Configuration
```
[ ] Set ALLOWED_ORIGINS env var to specific production domain(s)
[ ] Example: ALLOWED_ORIGINS=https://app.karcoz.com,https://www.karcoz.com
[ ] Update apps/api/src/server.ts to use allowedOrigins array
[ ] Test: curl -X OPTIONS -H "Origin: https://evil.com" --fail → should not be allowed
```

### P1-B: Stripe Configuration
```
[ ] Create Stripe account and get API keys (sk_live_... or sk_test_...)
[ ] Create Products: "KARÇÖZ Pro" and "KARÇÖZ Team" in Stripe dashboard
[ ] Create Price IDs for monthly subscriptions
[ ] Set STRIPE_SECRET_KEY=sk_live_...
[ ] Set STRIPE_PRICE_PRO_MONTHLY=price_...
[ ] Set STRIPE_PRICE_TEAM_MONTHLY=price_...
[ ] Set STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe dashboard webhook endpoint)
```

### P1-C: Public Webhook URL
```
[ ] Deploy API to public HTTPS URL
[ ] Register https://api.karcoz.com/api/billing/webhook in Stripe Dashboard
[ ] Register https://api.karcoz.com/api/telegram/webhook in Telegram Bot Settings
[ ] Verify webhook is reachable: curl -I https://api.karcoz.com/api/billing/webhook
```

### P1-D: Dashboard Wiring (Optional for Login-Only MVP)
```
[ ] Wire dashboard.html, history.html, practice.html to API endpoints
[ ] Or accept login-only MVP and prioritize wiring after launch
```

---

## Production Server Setup

### First-time Deploy
```bash
# 1. Clone repository
git clone <repo-url> /opt/karcoz
cd /opt/karcoz

# 2. Create production .env
cp infra/docker/.env.example /opt/karcoz/.env
# Fill in all required values (DB_PASSWORD, SESSION_SECRET, REDIS_PASSWORD,
# MAGIC_LINK_BASE_URL, APP_BASE_URL, ALLOWED_ORIGINS, Stripe keys, AI keys)

# 3. Start database and redis
docker compose -f infra/docker/docker-compose.prod.yml up -d db redis
sleep 15

# 4. Run migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate deploy

# 5. Verify migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate status

# 6. Start all services
docker compose -f infra/docker/docker-compose.prod.yml up -d

# 7. Smoke test
bash scripts/smoke-api.sh http://localhost:8132

# 8. Configure TLS (see P1-C)
sudo certbot --nginx -d yourdomain.com
```

### Subsequent Deploys
```bash
cd /opt/karcoz
git pull origin main
docker compose -f infra/docker/docker-compose.prod.yml build --parallel
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

---

## Rollback Commands

### Rollback to Previous Code
```bash
cd /opt/karcoz
git log --oneline -5
git checkout <previous-commit-hash>
docker compose -f infra/docker/docker-compose.prod.yml build --parallel
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

### Rollback to Previous Image
```bash
docker images | grep karcoz
docker compose -f infra/docker/docker-compose.prod.yml stop
docker run --rm -v karcoz_pgdata:/data ...  # restore volume if needed
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

### Database Rollback
```bash
bash scripts/restore-db.sh infra/docker/backups/karcoz_db_YYYYMMDD_HHMMSS.sql.gz
```

---

## Post-Launch Monitoring (First 24 Hours)

### Immediate Health Checks
```
[ ] Verify API health: curl https://api.karcoz.com/health
[ ] Verify web dashboard: curl https://app.karcoz.com/
[ ] Check Docker containers: docker compose -f infra/docker/docker-compose.prod.yml ps
[ ] Check API logs: docker compose -f infra/docker/docker-compose.prod.yml logs api --tail=50
[ ] Check DB logs: docker compose -f infra/docker/docker-compose.prod.yml logs db --tail=20
[ ] Check Redis: docker exec karcoz_redis redis-cli -a $REDIS_PASSWORD ping
```

### Key Metrics to Watch
```
[ ] API response time (should be < 2s for solve endpoints)
[ ] Error rate (watch for 500 errors in logs)
[ ] DB connection count (should be < 20)
[ ] Redis memory usage (should be stable)
[ ] CPU/memory usage of containers
```

### Alert Signs
- API health endpoint returns non-200
- Error rate > 1%
- DB connection pool exhausted
- Redis OOM
- Container restart loops

---

## Post-Launch Monitoring (First 7 Days)

### Daily Checks
```
[ ] Review error logs for new patterns
[ ] Monitor Stripe webhook delivery success rate
[ ] Check usage against plan limits (watch for unusual spikes)
[ ] Verify backups are running (check /opt/karcoz/infra/docker/backups/)
[ ] Monitor Redis memory (watch for growth)
```

### Weekly Checks
```
[ ] Review admin audit logs for suspicious activity
[ ] Check Telegram bot for any failed message deliveries
[ ] Review performance metrics (P50/P95/P99 latency)
[ ] Test backup restore procedure on a separate instance
```

---

## Verification Commands Reference

```bash
# All gates pass
bash scripts/release-check.sh

# Docker prod config
docker compose -f infra/docker/docker-compose.prod.yml config --quiet

# Docker dev config
docker compose -f infra/docker/docker-compose.yml config --quiet

# API health
curl -s http://localhost:8132/health | jq .

# DB health
docker exec karcoz_db pg_isready -U karcoz -d karcoz_db

# Redis health
docker exec karcoz_redis redis-cli -a $REDIS_PASSWORD ping

# Logs
docker compose -f infra/docker/docker-compose.prod.yml logs -f --tail=100 api

# Container status
docker compose -f infra/docker/docker-compose.prod.yml ps

# Backup
bash scripts/backup-db.sh

# Smoke test
bash scripts/smoke-api.sh http://localhost:8132
```

---

## Verdict: ✅ LAUNCH READY WITH MITIGATIONS

Complete all P1 pre-launch actions. Run deploy commands. Monitor first 24 hours using the checklist above.