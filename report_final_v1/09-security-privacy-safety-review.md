# 09 — Security, Privacy, and Safety Review

## Purpose
Analyze authentication, authorization, input validation, secrets management, and safety boundaries.

---

## Authentication

### Magic Link
| Aspect | Status |
|---|---|
| Token generation | ✅ `crypto.randomBytes()` — cryptographically secure |
| Token expiry | ✅ 15 minutes |
| Token single-use | ✅ `usedAt` timestamp set after use |
| Email enumeration | ⚠️ Returns same message for "user exists" and "user not found" (good) |
| Rate limiting | ✅ Global 100 req/min + `POST /api/auth/magic-link` specifically limited |
| Token storage | ✅ `AuthToken` table in PostgreSQL |

**Evidence:** `apps/api/src/services/auth.service.ts` — `createMagicLinkToken()` and `verifyMagicLinkToken()`

### Session
| Aspect | Status |
|---|---|
| Cookie type | ✅ `HttpOnly` — not accessible via JavaScript |
| Cookie name | `karcoz_session` |
| Cookie expiry | ✅ 30 days |
| Session storage | ✅ PostgreSQL `Session` table |
| Session validation | ✅ IP + User-Agent recorded; validated on each request |
| Session deletion | ✅ `DELETE FROM sessions WHERE token = ?` on logout |

**Evidence:** `apps/api/src/middleware/session-auth.ts`

### Extension Tokens
| Aspect | Status |
|---|---|
| Token generation | ✅ `crypto.randomBytes()` |
| Token expiry | ✅ 1 year |
| Storage | ✅ PostgreSQL `ExtensionToken` table |
| Revocation | ✅ `DELETE /api/auth/extension/token` |
| Device name | ✅ Optional `deviceName` for user辨识 |

---

## Authorization

### Session Auth Middleware
```typescript
// session-auth.ts
requireSession(req, reply):
  if (!req.userId) return 401
```

### Extension Auth Middleware
```typescript
// extension-auth.ts
requireExtensionAuth(req, reply):
  if (!req.userId) return 401
```

### Admin Auth
```typescript
// admin-auth.ts
requireAdmin(req, reply):
  if (!req.isAdmin) return 403 (or 401 if not authenticated)
```

**Status: ✅ Proper layered auth**

---

## Input Validation

### Zod Schemas (`@karcoz/shared/src/schemas.ts`)

| Schema | Route | Status |
|---|---|---|
| `MagicLinkRequestSchema` | `POST /auth/magic-link` | ✅ `email` — z.string().email() |
| `VerifyTokenSchema` | `POST /auth/verify` | ✅ `token` — z.string().min(1) |
| `SolveImageRequestSchema` | `POST /solve/image` | ✅ `sourceType` enum, `explanationLevel` enum, `resultMode` enum |
| `SolveTextRequestSchema` | `POST /solve/text` | ✅ `text` — z.string().min(1).max(50000) |
| `PracticeGenerationRequestSchema` | `POST /practice/generate` | ✅ Topic, count, difficulty, language, questionType |

### Body Size Limits
- Fastify: `bodyLimit: 20MB` — handles large images
- No application-level image size check before passing to AI provider
- Plan limit check: `getImageMaxBytes()` — enforces 2MB (free) / 10MB (pro) / 20MB (team)

**Evidence:** `apps/api/src/config/plan-limits.ts`

---

## Rate Limiting

### Global
- 100 requests per minute per IP (via `@fastify/rate-limit`)

### Per-Endpoint
| Endpoint | Limit |
|---|---|
| `/api/solve/image` | `solve_image` event → checked against plan |
| `/api/solve/text` | `solve` event → checked against plan |
| `/api/practice/generate` | `practice_generate` event → checked against plan |

**Status: ✅ Comprehensive rate limiting**

---

## Secrets Management

### Environment Variables (`apps/api/src/config/env.ts`)

| Variable | Validation | Status |
|---|---|---|
| `DATABASE_URL` | Required in prod | ✅ Zod validated |
| `REDIS_URL` | Required in prod; must start with `redis://` | ✅ |
| `SESSION_SECRET` | Min 32 chars | ✅ |
| `APP_BASE_URL` | Required in prod | ✅ |
| `MAGIC_LINK_BASE_URL` | Required in prod | ✅ |
| `AI_PROVIDER` | Enum: `openai` \| `openrouter` \| `mock` | ✅ |
| `OPENAI_API_KEY` | Optional | ✅ |
| `OPENROUTER_API_KEY` | Optional | ✅ |
| `TELEGRAM_BOT_TOKEN` | Optional | ✅ |

