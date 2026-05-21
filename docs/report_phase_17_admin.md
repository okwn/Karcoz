# Phase 17 — Admin & Model Configuration Foundation

**Date:** 2026-05-17
**Status:** ✅ Implemented

---

## Goal

Add the admin foundation for KARÇÖZ: admin role enforcement, model configuration storage, and the first set of privileged API endpoints to support multi-provider AI and future paid plans.

---

## What Was Built

### Schema Additions (`apps/api/prisma/schema.prisma`)

**`User.role`** — `String @default("user")` — values: `"user"` or `"admin"`. Existing users default to `"user"`.

**`ModelConfig`** — singleton table (`id = "default"`):
```
id               String @id @default("default")
provider         String @default("mock")     // active AI provider
modelName        String?                      // e.g. "gpt-4o"
fallbackModel    String?
timeoutMs        Int    @default(30000)
maxTokens        Int    @default(2048)
enableValidation Boolean @default(true)
compactMode      Boolean @default(false)
```

**`AdminAuditLog`** — tracks all admin mutations:
```
id        String @id @default(cuid())
adminId   String  // who made the change
action    String  // UPDATE_MODEL_CONFIG, UPDATE_RATE_LIMIT
target    String  // ModelConfig, RateLimitConfig
changes   Json?   // { before, after }
createdAt DateTime @default(now())
```

---

### Admin Middleware (`apps/api/src/middleware/admin-auth.ts`)

- `registerAdminAuth(app, prisma)` — preHandler hook that checks `User.role === 'admin'` after session auth
- `requireAdmin(req, reply)` — returns `401 UNAUTHORIZED` or `403 FORBIDDEN` as appropriate

```typescript
// Usage in routes:
const adminPreHandler = [requireSession, requireAdmin];
app.get('/api/admin/overview', { preHandler: adminPreHandler }, handler);
```

---

### Admin Service (`apps/api/src/services/admin.service.ts`)

| Method | Description |
|--------|-------------|
| `getAdminOverview()` | userCount, questionCount, todayCount, 24hErrors, 30dQuestions |
| `listUsers(page, limit)` | Paginated users with questionCount, lastActiveAt |
| `getUsageStats(days)` | Daily solve counts grouped by day (last N days) |
| `getSolveLatencyStats(limit)` | Estimated latency percentiles from question data |
| `getErrorStats()` | 24h error breakdown by error code |
| `getAuditLogs(limit, offset)` | Paginated AdminAuditLog entries |
| `getModelConfig()` | Current ModelConfig singleton |
| `updateModelConfig(adminId, patch)` | Update config, writes AdminAuditLog |
| `getRateLimits()` | All RateLimitConfig tiers |
| `updateRateLimit(adminId, tier, patch)` | Update tier, writes AdminAuditLog |
| `getAvailableProviders()` | `PROVIDER_MODELS` from `@karcoz/ai-core` (read-only) |

---

### Admin Routes (`apps/api/src/routes/admin.routes.ts`)

All guarded with `[requireSession, requireAdmin]`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/overview` | Summary stats |
| GET | `/api/admin/users` | Paginated user list |
| GET | `/api/admin/usage` | Daily solve time series |
| GET | `/api/admin/latency` | Solve latency stats |
| GET | `/api/admin/errors` | 24h error breakdown |
| GET | `/api/admin/audit` | AdminAuditLog entries |
| GET | `/api/admin/models` | Current config + available providers |
| PATCH | `/api/admin/models` | Update model config fields |
| GET | `/api/admin/rate-limits` | All rate limit tiers |
| PATCH | `/api/admin/rate-limits` | Update a specific tier |

---

### Shared Schemas (`packages/shared/src/schemas.ts`)

Added Zod schemas: `AdminOverviewSchema`, `PaginatedUsersSchema`, `UsageStatsSchema`, `ErrorStatsSchema`, `AuditLogEntrySchema`, `ModelConfigSchema`, `RateLimitEntrySchema`, `ModelConfigUpdateSchema`, `RateLimitUpdateSchema`.

---

### Server Wiring (`apps/api/src/server.ts`)

```typescript
registerAdminAuth(app, prisma);   // after session + extension auth
registerAdminRoutes(app, prisma); // last — after all other routes
```

---

## Verification

```bash
$ pnpm --filter @karcoz/api typecheck
> tsc --noEmit   # ✅ zero errors
```

All TypeScript checks pass. Prisma client regenerated (`prisma generate`).

---

## Documentation

- `docs/architecture/18-admin-and-model-config.md` — Architecture + data model
- `docs/api/admin.md` — Full API endpoint reference

---

## Making a User Admin

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'admin@example.com';
```

Or via Prisma:
```typescript
await prisma.user.update({
  where: { email: 'admin@example.com' },
  data: { role: 'admin' },
});
```

---

## Limitations

- **Latency metrics** are currently estimated from question counts rather than per-request timing logs. Real latency tracking requires instrumenting each solve request with duration logging.
- **Provider API keys** are not yet stored — just provider/model names. API key storage requires a secrets manager or encrypted field.
- **Rate limit enforcement** is configured but not yet enforced in the middleware. The `RateLimitConfig` rows exist; the enforcement hook in the rate-limit middleware needs to be wired to read per-user tier limits.
- **Frontend admin dashboard** routes are documented but not implemented — only the API backend exists.

---

## Next Steps

1. **Rate limit enforcement**: Wire `RateLimitConfig` into the rate-limit middleware to enforce per-tier limits
2. **Per-user rate limit overrides**: Add `User.rateLimitTier` field to allow per-user overrides
3. **Real latency tracking**: Add a `SolveMetric` table with per-request `durationMs`, `provider`, `model`, `status`
4. **Provider API keys**: Store encrypted API keys in `ModelConfig.apiKey` or a separate `ProviderCredential` table
5. **Frontend admin dashboard**: Build the React pages for `/admin/*`
6. **Invite-only admin**: Add `User.invitedBy` + admin invitation flow to prevent unauthorized admin promotion