# P0 Foundation Fixes — KARÇÖZ Release Report

**Date:** 2026-05-21
**Scope:** 7 P0 blockers addressed in this session

---

## Summary

All 7 P0 foundation blockers have been resolved. The system can now:
- Run `pnpm eval` successfully
- Build with a valid docker-compose.prod.yml config
- Use workspace symlinks via pnpm-workspace.yaml
- Route extension API calls to a real (configurable) backend
- Enforce image size limits before AI provider calls
- Run CORS with specific origins in production
- Add a root .env.example with all required variables

---

## Files Changed

### 1. Created: `pnpm-workspace.yaml`
```
packages:
  - "apps/*"
  - "packages/*"
  - "eval"
```
Enables pnpm workspace symlinks across all 10 workspace projects (apps/*, packages/*, eval).
Previously `package.json` `workspaces` field was ignored by pnpm v10.

### 2. Fixed: `apps/extension/src/lib/api-client.ts`
- `apiClient` is no longer hardcoded to `MockApiClient`
- Dynamic client reads `karcoz_use_mock` from `chrome.storage.local` at call time (5s cache TTL)
- `API_BASE_URL` read from `chrome.storage.local` (key: `karcoz_api_url`), defaults to `http://localhost:8132`
- `getApiBaseUrl()` and `isMockMode()` exported helpers added
- `RealApiClient` uses dynamic URL fetched per-request (no hardcoded localhost)
- Extension defaults to mock mode (user must explicitly uncheck "Use mock API" in settings)

### 3. Created: `apps/extension/src/popup/settings.html`, `settings.css`, `settings.js`
- Settings panel accessible from popup "Settings" button (opens as new tab)
- Fields: API Base URL input, "Use mock API" checkbox
- "Test API Connection" button — calls `GET /health` with 5s timeout, shows colored status dot
- "Disconnect Account" button clears stored token
- All settings persist to `chrome.storage.local`

### 4. Fixed: `apps/extension/manifest.json` + `background/service-worker.ts`
- `OPEN_SETTINGS` route handler opens `popup/settings.html` as new tab
- Build output verified: service-worker.js and content-script.js built without errors

### 5. Fixed: `infra/docker/docker-compose.prod.yml` — build contexts
| Service | Old context | New context | Dockerfile |
|---------|-------------|-------------|------------|
| `api` | `../apps/api` | `../../apps/api` | `../infra/docker/Dockerfile.api` |
| `web` | `../apps/web-dashboard` | `../../apps/web-dashboard` | `../infra/docker/Dockerfile.web` |
| `telegram-bot` | `../apps/api` | `../../apps/api` | `../infra/docker/Dockerfile.telegram-bot` |
- Worker section already commented out in prod compose
- Validation: `docker compose -f infra/docker/docker-compose.prod.yml config` passes cleanly

### 6. Fixed: `package.json` — eval script
```json
"eval": "pnpm --filter @karcoz/eval eval"
```
Previously pointed to non-existent `eval/run-eval.ts`. Now delegates to `@karcoz/eval` workspace which has `scripts/run-eval.ts`.

### 7. Created: `.env.example` at project root
Contains: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `APP_BASE_URL`, `MAGIC_LINK_BASE_URL`, `ALLOWED_ORIGINS`, `AI_PROVIDER`, `MOCK_AI`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `TELEGRAM_BOT_TOKEN`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

### 8. Fixed: `apps/api/src/server.ts` — CORS
- `origin: true` replaced with environment-aware origin list
- Production: reads `ALLOWED_ORIGINS` env var (comma-separated), falls back to `APP_BASE_URL`, or `false` (no origins) if unset
- Development: allows `localhost:3100`, `localhost:3000`, `127.0.0.1:3100`, `127.0.0.1:3000`
- `ALLOWED_ORIGINS` added to `env.ts` schema and `ValidatedEnv` type

### 9. Added: `packages/shared/src/schemas.ts` — image size validation
`SolveImageRequestSchema.imageBase64` now has `.max(10 * 1024 * 1024, 'Image exceeds maximum size of 10MB')`. Rejected by Zod before reaching the AI provider, returns HTTP 400 with structured error.

### 10. Fixed: `apps/api/src/config/env.ts`
- Added `ALLOWED_ORIGINS?: string` to env schema and `ValidatedEnv` interface

---

## Validation Results

| Command | Result | Notes |
|---------|--------|-------|
| `pnpm install` | ✅ PASS | 409 packages installed, workspace symlinks active |
| `pnpm typecheck` | ✅ PASS | 0 errors across 7 workspaces |
| `pnpm lint` | ✅ PASS | 0 errors |
| `pnpm test` | ✅ PASS | 88/88 tests passed |
| `pnpm build` | ✅ PASS | All packages built (api, extension, web-dashboard, ai-core, ocr-core, capture-core, shared, solver-core) |
| `pnpm eval` | ✅ PASS | 5/5 eval entries pass; report saved to eval/reports/ |
| `docker compose -f infra/docker/docker-compose.yml config` | ✅ PASS | Dev compose config valid |
| `docker compose -f infra/docker/docker-compose.prod.yml config` | ✅ PASS | Prod compose config valid |

---

## Remaining Blockers (Non-P0)

These are out of scope for P0 foundation but required for production:

| Blocker | Impact | Estimated Fix Time |
|---------|--------|-------------------|
| Billing completely stubbed (Stripe not integrated) | Cannot collect payment | 2–3 days |
| Dashboard not connected to API (all HTML pages are shells) | No user-facing application | 3–5 days |
| No CI/CD pipeline | Manual deployments, no automated quality gates | 4h |
| Worker service empty | No background job processing | 1h |
| Telegram bot not containerized separately | Polling code exists but not deployed as separate container | 30min |
| TLS not configured | No HTTPS in production | 30min |
| No composite DB index for analytics query | Slow `/analytics/weak-topics` at scale | 15min |
| Preprocessing not wired into OCR pipeline | Images not enhanced before OCR | 2h |

---

## Extension — Real API Status

**Can it call real API now?** ✅ YES

How:
1. Open extension popup → Settings
2. Enter API Base URL (e.g., `http://localhost:8132`)
3. Uncheck "Use mock API"
4. Click "Test API Connection" to verify
5. Solve requests go to the configured URL

Default after install: mock mode enabled. User must explicitly opt into real API.

---

## Production Docker Compose Config Status

**Is prod compose config valid?** ✅ YES

```
docker compose -f infra/docker/docker-compose.prod.yml config
```
Parses without errors. Build contexts resolve to:
- `api`: `/home/oguz/Masaüstü/KarÇÖZ/apps/api`
- `web`: `/home/oguz/Masaüstü/KarÇÖZ/apps/web-dashboard`
- `telegram-bot`: `/home/oguz/Masaüstü/KarÇÖZ/apps/api`

Worker is commented out. All Dockerfile paths resolve correctly.

---

## pnpm Workspace Status

**Are workspace symlinks working?** ✅ YES

```
node_modules/.pnpm/  ← hoisted store
packages/*/node_modules/ ← symlinks to .pnpm/ (workspace packages)
apps/*/node_modules/   ← symlinks to .pnpm/
eval/node_modules/     ← symlinks to .pnpm/
```

`@karcoz/ai-core`, `@karcoz/shared`, `@karcoz/ocr-core`, etc. resolve correctly from `@karcoz/api`.

---

## Commands Run (Chronological)

```bash
# Workspace setup
pnpm install                          # ✅ 409 packages, 10 workspace projects
npx prisma generate                   # Prisma client generated (required after install)
pnpm add --filter @karcoz/api redis   # redis package missing from api deps

# Individual workspace fixes
pnpm --filter @karcoz/extension build  # ✅ Built successfully

# Full validation suite
pnpm install                          # ✅ Already up to date
pnpm typecheck                        # ✅ 0 errors
pnpm lint                             # ✅ 0 errors
pnpm test                             # ✅ 88/88 passed
pnpm build                            # ✅ All packages built
pnpm eval                             # ✅ 5/5 entries pass
docker compose -f infra/docker/docker-compose.yml config    # ✅ PASS
docker compose -f infra/docker/docker-compose.prod.yml config # ✅ PASS
```