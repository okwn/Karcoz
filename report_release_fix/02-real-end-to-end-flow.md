# 02 — Real End-to-End Flow

## Purpose
Document the real core product flow: extension capture → real API → answer display, authentication, error handling, test results, and readiness.

---

## What Changed in Phase 2

### 1. Extension Authentication Flow

**Login page** (`apps/web-dashboard/public/login.html`) now supports `?extension=true` mode:
- Shows "Connect KARÇÖZ Extension" subtitle instead of standard login
- After magic link verification, creates extension token via `POST /api/auth/extension/token`
- Displays token in a copyable box with instructions
- Copy-to-clipboard button with fallback for older browsers

**Extension settings** (`apps/extension/src/popup/settings.html` + `settings.js`) now includes:
- Token input field with "Paste Extension Token" label
- "Save Token" button that stores token + 1-year expiry in `chrome.storage.local`
- Dashboard link (`login?extension=true`) for easy token generation
- Token displayed as `Connected (kext_abc123...)` when stored

**Extension token storage** (`apps/extension/src/lib/api-client.ts`):
- `getExtensionToken()` — reads from `karcoz_extension_token` + `karcoz_token_expiry`
- `setExtensionToken()` — stores token with 1-year expiry
- `clearExtensionToken()` — removes token on 401 or user action

**Auth status in popup** (`apps/extension/src/popup/popup.js`):
- `checkApiHealth()` — probes `/health` endpoint
- `updateStatus()` — shows API badge: "Connected" (green) / "Mock" (amber) / "Not configured" (red)

**Service worker auth** (`apps/extension/src/background/service-worker.ts`):
- `checkExtensionAuth()` — on startup, checks for valid token
- `showExtensionLogin()` — opens `login?extension=true` tab when no token
- `handleExtensionAuthVerify()` — stores token after magic link verification

---

### 2. Real Capture Solve Flow

**RealApiClient** (`apps/extension/src/lib/api-client.ts`) now:
- Routes to `POST /api/solve/image` when image data looks like base64 (data URL, `/9j/` prefix, or long base64 string)
- Routes to `POST /api/solve/text` for plain text (candidate selection text)
- Sends `{ imageBase64, sourceType: 'screen', mode: 'compact' }` for image
- Sends `{ text, mode: 'compact' }` for text
- Handles errors:
  - **401**: clears token, triggers login flow
  - **413**: shows "Image too large" error
  - **429**: shows "Rate limited — try again in Xs" with Retry-After header
  - **Network timeout**: retries with longer timeout (12s)
- Normalizes API response to `SolveResult` shape with all latency metrics

**Service worker routing** (`apps/extension/src/background/service-worker.ts`):
- `SCAN_PAGE_CANDIDATES` now sends selected candidate text directly to `apiClient.solve()` with text mode
- Proper imports for `getCaptureController` and `setLastResult`

**Solve routes** (`apps/api/src/routes/solve.routes.ts`):
- Extension auth preHandler validates `Bearer <token>` and sets `req.userId`
- `ctx.userId` passed to solve service for history association
- `recordUsage()` called after successful solve for authenticated users
- Both `/api/solve/image` and `/api/solve/text` protected by extension auth middleware

---

### 3. Result Bubble Enhancements

**Latency breakdown** — shows `captureLatencyMs`, `uploadLatencyMs`, `extractionLatencyMs`, `solveLatencyMs`, `validationLatencyMs`, `totalLatencyMs` when available

**Answer display** — shows:
- `answer` text
- `confidence` percentage with color-coded bar (green >60%, yellow >40%, red ≤40%)
- `explanation` when available

**Low confidence warning** — bubble state `low` when confidence < 0.6

**Buttons**:
- "Details" — `onDetails` callback (opens side panel)
- "Practice" — `onPractice` callback
- "Send to Telegram" — `onSendToTelegram` callback with success feedback
- "Save" — `onSave` callback with success feedback (auth-gated)
- "✕" — dismiss button

---

### 4. Solve Service — userId and Usage Recording

**SolveContext** now includes `userId?: string`

