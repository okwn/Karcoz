# Auth and Privacy Architecture

## Overview

KarCOZ uses a dual authentication system to support both web dashboard users and browser extension users, with privacy controls that give users fine-grained control over their data.

---

## 1. Authentication Flows

### 1.1 Web Dashboard: Magic Link Flow

```
User enters email
       |
       v
POST /api/auth/magic-link { email }
       |
       v
Server generates signed JWT token (15 min expiry)
       |
       v
Email sent with magic link: https://app.karCOZ.com/auth/verify?token=xxx
       |
       v
User clicks link
       |
       v
GET /api/auth/verify?token=xxx
       |
       v
Server validates token, creates session
       |
       v
HttpOnly, Secure, SameSite=Strict cookie set
       |
       v
User redirected to dashboard
```

**Session Cookie Properties:**
- `HttpOnly`: Cannot be accessed via JavaScript (XSS protection)
- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: CSRF protection
- `Max-Age=7 days`: Session expires after 7 days of inactivity
- Session stored server-side in database

### 1.2 Browser Extension: Token-Based Flow

```
Extension user generates token via dashboard
       |
       v
POST /api/auth/extension/token { name }
       |
       v
Server creates persistent token (no expiry)
       |
       v
Token displayed ONCE to user, stored in chrome.storage.local
       |
       v
Extension uses token in requests:
Authorization: Bearer <token>
```

**Token Storage:** `chrome.storage.local` (not sync, not session)

---

## 2. User Settings

User preferences are stored in the `UserSettings` model and accessed via dedicated endpoints.

### Settings Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `storeHistory` | boolean | `true` | Whether to persist solved problems |
| `storeImages` | boolean | `true` | Whether to store solution screenshots |
| `explanationLevel` | enum | `detailed` | `brief`, `detailed`, `comprehensive` |
| `resultMode` | enum | `instant` | `instant`, `manual` |
| `telegramEnabled` | boolean | `false` | Telegram integration status |

### Settings Access

```bash
GET  /api/users/me/settings    # Read settings
PATCH /api/users/me/settings   # Update settings
```

Settings are scoped per user and never exposed to other users.

---

## 3. Privacy Controls Reference

### 3.1 `storeHistory`

- **Type:** boolean
- **Default:** `true`
- **Effect when `true`:** Solved problems are saved to user's history table
- **Effect when `false`:** Solved problems are NOT saved; no history record created
- **Impact:** Disabling this means no practice records, streak data, or historical performance tracking

### 3.2 `storeImages`

- **Type:** boolean
- **Default:** `true`
- **Effect when `true`:** Screenshots of solutions are stored in object storage
- **Effect when `false`:** No solution images stored; only text-based explanations retained
- **Impact:** Disabling reduces storage usage but eliminates visual history

### 3.3 `explanationLevel`

- **Type:** enum (`brief` | `detailed` | `comprehensive`)
- **Default:** `detailed`
- **Effect:**
  - `brief`: 1-2 sentence explanations
  - `detailed`: Step-by-step breakdown
  - `comprehensive`: Full theory + detailed steps + edge cases

### 3.4 `resultMode`

- **Type:** enum (`instant` | `manual`)
- **Default:** `instant`
- **Effect:**
  - `instant`: Solutions shown immediately after submission
  - `manual`: User must click "Show Solution" to reveal

### 3.5 `telegramEnabled`

- **Type:** boolean
- **Default:** `false`
- **Effect when `true`:** Telegram bot receives problem notifications
- **Effect when `false`:** Telegram integration inactive
- **Related:** Requires valid `telegramChatId` in user profile

---

## 4. Security Measures

### 4.1 Cookie Security (Web Dashboard)

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | `true` | Prevents XSS access to cookie |
| `Secure` | `true` | HTTPS-only transmission |
| `SameSite` | `Strict` | CSRF protection |
| `Max-Age` | `604800` | 7-day session |

### 4.2 Bearer Token Security (Extension)

- Tokens are SHA-256 hashed in database (one-way)
- Tokens have no expiry but can be revoked
- Each token has a user-defined name for identification
- Maximum 10 tokens per user
- Token can only be viewed once at creation time

### 4.3 CSRF Protection

- `SameSite=Strict` cookies prevent cross-origin requests
- Non-cookie auth (Bearer tokens) is inherently CSRF-safe
- API state-changing operations require content-type check

### 4.4 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/magic-link` | 3 requests | 1 hour |
| `POST /api/auth/verify` | 5 requests | 1 hour |
| `POST /api/auth/extension/token` | 10 requests | 1 hour |
| General API | 100 requests | 1 minute |

### 4.5 Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

---

## 5. Data Flow Summary

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Web UI    │     │  Extension  │     │     API     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Magic Link        │ Bearer Token      │
       │──────────────────>│──────────────────>│
       │                   │                   │
       │ HttpOnly Cookie   │                   │
       │<──────────────────│                   │
       │                   │                   │
       │                   │ Request + Token   │
       │                   │──────────────────>│
       │                   │                   │
       │                   │ Response          │
       │                   │<──────────────────│
       │                   │                   │
```

---

## 6. Related Documents

- [API Reference: Auth Endpoints](../api/auth.md)
- [Product: Privacy Controls](../product/11-privacy-controls.md)