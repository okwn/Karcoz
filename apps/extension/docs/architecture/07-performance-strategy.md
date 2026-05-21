# Performance Strategy — KARÇÖZ

## Performance Targets

| Metric | Target | Baseline (estimated) |
|--------|--------|---------------------|
| Extension popup open | <300ms | ~200-400ms |
| Capture + crop (local) | <700ms | ~300-600ms |
| Image preprocessing | <500ms | N/A |
| API request overhead | <200ms | ~100-200ms |
| Compact answer (end-to-end) | <4s | ~2.7-6.7s |
| Full explanation (lazy) | on-demand | — |

## Latency Budget Allocation

Target end-to-end <4s for compact answer, budgeted as:
- Capture + crop: 700ms
- Client-side preprocessing: 200ms
- Network upload: 500ms
- Server extraction: 1000ms
- Server solve (compact mode): 1500ms
- Server validation: 300ms
- Network download: 300ms
- Client render: 200ms
- Buffer: 300ms
- **Total**: ~5s (tight — using fallbacks and caching to beat target)

## Performance Strategies

1. **Minimize bundle size** — esbuild minification (47-49% reduction), code splitting
2. **Lazy load heavy modules** — extension-storage, page-text-extractor load on demand
3. **Progress states** — show "Reading/Solving/Validating" so latency feels intentional
4. **Compact answer first** — fast model for initial answer (mode: 'compact'), lazy-load explanation
5. **Request cancellation** — abort in-flight on new capture (AbortController per request)
6. **Question hash cache** — skip solve for duplicate questions (local LRU + Redis/in-memory backend)
7. **Provider fallback** — chain 5s → 12s timeout retry to avoid timeouts
8. **Timeout handling** — 10s client-side timeout, retry with fallback

## Architecture

```
User clicks capture
  → Service worker wakes (200-400ms if cold)
  → captureVisibleTab + crop (300-600ms)
  → Check local LRU cache (hash of image data)
  → If cache hit: return cached answer immediately
  → If cache miss:
      → emit "Reading" progress state
      → POST /api/solve (compact mode, 10s timeout)
      → Server: hash check → cache hit? return cached
      → Server: extraction (800-1500ms)
      → Server: solve (compact mode, 1500ms)
      → Server: validation (200-500ms)
      → emit "Solving" → "Validating" → "Done"
      → Cache result by hash
  → Show compact answer in bubble
  → User clicks "More" → lazy load full explanation
```

## Metrics to Monitor

- captureLatencyMs (local)
- uploadLatencyMs (local → server)
- extractionLatencyMs (server OCR)
- solveLatencyMs (server LLM)
- validationLatencyMs (server validation)
- totalLatencyMs (end-to-end)
- cacheHitRate (hash cache)
- providerFallbackCount

## Bundle Size Results

| File | Baseline | After Minification | Reduction |
|------|----------|---------------------|-----------|
| background/service-worker.js | 14,127B (4,093 gz) | 7,509B (3,121 gz) | 47% raw, 24% gz |
| content/content-script.js | 37,915B (8,522 gz) | 19,364B (5,822 gz) | 49% raw, 32% gz |

## Code Splitting

- `extension-storage.ts` loaded as lazy chunk (1.6KB gzipped) on first save/history use
- Side panel / details lazy-loaded on demand
