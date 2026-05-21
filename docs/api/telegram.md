# Telegram API — Reference

Base URL: `http://localhost:8100/api`

## POST /api/telegram/link-account

Link a Telegram account to the current user session.

**Request:**
```json
{
  "telegramChatId": "123456789",
  "telegramUsername": "study_user",
  "displayName": "My Study Account"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telegramChatId` | string | Yes | Telegram chat ID from the bot |
| `telegramUsername` | string | No | Telegram username |
| `displayName` | string | No | User-friendly name (max 100 chars) |

**Response (200):**
```json
{
  "success": true,
  "linked": true,
  "telegramChatId": "123456789",
  "displayName": "My Study Account"
}
```

**Errors:**
- `400` — Invalid request body
- `409` — This Telegram account is already linked to another user

**Audit log:** `TELEGRAM_ACCOUNT_LINKED`

---

## POST /api/telegram/unlink-account

Unlink a Telegram account.

**Request:**
```json
{
  "telegramChatId": "123456789"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `400` — `telegramChatId` required
- `404` — Telegram account not found

**Audit log:** `TELEGRAM_ACCOUNT_UNLINKED`

---

## GET /api/telegram/status

Check link status for the current user.

**Headers:**
- `X-User-Id: <userId>` — User identifier (falls back to "anonymous")

**Response (200) — linked:**
```json
{
  "isLinked": true,
  "telegramChatId": "123456789",
  "telegramUsername": "study_user",
  "displayName": "My Study Account",
  "linkedAt": 1747442400000
}
```

**Response (200) — not linked:**
```json
{
  "isLinked": false
}
```

---

## POST /api/telegram/send-solution

Send a saved study solution to Telegram.

**Request:**
```json
{
  "telegramChatId": "123456789",
  "questionId": "q_abc123",
  "viaTelegram": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telegramChatId` | string | Yes | Target Telegram chat |
| `questionId` | string | Yes | Question to send |
| `viaTelegram` | boolean | No | Mark as sent via Telegram (default: true) |

**Response (200):**
```json
{
  "success": true,
  "question": {
    "id": "q_abc123",
    "topic": "Mathematics",
    "questionType": "multiple_choice",
    "extractedText": "What is the derivative of x²?",
    "shortAnswer": "2x",
    "fullExplanation": "Using the power rule...",
    "confidenceScore": 0.95
  }
}
```

**Errors:**
- `400` — Invalid request body
- `403` — Telegram account not linked
- `404` — Question not found

**Audit log:** `TELEGRAM_SOLUTION_SENT`

---

## POST /api/telegram/webhook

Receives updates from Telegram (Long Polling or Webhook).

**For Long Polling:** The bot process polls `getUpdates` directly — this endpoint is primarily for webhook mode.

**For Webhook mode:** Telegram sends POST to this endpoint with update payload.

**Request body (Telegram Update format):**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": { "id": 123456789, "username": "study_user" },
    "chat": { "id": 123456789, "type": "private" },
    "date": 1747442400,
    "text": "/start"
  }
}
```

**Photo handling:**
```json
{
  "update_id": 123456790,
  "message": {
    "message_id": 2,
    "chat": { "id": 123456789 },
    "date": 1747442400,
    "photo": [{ "file_id": "AgACAgI...", "width": 1280, "height": 720 }],
    "caption": "Solve this"
  }
}
```

**Response (200):**
```json
{ "ok": true }
```

**Audit logs:** `TELEGRAM_IMAGE_SOLVED` (when photo received), `TELEGRAM_LINK_STARTED` (on /link command)

---

## Bot Commands (via Telegram)

These are handled by the bot via `/command` messages:

| Command | Description |
|---------|-------------|
| `/start` | Welcome + link instructions |
| `/help` | Full command list |
| `/link` | Show link code or check status |
| `/unlink` | Unlink this Telegram account |
| `/solve` | Prompt to send question image |
| `/history` | Link to dashboard history |
| `/practice` | Link to practice dashboard |
| `/status` | Current link status |

All commands require explicit user input. No automatic responses.