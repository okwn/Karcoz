# Latency and Caching — KARÇÖZ

## Latency Breakdown

| Phase | Description | Typical Duration |
|-------|-------------|-------------------|
| captureLatencyMs | Request receipt → extraction start (network + queue) | 50-200ms |
| uploadLatencyMs | Extraction + classification before solve | 800-1500ms |
| extractionLatencyMs | OCR + text extraction from image | 600-1200ms |
| solveLatencyMs | LLM call for answer generation | 1000-3000ms |
| validationLatencyMs | Solution validation step | 200-500ms |
| totalLatencyMs | End-to-end from request to response | 2000-6000ms |

## Caching Strategy

### Level 1: Local LRU Cache (Extension)

Location: `extension/src/lib/recent-result-cache.ts`
- Max 20 entries
- 1-hour TTL
- Key: hash of first 200 chars of image data
- Stores: SolveResult with answer, confidence, explanation
- Hit rate target: 20-30% for repeated captures

### Level 2: Backend Hash Cache (Redis + In-Memory)

Location: `api/src/services/cache.service.ts`
- TTL: 1 hour
- Key: SHA256 of normalized question text (first 32 chars)
- Stores: { answer, confidence, explanation, questionId }
- Redis when available (URL from REDIS_URL env)
- In-memory fallback when Redis unavailable
- Hit rate target: 30-50% for duplicate questions

### Cache Flow

```
Solve request received
  → Extract text from image
  → Compute hash (SHA256 of normalized text)
  → Check L1 (local): getCachedResult(key)
  → If L1 hit: return cached result (fastest path)
  → If L1 miss:
      → Check L2 (backend): getCachedAnswer(hash)
      → If L2 hit: return cached result
      → If L2 miss:
          → Solve question (1000-3000ms)
          → Store result in L1 and L2
          → Return result
```

### Cache Key Strategy

- Local cache: hash of image data prefix (fast, no server round-trip)
- Backend cache: SHA256 of normalized question text (semantic dedup)

### Cache Invalidation

- Local LRU: TTL-based (1 hour) or manual clear
- Backend: TTL-based (1 hour), no manual invalidation needed

## Request Cancellation

Location: `extension/src/lib/request-cancellation.ts`
- Singleton AbortController per extension session
- New capture cancels any in-flight request
- Prevents stale results from old captures showing after new ones

## Timeout Strategy

| Attempt | Timeout | Provider |
|---------|---------|----------|
| 1st | 5s | fast model (compact mode) |
| 2nd | 12s | full model (fallback) |

## Compact vs Full Mode

| Mode | solveLatencyMs target | fullExplanation | Use case |
|------|----------------------|-----------------|----------|
| compact | <1500ms | null | Initial answer, speed critical |
| full | <4000ms | returned | Detailed answer when needed |

## Performance Monitoring

All solve responses include `performance` object:
```typescript
{
  captureLatencyMs: number,
  uploadLatencyMs: number,
  extractionLatencyMs: number,
  solveLatencyMs: number,
  validationLatencyMs: number,
  totalLatencyMs: number
}
```

## Redis Configuration

When `REDIS_URL` environment variable is set:
```bash
REDIS_URL=redis://localhost:6380
```

Cache keys follow pattern: `question:<hash>` with 3600s TTL.

When Redis unavailable, falls back to in-memory Map with automatic trimming at 1000 entries.
