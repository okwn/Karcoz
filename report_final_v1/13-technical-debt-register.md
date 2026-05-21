# 13 — Technical Debt Register

## Purpose
Prioritized table of technical debt items with severity, impact, affected files, and recommended fixes.

---

## Technical Debt Table

| ID | Title | Affected Files | Severity | Impact | Recommended Fix | Effort | Priority |
|---|---|---|---|---|---|---|---|
| **TD-01** | Extension hardcoded to MockApiClient | `apps/extension/src/lib/api-client.ts:162` | Critical | Extension cannot solve real questions in production | Change `createApiClient(true)` to `createApiClient(false)`; make `API_BASE_URL` configurable via extension settings | 1h | **P0** |
| **TD-02** | Docker build path mismatch | `infra/docker/docker-compose.prod.yml` (build context) | Critical | `docker compose prod build` will fail | Change `context: ../apps/api` to `../` and `dockerfile: infra/docker/Dockerfile.api` | 15min | **P0** |
| **TD-03** | `eval/run-eval.ts` missing | `eval/` directory | Critical | Cannot measure AI/OCR quality | Create `eval/run-eval.ts` as proper module that `eval/scripts/run-eval.ts` should be | 2h | **P0** |
| **TD-04** | `pnpm-workspace.yaml` missing | Root `package.json` | High | pnpm ignores `workspaces` field; flat install may cause import issues | Create `pnpm-workspace.yaml` with `packages: ['apps/*', 'packages/*']` | 10min | **P0** |
| **TD-05** | Billing completely stubbed | `apps/api/src/services/billing.service.ts` | High | Cannot collect payments; no monetization | Implement Stripe SDK or Paddle integration | 2–3 days | **P0** |
| **TD-06** | `createApiClient` hardcoded localhost URL | `apps/extension/src/lib/api-client.ts:8` | High | Extension only works against local dev server | Make `API_BASE_URL` read from `chrome.storage.local` settings | 1h | **P1** |
| **TD-07** | No CI/CD pipeline | `.github/workflows/` (empty) | High | No automated tests, lint, typecheck, or deployment | Add GitHub Actions: lint → typecheck → test → build → deploy | 4h | **P1** |
| **TD-08** | Web dashboard pages are shells | `apps/web-dashboard/public/*.html` | High | No user-facing application | Wire HTML pages to API endpoints via fetch(); add auth flow | 3–5 days | **P1** |
| **TD-09** | Worker service is empty no-op | `apps/worker/` (empty), `infra/docker/Dockerfile.worker` | Medium | No background job processing | Document why empty or implement future worker architecture | 1h | **P2** |
| **TD-10** | Provider JSON parsing duplicated | `openai.provider.ts`, `openrouter.provider.ts` | Medium | Code duplication; harder to maintain | Extract common utilities to `@karcoz/shared/src/provider-utils.ts` | 2h | **P2** |
| **TD-11** | CORS allows any origin | `apps/api/src/server.ts` (`origin: true`) | Medium | Security risk in production | Set `origin` to specific frontend domain(s) via env var | 30min | **P1** |
| **TD-12** | No API integration tests | None exist | Medium | No confidence in route correctness | Add Vitest/Supertest integration tests for all routes | 2–3 days | **P1** |
| **TD-13** | No composite index for analytics query | `prisma/schema.prisma` (Question) | Medium | Slow `/analytics/weak-topics` on large datasets | Add index: `@@index([userId, createdAt, topic, confidenceScore])` | 15min | **P1** |
| **TD-14** | Preprocessing not wired into OCR pipeline | `packages/ocr-core/src/engines/hybrid.engine.ts` | Medium | Images not enhanced before OCR | Add preprocess step: enhanceContrast → denoise → binarize → resize → OCR | 2h | **P2** |
| **TD-15** | `apps/telegram-bot/` is empty | `apps/telegram-bot/` | Low | Confusion about where bot code lives | Delete empty directory OR add README pointing to `apps/api/src/telegram-bot.ts` | 10min | **P3** |
| **TD-16** | Admin AI model config not hot-reloaded | `apps/api/src/services/admin.service.ts` | Low | Config changes require restart | Implement runtime config reload via `ModelConfig` table + event emitter | 2h | **P2** |
| **TD-17** | Redis connection pooling not configured | `apps/api/src/config/env.ts` | Low | Connection overhead | Add `pool: { min: 2, max: 10 }` to Redis URL | 10min | **P3** |
| **TD-18** | Static web uses `npx serve` in prod | `infra/docker/Dockerfile.web` | Medium | Not production-grade static serving | Replace with nginx in production compose | 1h | **P2** |
| **TD-19** | TLS not configured | `infra/nginx/karcoz.conf` (HTTPS commented) | High | No HTTPS in production | Uncomment HTTPS block + run certbot | 30min | **P1** |
| **TD-20** | No E2E / Playwright tests | None exist | Medium | No browser-based integration testing | Add Playwright tests for: login flow, solve flow, history, practice | 3–5 days | **P2** |
| **TD-21** | No CAPTCHA on magic link | `apps/api/src/routes/auth.routes.ts` | Low | Potential for abuse | Add CAPTCHA after N failed attempts | 2h | **P3** |
| **TD-22** | Telegram webhook lacks signature verification | `apps/api/src/routes/telegram.routes.ts` | Medium | Telegram webhook could accept fake messages | Verify `chat_id` from Telegram update matches linked account | 1h | **P2** |
| **TD-23** | No eval system for AI quality measurement | `eval/run-eval.ts` missing | High | Cannot quantify AI/OCR accuracy | Fix eval runner + add to CI pipeline | 3h | **P1** |
| **TD-24** | Dashboard has no API wiring | `apps/web-dashboard/public/*.html` | High | Disconnected from backend | Add JavaScript API client + auth handling to each page | 3 days | **P1** |
| **TD-25** | `server-deploy/docker-compose.yml` does not exist | `server-deploy/` | Low | Confusion | Delete `server-deploy/` or add README saying "use infra/docker/" | 10min | **P3** |

