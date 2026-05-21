# 03 — Product Readiness Review

## Purpose
Evaluate the real user flows, what is implemented vs stubbed, and what is needed for MVP vs production.

---

## Extension Flow Analysis

### Capture Area Flow (Intended)
```
User clicks "Capture Area" in popup
  → content-script receives START_CAPTURE_MODE
  → creates selection-layer (mouse-based crop overlay)
  → user draws rectangle on page
  → captures tab screenshot (chrome.tabs.captureVisibleTab)
  → crops to selection
  → sends CAPTURE_AREA to background
  → capture-controller: captureLatencyMs measured
  → LRU cache check (hash of first 200 chars of image)
  → MISS: apiClient.solve() called
  → result enriched with timing metrics
  → setLastResult stored
  → result-bubble.showAnswer(result) displayed
  → addToHistory() called
```

**Status: ⚠️ PARTIAL**
- `apiClient = createApiClient(true)` → MockApiClient always used
- Real flow: background → capture-controller → apiClient.solve → API server
- Actual flow: background → capture-controller → MockApiClient (no network call)

**Evidence:** `apps/extension/src/lib/api-client.ts` line 162:
```typescript
export const apiClient = createApiClient(true);  // Default: MOCK mode
```

### Page Scan Flow (Intended)
```
User clicks "Scan Page" in popup
  → content-script: extractPageText() from DOM
  → detectQuestions() → rankCandidates()
  → if candidates found: createFloatingCandidateSelector()
  → user selects a candidate
  → sends CAPTURE_AREA with candidateId + pageData
  → background → capture-controller → apiClient.solve
  → result-bubble.showAnswer()
```

**Status: ✅ IMPLEMENTED**
- All components exist and are wired
- No network calls in scan mode until candidate selected

### Result Bubble States
```
idle → capturing → reading → uploading → solving → validating → ready
                                                            ↓
                                                         low (confidence < 0.5)
                                                         ↓
                                                      error (failure)
```

**Status: ✅ IMPLEMENTED** — Full state machine with progress callbacks, auto-hide, drag support

---

## Core Product Flows

### Solve Flow (API)
```
POST /api/solve/image or /api/solve/text
  → session-auth or extension-auth middleware
  → rate-limit middleware
  → validate request (zod schema)
  → solveService.solveFromImage/Text
    1. extract text (extraction.service)
    2. classify topic (topic-classifier)
    3. check answer cache (cache.service → Redis)
    4. solve question (solution.service → ai-core → provider)
    5. validate answer (validation.service)
    6. build Question record in DB
    7. cache answer if not cached
    8. audit log
  → return { questionId, extraction, solution, performance }
```

**Status: ✅ FULLY IMPLEMENTED**
- All pipeline steps exist
- Redis caching implemented
- Audit logging implemented

### Practice Flow
```
POST /api/practice/generate
  → session auth required
  → validate topic, count, difficulty, language
  → practiceService.generatePracticeSet()
    → AI provider generates `count` questions
    → Filter: question >= 10 chars, answer >= 1, options >= 2
    → Create PracticeSet + PracticeQuestion in DB
  → return { setId, questions }

POST /api/practice/sets/:id/attempt
  → session auth required
  → practiceService.submitAttempt()
    → Compare answers (case-insensitive)
    → Calculate score %
    → Store PracticeAttempt
  → return { score, perQuestionResults }
```

**Status: ✅ IMPLEMENTED**
- Full generation + grading pipeline
- Weak topic recommendation (`/api/practice/recommended`)
- Hardcoded fallback mock questions if AI fails

### Telegram Flow
```
User sends photo to Telegram bot
  → handlePhoto():
    → Verify account.isLinked
    → Download photo via Telegram API
    → solveService.solveFromImage()
    → Send answer via Telegram API
  → /link command: shows linking instructions
  → /unlink command: calls telegramService.unlinkAccount()
  → /history: sends link to web dashboard
  → /practice: sends link to practice page
```

**Status: ✅ CODE EXISTS**
- Telegram polling code is in `apps/api/src/telegram-bot.ts`
- BUT: `apps/telegram-bot/` directory is empty — container built from `apps/api` context
- Telegram bot is a **separate process** from the API server
- Not wired in `server.ts` — only runs when `TELEGRAM_BOT_TOKEN` is set and file executed directly

