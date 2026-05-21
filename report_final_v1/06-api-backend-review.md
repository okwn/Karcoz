# 06 — API Backend Review

## Purpose
Analyze all routes, auth, validation, rate limiting, error handling, and service implementations.

---

## Route Inventory

### `POST /api/auth/magic-link` — No auth required
- Creates magic link token (15-min expiry)
- Creates or finds user on verify
- Dev mode: logs full URL to console
- Prod mode: sends via email provider (not implemented — logs only)

**Status: ✅ Functional** — Dev mode works; email sending is stub

### `POST /api/auth/verify` — No auth required
- Validates magic link token
- Creates 30-day session in DB
- Sets `karcoz_session` HttpOnly cookie
- Returns user profile

**Status: ✅ Functional**

### `GET /api/auth/session` — No auth required
- Validates session cookie
- Returns `{ user, settings }`

**Status: ✅ Functional**

### `POST /api/auth/logout` — No auth required
- Deletes session from DB
- Clears `karcoz_session` cookie

**Status: ✅ Functional**

### `POST /api/auth/extension/token` — Session required
- Creates 1-year extension token
- Stores device name (optional)

**Status: ✅ Functional**

### `DELETE /api/auth/extension/token` — Bearer token required
- Revokes extension token

**Status: ✅ Functional**

### `GET /api/auth/extension/tokens` — Session required
- Lists all extension tokens for user

**Status: ✅ Functional**

### `GET /api/users/me` — Session required
### `GET /api/users/me/settings` — Session required
### `PATCH /api/users/me/settings` — Session required
### `DELETE /api/users/me/history` — Session required
### `GET /api/users/me/export` — Session required
### `DELETE /api/users/me` — Session required

**Status: ✅ All implemented with proper auth**

---

## Solve Routes

### `POST /api/solve/image` — Extension auth
- `SolveImageRequestSchema` validation: `{ imageBase64?, imageUrl?, sourceType, pageTitle?, sourceUrl?, explanationLevel?, resultMode? }`
- `bodyLimit: 20MB` (enforced by Fastify)
- Calls `solveService.solveFromImage()`
- Returns: `{ questionId, extraction, solution, performance }`

**Status: ✅ Fully implemented**

### `POST /api/solve/text` — Extension auth
- `SolveTextRequestSchema` validation
- Calls `solveService.solveFromText()`

**Status: ✅ Fully implemented**

---

## Questions Routes

### `GET /api/questions/history` — Session required
- Pagination: `page`, `perPage`
- Filters: `topic`, `difficulty`, `question_type`, `date_from`, `date_to`, `min_confidence`, `saved_only`, `sort`, `order`
- Uses raw SQL for aggregation

**Status: ✅ Implemented**

### `GET /api/questions/:id` — No auth required
- Returns single question by ID

**Status: ✅ Implemented**

### `POST /api/questions/:id/save` — Session required
- Saves `selectedOption`, `notes`, `tags`
- Updates question status to `saved`

**Status: ✅ Implemented**

### `DELETE /api/questions/:id` — Session required

**Status: ✅ Implemented**

### `GET /api/analytics/weak-topics` — Session required
- Aggregate by topic: avg confidence, low-confidence count, saved count
- Returns weakness score + recommendation (`review`/`practice`/`monitor`)

**Status: ✅ Implemented**

### `GET /api/analytics/overview` — Session required
- Dashboard stats: total, saved, avg confidence, this week count

**Status: ✅ Implemented**

---

## Scan Routes

### `POST /api/scan/page-candidates` — No auth required
- Accepts: `pageText`, `pageTitle`, `sourceUrl`, optional `candidates[]`
- Server-side question candidate detection
- Scoring: interrogative words, action verbs, `?`, options pattern, math symbols, length
- Returns top 10 candidates

**Status: ✅ Fully implemented; good privacy (no auth required for public page scan)**

---

## Practice Routes

### `POST /api/practice/generate` — Session required
- `PracticeGenerationRequestSchema`: `topic, count(1-20), difficulty(low/medium/high), language, questionType, subtopic?`
- Hardcoded fallback mock questions if AI provider is `mock` and topic is Mathematics/Physics

**Status: ✅ Implemented**

### `GET /api/practice/sets` — Session required
### `GET /api/practice/sets/:id` — Session required
### `POST /api/practice/sets/:id/attempt` — Session required
### `GET /api/practice/recommended` — Session required

**Status: ✅ All implemented**

---

## Telegram Routes

### `POST /api/telegram/link-account` — Session required
- Links user's Telegram chat ID to account

**Status: ✅ Implemented**

