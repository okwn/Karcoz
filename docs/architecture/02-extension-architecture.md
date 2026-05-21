# Extension Architecture

## Overview

KARÇÖZ Chrome Extension (Manifest V3) provides AI-powered study assistance through a minimal, fast UX. The extension captures screen areas, processes images through an AI solver, and displays results as compact visible bubbles.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      POPUP UI                               │
│  - Study Scan Mode toggle                                  │
│  - Capture Selected Area                                   │
│  - Scan Visible Page                                       │
│  - Open Details                                            │
└────────────────────────┬──────────────────────────────────┘
                         │ chrome.runtime.sendMessage
┌────────────────────────▼──────────────────────────────────┐
│                  BACKGROUND SERVICE WORKER                 │
│  - Message routing                                        │
│  - Capture orchestration                                   │
│  - Study mode state management                            │
│  - API client (mock/real)                                  │
└────────────────────────┬──────────────────────────────────┘
                         │ chrome.tabs.sendMessage
┌────────────────────────▼──────────────────────────────────┐
│                   CONTENT SCRIPTS                          │
│  - selection-layer.ts: Rectangle selection overlay        │
│  - result-bubble.ts: Compact result display               │
│  - page-scan-indicator.ts: Scanning state feedback        │
│  - content-script.ts: Orchestrates UI components           │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│                      SIDE PANEL                            │
│  - Full explanation view                                   │
│  - Copy / New Capture actions                              │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Background (`background/`)

| File | Role |
|------|------|
| `service-worker.ts` | Entry point, message listeners, routes registration |
| `message-router.ts` | Route messages to handlers based on `action` type |
| `capture-controller.ts` | Orchestrates tab capture, image processing, API calls |

### Shared (`lib/`)

| File | Role |
|------|------|
| `message-types.ts` | TypeScript interfaces for messages, payloads, results |
| `extension-storage.ts` | Chrome storage.local wrapper |
| `image-utils.ts` | Capture, crop, dataURL utilities |
| `api-client.ts` | Mock and real API client with `solve()` interface |

### Content (`content/`)

| File | Role |
|------|------|
| `content-script.ts` | Main orchestrator, listens for messages, coordinates UI |
| `selection-layer.ts` | Crosshair overlay for area selection |
| `result-bubble.ts` | Floating answer/confidence bubble |
| `page-scan-indicator.ts` | Full-page scan loading indicator |

### Side Panel (`sidepanel/`)

| File | Role |
|------|------|
| `sidepanel.html` | Static shell |
| `sidepanel.css` | Monospace terminal aesthetic |
| `sidepanel.js` | Loads last result from storage, renders explanation |

### Popup (`popup/`)

| File | Role |
|------|------|
| `popup.html` | Static shell |
| `popup.css` | Compact action buttons with JetBrains Mono |
| `popup.js` | Reads status, handles button clicks |

## Data Flow

```
1. User clicks popup button
   ↓
2. popup.js → chrome.runtime.sendMessage({ action: 'SCAN_PAGE' })
   ↓
3. service-worker.ts receives, routes to capture-controller
   ↓
4. capture-controller → chrome.tabs.captureVisibleTab()
   ↓
5. apiClient.solve(imageData) → returns SolveResult
   ↓
6. Result stored via extension-storage.ts
   ↓
7. content-script.ts receives SHOW_RESULT via onMessage
   ↓
8. result-bubble.ts renders compact bubble with answer/confidence
```

## Message Protocol

All messages follow `ExtensionMessage` structure:

```typescript
interface ExtensionMessage {
  action: MessageAction; // 'CAPTURE_AREA' | 'SCAN_PAGE' | 'TOGGLE_STUDY_MODE' | ...
  payload?: unknown;
  tabId?: number;
  requestId?: string;
}
```

Responses wrap success/error:

```typescript
interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

## Security Considerations

- `host_permissions: "<all_urls>"` allows content script injection everywhere
- `activeTab` permission restricts capture to current tab
- All user actions are explicit (no auto-capture, no hidden forwarding)
- No proctoring bypass or stealth behavior
- Results shown in user-visible bubble, not hidden channels

## File Structure

```
apps/extension/
├── manifest.json
└── src/
    ├── background/
    │   ├── service-worker.ts
    │   ├── message-router.ts
    │   └── capture-controller.ts
    ├── content/
    │   ├── content-script.ts
    │   ├── content-styles.css
    │   ├── selection-layer.ts
    │   ├── result-bubble.ts
    │   └── page-scan-indicator.ts
    ├── popup/
    │   ├── popup.html
    │   ├── popup.css
    │   └── popup.js
    ├── sidepanel/
    │   ├── sidepanel.html
    │   ├── sidepanel.css
    │   └── sidepanel.js
    └── lib/
        ├── message-types.ts
        ├── extension-storage.ts
        ├── image-utils.ts
        └── api-client.ts
```