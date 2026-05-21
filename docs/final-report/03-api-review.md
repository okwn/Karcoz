# 03 — API Review

**Fastify REST API Review**

---

## Endpoints

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/solve/image` | POST | Extension token | Solve from captured image |
| `/api/solve/text` | POST | Session | Solve from text input |
| `/api/scan/page-candidates` | POST | Extension token | Get DOM question candidates |
| `/api/questions` | GET | Session | List user questions |
| `/api/questions/:id` | GET | Session | Get question details |
| `/api/questions/:id/save` | POST | Session | Save question |
| `/api/practice/generate` | POST | Session | Generate practice set |
| `/api/practice/:id/attempt` | POST | Session | Submit practice attempt |
| `/api/telegram/link-account` | POST | Session | Link Telegram account |
| `/api/telegram/unlink-account` | POST | Session | Unlink Telegram account |
| `/api/telegram/status` | GET | Session | Telegram link status |
| `/api/telegram/send-solution` | POST | Session | Send solution via Telegram |
| `/api/telegram/webhook` | POST | None | Receive Telegram updates |
| `/api/auth/magic-link` | POST | None | Send magic link email |
| `/api/auth/verify` | GET | None | Verify magic link token |
| `/api/auth/session` | GET | None | Get current session |
| `/api/auth/logout` | POST | Session | Destroy session |
| `/api/admin/models` | PATCH | Admin | Update AI model config |
| `/api/admin/rate-limits` | PATCH | Admin | Update rate limit config |
| `/api/admin/usage` | GET | Admin | View usage stats |
| `/api/admin/audit` | GET | Admin | View audit log |
| `/api/billing/checkout-placeholder` | POST | Session | Create checkout session |
| `/api/billing/webhook-placeholder` | POST | None | Billing webhook |
| `/health` | GET | None | Health check |

---

## Validation

**Input validation via Zod** on all routes. Structured 400 errors with `code`, `message`, `details`, `requestId`.

Issues found:
- `page` and `limit` query params cast via `as` rather than validated
- `SolveImageRequestSchema` does not enforce max base64 string length in schema (enforced in code at 15MB)
- `SaveQuestionBodySchema` has `max(2000)` on notes but not re-applied server-side
- `PageCandidatesRequestSchema` allows unbounded candidate arrays

---

## Authentication

Three-layer system:

1. **Session auth** — HttpOnly cookie `karcoz_session`, 30-day expiry, 48-byte crypto random token. `requireSession` middleware.
2. **Extension auth** — Bearer token in `Authorization` header, 1-year expiry. `requireExtensionAuth` per-route.
3. **Admin auth** — Runs after session auth, fetches `user.role` from DB. `requireAdmin` enforces both 401 and 403.

Auth routes: magic link (15-min single-use), session create/destroy, extension token CRUD, account deletion (transactional).

Issues:
- `APP_BASE_URL` fallback to `http://localhost:3100` if unset
- Magic link verification has no brute-force protection
- `x-user-id` header fallback in telegram routes is dead code

---

## Rate Limiting

- **Global**: Fastify rate-limit plugin, 100 requests/minute per IP
- **Per-user usage-based**: Tracked in `UsageRecord` table per endpoint per period
- **Plan limits** (solve endpoints only):

| Plan | Daily | Monthly |
|------|-------|---------|
| free | 10 | 100 |
| pro | 100 | 2000 |
| team | 500 | 10000 |

**Gap**: `practice_generate` events not subject to plan limit enforcement.

---

## Telegram Confirmation Flow

**Fully explicit, user-driven**:
- `/link` → bot instructs user to enter chatId in dashboard, then confirm via `/link`
- `/unlink` → explicit bot command
- Photo solve → only works after account linked; user must send photo directly
- No automatic image forwarding or solve without user action

---

## Database Schema

Comprehensive Prisma schema with: User, Question, QuestionSave, Session, AuthToken, ExtensionToken, UserSettings, UsageRecord, UsageEvent, PracticeSet, PracticeQuestion, PracticeAttempt, TelegramAccount, TelegramAuditLog, AuditLog, AdminAuditLog, Subscription, RateLimitConfig, ModelConfig.

Indexes on: questionHash, userId+period, userId+period+eventType, createdAt, telegramChatId.

**No migration files in repo** — schema is the source of truth; deploy via `prisma db push` or `prisma migrate deploy`.

---

## Error Handling

Typed `KarcozError` union in `solve.service.ts` with HTTP status codes. All routes return structured JSON: `{ error: { code, message, details, requestId } }`.

Issues:
- No centralized Fastify `setErrorHandler`
- Audit service swallows failures silently
- `telegram-bot.ts` catches errors but only sends generic user message

---

## Security

- Magic link tokens: 32 bytes crypto random
- Session tokens: 48 bytes crypto random
- Extension tokens: 48 bytes crypto random
- Cookies: HttpOnly + Secure + SameSite=strict
- CSRF: origin allowlist (incomplete when APP_BASE_URL unset)
- Input sanitization: control character rejection in validation
- Answer length bounded at 5000 chars
- Image base64 capped at 15MB in code
- Prisma parameterized queries throughout (no SQL injection)
- Admin audit log present but no deletion protection

---

## Verdict

**FUNCTIONAL** — All routes implemented with Zod validation, multi-layer auth, rate limiting, and structured errors. Telegram flow is explicit. Key gaps: no migration files, some input validation edge cases, `practice_generate` outside plan limits.