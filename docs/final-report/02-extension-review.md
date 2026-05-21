# 02 — Extension Review

**Browser Extension Review**

---

## Manifest & Structure

- **Manifest V3**, name "KARÇÖZ", version 0.1.0
- **Permissions**: `activeTab`, `tabs`, `storage` — minimal, appropriate
- **Host permissions**: `<all_urls>` (required for content script injection)
- **Entry points**: popup (320px), sidepanel, background service worker, content script
- **Resources**: web_accessible_resources allows content/ to all URLs

---

## Safety Review

### ✅ Hidden UI / Invisible Modes
None detected. All UI is explicit and visible. Study mode shows a fixed floating pill with pulsing green indicator.

### ✅ Auto-Answer Clicking
None detected. All actions require user interaction:
- `START_CAPTURE_MODE` → user draws rectangle → minimum 10×10px threshold
- `SCAN_PAGE` → user clicks scan → candidate overlay appears → user selects one
- No `click()` simulation, no `dispatchEvent` mouse events

### ✅ Secret Answer Forwarding
None detected. The only answer forwarding is the explicit "Send to Telegram" button in the result bubble. No hidden `fetch()` calls to external services.

### ✅ Proctoring Bypass
None detected:
- `page-text-extractor.ts` only reads visible DOM text
- `isVisible()` filters `display: none`, `visibility: hidden`, `opacity: 0`
- `capture-visible-tab` only captures visible tab
- Study mode comment explicitly states "No proctoring — only reads visible DOM text"
- No webcam, microphone, screen recording, or browser history access

---

## Privacy Controls

| Setting | Default | Location |
|---------|---------|----------|
| `storeHistory` | `true` | extension-storage.ts |
| `storeImages` | `true` | extension-storage.ts |
| `autoHideBubbleMs` | `8000` | extension-storage.ts |
| `showStudyIndicator` | `true` | extension-storage.ts |
| `maxHistoryItems` | `50` | extension-storage.ts |

**Delete all data**: `handleDeleteAllData` clears history and last result from storage.

Images are processed as data URLs and sent to the API — not persisted as blobs to storage.

---

## Usage Limits

**None found.** No rate limiting, request quotas, or daily caps. `maxHistoryItems` only limits stored history metadata, not API calls.

---

## Speed-First UX

### Compact Popup
- 320px wide, minimal layout
- Study Scan Mode toggle + 4 action buttons (Capture Area, Scan Page, Details, History, Settings)

### Visible Study Mode
- Fixed floating pill at top-right (`kcz-study-indicator`)
- Pulsing green dot, `aria-label="Study mode indicator"`
- CSS animation `kcz-pulse` (2s infinite)
- User-initiated via `TOGGLE_STUDY_MODE`

### Result Bubble
- 280px fixed bottom-right, draggable, collapsible
- States: `capturing` → `reading` → `solving` → `ready`/`low`/`error`
- Auto-hide timer (default 8000ms, 0 = disabled)

### Lazy Details
- Details button triggers `lazy-details.ts` → fetches `GET /api/questions/:id`
- Opens side panel immediately, prefetches explanation in background
- Not fetched on capture — only on demand

### Study Scan Mode Flow
User toggles → clicks scan → extracts DOM text → detects candidates → shows overlay → user selects → solves. Fully user-driven.

---

## Files

| File | Purpose |
|------|---------|
| `background/service-worker.ts` | Message routing, auth check, capture orchestration |
| `background/capture-controller.ts` | Area/page scan, LRU cache, latency tracking |
| `background/message-router.ts` | Route registry for background ↔ content |
| `content/content-script.ts` | Main injection entry |
| `content/result-bubble.ts` | Result display (all states) |
| `content/selection-layer.ts` | Draggable rectangle selection |
| `content/lazy-details.ts` | On-demand detail fetching |
| `content/study-scan-mode.ts` | DOM question detection flow |
| `content/page-text-extractor.ts` | Visible DOM text extraction |
| `content/question-candidate-overlay.ts` | Candidate selector UI |
| `lib/api-client.ts` | API client (mock + real) |
| `lib/extension-storage.ts` | Settings + history persistence |
| `lib/capture-service.ts` | capture-core wrapper |
| `popup/popup.html/js/css` | Compact popup |
| `sidepanel/sidepanel.html/js/css` | Details + history |

---

## Extension Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "KARÇÖZ",
  "version": "0.1.0",
  "permissions": ["activeTab", "tabs", "storage"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background/service-worker.js", "type": "module" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content/content-script.js"] }],
  "sidepanel": { "default_path": "sidepanel/sidepanel.html" },
  "web_accessible_resources": [{ "resources": ["content/*"], "matches": ["<all_urls>"] }]
}
```

---

## Verdict

**SAFE** — No hidden UI, no auto-answer clicking, no secret forwarding, no proctoring bypass detected. Privacy settings are present. Speed-first UX is implemented correctly.