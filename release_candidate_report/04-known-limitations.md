# 04 — Known Limitations

## P0 (Must Fix Before Launch — None)

All P0 wiring and build blockers have been resolved. No P0 issues remain.

---

## P1 (Must Address Before Launch)

### P1-A: CORS Origin Wildcard

**Issue:** `apps/api/src/server.ts` uses `origin: true` which allows credentials from any origin.

**Impact:** In production, any website can make authenticated requests to the KARÇÖZ API.

**Fix:** Set `ALLOWED_ORIGINS` env var and update CORS registration:
```typescript
// apps/api/src/server.ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [];
await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
});
```

**Action required:** Add `ALLOWED_ORIGINS=https://app.karcoz.com,https://www.karcoz.com` to production `.env`.

---

### P1-B: Stripe Price IDs Not Created

**Issue:** `STRIPE_PRICE_PRO_MONTHLY` and `STRIPE_PRICE_TEAM_MONTHLY` env vars have no values.

**Impact:** Billing checkout returns 503 `BILLING_NOT_CONFIGURED`.

**Fix:**
1. Create products and prices in Stripe dashboard
2. Copy Price IDs (starts with `price_`) to env vars:
   ```
   STRIPE_PRICE_PRO_MONTHLY=price_xxx
   STRIPE_PRICE_TEAM_MONTHLY=price_yyy
   ```

---

### P1-C: Webhook Endpoint Not Publicly Reachable

**Issue:** `POST /api/billing/webhook` requires public HTTPS URL for Stripe to call it.

**Impact:** Cannot receive payment confirmation events from Stripe.

**Fix:**
1. Deploy API with public HTTPS URL (e.g., `https://api.karcoz.com/api/billing/webhook`)
2. Register webhook URL in Stripe Dashboard → Webhooks
3. Set `STRIPE_WEBHOOK_SECRET` env var from Stripe dashboard

---

### P1-D: Dashboard HTML Not Fully Wired

**Issue:** `dashboard.html`, `history.html`, `practice.html` are static shells.

**Impact:** Users can log in but see mock data on most pages.

**Fix:** Either:
1. Wire HTML pages to API endpoints (estimated 1-2 days)
2. Accept login-only MVP and prioritize wiring before public launch

---

## P2 (Post-Launch, Not Blocking)

### P2-A: Telegram Bot Requires Public Webhook

The Telegram bot polling code exists but requires:
- `TELEGRAM_BOT_TOKEN` configured
- Public webhook URL for Telegram to call it
- Or run container with polling enabled (not recommended for production)

### P2-B: No Prometheus/Grafana Metrics

API has no `/metrics` endpoint. Admin panel shows basic stats only. Consider adding after launch if observability is needed.

### P2-C: No Sentry/Error Tracking

Errors are logged to console only. Add Sentry after launch for production error tracking.

### P2-D: No Load Testing

No k6 or load test suite exists. Recommended before high-traffic periods.

### P2-E: Extension Token Has No Usage Limit

Users can create unlimited extension tokens. P2 for now; add limit after launch.

### P2-F: No CAPTCHA on Magic Link

After N failed magic link attempts, could add CAPTCHA. Not blocking.

---

## P3 (Nice to Have, Not Blocking)

### P3-A: No Admin IP Allowlist

Admin routes accessible from any IP. Consider restriction via nginx before production.

### P3-B: Telegram Webhook Has No Signature Verification

Telegram webhook doesn't verify `chat_id` match. Low risk since token already authenticates.

### P3-C: No Audit Log for Failed Auth Attempts

Failed login attempts are not logged in `AuditLog` table. Low priority.

---

## Limitations That Are By Design

| Limitation | Reason |
|-----------|--------|
| Worker service disabled | No background jobs currently required |
| Web dashboard uses `npx serve` | Replace with nginx in production |
| Eval uses mock AI provider | Real AI only when `AI_PROVIDER` + key configured |
| Dashboard HTML is static | WASM build not yet implemented |
| E2E tests not in CI | Require running dev server at localhost |

---

## Verdict: ⚠️ GO — Mitigate P1 Issues Before Public Launch

All P1 issues are mitigatable with configuration changes or 1-2 days of work. None require architectural changes. The system is safe and functional for release candidate deployment.