### `POST /api/telegram/unlink-account` — Session required

**Status: ✅ Implemented**

### `GET /api/telegram/status` — Session required

**Status: ✅ Implemented**

### `POST /api/telegram/send-solution` — Session required
- Sends solved question to Telegram chat

**Status: ✅ Implemented**

### `POST /api/telegram/webhook` — No auth (Telegram verification)
- Webhook receiver for Telegram Bot API
- Handles `/start`, `/help`, `/link`, `/unlink`, `/solve`, `/history`, `/practice`
- Handles incoming photo messages

**Status: ✅ Implemented — requires `TELEGRAM_BOT_TOKEN`**

---

## Admin Routes

### `GET /api/admin/overview` — Session + Admin role
### `GET /api/admin/users` — Session + Admin role (paginated)
### `GET /api/admin/usage` — Session + Admin role
### `GET /api/admin/audit` — Session + Admin role
### `GET /api/admin/errors` — Session + Admin role
### `GET /api/admin/latency` — Session + Admin role
### `GET /api/admin/models` — Session + Admin role
### `PATCH /api/admin/models` — Session + Admin role
### `GET /api/admin/rate-limits` — Session + Admin role
### `PATCH /api/admin/rate-limits` — Session + Admin role

**Status: ✅ All implemented with proper admin auth**

---

## Billing Routes

### `GET /api/billing/plan` — Session required
### `GET /api/billing/usage` — Session required
### `POST /api/billing/checkout-placeholder` — Session required
### `POST /api/billing/webhook-placeholder` — No auth (webhook receiver)
### `POST /api/billing/cancel` — Session required
### `POST /api/billing/change-plan` — Session required

**Status: ❌ ALL STUBS — No payment processing**

---

## Auth Middleware Analysis

### Session Auth (`session-auth.ts`)
```
Cookie: karcoz_session
  → authService.validateSession(token)
  → Sets req.userId, req.sessionId
  → Invalid: clears cookie + 401
```

**Status: ✅ Solid**

### Extension Auth (`extension-auth.ts`)
```
Header: Authorization: Bearer <token>
  → authService.validateExtensionToken(token)
  → Sets req.userId
  → Runs alongside session-auth
```

**Status: ✅ Solid** — Both can coexist; extension takes precedence if both present

### Admin Auth (`admin-auth.ts`)
```
Requires session-auth first
  → SELECT role FROM users WHERE id = req.userId
  → req.isAdmin = role === 'admin'
  → requireAdmin → 401 if not auth, 403 if not admin
```

**Status: ✅ Solid**

---

## Rate Limiting

**File:** `apps/api/src/middleware/rate-limit.ts`

- Global: 100 req/min via `@fastify/rate-limit`
- Endpoint → event mapping: `solve/image` → `solve_image`, `solve/text` → `solve`, `practice/generate` → `practice_generate`
- Per-plan solve limits enforced: free (10/day, 100/month), pro (100/day, 2000/month), team (500/day, 10000/month)
- Headers: `Retry-After`, `X-RateLimit-*`, `X-Plan-Limit-Reached`

**Status: ✅ Implemented** — BUT: actual usage enforcement against plan limits is not confirmed in the usage service

---

## Error Handling

**File:** `apps/api/src/server.ts`

- `KarcozError` typed errors with `requestId`
- All routes wrap handlers in try/catch
- 400 → validation, 401 → auth, 403 → permission, 404 → not found, 500 → server error

**Status: ✅ Good pattern**

---

## Missing Test Coverage

| Route | Tests |
|---|---|
| `auth.routes.ts` | None — no route-level tests |
| `solve.routes.ts` | None — no route-level tests |
| `questions.routes.ts` | None |
| `scan.routes.ts` | None |
| `practice.routes.ts` | None |
| `telegram.routes.ts` | None |
| `admin.routes.ts` | None |
| `billing.routes.ts` | None |

**Only unit tests exist for packages (ai-core, ocr-core, capture-core). No API route integration tests.**

---

## Critical Bugs

| Bug | Severity | Evidence |
|---|---|---|
| `bodyLimit: 20MB` in Fastify but no request body size validation at route level | P1 | `solve.routes.ts` doesn't validate `imageBase64` size before passing to service |
| `admin/users` pagination has no explicit limit | P2 | `admin.service.ts` — limit comes from query param, could be abused |
| Rate limit headers added but Redis not confirmed working | P2 | `cache.service.ts` shows Redis/in-memory fallback, but not tested in dev |
| CORS origin set to `true` (wildcard) | P1 | `server.ts`: `origin: true` — allows any origin in development |