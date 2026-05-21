# Telegram Integration — Architecture

## Overview

KARÇÖZ connects to Telegram as a study assistant bot. Users can link their Telegram account to receive solutions and use bot commands for quick access to study features.

## Safety Principles

```
KARÇÖZ Telegram Bot — Safety Boundary
=====================================

ALLOWED (explicit user action):
✅ User sends question image directly to bot
✅ User clicks "Send to Telegram" in extension result bubble
✅ User requests daily study summary via /summary command
✅ User explicitly uses /history, /practice commands

NEVER (no automatic forwarding):
❌ No background forwarding of content to Telegram
❌ No automatic answer exfiltration
❌ No live exam answer delivery
❌ No hidden monitoring or capture
❌ No silent notifications without user request
```

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Telegram      │       │   API Server    │       │   Database      │
│   Bot Process   │──────▶│   (Fastify)     │──────▶│   (PostgreSQL)  │
│                 │       │                 │       │                 │
│  - Polls TG API │       │  /api/telegram/*│       │  TelegramAccount │
│  - Handles cmds │       │  - link-account │       │  TelegramAudit   │
│  - Solves img   │       │  - webhook      │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │                         ▲
         │                         │
         ▼                         │
┌─────────────────┐       ┌────────┴──────────┐
│  Chrome         │──────▶│   Extension       │
│  Extension      │       │  - Send to TG btn │
│                 │       │  - TG status      │
│  - Result bubble│       │  - Confirmation   │
└─────────────────┘       └───────────────────┘
```

## Database

### TelegramAccount

Links a KARÇÖZ user to a Telegram chat. One user can have multiple Telegram accounts; one Telegram account can only be linked to one user.

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | Primary key |
| userId | string? | Links to User, unique when set |
| telegramChatId | string | Telegram chat ID, unique |
| telegramUsername | string? | Telegram username |
| displayName | string? | User-friendly name |
| isLinked | boolean | Active link status |
| linkedAt | datetime | When linked |
| unlinkedAt | datetime? | When unlinked |
| lastActivityAt | datetime | Last bot interaction |

### TelegramAuditLog

Every Telegram-related action is logged for security and debugging.

| Action | When |
|--------|------|
| TELEGRAM_LINK_STARTED | User begins linking flow |
| TELEGRAM_ACCOUNT_LINKED | Account successfully linked |
| TELEGRAM_SOLUTION_SENT | Solution sent to Telegram |
| TELEGRAM_IMAGE_SOLVED | Image solved via Telegram |
| TELEGRAM_ACCOUNT_UNLINKED | Account unlinked |

## Bot Commands

| Command | Description | Safety |
|---------|-------------|--------|
| `/start` | Welcome message + quick start | ✅ Explicit |
| `/help` | List all commands | ✅ Explicit |
| `/link` | Show linking instructions / check status | ✅ Explicit |
| `/unlink` | Unlink Telegram from KARÇÖZ | ✅ Explicit |
| `/solve` | Instructions to send image | ✅ Explicit |
| `/history` | Link to web dashboard | ✅ Explicit |
| `/practice` | Link to practice dashboard | ✅ Explicit |
| `/status` | Check link status | ✅ Explicit |

## API Endpoints

All endpoints require explicit user action. No automatic triggering.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/telegram/link-account` | Link Telegram to user account |
| POST | `/api/telegram/unlink-account` | Unlink Telegram account |
| GET | `/api/telegram/status` | Get current link status |
| POST | `/api/telegram/send-solution` | Send saved solution to Telegram |
| POST | `/api/telegram/webhook` | Receive Telegram updates |

## Extension Integration

The "Send to Telegram" button in the result bubble requires explicit user action:

1. User clicks "Send to Telegram"
2. Confirmation modal appears: "Send this solution to your linked Telegram?"
3. User confirms → solution sent via API
4. Telegram receives formatted solution message

No sending happens without user confirmation.

## Environment Variables

```
TELEGRAM_BOT_TOKEN=  # BotFather token — required for bot to run
```

## Running the Bot

The bot runs as a separate process from the main API:

```bash
TELEGRAM_BOT_TOKEN=xxx npx tsx src/telegram-bot.ts
```

The main API server receives webhook updates at `/api/telegram/webhook` but the bot can also poll directly using long polling (default mode).