# Privacy Controls

KarCOZ gives you full control over how your data is collected, stored, and used. This document explains each privacy setting and how to manage your data.

---

## Privacy Settings Overview

Your privacy settings control five aspects of how KarCOZ handles your information:

| Setting | What It Controls |
|---------|------------------|
| Store History | Whether solved problems are saved |
| Store Images | Whether solution screenshots are kept |
| Explanation Level | How detailed AI explanations are |
| Result Mode | When solutions are revealed |
| Telegram Integration | Whether the bot can send you messages |

---

## Understanding Each Setting

### Store History

**What it does:**
When enabled, every problem you solve is saved to your personal history. This includes:
- The problem text or image
- Your answer
- The correct solution
- Timestamp
- Time taken to solve

**When to disable:**
- You only want to practice problems without tracking
- You share your account and want private practice sessions
- You prefer a "clean slate" each time

**What you lose if disabled:**
- Practice streak tracking
- Performance analytics
- History-based recommendations
- Ability to review past mistakes

---

### Store Images

**What it does:**
When enabled, KarCOZ may capture and store screenshots of:
- The problem as you submitted it
- The solution screen
- Step-by-step work images

These are stored securely in encrypted object storage.

**When to disable:**
- You want to minimize storage usage
- You only need text-based explanations
- You prefer not to have visual records

**What you lose if disabled:**
- Visual history of your work
- Ability to compare similar problems visually
- Some solution explanations that rely on annotated images

---

### Explanation Level

**What it does:**
Controls how detailed the AI explanation is when showing you a solution.

| Level | Description |
|-------|-------------|
| `brief` | 1-2 sentences. "The answer is 42 because you isolate x by subtracting 5 and dividing by 2." |
| `detailed` | Step-by-step breakdown. Each step explained with the reasoning behind it. |
| `comprehensive` | Full theory review + detailed steps + edge cases + alternative methods. |

**When to use each:**
- `brief`: Quick refresh, problems you find easy
- `detailed`: Standard practice, most problems
- `comprehensive`: New topics, difficult problems, learning new concepts

---

### Result Mode

**What it does:**
Controls when the solution is revealed to you.

| Mode | Behavior |
|------|----------|
| `instant` | Solution appears immediately after you submit an answer |
| `manual` | You must click "Show Solution" to see the answer |

**When to use each:**
- `instant`: Faster workflows, when you want immediate feedback
- `manual`: Study mode, when you want to think first before seeing the solution

---

### Telegram Integration

**What it does:**
When enabled, the KarCOZ Telegram bot can send you:
- Problem notifications
- Practice reminders
- Solution summaries

**Requirements:**
- A verified Telegram account
- You must start a chat with `@KarCOZBot` and send `/start`
- Your `telegramChatId` must be linked to your account

**Privacy note:**
Enabling this means problem text may be shared via Telegram servers. Do not enable if you work with sensitive problems that should not leave your device.

---

## How Your Data is Stored

### Data Location

| Data Type | Storage Location | Encryption |
|-----------|------------------|------------|
| Profile (email, name) | PostgreSQL | Encrypted at rest |
| Settings | PostgreSQL | Encrypted at rest |
| Problem History | PostgreSQL | Encrypted at rest |
| Solution Images | S3/MinIO | Encrypted at rest + in transit |
| Extension Tokens | PostgreSQL | Hashed (not reversible) |

### Data Retention

- **Active accounts:** Data retained indefinitely while account exists
- **Deleted accounts:** All data permanently deleted within 30 days
- **History deletion:** Immediate deletion, no recovery

---

## Your Data Rights

### Export Your Data

You can download a complete copy of all your data at any time:

```
GET /api/users/me/export
```

This returns a JSON file containing:
- Your profile information
- All settings
- Complete problem history
- List of extension tokens (not the actual tokens)

### Delete Your History

Delete all problem history without deleting your account:

```
DELETE /api/users/me/history
```

This removes all saved problems but keeps your account and settings.

### Delete Your Account

Delete your account and ALL associated data:

```
DELETE /api/users/me
```

This permanently removes:
- Your profile
- All problem history
- All solution images
- All extension tokens
- All sessions

**Note:** This action cannot be undone.

---

## Telegram Privacy Considerations

### What Information Goes to Telegram

When `telegramEnabled` is true:

1. **Problem text** may be sent to Telegram servers for the bot to display
2. **Timestamps** of bot interactions
3. **Your Telegram Chat ID** stored in our database

### What Does NOT Go to Telegram

- Problem images (screenshots) are NOT sent via Telegram
- Historical data is NOT synced
- Settings and preferences are NOT shared

### Disabling Telegram

You can disable Telegram integration at any time by setting `telegramEnabled` to false in your settings. This immediately stops all bot notifications.

---

## Privacy by Design

KarCOZ is designed with privacy-first principles:

1. **Data minimization:** We only collect what we need
2. **User control:** You can export or delete your data anytime
3. **Transparency:** This document explains exactly what is stored
4. **Security:** Data is encrypted at rest and in transit
5. **No selling data:** We never sell, rent, or share your data with third parties

---

## Cookie-Based Session (Web)

When you log in via magic link on the web:

- A session cookie is stored (`session_token`)
- This cookie is `HttpOnly` — JavaScript cannot read it
- This cookie is `Secure` — only transmitted over HTTPS
- This cookie is `SameSite=Strict` — prevents cross-site requests

The session expires after 7 days of inactivity.

---

## Extension Tokens

Extension users authenticate differently:

1. You generate a token from the web dashboard
2. The token is shown ONCE — you must save it immediately
3. The token is stored in `chrome.storage.local` on your device
4. Each request sends the token in the `Authorization: Bearer <token>` header

Tokens can be revoked at any time from the dashboard.

---

## Questions?

If you have questions about privacy or data handling:
- Email: privacy@karCOZ.com
- Documentation: [Architecture Overview](../architecture/16-auth-and-privacy.md)
- API Reference: [Auth Endpoints](../api/auth.md)