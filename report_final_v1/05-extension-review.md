# 05 — Extension Review

## Purpose
Deep analysis of the Chrome Extension: Manifest V3 compliance, permissions, content scripts, background worker, result bubble, privacy, and safety.

---

## Manifest V3 Compliance

**File:** `apps/extension/manifest.json`

```json
{
  "manifest_version": 3,
  "name": "KARÇÖZ",
  "version": "0.1.0",
  "permissions": ["activeTab", "tabs", "storage"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background/service-worker.js", "type": "module" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content-script.js"],
    "css": ["content/content-styles.css"],
    "run_at": "document_idle"
  }],
  "sidepanel": { "default_path": "sidepanel/sidepanel.html" }
}
```

**Status: ✅ COMPLIANT** — Manifest V3, service worker (not persistent background page), content scripts with CSS.

---

## Permissions Analysis

| Permission | Required | Justification |
|---|---|---|
| `activeTab` | Yes | Needed to capture visible tab content |
| `tabs` | Partial | Used for `chrome.tabs.captureVisibleTab` and `chrome.tabs.query` |
| `storage` | Yes | Local storage for history, settings, last result |
| `<all_urls>` | Yes | Extension must work on any study website (questions appear everywhere) |

**Privacy note:** `<all_urls>` is broad but necessary for a study assistant. The extension does NOT:
- Read page content passively
- Exfiltrate data without user action
- Log keystrokes or form inputs
- Track browsing history

Capture only occurs on explicit user action (clicking capture/scan).

---

## Content Scripts

### `content-script.ts` — Message Hub
**Lines:** ~180

Handles messages from popup and background:
- `START_CAPTURE_MODE` → `startCaptureArea()`
- `SCAN_PAGE` → `startScanPage()`
- `STUDY_MODE_CHANGED` → Updates state
- `SHOW_RESULT` → Creates/updates result bubble

**No direct API calls from content script.** All API calls go through background service worker.

### `selection-layer.ts` — Area Selection
**Lines:** ~160

Creates a full-page overlay for drawing capture rectangle:
- Mouse event handlers (mousedown/mousemove/mouseup)
- Min selection: 10x10px
- Escape key cancels
- Creates `.kcz-selection-overlay` and `.kcz-selection-box` DOM elements

**Status: ✅ Clean implementation**

### `result-bubble.ts` — Answer Display
**Lines:** ~452

Full-featured floating result bubble:
- **States:** idle → capturing → reading → uploading → solving → validating → ready/low/error
- **Drag:** Header element draggable with mousedown/mousemove/mouseup
- **Collapse:** Toggle button with ▲/▼ icons
- **Auto-hide:** Configurable via `autoHideMs` (default: 8000ms for ready/low/error states)
- **Callbacks:** `onDetails`, `onSave`, `onPractice`, `onSendToTelegram`, `onDismiss`
- **Progress display:** Shows `captureLatencyMs`, `uploadLatencyMs`, etc.
- **Confidence badge:** Color-coded (green >0.8, yellow >0.5, red ≤0.5)

**Status: ✅ Well-implemented, user-visible at all times**

### `page-text-extractor.ts` — DOM Extraction
**Lines:** ~206

Extracts readable text from page DOM:
- Priority selectors: `[role="main"]`, `main`, `article`, `.question`, `.problem`, `.exercise`, `.quiz`, `.test`, `.card-body`
- Skips: `script`, `style`, `nav`, `footer`, `header`, `aside`, `canvas`, `svg`
- Visible-only: checks `display`, `visibility`, `opacity`
- Min text: 10 chars; Max: 5000 chars
- Alpha ratio filter: ≥30% alphanumeric
- Returns: `{ title, pageText, blocks[], url, timestamp }`

**Status: ✅ Thorough**

### `question-detector.ts` — Candidate Detection
**Lines:** ~232

Scores DOM blocks as potential questions:
- Option patterns: `A. B. C. D.` / `(a) (b) (c)` / `1. 2. 3.`
- Scoring: question words (+0.4), action verbs (+0.25), `?` (+0.2), MC patterns (+0.25), math (+0.15)
- Min confidence threshold: 0.25
- Merges nearby blocks (within 150px vertical proximity)
- Ranks candidates, boosts 1.2x if ≥2 options found

**Status: ✅ Solid**

### `question-candidate-overlay.ts` — Candidate Selector
**Lines:** ~261

Two modes:
1. `createCandidateOverlay()` — Full-page overlay with list
2. `createFloatingCandidateSelector()` — Floating panel + numbered page markers

Keyboard accessible (Enter/Space to select).

---

## Background Service Worker

### `service-worker.ts` — Message Router
**Lines:** ~160

Registers 15 route handlers:
- `CAPTURE_AREA`, `SCAN_PAGE`, `SCAN_PAGE_CANDIDATES` → `handleCaptureMessage`
- `TOGGLE_STUDY_MODE` → Toggle study mode state
- `GET_STATUS` → Returns study mode state
- `OPEN_DETAILS` → Opens side panel + loads details
- `SAVE_RESULT` → Saves to history
- `OPEN_HISTORY`, `OPEN_SETTINGS` → Opens side panel
- `GET_HISTORY`, `CLEAR_HISTORY`, `DELETE_ALL_DATA` → Storage management
- `GET_SETTINGS`, `UPDATE_SETTINGS` → Settings management
- `PROGRESS_UPDATE` → Forward progress to content script

