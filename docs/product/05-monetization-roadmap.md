# Monetization Roadmap

**Phase:** 18
**Status:** Foundation implemented — payment integration not yet active

---

## Plan Tiers

| Feature | Free | Pro ($9/mo) | Team ($29/mo) |
|---------|------|-------------|---------------|
| Daily solves | 10 | 100 | 500 |
| Monthly solves | 100 | 2,000 | 10,000 |
| Image upload | 2 MB | 10 MB | 20 MB |
| History | 20 items | Full | Full |
| Practice generator | — | ✅ | ✅ |
| Telegram summaries | — | ✅ | ✅ |
| Advanced analytics | — | ✅ | ✅ |
| Priority support | — | — | ✅ |
| API access | — | — | ✅ |

---

## Current State (MVP)

- ✅ Plan limits enforced per user (daily/monthly solves)
- ✅ Feature gates on practice, Telegram, analytics
- ✅ `User.plan` field in DB (`free | pro | team`)
- ✅ `UsageEvent` tracking per event type
- ✅ `Subscription` table ready for payment providers
- ✅ `billing.service.ts` placeholder with documented real-integration signatures
- ✅ `POST /api/billing/checkout-placeholder` returns mock sessions
- ✅ `POST /api/billing/webhook-placeholder` acknowledges all events

**Payment is not required.** Users can be upgraded via:
```sql
UPDATE "User" SET plan = 'pro' WHERE email = 'user@example.com';
```

Or via admin panel (`PATCH /api/admin/users/:id`).

---

## Roadmap

### Phase 1 — Now (this implementation)
- [x] Plan limits per user (solves, features)
- [x] Usage tracking with daily/monthly resets
- [x] Feature gate middleware
- [x] Billing service abstraction (Stripe/Paddle stubs)
- [x] Subscription table

### Phase 2 — Stripe Integration
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` to env
- [ ] Replace `createCheckoutSession` in `billing.service.ts`
- [ ] Add Stripe webhook signature verification
- [ ] Handle events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Test with Stripe test mode

### Phase 3 — Paddle Integration (alternative)
- [ ] Add `PADDLE_VENDOR_ID`, `PADDLE_API_KEY` to env
- [ ] Replace `createCheckoutSession` and `handleWebhookEvent`
- [ ] Handle Paddle events: `subscription.created`, `subscription.canceled`, `subscription.payment_failed`

### Phase 4 — Billing Dashboard
- [ ] Billing page in web dashboard (`/settings/billing`)
- [ ] Show current plan + usage
- [ ] Upgrade/downgrade/cancel buttons
- [ ] Invoice history (from Stripe/Paddle)
- [ ] Update payment method

### Phase 5 — Team Billing
- [ ] Team seats tracking in `Subscription` model
- [ ] Per-seat billing
- [ ] Team admin who can add/remove members
- [ ] Team workspace (shared questions + history)

### Phase 6 — Usage-based Billing
- [ ] Track actual solve + API call counts
- [ ] Overage pricing for free plan
- [ ] Prorated upgrades mid-cycle

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/config/plan-limits.ts` | Plan feature matrix |
| `apps/api/src/services/usage-limit.service.ts` | Per-plan limit checks |
| `apps/api/src/services/billing.service.ts` | Payment provider abstraction |
| `apps/api/src/routes/billing.routes.ts` | Billing API endpoints |
| `apps/api/src/middleware/rate-limit.ts` | Plan enforcement in request pipeline |
| `apps/api/prisma/schema.prisma` | `User.plan`, `UsageEvent`, `Subscription` |
| `packages/shared/src/schemas.ts` | Billing Zod schemas |

---

## Environment Variables (future)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_TEAM=price_...

# Paddle (alternative)
PADDLE_VENDOR_ID=12345
PADDLE_API_KEY=pdl_live_...
PADDLE_WEBHOOK_KEY=...

# App
BILLING_PROVIDER=stripe  # or "paddle" or "manual"
```