# Billing API Reference

**Base URL:** `/api/billing`
**Authentication:** Session cookie required.

---

## GET `/api/billing/plan`

Returns the user's current subscription, usage summary, and available plans.

**Response:**
```json
{
  "subscription": {
    "plan": "free",
    "status": "none",
    "provider": null,
    "currentPeriodEnd": null,
    "cancelAtPeriodEnd": false
  },
  "usage": {
    "plan": "free",
    "dailyCount": 3,
    "dailyLimit": 10,
    "monthlyCount": 47,
    "monthlyLimit": 100,
    "dailyRemaining": 7,
    "monthlyRemaining": 53,
    "resetDailyAt": 1747526400000,
    "resetMonthlyAt": 1748803200000
  },
  "availablePlans": [
    {
      "id": "free",
      "name": "Free",
      "price": { "monthly": 0, "currency": "USD" },
      "features": ["10 solves/day, 100/month", "Basic history (20 items)", "Standard speed"]
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": { "monthly": 9, "currency": "USD" },
      "features": [...]
    }
  ]
}
```

---

## GET `/api/billing/usage`

Returns current usage against plan limits.

**Response:** Same `usage` object as above (daily/monthly counts and limits).

---

## POST `/api/billing/checkout-placeholder`

Creates a checkout session for upgrading to a paid plan. **Currently a placeholder** — returns a mock redirect URL.

**Request body:**
```json
{
  "plan": "pro",
  "provider": "stripe"
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `plan` | `free \| pro \| team` | required | Target plan |
| `provider` | `stripe \| paddle` | `stripe` | Payment provider |
| `successUrl` | URL | `/settings?billing=success` | Redirect on success |
| `cancelUrl` | URL | `/settings?billing=canceled` | Redirect on cancel |

**Response:**
```json
{
  "url": "/settings?billing=canceled&provider=stripe&plan=pro&placeholder=true",
  "sessionId": "cs_placeholder_1747526400000",
  "provider": "stripe"
}
```

**Errors:**
- `400 INVALID_REQUEST` — validation failed
- `400 INVALID_PLAN` — cannot checkout for free plan

---

## POST `/api/billing/webhook-placeholder`

Receives and acknowledges payment provider webhooks. **Currently a no-op placeholder.**

**Request body:**
```json
{
  "provider": "stripe",
  "eventId": "evt_123",
  "eventType": "checkout.session.completed",
  "data": {}
}
```

**Response:**
```json
{ "processed": true, "action": "acknowledged_placeholder" }
```

**TODO (real integration):**
- Verify webhook signature
- Handle `checkout.session.completed` → create/update Subscription, set User.plan
- Handle `customer.subscription.deleted` → set status to `canceled`
- Handle `invoice.payment_failed` → set status to `past_due`

---

## POST `/api/billing/cancel`

Cancels the user's active subscription.

**Response:**
```json
{
  "message": "Subscription canceled. You have access until the end of the billing period."
}
```

**Errors:**
- `404 NOT_FOUND` — no active subscription found

---

## POST `/api/billing/change-plan`

Changes the user's plan directly (no payment flow). Use for manual upgrades, trials, or promotions.

**Request body:** `"pro"` (plan name as string, or use `PlanNameSchema`)

**Response:**
```json
{
  "success": true,
  "message": "Plan changed to Pro. Changes take effect immediately."
}
```

---

## Plan Limits by Endpoint

| Endpoint | Limit check | Event recorded |
|----------|------------|----------------|
| `POST /api/solve/image` | Plan solve limit | `solve_image` |
| `POST /api/solve/text` | Plan solve limit | `solve` |
| `POST /api/practice/generate` | Plan solve limit | `practice_generate` |
| All others | Endpoint rate limit only | No event |

## Error Responses

Plan limit exceeded:
```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Daily solve limit reached (10/day). Resets at midnight.",
    "usage": { "plan": "free", "dailyCount": 10, "dailyLimit": 10, ... }
  }
}
```

Feature not available:
```json
{
  "error": {
    "code": "FEATURE_NOT_AVAILABLE",
    "message": "This feature is not available on your Free plan."
  }
}
```

Image too large:
```json
{
  "error": {
    "code": "IMAGE_TOO_LARGE",
    "message": "Image exceeds maximum size for your plan (2 MB). Upgrade to Pro for 10 MB."
  }
}
```