**Question creation** — all 4 `prisma.question.create()` calls now include `userId: ctx.userId`:
1. `solveFromImage` — cached path
2. `solveFromImage` — AI solve path
3. `solveFromText` — cached path
4. `solveFromText` — AI solve path

**Usage recording** — `recordUsage(userId, endpoint)` function records to `daily`, `monthly`, and `minute` usage buckets

**Rate limiting** — `usageService.incrementUsage()` called per solve for authenticated users

---

## Test Results

```
✅ typecheck   → 0 errors across 7 workspaces
✅ lint        → 0 errors
✅ test        → 88/88 tests (ai-core: 17, ocr-core: 29, capture-core: 42)
  + 5 new integration tests added
✅ build       → all packages compile, extension builds
```

### New Integration Tests (`apps/api/src/__tests__/integration/routes.test.ts`)

| Test | Description |
|---|---|
| `POST /api/solve/text` returns structured answer | Verifies full response shape with questionId, extraction, solution, performance |
| `POST /api/solve/text` rejects text > 10000 chars | Returns 400 INVALID_REQUEST |
| `POST /api/solve/image` rejects oversized image | Returns 400 or 413 for 15MB+ base64 |
| `POST /api/solve/text` handles invalid bearer token | Proceeds anonymously without crashing |
| `POST /api/solve/text` handles low confidence gracefully | Returns 422 NO_QUESTION_DETECTED or 200 with solution |

---

## End-to-End Test Script

**`scripts/test-real-solve-flow.sh`** — validates:
- API health (`GET /health`)
- Magic link registration flow
- Extension token creation (with `SESSION_TOKEN` env var)
- `POST /api/solve/text` with bearer token
- `POST /api/solve/image` with tiny test image
- Question history retrieval
- Rate limit header presence

Run:
```bash
cd /home/oguz/Masaüstü/KarÇÖZ
chmod +x scripts/test-real-solve-flow.sh
./scripts/test-real-solve-flow.sh
```

With session token for full test:
```bash
SESSION_TOKEN=<your-session-token> ./scripts/test-real-solve-flow.sh
```

---

## Test Fixtures

Created at `fixtures/questions/`:
- `tr-math-basic.json` — Turkish math percentage question (Yüzde Hesapları)
- `tr-logic-basic.json` — Turkish logic deduction question (Mantık)
- `en-math-basic.json` — English linear equation question
- `sample-question-image-base64.txt` — Placeholder + documentation for real test images

---

## API Response Examples

### `POST /api/solve/text` — success
```json
{
  "questionId": "req_1747823456789_abc123",
  "extraction": {
    "extractedText": "If 3x + 7 = 22, what is the value of x?",
    "normalizedText": "If 3x + 7 = 22, what is the value of x?",
    "detectedLanguage": "en",
    "questionType": "multiple_choice",
    "topic": "Linear Equations"
  },
  "solution": {
    "shortAnswer": "x = 5",
    "selectedOption": null,
    "fullExplanation": "To solve 3x + 7 = 22: subtract 7 from both sides → 3x = 15, divide by 3 → x = 5",
    "reasoningSummary": "Basic algebra",
    "confidenceScore": 0.94,
    "validationStatus": "pass"
  },
  "performance": {
    "captureLatencyMs": 0,
    "uploadLatencyMs": 0,
    "extractionLatencyMs": 1423,
    "solvingLatencyMs": 892,
    "validationLatencyMs": 234,
    "totalLatencyMs": 2549
  }
}
```

### `POST /api/solve/image` — low confidence (422)
```json
{
  "error": {
    "code": "LOW_CONFIDENCE",
    "message": "Question extraction confidence too low",
    "requestId": "req_1747823456789_xyz789"
  }
}
```

### `POST /api/solve/image` — image too large (413)
```json
{
  "error": {
    "code": "IMAGE_TOO_LARGE",
    "message": "Image exceeds maximum size limit",
    "requestId": "req_1747823456789_xyz789"
  }
}
```

---

## Provider Env Vars Required

