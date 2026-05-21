# 10 — Performance and Latency Review

## Purpose
Analyze extension bundle size, capture latency, AI/OCR latency, caching, database hot paths, and N+1 risks.

---

## Extension Bundle Performance

**Build:** esbuild (fast, minimal overhead)
```
node build.js
  Built background/service-worker.js
  Built content/content-script.js
Build complete!
```

**Bundle sizes (estimated):**
| File | Type | Estimated Size |
|---|---|---|
| `service-worker.js` | ES module | ~50–100KB |
| `content-script.js` | ES module | ~50–100KB |
| `content-styles.css` | CSS | ~5–15KB |
| Total | | ~110–220KB |

**esbuild advantages:** Tree-shaking, fast compilation, no runtime overhead.

---

## Capture Latency

| Operation | Latency | Evidence |
|---|---|---|
| `chrome.tabs.captureVisibleTab()` | 50–200ms | Native Chrome API |
| Canvas crop | 5–20ms | `cropImage()` via canvas drawImage |
| Image compression (WebP 0.85) | 20–100ms | `compressToMaxSize()` binary search |
| LRU cache lookup | <5ms | `recent-result-cache.ts` — in-memory array |
| **Total capture before network** | **75–325ms** | |

---

## Network Latency

| Hop | Latency | Notes |
|---|---|---|
| Extension → API (localhost:8100) | <10ms | Dev: same machine |
| Extension → API (production) | 100–500ms | Depends on geography + TLS |
| API → OpenAI | 200–1000ms | GPT-4o vision API |
| API → OpenRouter | 200–1500ms | Includes OpenRouter proxy overhead |
| API → Redis | 1–5ms | Local Redis |

---

## AI Provider Latency

| Provider | Operation | Expected Latency |
|---|---|---|
| OpenAI GPT-4o (vision) | Image extraction | 1–3 seconds |
| OpenAI GPT-4o-mini | Text solve | 500ms–2 seconds |
| OpenRouter Claude 3.5 | Solve | 800ms–2.5 seconds |
| MockProvider | Any | 200–600ms (configurable delay) |

**Timeout:** All providers set to 30s via `AI_TIMEOUT_MS` (max 120s configurable).

---

## Solver Latency Breakdown

**Cache miss + GPT-4o (image solve):**
```
Tab capture:          ~150ms
Image compress:       ~60ms
Network to API:       ~200ms
OCR extraction:      ~2000ms (GPT-4o vision)
Topic classify:        ~500ms (GPT-4o-mini)
Deterministic solve:   ~30ms
AI solve (fallback):  ~1500ms (if needed)
Validation:            ~200ms
DB write:             ~20ms
Redis cache write:     ~5ms
Network back to ext:  ~100ms
Total:                ~4.5–5.5 seconds
```

**Cache hit:**
```
Tab capture:          ~150ms
LRU cache lookup:      ~5ms
Network back to ext:  ~100ms
Total:                ~255ms
```

---

## Caching Strategy

### Redis Cache (`apps/api/src/services/cache.service.ts`)
```typescript
interface CacheOptions { ttlSeconds?: number; keyPrefix?: string; }

// Check: get(answerKey(questionText, topic))
// Miss: solve → store with TTL (24h for solved questions)
// Hit: return cached answer + validation
```

**Cache key:** Hash of `normalizedText + topic` — deduplicates identical questions.

**TTL:** 24 hours default for solved questions.

### Extension LRU Cache (`apps/extension/src/lib/recent-result-cache.ts`)
```typescript
const MAX_CACHE_SIZE = 20;  // 20 items
const TTL = 60 * 60 * 1000;  // 1 hour

// Checked before API call in capture-controller
// Key: hash of first 200 chars of image data
```

**Status: ✅ Two-level caching (in-memory + Redis)**

---

## Database Hot Paths

### Query 1: Solve endpoint (per request)
```sql
-- Upsert question
INSERT INTO "Question" (...) VALUES (...) ON CONFLICT ("questionHash") DO UPDATE ...

-- Insert audit log
INSERT INTO "AuditLog" (...) VALUES (...)
```
**Status: ✅ Single upsert + insert**

