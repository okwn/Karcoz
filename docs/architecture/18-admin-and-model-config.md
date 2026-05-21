# Admin & Model Configuration

**Phase:** 17
**Status:** Implemented

---

## Overview

The admin subsystem provides privileged access for operational management of KARÇÖZ. It is designed to support multi-provider AI configurations and future paid-tier rate limiting.

## Security Model

### Admin Role

Users have a `role` field: `"user"` (default) or `"admin"`. Admin status is checked per-request via the `requireAdmin` middleware after session authentication.

```
Unauthenticated → 401 UNAUTHORIZED
Authenticated, non-admin → 403 FORBIDDEN
Authenticated, admin → request proceeds
```

### Admin Middleware Chain

```
preHandler: [requireSession, requireAdmin]
```

- `requireSession` — validates session cookie, sets `req.userId`
- `requireAdmin` — checks `req.userId` + `User.role === 'admin'` in DB, sets `req.isAdmin`

### Audit Trail

All admin mutations write to `AdminAuditLog`:

```prisma
model AdminAuditLog {
  id        String   @id @default(cuid())
  adminId   String   // admin user who made the change
  action    String   // e.g. UPDATE_MODEL_CONFIG
  target    String   // e.g. ModelConfig, RateLimitConfig
  changes   Json?    // { before, after }
  createdAt DateTime @default(now())
}
```

Tracked actions: `UPDATE_MODEL_CONFIG`, `UPDATE_RATE_LIMIT`

## Data Model

### User Role Extension

```prisma
model User {
  role String @default("user") // "user" | "admin"
}
```

### Model Configuration

```prisma
model ModelConfig {
  id               String @id @default("default")
  provider         String @default("mock")
  modelName        String?
  fallbackModel    String?
  timeoutMs        Int    @default(30000)
  maxTokens        Int    @default(2048)
  enableValidation Boolean @default(true)
  compactMode      Boolean @default(false)
}
```

Single-row singleton (`id = "default"`). Represents the active AI provider configuration.

### Admin Audit Log

```prisma
model AdminAuditLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  target    String
  changes   Json?
  createdAt DateTime @default(now())
}
```

## API Endpoints

All require admin session. Returns `403 FORBIDDEN` for non-admins.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/overview` | User count, question count, 24h error count, 30d question count |
| GET | `/api/admin/users` | Paginated user list with question count and last active |
| GET | `/api/admin/usage` | Daily solve counts for the last N days (default 30) |
| GET | `/api/admin/latency` | Solve latency stats (estimated from question timestamps) |
| GET | `/api/admin/errors` | Error breakdown last 24h by error code |
| GET | `/api/admin/audit` | AdminAuditLog entries, paginated |
| GET | `/api/admin/models` | Current config + available providers from ai-core |
| PATCH | `/api/admin/models` | Update provider, model, timeout, tokens, flags |
| GET | `/api/admin/rate-limits` | All rate limit tiers |
| PATCH | `/api/admin/rate-limits` | Update a specific tier |

### Rate Limit Tiers

Default tiers (created via Prisma seed or migration):

| Tier | Minute | Daily | Monthly |
|------|--------|-------|---------|
| free | 10 | 100 | 1,000 |
| pro | 60 | 2,000 | 20,000 |
| enterprise | 300 | 20,000 | 200,000 |

## Model Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `provider` | `ProviderName` | Active AI provider: `mock`, `openai`, `openrouter`, `anthropic`, `gemini` |
| `modelName` | `string?` | Specific model ID to use (e.g. `gpt-4o`) |
| `fallbackModel` | `string?` | Fallback model if primary fails |
| `timeoutMs` | `number` | Request timeout in ms (1000–120000) |
| `maxTokens` | `number` | Max output tokens (256–256000) |
| `enableValidation` | `boolean` | Enable answer validation step |
| `compactMode` | `boolean` | Return compact (short) answers |

## Architecture

```
┌─────────────────────────────────────────────┐
│           Admin Routes (Fastify)            │
│  /api/admin/overview, /users, /models, ...  │
└──────────────────┬──────────────────────────┘
                   │ requiresAdmin
┌──────────────────▼──────────────────────────┐
│           AdminService                      │
│  getAdminOverview, listUsers,               │
│  getModelConfig, updateModelConfig,         │
│  getRateLimits, updateRateLimit, ...        │
└──────────────────┬──────────────────────────┘
                   │ Prisma
┌──────────────────▼──────────────────────────┐
│           PostgreSQL                        │
│  User, Question, AdminAuditLog,             │
│  ModelConfig, RateLimitConfig               │
└─────────────────────────────────────────────┘
```

## Admin Dashboard Routes (Frontend)

| Path | Description |
|------|-------------|
| `/admin` | Overview — stats cards |
| `/admin/users` | User management table |
| `/admin/usage` | Usage charts |
| `/admin/models` | AI model configuration |
| `/admin/audit` | Admin action audit log |
| `/admin/errors` | Error breakdown |

## Future Extensibility

- **Paid tiers**: RateLimitConfig tiers map to subscription plans; enforce per-tier limits in middleware
- **Per-user rate limits**: Override tier defaults at user level
- **Provider-specific config**: Per-provider API keys stored encrypted in `ModelConfig` or a separate secrets table
- **Usage metering**: Integrate with `UsageRecord` table for metered billing