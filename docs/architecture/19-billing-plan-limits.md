# Billing & Plan Limits

**Phase:** 18
**Status:** Implemented

---

## Overview

KARÇÖZ has a three-tier plan system. No payment is enforced in MVP — the infrastructure is in place for Stripe/Paddle integration without requiring it today.

## Plans

| | Free | Pro | Team |
|---|---|---|---|
| **Daily solves** | 10 | 100 | 500 |
| **Monthly solves** | 100 | 2,000 | 10,000 |
| **Image max size** | 2 MB | 10 MB | 20 MB |
| **History** | Basic (20) | Full | Full |
| **Practice generation** | — | ✅ | ✅ |
| **Telegram summaries** | — | ✅ | ✅ |
| **Advanced analytics** | — | ✅ | ✅ |
| **Priority support** | — | — | ✅ |
| **API access** | — | — | ✅ |
| **Price** | Free | $9/mo | $29/mo |

## Data Model

### User Plan Field

```prisma
model User {
  plan String @default("free") // "free" | "pro" | "team"
}
```

### UsageEvent (per-event tracking)

```prisma
model UsageEvent {
  id        String @id @default(cuid())
  userId    String
  eventType String // "solve" | "solve_image" | "practice_generate" | "telegram_message"
  count     Int @default(1)
  period    String // "daily" | "monthly"
}
```

Tracked per user per event type per period. Periods reset at midnight (daily) and month start (monthly).

### Subscription (future payments)

```prisma
model Subscription {
  id                  String
  userId              String
  plan                String // "free" | "pro" | "team"
  status              String // "active" | "canceled" | "past_due"
  provider            String // "stripe" | "paddle" | "manual"
  providerSubId       String? // external ID from payment provider
  currentPeriodStart  DateTime
  currentPeriodEnd    DateTime
}
```

## Plan Limits Config

`apps/api/src/config/plan-limits.ts` — single source of truth for all plan limits.

```typescript
PLAN_LIMITS = {
  free: { solve: { daily: 10, monthly: 100 }, image: { maxSizeBytes: 2*1024*1024 }, features: { ... } },
  pro:  { solve: { daily: 100, monthly: 2000 }, ... },
  team: { solve: { daily: 500, monthly: 10000 }, ... },
}
```

## Usage Limit Service

`apps/api/src/services/usage-limit.service.ts`

| Method | Description |
|--------|-------------|
| `getUserPlan(userId)` | Returns user's current plan |
| `checkSolveLimit(userId)` | Checks daily/monthly solve count vs plan limit |
| `recordUsage(userId, eventType)` | Records a usage event |
| `checkFeatureAccess(userId, feature)` | Checks if plan has a feature |
| `checkImageSize(userId, sizeBytes)` | Checks image size vs plan limit |
| `getUsageSummary(userId)` | Full usage + limits summary |

## Rate Limit Middleware Changes

The middleware now:
1. Resolves user plan for authenticated requests (`free` for anonymous)
2. Checks plan-specific solve limits before allowing solve/practice requests
3. Records usage events on response (not just raw endpoint counts)
4. Returns `PLAN_LIMIT_EXCEEDED` with usage summary when a plan limit is hit

```
Request → preHandler → rate-limit check (endpoint/minute/daily)
                    → plan solve limit check (daily/monthly solves)
                    → route handler
Response → onResponse → incrementUsage (endpoint counts)
                         → recordUsage (plan events)
```

## Billing Service

`apps/api/src/services/billing.service.ts` — **placeholder implementation**.

| Method | Real integration |
|--------|-----------------|
| `createCheckoutSession` | Stripe Checkout or Paddle subscription |
| `handleWebhookEvent` | Stripe webhooks or Paddle webhooks |
| `getSubscription` | Stripe Customer/Paddle subscription |
| `cancelSubscription` | Cancel at period end |
| `changePlan` | Direct plan change (no payment needed) |
| `listAvailablePlans` | Static from plan config |

All methods log placeholder messages and return mock data. To enable real payments, replace the method bodies and add env vars.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/billing/plan` | Session | Full plan overview: subscription + usage + available plans |
| GET | `/api/billing/usage` | Session | Current usage vs plan limits |
| POST | `/api/billing/checkout-placeholder` | Session | Create checkout session (placeholder) |
| POST | `/api/billing/webhook-placeholder` | None | Handle payment webhook (placeholder) |
| POST | `/api/billing/cancel` | Session | Cancel active subscription |
| POST | `/api/billing/change-plan` | Session | Change plan directly (no payment) |

## Feature Flags (per plan)

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| `history` | `"basic"` | `"full"` | `"full"` |
| `practiceGeneration` | `false` | `true` | `true` |
| `telegramSummaries` | `false` | `true` | `true` |
| `advancedAnalytics` | `false` | `true` | `true` |
| `prioritySupport` | `false` | `false` | `true` |
| `apiAccess` | `false` | `false` | `true` |

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `PLAN_LIMIT_EXCEEDED` | 429 | User's daily/monthly solve limit reached |
| `FEATURE_NOT_AVAILABLE` | 403 | Feature not in user's plan |
| `IMAGE_TOO_LARGE` | 413 | Image exceeds plan's max size |
| `RATE_LIMITED` | 429 | Endpoint rate limit (per-minute/daily) |

## Adding Real Payments

**Stripe:**
1. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` to env
2. Replace `createCheckoutSession` with `stripe.checkout.sessions.create({ mode: 'subscription', ... })`
3. Replace `handleWebhookEvent` with Stripe webhook signature verification + event dispatch
4. In webhook handler: update `Subscription` table, call `prisma.user.update({ plan })`

**Paddle:**
1. Add `PADDLE_VENDOR_ID`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_KEY` to env
2. Replace methods with Paddle SDK calls
3. Same DB update pattern in webhook handler

## Making a User Pro (without payment)

```sql
UPDATE "User" SET plan = 'pro' WHERE email = 'user@example.com';
```

Or via admin API:
```bash
curl -X PATCH /api/admin/users/:id \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro"}'
```