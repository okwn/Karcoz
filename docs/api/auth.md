# Authentication API Reference

Base URL: `https://api.karCOZ.com` (production) or `http://localhost:8132` (development)

All endpoints returning JSON use `Content-Type: application/json`.

---

## Magic Link Authentication

### POST /api/auth/magic-link

Request a magic link to be sent to the user's email.

**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Magic link sent if email exists"
}
```

**Notes:**
- Always returns 200 to prevent email enumeration
- Rate limited: 3 requests per hour per IP
- Token expires in 15 minutes

**Example:**
```bash
curl -X POST http://localhost:8132/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

### POST /api/auth/verify

Verify magic link token and create session.

**Auth Required:** No

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | JWT token from magic link email |

**Request Body:** None

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "message": "Login successful"
}
```

**Cookies Set:**
| Name | Value | Options |
|------|-------|---------|
| `session_token` | JWT | HttpOnly; Secure; SameSite=Strict; MaxAge=604800 |

**Error Responses:**
- `400 Bad Request` — Missing or invalid token
- `401 Unauthorized` — Token expired or already used
- `429 Too Many Requests` — Rate limit exceeded

**Example:**
```bash
# After clicking magic link in email
curl -X POST "http://localhost:8132/api/auth/verify?token=eyJhbGci..." \
  -H "Content-Type: application/json"
