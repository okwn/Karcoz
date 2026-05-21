# 04 — Billing: Stripe Plan Limits

## Purpose
Replace billing stubs with a safe, real billing foundation. No plan changes without verified payment webhook. Consistent quota enforcement with 429 responses.

---

## What Changed

### 1. Stripe Configuration

**`apps/api/src/config/env.ts`** — Added Stripe env vars:
```bash
STRIPE_SECRET_KEY=sk_live_...      # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...   # Stripe webhook signing secret
STRIPE_PRICE_PRO_MONTHLY=price_...  # Stripe price ID for Pro monthly
STRIPE_PRICE_TEAM_MONTHLY=price_...  # Stripe price ID for Team monthly
APP_BASE_URL=https://app.karcoz.com  # Used for checkout redirect URLs
```

### 2. Billing Service

**`apps/api/src/services/billing.service.ts`** — Replaced placeholder with real Stripe integration:

| Method | Behavior |
|---|---|
| `createCheckoutSession(userId, plan, successUrl, cancelUrl)` | Creates Stripe Checkout Session with `mode: 'subscription'`, metadata `{userId, plan}`, returns `{url, sessionId, provider: 'stripe'}` |
| `getSubscription(userId)` | Reads from `Subscription` table (joined with `User` for default plan) |
| `cancelSubscription(userId)` | Calls `stripe.subscriptions.update(cancel_at_period_end: true)` for Stripe subs; graceful fallback without Stripe |
| `handleStripeWebhook(rawBody, signature)` | Verifies Stripe signature, dispatches to event handler |
| `handleWebhookEvent(payload)` | Non-signature path for testing |
| `listAvailablePlans()` | Returns free/pro/team with feature lists |
| `isCheckoutAvailable()` | `true` when all Stripe env vars are set |

**Webhook events handled:**
- `checkout.session.completed` → upgrades user plan after verified payment
- `customer.subscription.updated` → syncs status/period end
- `customer.subscription.deleted` → downgrades to free
- `invoice.payment_failed` → downgrades to free gracefully

**Safety properties:**
- Plan is updated in DB only after verified Stripe webhook
- No direct `user.plan` mutation from checkout
- `changePlan(userId, 'free')` only for downgrades (no checkout needed)
- All errors logged, no secrets exposed in responses

### 3. Billing Routes

**`apps/api/src/routes/billing.routes.ts`** — Updated endpoints:

| Endpoint | Change |
|---|---|
| `POST /api/billing/checkout` | New (replaces `checkout-placeholder`). 503 when Stripe not configured. Returns `{url, sessionId, provider}` |
| `POST /api/billing/webhook` | New (replaces `webhook-placeholder`). Uses raw body for signature verification. Reads `stripe-signature` header |
| `POST /api/billing/change-plan` | Disabled for paid plans (403 + `CHECKOUT_REQUIRED`). Only `free` allowed directly |
| `GET /api/billing/plan` | Added `checkoutAvailable` field |
| `GET /api/billing/usage` | Added for usage details |

**Webhook route** — Raw body access via `addContentTypeParser`:
```typescript
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  (req as FastifyRequest & { rawBody?: string }).rawBody = body as string;
  done(null, JSON.parse(body as string));
});
```

### 4. Schema Change

**`apps/api/prisma/schema.prisma`** — `Subscription.userId` is now `@unique`:
```prisma
model Subscription {
  userId String @unique  # was: String (no unique constraint)
}
```
This allows `prisma.subscription.findUnique({ where: { userId } })` by primary key, ensuring one active subscription per user.

### 5. Server Setup

**`apps/api/src/server.ts`** — Added raw body parser for webhook signature verification:
- Uses `addContentTypeParser` to capture raw body before JSON parsing
- Stores `rawBody` on the request object for webhook route access

### 6. Plan Enforcement

**`apps/api/src/routes/solve.routes.ts`** — Added quota check before solving:
```typescript
if (ctx.userId) {
  const limitCheck = await usageLimitService.checkSolveLimit(ctx.userId);
  if (!limitCheck.allowed) {
    return reply.status(429).send({
      error: {
        code: 'QUOTA_EXCEEDED',
        message: limitCheck.reason,
        details: {
          plan: limitCheck.usage.plan,
          dailyLimit: limitCheck.usage.dailyLimit,
          monthlyLimit: limitCheck.usage.monthlyLimit,
          resetDailyAt: limitCheck.usage.resetDailyAt.getTime(),
          resetMonthlyAt: limitCheck.usage.resetMonthlyAt.getTime(),
        },
        requestId,
      },
    });
  }
}
```

**Usage recording** — Both `solve/image` and `solve/text` now record as `solve` event type for unified quota tracking (free: 10/day, pro: 100/day, team: 500/day).

### 7. Dashboard Billing Page

