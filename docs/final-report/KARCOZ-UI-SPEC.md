# KARÇÖZ — Extension UI Design Specification

## Concept: "Carbon Instrument"

An AI-powered study tool that feels like a premium aerospace instrument — dark, precise, no-nonsense. Every pixel earns its place. The interface should feel like a well-calibrated measurement device: serious, reliable, fast. Not a toy, not a chatbot — a **power tool for learning**.

**Core metaphor**: The cockpit HUD of a fighter jet or a precision Swiss watch face. Information-dense but never cluttered. Readable at a glance. Every state is unmistakable.

---

## Design Language

### Color Palette (Dark Mode First)

```
--bg-void:        #0a0b0e   /* deepest background */
--bg-surface:     #12141a   /* card/panel surfaces */
--bg-elevated:    #1a1d26   /* elevated elements */
--bg-glass:       rgba(26, 29, 38, 0.75)  /* glass panels */
--border-subtle:   #2a2e3a   /* borders, dividers */
--border-active:  #3d4255   /* active borders */

--text-primary:  #eef0f4   /* primary text — near-white */
--text-secondary: #8b90a0  /* secondary text */
--text-muted:     #555a6e   /* muted/disabled text */
--text-inverse:   #0a0b0e   /* text on bright surfaces */

--accent-cyan:    #00d4ff   /* primary accent — icy cyan */
--accent-cyan-dim: #00a8cc  /* dimmed cyan */
--accent-emerald: #00e5a0   /* confidence high / success */
--accent-amber:   #ffb340   /* confidence medium / warning */
--accent-red:     #ff4757   /* error / confidence low */

--glass-overlay:   rgba(10, 11, 14, 0.6)
--glass-border:    rgba(0, 212, 255, 0.12)
```

### Light Mode Palette

```
--bg-void:        #f4f5f7
--bg-surface:     #ffffff
--bg-elevated:    #eef0f4
--bg-glass:       rgba(255, 255, 255, 0.80)
--border-subtle:   #e2e5ea
--border-active:  #c8ccd6

--text-primary:    #0a0b0e
--text-secondary: #555a6e
--text-muted:     #8b90a0

--accent-cyan:    #0088b3
--accent-emerald: #00a868
--accent-amber:   #e08a00
--accent-red:     #d63035
```

### Typography

- **Display**: `"Geiger"` — sharp, geometric, technical. Google Fonts: **Geiger** (a modern geometric sans with personality)
- Fallback: `"DM Sans"`, system-ui
- **Body**: `"Atkinson Hyperlegible"` — exceptional legibility, designed for readability. Google Fonts: **Atkinson Hyperlegible**
- Fallback: `"Inter"` (only for body, not display)
- **Mono**: `"JetBrains Mono"` — for confidence scores, code-like elements

```
--font-display: 'Geiger', 'DM Sans', system-ui, sans-serif;
--font-body: 'Atkinson Hyperlegible', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

--text-2xs: 0.625rem;   /* 10px — labels */
--text-xs: 0.6875rem;  /* 11px — micro */
--text-sm: 0.75rem;    /* 12px — secondary */
--text-base: 0.8125rem; /* 13px — body (slightly smaller = more premium) */
--text-md: 0.875rem;   /* 14px — primary actions */
--text-lg: 1rem;       /* 16px — section headers */
--text-xl: 1.25rem;     /* 20px — popup title */
```

### Spacing System

