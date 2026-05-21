# 07 — Performance Review

**Performance Characteristics**

---

## Extension Performance

### Popup (320px)
Minimal layout. Buttons only — no data fetching on open.

### Result Bubble
- Fixed bottom-right, 280px
- Draggable, collapsible
- Auto-hide timer (default 8000ms, 0 = disabled)
- States: capturing → reading → solving → ready/low/error

### Lazy Loading
- Details fetched on demand via `GET /api/questions/:id`
- Side panel opens immediately, prefetches in background
- Not fetched on capture — only when user requests

### Cache
- LRU cache (20 items, 1hr TTL) keyed by image hash
- `recent-result-cache.ts` deduplicates identical captures
- AbortController cancels in-flight duplicate requests

### Latency Tracking
- `latency-tracker.ts` tracks per-phase: capture, preprocess, OCR, normalize, solve, total
- Phase-level timing stored for optimization decisions

---

## API Performance

### Route Handlers
All async with proper error wrapping. No blocking operations in handlers.

### Cache Strategy
- Redis → falls back to in-memory LRU (max 1000 entries)
- Cache key: pattern-based (solve results, session data)
- No cache invalidation strategy documented

### Database
- PostgreSQL 16 with Prisma
- Indexes on: questionHash, userId+period, userId+period+eventType, createdAt, token lookups
- No N+1 query issues detected (Prisma handles relations)

### Eval Latency
- Mean: 553ms (5-question dataset, all mock)
- p50: 553ms, p95: 554ms
- Note: Mock data — real latency will be higher with actual API calls

---

## Bundle Sizes

| Package | Build Output |
|---------|-------------|
| api | `dist/` (tsc) |
| extension | `background/service-worker.js`, `content/content-script.js`, etc. |
| ai-core | `dist/` |
| ocr-core | `dist/` |
| capture-core | `dist/` |

No bundle analysis available (webpack-bundle-analyzer not configured).

---

## Performance Gaps

1. **No image downscaling before OCR** — capture-core validates but doesn't enforce optimal resolution
2. **No CDN for static assets** — web-dashboard served via npx serve
3. **No response compression** — gzip/brotli not configured on API
4. **No database connection pooling config** — uses Prisma defaults
5. **In-memory cache not shared** — Redis fallback is per-instance

---

## Eval Results

| Metric | Value |
|--------|-------|
| Mean latency | 553ms |
| p50 latency | 553ms |
| p95 latency | 554ms |
| Confidence mean | 0.93 |

All mock-based. Real-world latency will scale with:
- AI provider response time
- OCR image complexity
- Network round-trip

---

## Verdict

**ADEQUATE** — Extension is designed for speed (lazy details, LRU cache, latency tracking). API has basic caching and async handlers. Production performance depends on real AI provider latency.