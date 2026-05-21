# Speed-First UX — KARÇÖZ Extension

## Design Philosophy

The KARÇÖZ extension prioritizes **perceived speed** and **user control**. Every interaction should feel instant, lightweight, and reversible. Users are always aware of what the extension is doing — no hidden UI, no surprises.

## Core UX Principles

### 1. No Chat Sidebar by Default

The extension opens as a **small popup** (320px wide), not a full chat panel. This keeps the browser usable while working.

### 2. Visible, Consented UI

- **Study Mode Indicator**: A floating pill (`"KARÇÖZ Study Mode On"`) appears at the top-right when enabled. Always visible, always dismissible.
- **Result Bubble**: A compact card at the bottom-right shows the answer, confidence, and action buttons. No hidden toasts or silent updates.
- **Scan Indicator**: When scanning, a centered loading state prevents double-capture.

### 3. Explicit Actions Only

Every action requires user intent:
- Click to open popup
- Click button to capture area
- Click button to scan page
- Click button to open details

No auto-capture, no continuous monitoring, no background answer forwarding.

## Interaction Flows

### Flow 1: Study Mode Toggle

```
Popup → Click toggle → Storage updated
       → Message sent to content script
       → Floating indicator appears/disappears
```

### Flow 2: Capture Area

```
Popup → Click "Capture Selected Area"
     → Popup closes
     → Selection overlay activates (crosshair cursor)
     → User drags rectangle
     → Area captured + cropped
     → API called → "Solving..." bubble appears
     → Result bubble shows answer + confidence + Details + Save
     → Click "Details" → Side panel opens
```

### Flow 3: Scan Page

```
Popup → Click "Scan Visible Page"
     → Popup closes
     → Centered "Scanning..." indicator appears
     → Tab captured (full visible area)
     → API called
     → Indicator hides → Result bubble appears
```

## Performance Targets

| Action | Target | Rationale |
|--------|--------|-----------|
| Popup open | < 300ms | Chrome's popup lifecycle is ~100ms; keep JS minimal |
| Capture start | < 50ms | Just inject overlay, no heavy computation |
| Selection complete | < 16ms | One frame at 60fps |
| Bubble show | < 100ms | CSS animation, content from storage |
| Side panel open | < 200ms | Side panel is a separate document |

## Bundle Strategy

To keep popup fast:

- **No heavy frameworks** in popup (vanilla JS)
- **Content script lazy-init**: Selection overlay created on-demand, not at page load
- **CSS-only animations**: No GSAP or Motion library for simple transitions
- **Tree-shaken modules**: Only import what's needed

## UI State Machine

```
                    ┌─────────────┐
                    │   IDLE      │
                    └──────┬──────┘
                           │ click capture
            ┌──────────────▼──────────────┐
            │    SELECTING                │
            │  (crosshair overlay)         │
            └──────────────┬──────────────┘
                           │ selection done
            ┌──────────────▼──────────────┐
            │    CAPTURING                 │
            │  (sending to API)             │
            └──────────────┬──────────────┘
                           │ result
            ┌──────────────▼──────────────┐
            │    RESULT                    │
            │  (bubble visible)             │
            └──────────────┬──────────────┘
                           │ dismissed / new capture
            ┌──────────────▼──────────────┐
            │   IDLE                      │
            └─────────────────────────────┘
```

## Visibility Guarantees

| State | What user sees |
|-------|----------------|
| Study mode ON | Green pill "KARÇÖZ Study Mode On" top-right |
| Capturing | "Solving..." bubble with spinner |
| Result | Answer + confidence bar + Details/Save buttons |
| Error | Red error text + Close button |
| Scanning | Centered scan icon + "Scanning visible page..." |

## Privacy & Consent

- No hidden elements injected into pages
- No continuous background scripts running
- No "invisible mode" — study mode shows a persistent indicator
- No proctoring bypass features
- All capture actions show visible UI feedback