**Auth check on startup:**
```typescript
chrome.runtime.onInstalled.addListener(() => { checkExtensionAuth(); });
// If no token: setTimeout(() => showExtensionLogin(), 500);
```

Login page: `http://localhost:3100/login?extension=true` — hardcoded localhost URL.

**Status: ✅ Clean message routing pattern**

### `capture-controller.ts` — Capture Orchestration
**Lines:** ~116

Implements `CaptureController` interface:
- `captureArea()`: captures tab → crops → checks LRU cache → `apiClient.solve()` → stores result
- `scanPage()`: captures tab → caches → `apiClient.solve(mode: 'page')`
- Measures `captureLatencyMs`, `totalLatencyMs`

**Status: ✅ Well-structured with caching**

---

## API Client — **CRITICAL ISSUE**

**File:** `apps/extension/src/lib/api-client.ts`

```typescript
export const apiClient = createApiClient(true);  // Default: MOCK mode ← BLOCKER
```

**The extension ALWAYS uses MockApiClient, never calls the real API.**

To fix:
1. Change `createApiClient(true)` to `createApiClient(false)` for production
2. Configure `API_BASE_URL` dynamically (currently hardcoded to `http://localhost:8100/api`)

```typescript
class RealApiClient {
  private async attemptSolve(request: SolveRequest, timeoutMs: number, abortController?: AbortController): Promise<SolveResult> {
    const response = await fetch(`${API_BASE_URL}/solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
      signal: abortController?.signal,
    });
    // 401 → clearToken + showLogin
  }
}
```

**RealApiClient implementation exists and is well-structured**, but is never used because `useMock = true`.

---

## Storage

**File:** `apps/extension/src/lib/extension-storage.ts`

Uses `chrome.storage.local` (not sync):
- `studyMode`: `{ enabled: boolean, tabId?: number }`
- `lastResult`: `SolveResult` — most recent solve result
- `history`: `HistoryEntry[]` — up to 50 items (configurable)
- `settings`: `ExtensionSettings` — storeHistory, storeImages, autoHideBubbleMs, showStudyIndicator, maxHistoryItems

**Status: ✅ Clean, well-typed**

---

## Popup

**File:** `apps/extension/src/popup/popup.html`

- Width: 320px
- Actions: Study Scan Mode toggle, Capture Area, Scan Page, Details, History, Settings
- Footer: version + keyboard shortcut (`⌘⇧K`)
- Shortcuts shown: `⌘⇧C` (capture), `⌘⇧P` (scan page), `⌘⇧K` (open)

---

## Sidepanel

**File:** `apps/extension/src/sidepanel/sidepanel.js`

- Renders last result with confidence badge, question, options, answer, explanation
- History list with click-to-load
- Loads from `chrome.storage.local`

---

## Safety Boundaries

| Feature | Status | Notes |
|---|---|---|
| User-visible at all times | ✅ | Result bubble always shown; no hidden answers |
| Explicit action required | ✅ | User must click capture or scan |
| No auto-submit | ✅ | No form submission mechanism |
| No screen recording | ✅ | Only tab screenshot on demand |
| No background data exfil | ✅ | All messages logged in audit service |
| Result bubble dismissible | ✅ | `remove()` method, auto-hide configurable |
| History deletable | ✅ | `CLEAR_HISTORY` and `DELETE_ALL_DATA` handlers |
| Extension login required | ✅ | Checks token on startup; prompts login |

---

## Performance

| Component | Notes |
|---|---|
| esbuild | Fast bundling; build time <2s |
| Service worker | Lazy loads capture-controller, api-client, storage libs |
| Image compression | WebP 0.85 quality default; binary search for max size |
| LRU cache | 20-item cache with 1hr TTL; avoids duplicate solves |
| Request cancellation | AbortController per request; cancels on new request |
| Tab capture | `chrome.tabs.captureVisibleTab` — native API, fast |

---

## Extension Build Output

**File:** `apps/extension/dist/`

Built via `node build.js` (esbuild):
- `background/service-worker.js`
- `content/content-script.js`
- `content/content-styles.css` (copied)
- `manifest.json` (copied)

Icons must be present at `icons/icon{16,32,48,128}.png`.

---

## Issues Found

| Priority | Issue | File | Fix |
|---|---|---|---|
| P0 | `createApiClient(true)` — mock always used | `lib/api-client.ts:162` | Flip to `false`; add env-based config |
| P0 | `API_BASE_URL` hardcoded to localhost | `lib/api-client.ts:8` | Make configurable via extension settings |
| P1 | Login URL hardcoded `localhost:3100` | `background/service-worker.ts` | Make configurable |
| P1 | Icons missing from `dist/` | Build output | Ensure icons are copied to dist |
| P2 | No extension uninstall cleanup | `service-worker.ts` | `chrome.runtime.onUninstalled` handler |