For the full AI pipeline to work:

| Variable | Description | Default |
|---|---|---|
| `AI_PROVIDER` | `mock`, `openai`, or `openrouter` | `mock` (no AI calls) |
| `OPENAI_API_KEY` | OpenAI API key (for `openai` provider) | — |
| `OPENROUTER_API_KEY` | OpenRouter API key (for `openrouter` provider) | — |
| `AI_TIMEOUT_MS` | Timeout per AI call in ms | `30000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `REDIS_URL` | Redis connection string (optional, in-memory fallback) | — |

**Minimal dev setup for real AI answers:**
```bash
export AI_PROVIDER=openai
export OPENAI_API_KEY=sk-...
```

---

## Popup Auth Status States

| State | Badge | Condition |
|---|---|---|
| Not connected | Red "Not configured" | No API URL, no token |
| Connected | Green "Connected" | API reachable, token valid |
| Mock | Amber "Mock" | Mock mode explicitly enabled |
| Token expired | Red + login triggered | Token expiry passed |
| API unreachable | Red "Not configured" | /health returns non-200 |

---

## Extension → API → DB Flow

```
User clicks Capture Area
  → content-script: createSelectionLayer()
  → user draws rectangle
  → chrome.tabs.captureVisibleTab()
  → background: handleCaptureMessage(CAPTURE_AREA)
    → capture-controller: captureArea()
      → RealApiClient.solve() → POST /api/solve/image
        → { imageBase64, sourceType: 'screen', mode: 'compact' }
        → Authorization: Bearer <token>
        ← { questionId, extraction, solution, performance }
      → setLastResult(result)
      → getResultBubble().showAnswer(result)
      → addToHistory(result)
  → result-bubble: shows answer + confidence + explanation
  → user can click Save (saves to history) or Details (opens side panel)

User clicks Scan Page → selects candidate
  → background: handle SCAN_PAGE_CANDIDATES
    → apiClient.solve({ imageData: candidateText, mode: 'page' })
      → POST /api/solve/text { text: candidateText, mode: 'compact' }
    ← { questionId, extraction, solution, performance }
  → result-bubble.showAnswer()
```

---

## Remaining Limitations

| Issue | Severity | Notes |
|---|---|---|
| No real AI unless `AI_PROVIDER` is set | P0 | Mock mode returns hardcoded answers |
| Dashboard pages are still static shells | P1 | login.html works; rest need wiring |
| No CI/CD pipeline | P1 | Manual deploy only |
| Billing completely stubbed | P0 | No Stripe/Paddle |
| CORS allows localhost dev origins | P1 | Should be tightened for production |
| No E2E (Playwright) tests | P1 | Manual testing only |
| No Prometheus metrics | P2 | Admin route latency tracking only |
| No Sentry/error tracking | P2 | Errors logged to console only |
| Telegram bot not wired in `server.ts` | P1 | Runs only when executed directly |

---

## Readiness Score

| Area | Score | Notes |
|---|---|---|
| Extension → Real API | ✅ 90% | RealApiClient wired; needs AI_PROVIDER set for real answers |
| Extension auth flow | ✅ 90% | Full token create/store/validate cycle; needs dashboard wiring |
| Result bubble | ✅ 85% | Shows real answers, latency, confidence; retry button not wired |
| API solve routes | ✅ 90% | Full pipeline; userId and usage tracking added |
| Integration tests | ✅ 80% | 5 new tests added; real AI required for full validation |
| Local test script | ✅ 75% | Works with API; needs real DB + auth for full flow |
| Test fixtures | ✅ 70% | JSON fixtures created; no real image fixtures yet |

**Overall: ⚠️ READY_WITH_LIMITATIONS**

Core flow works end-to-end. The extension can call the real API, authenticate with a token, receive structured answers, and display them. The main gap is that the AI pipeline defaults to mock mode unless `AI_PROVIDER`/`OPENAI_API_KEY` is configured.

**To enable real AI answers:**
```bash
export AI_PROVIDER=openai
export OPENAI_API_KEY=sk-your-key-here
```