### Query 2: History endpoint (paginated)
```sql
SELECT * FROM "Question"
WHERE "userId" = ?
ORDER BY "createdAt" DESC
LIMIT ? OFFSET ?
```
**Status: ✅ Simple with index on `(userId, createdAt)`**

### Query 3: Analytics weak topics
```sql
SELECT topic, AVG("confidenceScore"), COUNT(*) ...
FROM "Question"
WHERE "userId" = ? AND "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY topic
```
**Status: ⚠️ Full scan risk** — No composite index on `(userId, createdAt, topic, confidenceScore)`

### Query 4: Usage check (per request)
```sql
SELECT * FROM "UsageRecord"
WHERE "userId" = ? AND "endpoint" = ? AND "period" = ?
```
**Status: ✅ Indexed with unique constraint on (userId, endpoint, period)**

---

## N+1 Risks

| Scenario | N+1? | Evidence |
|---|---|---|
| History with saves | ✅ AVOIDED | `questions.routes.ts` uses Prisma include |
| Practice set with questions | ✅ AVOIDED | `practice.service.ts` includes questions |
| Practice set with attempts | ✅ AVOIDED | Same as above |
| Admin user list | ⚠️ POTENTIAL | `admin.service.ts` — `select: { questions: false }` but no explicit include |

**Evidence:** `questions.routes.ts`:
```typescript
const questions = await prisma.question.findMany({
  where: { userId: req.userId, ... },
  include: { saves: true },  // ← No N+1
  orderBy: { createdAt: 'desc' },
  take: perPage,
  skip: offset,
});
```

---

## API Response Compression

**File:** `apps/api/src/server.ts`
```typescript
await app.register(compress, { encodings: ['gzip', 'deflate'] });
```

**Status: ✅ Enabled**

---

## Timeout Handling

| Layer | Timeout | Implementation |
|---|---|---|
| AI provider | 30s | `AbortController` + `setTimeout` in `makeRequest()` |
| Fetch retry | 5s first, 12s second | `RealApiClient.attemptSolve()` |
| Rate limit | N/A | Returns `Retry-After` header |
| Session validation | N/A | DB query, should be <10ms |

---

## Request Cancellation

**File:** `apps/extension/src/lib/request-cancellation.ts`

```typescript
let currentRequestId: string | null = null;
let currentAbortController: AbortController | null = null;

export function startRequest(requestId: string): AbortController {
  if (currentAbortController) currentAbortController.abort();  // Cancels previous
  currentRequestId = requestId;
  currentAbortController = new AbortController();
  return currentAbortController;
}
```

**Status: ✅ Previous request aborted when new one starts**

---

## Duplicate Request Handling

- LRU cache in extension: same image → cached result (1hr TTL)
- Redis answer cache: same normalized question text → cached answer (24hr TTL)
- Deduplication: `questionHash` unique index prevents duplicate Question records

---

## Real-World Latency Expectations

| Scenario | P50 | P95 | P99 |
|---|---|---|---|
| Cache hit (extension) | 200ms | 400ms | 600ms |
| Cache miss (deterministic) | 1s | 2s | 3s |
| Cache miss (AI solve) | 4s | 8s | 12s |
| Page scan (no solve) | 300ms | 800ms | 1.5s |

---

## Performance Issues Found

| Severity | Issue | Impact | Fix |
|---|---|---|---|
| **P1** | No composite index on `(userId, createdAt, topic, confidenceScore)` for analytics | Slow `/analytics/weak-topics` on large datasets | Add composite index |
| **P1** | CORS `origin: true` | Security risk (not performance) | Set specific origins |
| **P2** | No Redis connection pooling configured | Redis connection overhead | Use `pool: { min: 2, max: 10 }` in Redis URL |
| **P2** | No response caching headers for static assets | Web dashboard reloads everything | Add `Cache-Control` headers in nginx |
| **P3** | Preprocessing functions not wired into OCR pipeline | Images not enhanced before OCR | Wire preprocess steps in `hybrid.engine.ts` |