# 01 — Architecture Map

**KARÇÖZ System Architecture**

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Extension                      │
│  popup (320px) · sidepanel · content-script · bg worker  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (extension-auth token)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      Fastify API                         │
│  Port 8132 · Routes: solve/scan/practice/telegram/       │
│  auth/admin/billing · Zod validation · JWT sessions      │
└──────┬──────────────┬───────────────┬──────────────────┘
       │              │               │
       ▼              ▼               ▼
┌──────────┐  ┌───────────┐  ┌────────────────┐
│ capture  │  │   OCR     │  │     AI         │
│ -core    │  │ -core     │  │ -core (mock)   │
│ crop/    │  │ preprocess│  │ provider reg   │
│ compress │  │ normalize │  │ openai/anthropic│
│ validate │  │ engines   │  │ gemini/mock     │
└──────────┘  └───────────┘  └────────────────┘
                                   │
       ┌───────────────────────────┴──┐
       ▼                               ▼
┌─────────────┐              ┌─────────────────┐
│ PostgreSQL  │              │     Redis       │
│ Port 5433   │              │   Port 6380     │
│ persistence │              │  cache/fallback │
└─────────────┘              └─────────────────┘
```

---

## Package Architecture

```
packages/
├── ai-core/          # AI provider abstraction (mocked)
│   └── providers/     openai, anthropic, gemini, openrouter, mock
├── ocr-core/          # Image → text pipeline (mocked)
│   ├── preprocess/    denoise, binarize, resize, contrast
│   ├── normalize/    turkish, math-symbols, whitespace, option-parser
│   └── engines/       mock-ocr, vision-ocr, hybrid
├── solver-core/       # EMPTY — no solver algorithm implemented
├── capture-core/     # Screenshot capture and processing
│   └── crop.ts, compression.ts, validation.ts, canvas-utils.ts
├── security/         # Security utilities (placeholder)
├── shared/           # Zod schemas, types
├── database/         # Database access layer (placeholder)
├── notification-core/ # Notification utilities (placeholder)
├── plugin-system/    # Plugin system (placeholder)
└── ui/               # UI components (placeholder)

apps/
├── api/              # Fastify REST API server
│   ├── routes/       solve, scan, questions, practice, telegram, auth, admin, billing
│   ├── services/     business logic per route
│   └── middleware/   session-auth, extension-auth, admin-auth, rate-limit, csrf
├── extension/        # Chrome Extension (Manifest V3)
│   ├── background/   service-worker, capture-controller, message-router
│   ├── content/      content-script, result-bubble, selection-layer, lazy-details
│   ├── popup/        compact popup UI
│   └── sidepanel/    details/history view
├── web-dashboard/   # Static SPA served via npx serve
├── telegram-bot/      # EMPTY — code lives in api/src/telegram-bot.ts
└── worker/           # EMPTY — placeholder container only

infra/
├── docker/           docker-compose.yml, Dockerfile.*, .env.example
└── nginx/            karcoz.conf reverse proxy config
```

---

## Data Flow

```
User clicks extension → selection rect drawn → capture-controller captures
→ image compressed → sent to POST /api/solve/image with extension token
→ validation (Zod) → extraction service → OCR → normalize → AI solve chain
→ solution service → confidence scoring → response → result bubble displayed
→ user can open sidepanel for lazy-loaded details
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | Fastify 5 + TypeScript |
| Database | PostgreSQL 16 + Prisma |
| Cache | Redis 7 (optional fallback to in-memory LRU) |
| AI | @karcoz/ai-core (provider registry, all mocked) |
| OCR | @karcoz/ocr-core (hybrid engine, mocked) |
| Extension | Chrome Extension MV3 |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Eval | Custom Vitest-based scorer |

---

## Security Architecture

- **Auth**: Magic link (email) + session cookies (HttpOnly/Secure/SameSite=strict) + extension bearer tokens
- **API security**: Zod input validation, rate limiting (100/min global + per-user plan limits), CORS, CSRF origin allowlist
- **Storage**: No secrets in code; all via env vars; .env in .gitignore
- **Extension**: Permissions activeTab + storage only; no webcam/microphone/screen recording
- **DOM access**: Visible elements only, no iframe/canvas/hidden content access
- **Answer forwarding**: Only via explicit user action (Telegram button click)

---

## Missing Components

| Component | Status |
|-----------|--------|
| Real AI providers | All mocked — needs API keys |
| solver-core | Empty — no algorithm |
| Worker | Placeholder only |
| Web dashboard | Static shell — no real backend |
| Billing | Placeholder only |
| Prisma migrations | Not committed — schema only |
| Telegram bot Dockerfile | Broken entry point |
| ESLint | Not installed |