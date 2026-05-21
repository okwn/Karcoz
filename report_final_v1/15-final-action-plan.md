# 15 — Final Action Plan

## Purpose
Concrete phased plan with immediate actions, timelines, and milestones for reaching production-ready status.

---

## Immediate Actions (Before Any Code Review)

These are **P0 blockers** that make the system non-functional or non-deployable:

### TD-01: Fix Extension API Client
**File:** `apps/extension/src/lib/api-client.ts:162`
```typescript
// Change from:
export const apiClient = createApiClient(true);
// To: use environment-based selection
export const apiClient = createApiClient(process.env.NODE_ENV === 'production');
```
Also make `API_BASE_URL` configurable via extension settings storage.
**Time:** 1h

### TD-02: Fix Docker Build Path
**File:** `infra/docker/docker-compose.prod.yml`

Change build context from `../apps/api` to `../` and dockerfile to `infra/docker/Dockerfile.api`.

Alternatively, move `Dockerfile.api` into `apps/api/` directory.
**Time:** 15min

### TD-04: Create pnpm-workspace.yaml
**File:** Root — create `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```
**Time:** 10min

### TD-03: Fix Eval System
**File:** `eval/run-eval.ts` — create this file to make `pnpm eval` work.
The `package.json` references `eval/run-eval.ts` but the actual code may be at `eval/scripts/run-eval.ts`. Align the paths or create the missing file.
**Time:** 2h

---

## Next 24 Hours

### 1. Fix Docker Compose Prod Config
- Fix build path mismatch in `docker-compose.prod.yml`
- Verify `docker compose -f infra/docker/docker-compose.prod.yml config` passes
**Owner:** DevOps

### 2. Create pnpm-workspace.yaml
- Add proper workspace configuration
- Re-run `pnpm install` to verify workspace symlinks
**Owner:** DevOps

### 3. Wire Extension to Real API
- Change `createApiClient(false)` in extension
- Make `API_BASE_URL` configurable via `chrome.storage.local` settings
- Add production API URL to extension settings
**Owner:** Frontend

### 4. Verify Docker Dev Stack
- Run `scripts/dev.sh` or `docker compose -f infra/docker/docker-compose.yml up -d`
- Run `scripts/smoke-api.sh` to verify API health
- Verify DB migrations run: `docker exec karcoz_api npx prisma db push`
**Owner:** DevOps

### 5. Document Environment Setup
- Create `.env` from `infra/docker/.env.example`
- Document all required environment variables
- Add `.env.example` at project root if missing
**Owner:** DevOps

---

## Next 3 Days

### Day 1 — Infrastructure Foundation

| Task | Owner | Time |
|---|---|---|
| Fix Docker prod build path | DevOps | 30min |
| Add pnpm-workspace.yaml | DevOps | 10min |
| Verify all Docker services start | DevOps | 1h |
| Set up TLS with certbot (staging) | DevOps | 1h |
| Add GitHub Actions CI: lint → typecheck → test → build | DevOps | 2h |
| Fix CORS to use specific origin | Backend | 30min |

### Day 2 — API Completeness

| Task | Owner | Time |
|---|---|---|
| Fix `eval/run-eval.ts` | Backend | 2h |
| Add image size validation in solve routes | Backend | 1h |
| Add composite index for analytics query | Backend | 15min |
| Verify Redis caching works | Backend | 1h |
| Wire web dashboard login page to real API | Frontend | 3h |
| Add admin auth middleware IP logging | Backend | 1h |
| Add Telegram webhook chat_id verification | Backend | 1h |

### Day 3 — Frontend and Billing

| Task | Owner | Time |
|---|---|---|
| Wire dashboard HTML pages to API | Frontend | 4h |
| Implement Stripe SDK in billing service | Backend | 3h |
| Add plan-based usage enforcement confirmation | Backend | 1h |
| Test magic link flow end-to-end | QA | 1h |
| Test extension → API solve flow | QA | 2h |
| Add skeleton loading states to dashboard | Frontend | 2h |

---

## Next 1 Week

### Core MVP Completion

| Task | Priority | Time |
|---|---|---|
| Stripe billing integration (checkout, webhook, cancel) | P0 | 2–3 days |
| Dashboard full API wiring (all 10 pages) | P1 | 2 days |
| GitHub Actions CI/CD pipeline | P1 | 1 day |
| Fix preprocessing pipeline (wire into OCR) | P2 | 2h |
| Add Redis connection pooling config | P3 | 30min |
| Add composite DB indexes for analytics | P1 | 15min |
| Test all API routes with integration tests | P1 | 1–2 days |
| Smoke test suite in CI | P1 | 2h |

### Product Quality