```

---

## Session Management

### GET /api/auth/session

Get current session information.

**Auth Required:** Yes (Session cookie or Bearer token)

**Response (200 OK):**
```json
{
  "authenticated": true,
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "User Name",
    "telegramChatId": "123456789",
    "telegramEnabled": false
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:8132/api/auth/session \
  -H "Cookie: session_token=xxx"
```

---

### POST /api/auth/logout

Delete current session (web) or revoke token.

**Auth Required:** Yes

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Notes:**
- Web: Clears the session cookie
- Extension: Does NOT revoke Bearer token (use DELETE /extension/token)

**Example:**
```bash
curl -X POST http://localhost:8132/api/auth/logout \
  -H "Cookie: session_token=xxx"
```

---

## Extension Token Management

### POST /api/auth/extension/token

Create a new extension authentication token.

**Auth Required:** Yes (Session cookie or existing Bearer token)

**Request Body:**
```json
{
  "name": "Chrome on MacBook Pro"
}
```

**Response (201 Created):**
```json
{
  "token": "kct_a1b2c3d4e5f6...",
  "name": "Chrome on MacBook Pro",
  "createdAt": "2025-01-15T10:30:00Z",
  "warning": "This token will only be shown once. Save it now."
}
```

**Notes:**
- Token is only shown ONCE at creation time
- Maximum 10 tokens per user
- Rate limited: 10 requests per hour

**Example:**
```bash
curl -X POST http://localhost:8132/api/auth/extension/token \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=xxx" \
  -d '{"name": "Firefox on Windows"}'
```

---

### GET /api/auth/extension/tokens

List all extension tokens (metadata only, not the actual tokens).

**Auth Required:** Yes

**Response (200 OK):**
```json
{
  "tokens": [
    {
      "id": "tkn_abc123",
      "name": "Chrome on MacBook Pro",
      "createdAt": "2025-01-15T10:30:00Z",
      "lastUsedAt": "2025-01-16T08:15:00Z"
    },
    {
      "id": "tkn_def456",
      "name": "Firefox on Windows",
      "createdAt": "2025-01-14T15:20:00Z",
      "lastUsedAt": null
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:8132/api/auth/extension/tokens \
  -H "Cookie: session_token=xxx"
```

---

### DELETE /api/auth/extension/token

Revoke an extension token.

**Auth Required:** Yes

**Request Body:**
```json
{
  "tokenId": "tkn_abc123"
}
```

**Response (200 OK):**
```json
{
  "message": "Token revoked successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:8132/api/auth/extension/token \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=xxx" \
  -d '{"tokenId": "tkn_abc123"}'
```

---

## User Profile

### GET /api/users/me

Get current user's profile.

**Auth Required:** Yes

**Response (200 OK):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "User Name",
    "telegramChatId": "123456789",
    "telegramEnabled": false,
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:8132/api/users/me \
  -H "Cookie: session_token=xxx"
```

---

## User Settings

### GET /api/users/me/settings

Get current user's privacy and preference settings.

**Auth Required:** Yes

**Response (200 OK):**
```json
{
  "settings": {
    "storeHistory": true,
    "storeImages": true,
    "explanationLevel": "detailed",
    "resultMode": "instant",
    "telegramEnabled": false
  }
}
```

**Example:**
```bash
curl -X GET http://localhost:8132/api/users/me/settings \
  -H "Cookie: session_token=xxx"
```

---

### PATCH /api/users/me/settings

Update current user's privacy and preference settings.

**Auth Required:** Yes

**Request Body (all fields optional):**
```json
{
  "storeHistory": false,
  "storeImages": true,
  "explanationLevel": "comprehensive",
  "resultMode": "manual",
  "telegramEnabled": true
}
```

**Response (200 OK):**
```json
{
  "settings": {
    "storeHistory": false,
    "storeImages": true,
    "explanationLevel": "comprehensive",
    "resultMode": "manual",
    "telegramEnabled": true
  }
}
```

**Validation Rules:**
- `storeHistory`: boolean
- `storeImages`: boolean
- `explanationLevel`: one of `brief`, `detailed`, `comprehensive`
- `resultMode`: one of `instant`, `manual`
- `telegramEnabled`: boolean

**Example:**
```bash
curl -X PATCH http://localhost:8132/api/users/me/settings \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=xxx" \
  -d '{"explanationLevel": "brief", "telegramEnabled": true}'
```

---

## Data Management

### DELETE /api/users/me/history

Delete all problem history for the current user.

**Auth Required:** Yes

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "History deleted",
  "deletedCount": 42
}
```

**Notes:**
- This action is irreversible
- Does not affect settings or tokens
- Does not delete account

**Example:**
```bash
curl -X DELETE http://localhost:8132/api/users/me/history \
  -H "Cookie: session_token=xxx"
```

---

### GET /api/users/me/export

Export all user data in JSON format.

**Auth Required:** Yes

**Response (200 OK):**
```json
{
  "exportedAt": "2025-01-16T12:00:00Z",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "User Name",
    "telegramChatId": "123456789",
    "telegramEnabled": false,
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "settings": {
    "storeHistory": true,
    "storeImages": true,
    "explanationLevel": "detailed",
    "resultMode": "instant",
    "telegramEnabled": false
  },
  "history": [
    {
      "id": "hst_001",
      "problemText": "Solve for x: 2x + 5 = 15",
      "solution": "x = 5",
      "solvedAt": "2025-01-15T11:00:00Z"
    }
  ],
  "extensionTokens": [
    {
      "id": "tkn_abc123",
      "name": "Chrome on MacBook Pro",
      "createdAt": "2025-01-15T10:30:00Z",
      "lastUsedAt": "2025-01-16T08:15:00Z"
    }
  ]
}
```

**Example:**
```bash
curl -X GET http://localhost:8132/api/users/me/export \
  -H "Cookie: session_token=xxx"
```

---

### DELETE /api/users/me

Delete the current user's account and all associated data.

**Auth Required:** Yes

**Request Body:** None

**Response (200 OK):**
```json
{
  "message": "Account deleted",
  "deletedData": {
    "history": 42,
    "images": 15,
    "tokens": 2
  }
}
```

**Notes:**
- This action is irreversible
- Deletes: user profile, history, images, extension tokens
- Revokes all active sessions

**Example:**
```bash
curl -X DELETE http://localhost:8132/api/users/me \
  -H "Cookie: session_token=xxx"
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |