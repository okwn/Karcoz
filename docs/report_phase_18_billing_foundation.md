# Phase 18 — Billing & Plan Limits Foundation

**Date:** 2026-05-17
**Status:** ✅ Implemented

---

## Goal

Add paid plan infrastructure for KARÇÖZ without requiring payment integration in MVP. Build the plan limit enforcement system, usage tracking, feature gates, and billing API abstraction — ready for Stripe/Paddle when needed.

---

## What Was Built

### Schema Additions (`apps/api/prisma/schema.prisma`)

**`User.plan`** — `String @default("free")` — values: `"free" | "pro" | "team"`. Existing users default to `"free"`.

**`UsageEvent`** — per-event, per-period usage tracking:
```
userId    String  // keyed to User
eventType String  // "solve" | "solve_image" | "practice_generate" | "telegram_message"
count     Int     @default(1)
period    String  // "daily" | "monthly"
```
Unlike `UsageRecord` which tracks raw endpoint hits, `UsageEvent` tracks meaningful billable actions.

**`Subscription`** — payment provider subscription state:
```
userId, plan, status, provider, providerSubId,
currentPeriodStart, currentPeriodEnd, canceledAt
```

---

### Plan Limits Config (`apps/api/src/config/plan-limits.ts`)

Single source of truth for all plan limits:

```typescript
PLAN_LIMITS = {
  free:  { solve: { daily: 10, monthly: 100 },    imageMaxBytes: 2MB,  features: { practiceGeneration: false, ... } },
  pro:   { solve: { daily: 100, monthly: 2000 },  imageMaxBytes: 10MB, features: { practiceGeneration: true,  ... } },
  team:  { solve: { daily: 500, monthly: 10000 }, imageMaxBytes: 20MB, features: { practiceGeneration: true,  ... } },
}
```

Exports: `getPlanLimits()`, `hasFeature()`, `getSolveLimit()`, `getImageMaxBytes()`.

---

### Usage Limit Service (`apps/api/src/services/usage-limit.service.ts`)

| Method | Description |
|--------|-------------|
| `getUserPlan(userId)` | Reads `User.plan` |
| `checkSolveLimit(userId)` | Returns `{ allowed, usage }` vs daily/monthly limits |
| `recordUsage(userId, eventType)` | Creates daily + monthly UsageEvent rows |
| `checkFeatureAccess(userId, feature)` | Returns `{ allowed, reason }` for feature gates |
| `checkImageSize(userId, sizeBytes)` | Returns `{ allowed, maxBytes }` |
| `getUsageSummary(userId)` | Full usage snapshot for billing API |

---

### Billing Service (`apps/api/src/services/billing.service.ts`)

**Placeholder** — all methods log what they would do and return mock data. Ready for real Stripe/Paddle replacement without API signature changes.

| Method | Real integration |
|--------|-----------------|
| `createCheckoutSession` | `stripe.checkout.sessions.create(...)` |
| `handleWebhookEvent` | Stripe webhook handler / Paddle webhook handler |
| `getSubscription` | Stripe Customer / Paddle subscription |
| `cancelSubscription` | Cancel at period end |
| `changePlan` | Direct plan change (no payment) |
| `listAvailablePlans` | Static from plan config |

---

### Rate Limit Middleware (`apps/api/src/middleware/rate-limit.ts`)

Rewritten to:
1. Resolve authenticated user's plan (fallback `free` for anonymous)
2. **Check plan solve limits** before allowing solve/practice requests → `PLAN_LIMIT_EXCEEDED` (429)
3. **Record `UsageEvent`** on response (not just raw endpoint counts)
4. Continue to check standard endpoint rate limits (minute/daily)

---

### Billing Routes (`apps/api/src/routes/billing.routes.ts`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/plan` | Full overview: subscription + usage + available plans |
| GET | `/api/billing/usage` | Current usage vs limits |
| POST | `/api/billing/checkout-placeholder` | Create mock checkout session |
| POST | `/api/billing/webhook-placeholder` | Acknowledge payment webhooks |
| POST | `/api/billing/cancel` | Cancel active subscription |
| POST | `/api/billing/change-plan` | Direct plan change (no payment) |

---

### Shared Schemas (`packages/shared/src/schemas.ts`)

Added: `PlanNameSchema`, `PlanUsageSchema`, `CheckoutRequestSchema`, `CheckoutResponseSchema`, `WebhookPayloadSchema`, `SubscriptionInfoSchema`, `PlanFeatureSchema`, `BillingOverviewSchema`.

---

### Server Wiring

```typescript
import { registerBillingRoutes } from './routes/billing.routes.js';
// ...
registerBillingRoutes(app, prisma); // after admin, last
```

---

## Verification

```bash
$ pnpm --filter @karcoz/api typecheck
> tsc --noEmit   # ✅ zero errors

$ cd apps/api && pnpm db:generate
> prisma generate   # ✅ new models registered
```

---

## Usage Enforcement Flow

```
POST /api/solve/text (authenticated, free user, 9 solves today)
  ↓
preHandler hook
  → rate-limit check (endpoint/minute/daily) — PASS
  → usageLimitService.getUserPlan(userId) → "free"
  → usageLimitService.checkSolveLimit(userId)
      dailyCount=9, dailyLimit=10 → allowed ✅
  → proceed to route handler
  → solve returns result
  ↓
onResponse hook
  → usageService.incrementUsage(userId, endpoint, 'daily')  [old raw count]
  → usageLimitService.recordUsage(userId, 'solve')          [new event]
      → creates UsageEvent(userId, "solve", "daily")
      → creates UsageEvent(userId, "solve", "monthly")

POST /api/solve/text (10th solve, now at limit)
  → checkSolveLimit → allowed=false, reason="Daily limit reached"
  → 429 PLAN_LIMIT_EXCEEDED with usage summary
```

---

## Upgrading a User Without Payment

```sql
UPDATE "User" SET plan = 'pro' WHERE email = 'user@example.com';
```

---

## Limitations

- **Payment providers**: Stripe/Paddle are stubbed. Real integration requires adding env vars and replacing method bodies in `billing.service.ts`.
- **Image size enforcement**: `checkImageSize()` exists but is not yet wired into the solve/image route handler — the actual image size check in `solve.service.ts` uses the old 15MB hardcoded limit.
- **Feature gates**: `checkFeatureAccess()` is available but not yet called from `practice.routes.ts` or other feature-gated routes — `practiceGeneration: true` feature is currently available to all plans.
- **Webhook security**: `webhook-placeholder` does no signature verification. Real webhooks must verify `Stripe-Signature` / Paddle webhook headers.

---

## Next Steps

1. Wire `checkImageSize` into `solve.service.ts` solve image path
2. Add feature gate calls to `practice.routes.ts` for `practiceGeneration` feature
3. Add `FEATURE_NOT_AVAILABLE` error responses to Telegram summaries + analytics routes
4. Add `STRIPE_SECRET_KEY` + implement real `createCheckoutSession` + `handleWebhookEvent`
5. Add real `cancelSubscription` that calls Stripe API
6. Build billing dashboard page in web-dashboard (`/settings/billing`)
7. Add plan-gated model selection (Pro/Team get faster models — already stored in `ModelConfig.modelName`)