**`apps/web-dashboard/public/billing.html`** — Updated:
- Uses `window.KARCOZ.getBillingPlan()`, `window.KARCOZ.cancelBilling()`
- Shows `checkoutAvailable` — hides upgrade buttons with "Coming Soon" if Stripe not configured
- Shows `not-configured` notice with yellow border when Stripe unavailable
- Upgrade buttons redirect to Stripe Checkout URL on success
- Cancel button calls cancel API with confirmation
- Auth guard via `window.KARCOZ.requireAuth()`

---

## Validation Results

```
✅ typecheck  → 0 errors across 7 workspaces
✅ lint       → 0 errors (168 warnings pre-existing)
✅ test       → 53/53 tests passed
✅ build      → all packages compile
```

---

## Tests Added

| Test | File | Coverage |
|---|---|---|
| `POST /api/billing/checkout` requires session auth | `routes.test.ts` | Returns 401 without session |
| `POST /api/billing/checkout` returns 503 when Stripe missing | `routes.test.ts` | Clear `BILLING_NOT_CONFIGURED` error |
| `POST /api/billing/webhook` missing signature returns 400 | `routes.test.ts` | `MISSING_SIGNATURE` code |
| `POST /api/billing/webhook` rejects invalid sig | `routes.test.ts` | `WEBHOOK_FAILED` |
| `POST /api/billing/change-plan` blocks paid plan upgrades | `routes.test.ts` | `CHECKOUT_REQUIRED` 403 |
| `POST /api/billing/change-plan` allows free downgrade | `routes.test.ts` | 200 success |

---

## Billing Flow

```
User clicks "Upgrade to Pro"
  → POST /api/billing/checkout { plan: 'pro' }
    → 503 if Stripe not configured
    → Creates Stripe Checkout Session with userId+plan metadata
    → Returns { url: 'https://checkout.stripe.com/...' }
  → Browser redirects to Stripe Checkout
  → User enters payment details on Stripe
  → Stripe sends POST /api/billing/webhook
    → Stripe-Signature header verified
    → checkout.session.completed event
      → Creates/updates Subscription record
      → Updates User.plan = 'pro' ← only place plan is set
      → Returns 200 to Stripe
  → Browser redirected to /settings?billing=success
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes (for billing) | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes (for webhooks) | `whsec_...` from Stripe dashboard |
| `STRIPE_PRICE_PRO_MONTHLY` | Yes (for checkout) | Stripe Price ID for Pro monthly plan |
| `STRIPE_PRICE_TEAM_MONTHLY` | Yes (for checkout) | Stripe Price ID for Team monthly plan |
| `APP_BASE_URL` | Yes | Used to construct success/cancel redirect URLs |

---

## Webhook Events Supported

| Event | Action |
|---|---|
| `checkout.session.completed` | Create/update Subscription, set `User.plan` |
| `customer.subscription.updated` | Sync status, `currentPeriodEnd`, `canceledAt` |
| `customer.subscription.deleted` | Set `Subscription.status = canceled`, downgrade user to `free` |
| `invoice.payment_failed` | Set `Subscription.status = past_due`, graceful downgrade to `free` |

---

## Safety Properties

- **No fake subscriptions**: Plan is never set directly from API — only from verified webhook
- **No direct plan mutation**: `change-plan` to paid requires `checkout` → Stripe → webhook chain
- **Signature verification**: Webhook endpoint rejects requests without valid Stripe signature
- **Graceful downgrade**: `invoice.payment_failed` downgrades to free rather than locking account
- **Audit trail**: All subscription state changes go through `Subscription` table with timestamps

---

## Remaining Limitations

| Issue | Severity | Notes |
|---|---|---|
| No Stripe Price IDs created yet | P0 | Must create products/prices in Stripe dashboard |
| No refund handling | P2 | No `invoice.payment_succeeded` reconciliation |
| No invoice history page | P2 | Billing page shows plan/usage only |
| Webhook URL must be configured in Stripe | P0 | `POST /api/billing/webhook` must be publicly reachable |
| No retry logic for failed webhook processing | P2 | Stripe retries automatically, but internal errors are not retried |
| Team plan > 1 seat not enforced | P1 | `team` plan accepts payment but seat management is not implemented |

---

## Readiness Score

| Area | Score | Notes |
|---|---|---|
| Checkout flow | ✅ 90% | Works with Stripe; needs real price IDs |
| Webhook security | ✅ 90% | Signature verification; needs public URL |
| Plan enforcement | ✅ 85% | Solves checked; practice generation not yet enforced |
| Direct plan change blocked | ✅ 100% | 403 for paid plan upgrades |
| Dashboard billing page | ✅ 85% | Shows checkout unavailable when Stripe missing |
| Tests | ✅ 85% | Key billing paths covered; no live Stripe test |
| DB schema | ✅ 100% | `Subscription.userId @unique` |

**Overall: ⚠️ READY_WITH_LIMITATIONS**

Core billing infrastructure is in place and safe. The main gaps are creating real Stripe Price IDs and exposing the webhook endpoint publicly.