---

## Debt Summary by Priority

### P0 (Must Fix Before Production)
| ID | Title | Effort |
|---|---|---|
| TD-01 | Extension MockApiClient hardcoded | 1h |
| TD-02 | Docker build path mismatch | 15min |
| TD-03 | Eval runner missing | 2h |
| TD-04 | pnpm workspace not configured | 10min |
| TD-05 | Billing stubbed | 2–3 days |

### P1 (Fix Before Launch)
| ID | Title | Effort |
|---|---|---|
| TD-06 | API_BASE_URL hardcoded | 1h |
| TD-07 | No CI/CD | 4h |
| TD-08 | Dashboard shells | 3–5 days |
| TD-11 | CORS wildcard | 30min |
| TD-12 | No API integration tests | 2–3 days |
| TD-13 | Missing composite index | 15min |
| TD-19 | TLS not configured | 30min |
| TD-23 | Eval system broken | 3h |
| TD-24 | Dashboard not wired | 3 days |

### P2 (Post-Launch)
| ID | Title | Effort |
|---|---|---|
| TD-09 | Empty worker service | 1h |
| TD-10 | Duplicated provider code | 2h |
| TD-14 | Preprocessing not wired | 2h |
| TD-16 | Config not hot-reloaded | 2h |
| TD-18 | npx serve in prod | 1h |
| TD-20 | No E2E tests | 3–5 days |
| TD-22 | Telegram webhook verification | 1h |

### P3 (Nice to Have)
| ID | Title | Effort |
|---|---|---|
| TD-15 | Empty telegram-bot directory | 10min |
| TD-17 | Redis pooling not configured | 10min |
| TD-21 | No CAPTCHA | 2h |
| TD-25 | server-deploy confusion | 10min |

---

## Total Estimated Effort

| Phase | Items | Time |
|---|---|---|
| P0 fixes | 5 | ~3 days |
| P1 fixes | 9 | ~10 days |
| P2 fixes | 7 | ~5 days |
| P3 fixes | 4 | ~4h |
| **Total** | **25** | **~18 days + 4h** |