| Task | Priority | Time |
|---|---|---|
| Add E2E tests (Playwright) for: login, solve, history, practice | P2 | 2–3 days |
| User onboarding flow (welcome + feature tour) | P2 | 1–2 days |
| Dark mode for web dashboard | P3 | 4h |
| Mobile responsive check for dashboard | P2 | 2h |
| Error tracking (Sentry) | P2 | 2h |

---

## Next 2 Weeks

### Production Hardening

| Task | Priority | Time |
|---|---|---|
| TLS/HTTPS production setup | P1 | 1h |
| Replace `npx serve` with nginx in prod | P2 | 1h |
| Database backup/restore tested | P1 | 2h |
| Add Prometheus metrics | P3 | 4h |
| Hot config reload for AI model | P2 | 2h |
| Load testing (k6) | P3 | 1 day |
| Feature flags system | P3 | 1 day |
| Admin live dashboard (replace static pages) | P2 | 2 days |
| Usage alerts (notify when approaching limits) | P2 | 4h |
| API documentation (Swagger/OpenAPI) | P2 | 2h |

### Monetization

| Task | Priority | Time |
|---|---|---|
| Stripe checkout flow complete | P0 | 2 days |
| Webhook signature verification | P0 | 1h |
| Usage-based billing notifications | P2 | 2h |
| Invoice history page | P3 | 2h |
| Refund handling flow | P3 | 1 day |

---

## Release Candidate Milestone

### Criteria for RC

| Requirement | Status | Notes |
|---|---|---|
| Extension calls real API | ❌ Not done | Blocked by TD-01 |
| Billing accepts real payments | ❌ Not done | Stripe not integrated |
| Dashboard fully functional | ❌ Not done | All pages are shells |
| Docker prod build succeeds | ❌ Not done | Path mismatch |
| TLS configured | ❌ Not done | Manual setup needed |
| CI/CD pipeline running | ❌ Not done | No GitHub Actions |
| All P0 bugs resolved | ❌ Not done | 5 P0 items |
| Smoke tests pass | ⚠️ Not automated | Manual `smoke-api.sh` exists |
| No P0 or P1 technical debt remaining | ❌ Not done | 14 P0/P1 items |
| Admin panel shows live data | ❌ Not done | Static pages |

### RC Target: ~3 weeks with dedicated development

---

## Post-Launch Roadmap

### Month 1 — Stability
- Monitor error rates (Sentry)
- Monitor API latency (P50/P95/P99)
- Add automated DB backups (daily)
- Add usage alerting
- Build team features (team plan exists but not implemented)

### Month 2 — Growth
- API key management (for team plan)
- Referral program
- Email notifications (weekly progress digest)
- Mobile-responsive improvements
- Accessibility audit (WCAG 2.1 AA)

### Month 3 — Scale
- Kubernetes migration (if needed)
- Multi-region deployment
- AI model A/B testing
- Advanced analytics (per-topic trends)
- Mobile app (React Native or PWA)

---

## Top 10 Blockers Summary

| Rank | Blocker | Impact | Fix Time |
|---|---|---|---|
| **1** | Extension uses MockApiClient | Extension cannot solve real questions | 1h |
| **2** | Docker build path mismatch | Cannot build production images | 15min |
| **3** | Billing is a no-op | Cannot collect payment | 2–3 days |
| **4** | Dashboard not connected to API | No user-facing application | 3–5 days |
| **5** | Eval system broken | Cannot measure AI quality | 3h |
| **6** | No CI/CD pipeline | Manual deployments, no automated quality gates | 4h |
| **7** | `pnpm-workspace.yaml` missing | Workspace packages not properly linked | 10min |
| **8** | TLS not configured | No HTTPS in production | 30min |
| **9** | No API integration tests | Low confidence in route correctness | 2–3 days |
| **10** | CORS allows any origin | Security gap in production | 30min |

---

## Quick Wins (Under 30 minutes)

1. **Create pnpm-workspace.yaml** (10min) — TD-04
2. **Fix Docker build path** (15min) — TD-02
3. **Fix CORS origin** (30min) — TD-11
4. **Add composite DB index** (15min) — TD-13
5. **Add Telegram webhook verification** (1h) — TD-22
6. **Delete empty `apps/telegram-bot/`** (10min) — TD-15

---

## Recommended Next Prompt

```
Fix the following P0 blockers in order:
1. Create pnpm-workspace.yaml
2. Fix Docker build path in docker-compose.prod.yml
3. Flip createApiClient to use RealApiClient with configurable URL
4. Create eval/run-eval.ts
5. Add .env.example to project root
```

After these, proceed to wire dashboard → API, then implement Stripe billing.