4px base unit. Tight but breathable.

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
```

### Motion Philosophy

- **Fast and purposeful** — no decorative delays. Every animation has a functional reason.
- Transitions: 120ms–200ms for micro-interactions, 250ms for panel transitions
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy deceleration)
- No bounce, no overshoot — precision, not playfulness
- Stagger: 40ms delay between items in lists

### Visual Details

- Subtle glass morphism on panels: `backdrop-filter: blur(12px)`
- 1px borders with low-opacity accent color
- Sharp corners (`border-radius: 6px`) — not bubbly
- Subtle inner glow on active/focus states: `box-shadow: inset 0 0 0 1px var(--accent-cyan)`
- No shadows except on floating elements (result bubble, drawers)
- Subtle noise texture overlay on void backgrounds (`opacity: 0.015`)
- Custom scrollbar: thin, 4px, matches border colors

---

## Screen Inventory

### 1. Extension Popup (320×420px)

- **Header bar**: KARÇÖZ logotype + status indicator (ready/reading/solving with animated dot)
- **Primary CTA**: Full-width "Capture Selected Area" button — large, prominent, cyan accent
- **Secondary actions row**: "Scan Page" | "History" | "Settings" — icon + label buttons
- **Study Mode toggle**: Toggle switch with label
- **Recent result mini-card**: Last solved question preview — question text (truncated), confidence badge, answer (truncated)
- **Footer**: Version number, upgrade link

States:
- Ready: Cyan dot, "Ready" label
- Reading: Amber pulsing dot, "Reading..."
- Solving: Cyan spinning ring, "Solving..."
- Error: Red dot, error message

### 2. Study Scan Mode Indicator

Fixed floating pill at top-right of page. Always visible when active. Non-intrusive.
- Small pill shape, glass background, cyan border
- "Study Mode" label with small icon
- Pulsing green dot (different from popup — green = active study, cyan = extension status)
- Click to deactivate

### 3. Capture Selected Area Overlay

Darkened page overlay with active selection rectangle.
- Semi-transparent dark overlay (50% opacity)
- Draggable selection rectangle with cyan dashed border
- Dimension readout (e.g., "320 × 240")
- "Capture" / "Cancel" floating buttons at bottom of selection
- Corner handles for resize

### 4. Result Bubble (280×auto, bottom-right)

Compact floating bubble — the answer card.
- Glass background with subtle cyan border
- Drag handle bar at top
- Answer text (prominent, large)
- Confidence badge: "92%" with colored ring (emerald/amber/red)
- Status indicator: small state label
- Action row: Details | Save | Practice
- Minimize button (×)

States:
- Capturing: Loading spinner, "Capturing..."
- Reading: Amber pulse, "Reading question..."
- Solving: Cyan ring spin, "Solving..."
- Ready: Answer shown, confidence badge
- Low confidence: Answer shown with red-tinted confidence badge
- Error: Red background tint, error message, retry button

### 5. Details Drawer (Sidepanel, 360px wide)

Slides in from right (sidepanel behavior).
- Header: question text (full)
- Confidence section: score + breakdown bars
- Topic badge
- Answer section: large, prominent
- Explanation (expandable, lazy-loaded)
- Source URL if available
- Action row: Save | Practice | Send to Telegram
- Close button

### 6. History Mini-List

Compact list in popup or sidepanel.
- Each item: question text (2 lines max), confidence dot, topic, timestamp
- Click to expand details
- Delete action (swipe or icon)
- Empty state: "No history yet" with subtle icon
- Max 10 items shown, "Show all" link

### 7. Settings Screen

Toggle-based settings page.
- **Storage section**: Store history (toggle), Store images (toggle), Max history items (stepper)
- **Display section**: Auto-hide bubble (stepper ms), Show study indicator (toggle)
- **Privacy section**: Clear all data (destructive button with confirmation)
- **About section**: Version, API status indicator

### 8. Dashboard Overview (Sidepanel root)

Entry point when opening sidepanel.
- Greeting + date
- Stats row: Questions solved today, Streak, Weak topics count
- Recent result card (larger than popup mini-card)
- Quick actions: New capture, Practice, History, Weak topics
- Plan badge (Free/Pro/Team)

### 9. Question History Page

Full list view.
- Filterable: All / This week / Topic
- Each card: question text, answer, confidence, topic, date
- Expandable cards (click to show full details)
- Bulk delete option
- Infinite scroll

### 10. Weak Topics Page

Analytics-style page.
- Topic cards with weakness score
- Most struggled topics listed
- "Practice this topic" CTA on each
- Overall weakness trend

### 11. Practice Generator Page

- Topic selector (dropdown)
- Difficulty selector (Easy / Medium / Hard / Mixed)
- Question count (5 / 10 / 15 / 20)
- "Generate Practice Set" CTA
- Generated questions list (expandable cards)
- Submit answers → score

### 12. Telegram Link Page

- Current link status (Linked / Not linked)
- Instructions to link
- Unlink button
- Telegram bot username display

### 13. Billing Placeholder Page

- Current plan badge (Free)
- Feature comparison table
- Pro CTA button (placeholder — links to checkout)
- Team CTA button

---

## Confidence States

| Score | Color | Label | Visual |
|-------|-------|-------|--------|
| 90–100% | Emerald | "High" | Green dot + ring |
| 70–89% | Cyan | "Good" | Cyan dot + ring |
| 50–69% | Amber | "Medium" | Amber dot + ring |
| <50% | Red | "Low" | Red dot + ring |

Confidence displayed as: percentage + small colored ring around the number.

---

## Error States

- Network error: "Connection lost. Retrying..." + retry button
- Solve failed: "Couldn't solve this. Try again." + retry
- Low confidence: Answer shown with red tint + "Low confidence" warning
- Rate limited: "Daily limit reached. Upgrade for more."
- Auth expired: "Session expired. Refresh to continue."

---

## Component States Summary

```
Button: default | hover | active | disabled | loading
Toggle: on | off | disabled
Card: default | hover | expanded | selected
Badge: high | good | medium | low | error
Input: default | focus | error | disabled
ListItem: default | hover | active | selected
```

---

## Implementation Notes

- All screens share the same CSS variable system
- Dark mode default; light mode via `data-theme="light"` on root
- No external JS dependencies in core CSS
- Icons: inline SVG, consistent 16×16 or 20×20 grid, 1.5px stroke
- All measurements in rem for accessibility
- Touch targets: minimum 44×44px on interactive elements
- Focus states: cyan inset ring (not default blue browser ring)