**Production behavior:** Server exits with ASCII art error box if critical vars missing.
**Development:** Logs warnings but starts.

### `.env.example` Coverage
- `infra/docker/.env.example` — complete with all 20+ variables
- No `.env.example` at root level

**Status: ✅ Good env management**

---

## CORS Configuration

**File:** `apps/api/src/server.ts`

```typescript
await app.register(cors, {
  origin: true,  // ← ALLOWS ANY ORIGIN IN DEV
  credentials: true,
});
```

**⚠️ Risk:** `origin: true` allows credentials from any origin. In production, this should be set to the specific frontend domain(s).

**Evidence:** The `CORS` registration has no environment-specific override.

---

## Security Headers (Nginx)

**File:** `infra/nginx/karcoz.conf`

```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: "1; mode=block"
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: ...
```

**Status: ✅ Good security headers**

---

## CSRF Protection

**File:** `apps/api/src/middleware/csrf.ts`

- Uses `@fastify/csrf-protection`
- Protects non-GET routes
- Requires `crsfToken` in request body/header

**Status: ✅ Implemented**

---

## Data Deletion

### User Account Deletion
```typescript
// auth.service.ts — transactional
1. DELETE FROM questions WHERE userId = ?
2. DELETE FROM sessions WHERE userId = ?
3. DELETE FROM auth_tokens WHERE email = ?
4. DELETE FROM extension_tokens WHERE userId = ?
5. DELETE FROM user_settings WHERE userId = ?
6. DELETE FROM telegram_accounts WHERE userId = ?
7. DELETE FROM subscriptions WHERE userId = ?
8. DELETE FROM practice_sets WHERE userId = ?
9. DELETE FROM users WHERE id = ?
```

**Status: ✅ Thorough transactional delete**

### History Deletion
```typescript
DELETE FROM questions WHERE userId = ?
```

**Status: ✅ Separate history delete**

---

## Audit Logging

| Log Type | Location | Events Tracked |
|---|---|---|
| `AuditLog` | PostgreSQL | Question creation, viewing, saving |
| `AdminAuditLog` | PostgreSQL | Admin actions (model config, rate limits) |
| `TelegramAuditLog` | PostgreSQL | Telegram link/unlink/send |
| API audit | `audit.service.ts` | Solve success/failure with requestId |

**Status: ✅ Good observability**

---

## Abuse Prevention

| Mechanism | Status |
|---|---|
| Rate limiting | ✅ 100 req/min global + per-plan |
| Magic link throttling | ✅ Same rate limit applies |
| Extension token per-user limit | ✅ No explicit limit, but requires auth |
| Image size limits | ✅ Per-plan (2MB/10MB/20MB) |
| Request body limit | ✅ Fastify 20MB |
| IP-based limiting | ✅ Global rate limit |
| Bot detection | ❌ None (no CAPTCHA/honey pot) |

---

## Safety Boundaries

**Reviewed for hidden/proctoring/auto-click features:**

| Feature | Finding |
|---|---|
| Hidden UI | ✅ NONE — all UI explicitly user-triggered |
| Invisible exam mode | ✅ NONE |
| Proctoring bypass | ✅ NONE |
| Auto-answer clicking | ✅ NONE — result bubble shows answer; user reads |
| Answer auto-submit | ✅ NONE |
| Screen recording | ✅ NONE — only `captureVisibleTab` on user action |
| Background exfil | ✅ NONE — all network calls logged |
| Cheating workflows | ✅ NONE |

**VERDICT: ✅ SAFETY CLEAN** — KARÇÖZ is a visible, user-consented study assistant. No hidden or cheating-oriented features found in the codebase.

---

## Known Security Gaps

| Severity | Issue | Fix |
|---|---|---|
| **P1** | CORS `origin: true` allows any origin | Set `origin` to specific domain(s) in production |
| **P1** | No image size validation at solve route before AI call | Add `maxImageBytes` check in solve routes |
| **P2** | No CAPTCHA on magic link | Consider adding after N failed attempts |
| **P2** | Extension token has no usage limit | Add `MAX_EXTENSION_TOKENS_PER_USER` check |
| **P2** | No IP allowlist for admin routes | Consider admin IP restriction |
| **P3** | Telegram webhook has no signature verification | Add Telegram `chat_id` verification in webhook |
| **P3** | No audit log for failed auth attempts | Add `AuthFailure` audit log type |