### Billing Flow
```
GET /api/billing/plan
  → billingService.getSubscription() — STUB
  → billingService.listAvailablePlans() — returns hardcoded free/pro/team
  → returns { plan, status, availablePlans }

POST /api/billing/checkout-placeholder
  → console.log PLACEHOLDER
  → returns mock checkout URL

POST /api/billing/cancel
  → Updates DB directly (no provider call)
  → Sets user.plan = 'free'
```

**Status: ❌ STUB — CANNOT COLLECT PAYMENT**
- All methods log "PLACEHOLDER" and return mock data
- No Stripe SDK, no Paddle SDK
- No webhook signature verification

---

## Dashboard Flow (Web)

| Page | Status | Notes |
|---|---|---|
| `login.html` | ❌ Shell | No API calls, no auth flow, no magic link UI |
| `dashboard.html` | ❌ Shell | No API calls, no stats rendering |
| `history.html` | ❌ Shell | No API calls, no question list |
| `weak-topics.html` | ❌ Shell | No API calls, no analytics display |
| `practice.html` | ❌ Shell | No API calls, no practice generation |
| `settings.html` | ❌ Shell | No API calls, no settings save |
| `telegram.html` | ❌ Shell | No API calls, no link/unlink |
| `billing.html` | ❌ Shell | No API calls, no plan display |
| `questions/[id].html` | ❌ Shell | No API calls |

**All 10+ HTML pages are pure UI shells with CSS styling but zero backend wiring.**

**Evidence:** `apps/web-dashboard/package.json`:
```json
"dev": "npx serve public -l 3100"
```
No API client, no fetch calls, no authentication flow.

---

## What Is Needed for MVP

| Feature | Status | MVP Requirement |
|---|---|---|
| Extension popup with capture/scan | ✅ Done | Working UI + real API call |
| Area selection + capture | ✅ Done | Real backend solve |
| Result bubble with answer | ✅ Done | Real answer from AI |
| Page scan with candidates | ✅ Done | Real solve per candidate |
| Question history | ✅ Done | Paginated API + display UI |
| Practice question generation | ✅ Done | AI generation works |
| Practice set grading | ✅ Done | Score + per-question results |
| Weak topic analytics | ✅ Done | DB aggregation + API |
| Extension auth (token) | ✅ Done | Secure per-user tokens |
| Magic link auth | ✅ Done | Email-based login |
| User data export | ✅ Done | Full data export endpoint |
| User data deletion | ✅ Done | Transactional account delete |
| Telegram bot (link/unlink) | ✅ Done | Bot code exists |
| **Extension → Real API** | ❌ BLOCKED | Must flip `createApiClient(false)` |
| **Real API deployment** | ⚠️ Partial | Docker config has path issue |
| **Dashboard wired to API** | ❌ MISSING | All pages are shells |
| **Billing payment** | ❌ MISSING | No Stripe/Paddle |
| **TLS/HTTPS** | ❌ MISSING | Manual certbot setup |
| **CI/CD** | ❌ MISSING | No automated pipeline |

---

## What Is Needed for Production

| Feature | Priority |
|---|---|
| Stripe or Paddle integration | P0 |
| Real extension API client | P0 |
| Dashboard → API wiring | P1 |
| E2E tests (Playwright) | P1 |
| CI/CD pipeline (GitHub Actions) | P1 |
| Background worker (future features) | P2 |
| Real-time usage enforcement | P2 |
| Admin dashboard (live) | P2 |
| Prometheus metrics | P2 |
| Error tracking (Sentry) | P2 |
| Uptime monitoring | P3 |

---

## Safety Boundary Audit

**Critical: Does KARÇÖZ implement any hidden/proctoring/auto-click features?**

| Feature | Status | Evidence |
|---|---|---|
| Hidden UI elements | ✅ NONE | All UI is explicitly user-triggered |
| Invisible exam mode | ✅ NONE | No exam mode exists |
| Proctoring bypass | ✅ NONE | No proctoring features exist |
| Auto-answer clicking | ✅ NONE | Result bubble shows answer; user must read |
| Answer auto-submit | ✅ NONE | No submission mechanism |
| Screen-recording evasion | ✅ NONE | No screen recording |
| Secret background forwarding | ✅ NONE | All network calls logged in audit service |
| Cheating-oriented workflows | ✅ NONE | Study scan mode requires explicit user action |

**VERDICT: ✅ CLEAN** — KARÇÖZ implements a visible, user-consented study assistant. No hidden or cheating-oriented features found.

**Minor safety note:** `host_permissions: ["<all_urls>"]` in manifest.json — necessary for the extension to work on any study website. No data is exfiltrated; capture happens only on explicit user action.