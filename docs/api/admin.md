# Admin API Reference

**Base URL:** `/api/admin`
**Authentication:** Session cookie (`karcoz_session`) + admin role required on all endpoints.

Returns `401` if unauthenticated, `403` if authenticated but not admin.

---

## Endpoints

### GET `/api/admin/overview`

Summary statistics for the admin dashboard.

**Response:**
```json
{
  "userCount": 142,
  "questionCount": 3847,
  "todaySolveCount": 89,
  "errorCountLast24h": 3,
  "questionsLast30d": 1240
}
```

---

### GET `/api/admin/users`

Paginated user list.

**Query parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number (1-indexed) |
| `limit` | `20` | Items per page (max 100) |

**Response:**
```json
{
  "data": [
    {
      "id": "usr_abc123",
      "email": "user@example.com",
      "role": "user",
      "createdAt": 1715200000000,
      "questionCount": 47,
      "lastActiveAt": 1715300000000
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

### GET `/api/admin/usage`

Daily solve counts time series.

**Query parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `days` | `30` | Number of days to look back (max 365) |

**Response:**
```json
{
  "series": [
    { "date": "2026-04-16", "count": 43 },
    { "date": "2026-04-17", "count": 51 }
  ],
  "period": "last_30_days"
}
```

---

### GET `/api/admin/latency`

Solve latency statistics (estimated from question data).

**Query parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `1000` | Number of recent solves to analyze |

**Response:**
```json
{
  "sampleSize": 1000,
  "estimatedP50Ms": 500,
  "estimatedP95Ms": 2000,
  "note": "Latency metrics require per-request performance logging"
}
```

---

### GET `/api/admin/errors`

Error breakdown for the last 24 hours.

**Response:**
```json
{
  "totalErrorsLast24h": 5,
  "breakdown": [
    { "code": "NO_QUESTION_DETECTED", "count": 2 },
    { "code": "LOW_CONFIDENCE", "count": 2 },
    { "code": "UNKNOWN", "count": 1 }
  ]
}
```

---

### GET `/api/admin/audit`

Admin audit log — all admin mutations.

**Query parameters:**
| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Items per page (max 200) |
| `offset` | `0` | Offset for pagination |

**Response:**
```json
{
  "data": [
    {
      "id": "log_xyz",
      "adminId": "usr_admin1",
      "action": "UPDATE_MODEL_CONFIG",
      "target": "ModelConfig",
      "changes": {
        "before": { "provider": "mock" },
        "after": { "provider": "openai" }
      },
      "createdAt": 1715300000000
    }
  ],
  "meta": { "total": 12, "limit": 50, "offset": 0 }
}
```

---

### GET `/api/admin/models`

Current model configuration and available provider/models list.

**Response:**
```json
{
  "config": {
    "provider": "openai",
    "modelName": "gpt-4o",
    "fallbackModel": "gpt-4o-mini",
    "timeoutMs": 30000,
    "maxTokens": 2048,
    "enableValidation": true,
    "compactMode": false,
    "updatedAt": 1715300000000
  },
  "providers": {
    "openai": [
      { "name": "GPT-4o", "model": "gpt-4o", "maxTokens": 128000, "supportsVision": true, "costPer1kInput": 0.005, "costPer1kOutput": 0.015 }
    ],
    "anthropic": [...],
    "gemini": [...]
  }
}
```

---

### PATCH `/api/admin/models`

Update the active model configuration.

**Request body:**
```json
{
  "provider": "anthropic",
  "modelName": "claude-3-5-sonnet-20241022",
  "timeoutMs": 45000,
  "enableValidation": true,
  "compactMode": false
}
```

All fields optional — only supplied fields are updated. Writes to `AdminAuditLog`.

**Response:** Updated `ModelConfig` object (same shape as GET `/api/admin/models` config field).

**Errors:**
- `400 INVALID_REQUEST` — validation failed
- `403 FORBIDDEN` — not an admin

---

### GET `/api/admin/rate-limits`

List all rate limit tiers.

**Response:**
```json
{
  "tiers": [
    { "tier": "free", "minute": 10, "daily": 100, "monthly": 1000 },
    { "tier": "pro", "minute": 60, "daily": 2000, "monthly": 20000 }
  ]
}
```

---

### PATCH `/api/admin/rate-limits`

Update a rate limit tier.

**Request body:**
```json
{
  "tier": "pro",
  "minute": 120,
  "daily": 5000
}
```

Only supplied fields are updated. Writes to `AdminAuditLog`.

**Response:** Updated `RateLimitEntry` object.

**Errors:**
- `404 NOT_FOUND` — tier does not exist
- `400 INVALID_REQUEST` — validation failed
- `403 FORBIDDEN` — not an admin

---

## Error Response Format

All admin endpoints return errors in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 401 | `UNAUTHORIZED` | No valid session |
| 403 | `FORBIDDEN` | Authenticated but not admin |
| 404 | `NOT_FOUND` | Resource not found |
| 400 | `INVALID_REQUEST` | Request validation failed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |