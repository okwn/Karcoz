# 02 — Current System Map

## Purpose
Structural inventory of all code, configuration, documentation, and empty/broken directories in the KARÇÖZ repository.

---

## Repository Root Structure

```
/home/oguz/Masaüstü/KarÇÖZ/
├── apps/
│   ├── api/                    ✅ Real — Fastify API server
│   ├── extension/             ✅ Real — Chrome Extension (Manifest V3)
│   ├── telegram-bot/           ❌ EMPTY — Bot code lives in apps/api/src/telegram-bot.ts
│   ├── web-dashboard/          ⚠️  SHELL — Static HTML, no API wiring
│   └── worker/                 ❌ EMPTY — No background jobs implemented
├── packages/
│   ├── ai-core/               ✅ Real — AI providers (OpenAI, OpenRouter, Mock)
│   ├── ocr-core/               ✅ Real — OCR pipeline with hybrid engine
│   ├── solver-core/            ✅ Real — Deterministic + AI fallback solvers
│   ├── capture-core/           ✅ Real — Image capture and compression
│   └── shared/                ✅ Real — Zod schemas and shared types
├── infra/
│   └── docker/                 ✅ Dev + Prod Docker configs
│       └── nginx/              ✅ Nginx config (TLS block commented)
├── docs/                       ❌ EMPTY — No root docs
│   └── [subdirs with content]  ✅ docs/architecture/, docs/api/, docs/product/, docs/final-report/, docs/superpowers/
├── scripts/                   ✅ All 7 shell scripts present and functional
├── server-deploy/              ⚠️ Docs only — no docker-compose.yml here
│   └── [12 .md deployment guides]
├── eval/                       ⚠️ Partial — datasets + reports exist; run-eval.ts MISSING
├── node_modules/               ✅ Installed (flat pnpm install)
├── package.json                ⚠️ Missing pnpm-workspace.yaml
├── eslint.config.js            ✅ Present
└── .github/                    ✅ Workflows directory (empty?)
```

---

## Apps Detail

### `apps/api/` — API Server
```
apps/api/
├── src/
│   ├── server.ts                    ✅ Fastify bootstrap, route registration, middleware
│   ├── telegram-bot.ts              ✅ Standalone Telegram polling bot (NOT in telegram-bot app)
│   ├── routes/
│   │   ├── auth.routes.ts           ✅ Magic link, session, extension tokens, user profile
│   │   ├── solve.routes.ts          ✅ /solve/image, /solve/text
│   │   ├── questions.routes.ts      ✅ History, saves, analytics
│   │   ├── scan.routes.ts           ✅ /scan/page-candidates (no auth)
│   │   ├── practice.routes.ts       ✅ /practice/generate, /sets, /attempt, /recommended
│   │   ├── telegram.routes.ts        ✅ Link/unlink, send-solution, webhook
│   │   ├── admin.routes.ts          ✅ Overview, users, usage, audit, errors, latency, models, rate-limits
│   │   └── billing.routes.ts        ✅ Plan, usage, checkout (stub), cancel, change-plan
│   ├── services/
│   │   ├── auth.service.ts          ✅ Magic link, session, tokens, data export/delete
│   │   ├── solve.service.ts         ✅ Orchestrates extract → classify → solve → validate → cache → DB
│   │   ├── practice.service.ts      ✅ Generate sets, grade attempts, recommend
│   │   ├── billing.service.ts       ❌ STUB — All methods are no-ops with console.log
│   │   ├── admin.service.ts         ✅ User management, usage, audit logs
│   │   ├── telegram.service.ts      ✅ Account linking, message sending
│   │   ├── cache.service.ts         ✅ Redis/in-memory answer caching
│   │   ├── extraction.service.ts    ✅ Text extraction from image
│   │   ├── solution.service.ts     ✅ AI solve chain wrapper
│   │   └── audit.service.ts        ✅ Audit log recording
│   ├── middleware/
│   │   ├── session-auth.ts         ✅ HttpOnly cookie → req.userId
│   │   ├── extension-auth.ts       ✅ Bearer token → req.userId
│   │   ├── admin-auth.ts           ✅ Role check → req.isAdmin
│   │   ├── rate-limit.ts           ✅ Per-endpoint + per-plan limits
│   │   └── csrf.ts                 ✅ CSRF protection
│   ├── config/
│   │   ├── env.ts                  ✅ Zod validation; fail-fast in production
│   │   └── plan-limits.ts          ✅ free/pro/team tier limits
│   └── prisma/
│       ├── schema.prisma           ✅ 18 models
│       └── migrations/
│           └── 20260517181506_initial/  ✅ Single initial migration
├── dist/                          ✅ Built output (JS, source maps, declaration files)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── pnpm-lock.yaml
└── node_modules/
```

### `apps/extension/` — Chrome Extension
```
apps/extension/
├── manifest.json                 ✅ Manifest V3, all_urls host permission
├── package.json
├── tsconfig.json
├── build.js                      ✅ esbuild entry point
├── src/
│   ├── background/
│   │   ├── service-worker.ts     ✅ Message router, 15 route handlers
│   │   └── capture-controller.ts ✅ Tab capture, crop, LRU cache, API calls
│   ├── content/
│   │   ├── content-script.ts     ✅ DOM listener, START_CAPTURE_MODE, SCAN_PAGE handlers
│   │   ├── result-bubble.ts      ✅ 452-line UI bubble with states and drag
│   │   ├── selection-layer.ts   ✅ Mouse-based area selection overlay
│   │   ├── page-text-extractor.ts ✅ DOM text extraction with question scoring
│   │   ├── question-detector.ts  ✅ Candidate detection from DOM blocks
│   │   ├── question-candidate-overlay.ts ✅ Floating overlay for page scan candidates
│   │   ├── page-scan-indicator.ts ✅ Loading indicator during page scan
│   │   └── lazy-details.ts       ✅ Lazy-loads result into sidepanel
│   ├── popup/
│   │   ├── popup.html            ✅ 320px popup with action buttons
│   │   ├── popup.css
│   │   └── popup.js              ✅ Chrome message sends to background
│   ├── sidepanel/
│   │   ├── sidepanel.html
│   │   ├── sidepanel.css
│   │   └── sidepanel.js          ✅ Renders history, last result
│   ├── lib/
│   │   ├── api-client.ts         ⚠️ CRITICAL — `createApiClient(true)` = MockApiClient by default
│   │   ├── extension-storage.ts  ✅ chrome.storage.local wrappers
│   │   ├── message-types.ts      ✅ All shared types
│   │   ├── image-utils.ts        ✅ cropImage, captureVisibleTab
│   │   ├── capture-service.ts    ✅ Wraps @karcoz/capture-core
│   │   ├── request-cancellation.ts ✅ AbortController per request
│   │   ├── recent-result-cache.ts ✅ LRU cache, 20 items, 1hr TTL
│   │   └── latency-tracker.ts
│   └── types/
│       └── message-types.ts      ✅ Shared extension message types
├── icons/                        ✅ PNG icons at 16/32/48/128
└── dist/                         ✅ Built extension files (manifest.json, JS, CSS)
```

### `apps/web-dashboard/` — Web Dashboard
```
apps/web-dashboard/
├── package.json                  ✅ Static server only: `npx serve public -l 3100`
├── public/
│   ├── dashboard.html           ❌ Static shell — no API calls
│   ├── login.html               ❌ Static shell — no API calls
│   ├── history.html             ❌ Static shell — no API calls
│   ├── weak-topics.html         ❌ Static shell — no API calls
│   ├── practice.html            ❌ Static shell — no API calls
│   ├── settings.html            ❌ Static shell — no API calls
│   ├── telegram.html            ❌ Static shell — no API calls
│   ├── billing.html             ❌ Static shell — no API calls
│   ├── questions/[id].html     ❌ Static shell — no API calls
│   └── styles.css               ✅ Styling exists
└── build: "echo 'static files'"  ✅ No real build
```

### `apps/telegram-bot/` — **EMPTY DIRECTORY**
The actual Telegram bot is at `apps/api/src/telegram-bot.ts`.

### `apps/worker/` — **EMPTY DIRECTORY**
Worker service is not implemented. `Dockerfile.worker` is a no-op.

---

## Packages Detail

### `packages/ai-core/`
```
src/
├── index.ts                     ✅ solve(), classify(), routeToSolver(), needsBetterCrop()
├── providers/
│   ├── openai.provider.ts        ✅ Real — GPT-4o vision + GPT-4o-mini text; fetch to api.openai.com
│   ├── openrouter.provider.ts    ✅ Real — Claude via OpenRouter; fetch to openrouter.ai
│   ├── mock.provider.ts           ✅ Real mock with configurable delay; always available
│   └── provider-registry.ts      ✅ Factory; throws PROVIDER_NOT_CONFIGURED for unknown providers
├── chains/
│   └── image-to-question.chain.ts ✅ runExtractChain, runSolveChain, runValidateChain
├── prompt-templates/
│   └── image-to-question.prompt.ts ✅ buildImagePrompt, buildSolvePrompt, buildValidatePrompt, buildTopicPrompt (TR + EN)
├── errors.ts                    ✅ AIProviderError, ProviderTimeoutError, NoQuestionDetectedError
└── types.ts                     ✅ AIProvider interface + all input/output types
```

### `packages/ocr-core/`
```
src/
├── index.ts                     ✅ Exports hybridOCR, initHybridEngine, normalize functions
├── engines/
│   ├── ocr-engine.interface.ts  ✅ OCREngine interface
│   ├── mock-ocr.engine.ts       ✅ Always returns hardcoded French capital question
│   ├── vision-ocr.engine.ts     ✅ Wraps AI provider; real AI OCR
│   └── hybrid.engine.ts         ✅ Vision → Mock fallback → merge
├── preprocess/
│   ├── enhance-contrast.ts      ✅ CLAHE
│   ├── denoise.ts               ✅ Gaussian blur
│   ├── binarize.ts              ✅ Otsu threshold
│   └── resize-for-ocr.ts        ✅ DPI normalization
├── normalize/
│   ├── whitespace.ts, turkish.ts, math-symbols.ts
│   ├── detect-language.ts       ✅ Turkish character detection
│   └── option-parser.ts         ✅ Parses A. B. C. D. / (a) (b) / 1. 2. 3.
└── confidence/
    └── ocr-confidence.ts        ✅ computeConfidence, assessTextQuality
```

### `packages/solver-core/`
```
src/
├── index.ts                     ✅ Main solver — deterministic + AI fallback
├── classify/
│   └── question-type-classifier.ts ✅ Regex classifier: arithmetic, percentage, ratio, algebra, sequence, MC
├── solvers/
│   ├── arithmetic.ts, percentage.ts, ratio.ts, simple-algebra.ts, sequence.ts, multiple-choice.ts
│   └── fallback-ai.ts          ✅ AI fallback when deterministic confidence < 0.5
├── normalize/
│   ├── question-cleaner.ts      ✅ Full normalization pipeline
│   └── option-parser.ts         ✅ MC option parser
└── validate/
    ├── answer-validator.ts      ✅ Validates answer format and consistency
    └── confidence-calculator.ts ✅ Weighted confidence: OCR 0.3 + solver 0.6 + validation 0.1
```

### `packages/capture-core/`
```
src/
├── index.ts
├── crop.ts                      ✅ calculateImageCropRect, clampCropRect, normalizeCropRect
├── canvas-utils.ts
├── image-normalize.ts
├── compression.ts               ✅ compressToMaxSize, compressCanvas, compressWithPreset, WebP 0.85
└── validation.ts                ✅ Input validation for capture options
```

### `packages/shared/`
```
src/
├── schemas.ts                   ✅ All Zod schemas: SolveImageRequest, SolveResponse, Practice*, Auth*, Admin*, Billing*
└── validation.ts                ✅ Zod validation helpers
```

---

## Docker / Infra

| File | Status | Notes |
|---|---|---|
| `infra/docker/docker-compose.yml` | ✅ Valid | Dev: api, web, telegram-bot, db, redis |
| `infra/docker/docker-compose.prod.yml` | ⚠️ Path issue | Build context mismatch: `../apps/api` vs `../infra/docker/Dockerfile.api` |
| `infra/docker/Dockerfile.api` | ✅ Valid | Two-stage build; Prisma generate; karcoz user |
| `infra/docker/Dockerfile.web` | ✅ Valid | npx serve static; comment says "replace with nginx" |
| `infra/docker/Dockerfile.telegram-bot` | ✅ Valid | Builds from apps/api; compiles telegram-bot.ts |
| `infra/docker/Dockerfile.worker` | ❌ No-op | `tail -f /dev/null`; apps/worker/ is empty |
| `infra/docker/.env.example` | ✅ Complete | All 20+ env vars documented |
| `infra/nginx/karcoz.conf` | ✅ Valid | HTTPS block commented out; TLS needs manual setup |

---

## Ports in Use

| Port | Service | Source |
|---|---|---|
| 8132 | API (host) | docker-compose.yml: `8132:8000` |
| 3100 | Web (host) | docker-compose.yml: `3100:3000` |
| 5433 | PostgreSQL (host) | docker-compose.yml: `5433:5432` |
| 6380 | Redis (host) | docker-compose.yml: `6380:6379` |
| 8000 | API (container) | Dockerfile.api: `EXPOSE 8000` |
| 3000 | Web (container) | Dockerfile.web: `EXPOSE 3000` |

---

## Scripts

| Script | Status |
|---|---|
| `scripts/dev.sh` | ✅ Works — builds all images, starts stack, shows status |
| `scripts/build.sh` | ✅ Calls `docker compose -f infra/docker/docker-compose.prod.yml build --parallel` |
| `scripts/deploy.sh` | ✅ Checks `.env`, validates, runs `docker compose up -d --build` |
| `scripts/backup-db.sh` | ✅ Creates timestamped `.sql.gz` backups |
| `scripts/restore-db.sh` | ✅ Restores from `.sql.gz` |
| `scripts/logs.sh` | ✅ `docker compose logs -f` with service filter |
| `scripts/update.sh` | ✅ `git pull` + rebuild |
| `scripts/smoke-api.sh` | ✅ Bash smoke test suite for health, solve, billing, rate-limit |

---

## Empty / Broken Directories

| Directory | Status | Fix Required |
|---|---|---|
| `apps/telegram-bot/` | **EMPTY** | Bot lives in `apps/api/src/telegram-bot.ts`; delete dir or add placeholder readme |
| `apps/worker/` | **EMPTY** | Implement worker or document why empty |
| `docs/` (root) | **EMPTY** | All docs in subdirectories; safe to remove root `docs/` |
| `server-deploy/docker-compose.yml` | **MISSING** | Not needed — actual compose files are in `infra/docker/` |
| `eval/run-eval.ts` | **MISSING** | Create this file to make `pnpm eval` work |
| `package.json` (root) | **Missing pnpm-workspace.yaml** | Create `pnpm-workspace.yaml` with `packages: ['apps/*', 'packages/*']` |

---

## Previous Report Folders

The following were found but NOT blindly copied:
- `docs/final-report/` — Contains 10 markdown + UI spec + UI demo HTML
- `docs/report_phase_XX_*.md` — 13 phase status reports

These were inspected for context but the new `report_final_v1/` is freshly written.