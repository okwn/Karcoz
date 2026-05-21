# Performance Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce KARÇÖZ latency from capture to compact answer under 4 seconds, with fast extension popup and local-only phases under 700ms.

**Architecture:**
- Phase 1 (local, <700ms): capture → preprocess → emit "reading" state
- Phase 2 (upload + server, target <3.5s): upload → extract → solve → validate → cache
- Compact answer shown as soon as solving completes; explanation lazy-loaded on demand
- Question hash caching: normalized text → cached answer, skip solve if hash exists
- Request cancellation: abort in-flight requests when user starts new capture

**Tech Stack:** Chrome Extension (MV3), Fastify, Prisma, esbuild, Redis (optional), in-memory LRU cache fallback

---

## Current Baseline Measurements

```
Extension bundle sizes (unminified, no compression):
  background/service-worker.js: 12 KB
  content/content-script.js:    36 KB
  
Content script composition (estimated):
  result-bubble.ts:     14 KB (UI, large)
  content-script.ts:     8 KB (orchestrator)
  question-candidate-overlay.ts: 8 KB
  page-text-extractor.ts: 6 KB (heavy — full DOM parsing)
  question-detector.ts:  7 KB
  study-scan-mode.ts:    5 KB
  selection-layer.ts:    4 KB
  result-bubble-controller.ts: 3 KB
  page-scan-indicator.ts: 1 KB

Latency breakdown (current, typical):
  Extension popup open:     ~200-400ms (depends on service worker wake-up)
  Capture + crop:           ~300-600ms
  API request overhead:     ~100-200ms (network)
  Server extraction:         ~800-1500ms (OCR)
  Server solve:              ~1000-3000ms (LLM call)
  Server validation:         ~200-500ms
  Total server round-trip:  ~2100-5700ms
  End-to-end total:         ~2700-6700ms
```

---

## File Inventory

### Extension — Code Splitting
- Split: `content/page-text-extractor.ts` → lazy import in content-script
- Split: `content/question-candidate-overlay.ts` → lazy import (only when study mode active)
- Split: `content/study-scan-mode.ts` → lazy import (only when scan triggered)
- New: `content/lazy-details.ts` → side panel loader, only imported when OPEN_DETAILS triggered
- New: `lib/request-cancellation.ts` → AbortController manager for in-flight requests

### Extension — New Files
- `apps/extension/src/lib/request-cancellation.ts` — cancel in-flight solve requests
- `apps/extension/src/lib/latency-tracker.ts` — captureLatencyMs, uploadLatencyMs timing
- `apps/extension/src/lib/recent-result-cache.ts` — LRU cache for recent solve results (hash → result)
- `apps/extension/build.js` (modify) — enable minification, splitChunks for lazy loading

### Extension — Modify Files
- `apps/extension/src/background/capture-controller.ts` — add progress states, cancellation, cache check
- `apps/extension/src/lib/api-client.ts` — add request timeout, abort signal, cache check
- `apps/extension/src/content/result-bubble.ts` — update progress states ("Reading", "Solving", "Validating")
- `apps/extension/src/background/service-worker.ts` — wire progress states from capture to UI
- `apps/extension/src/lib/message-types.ts` — add ProgressState type, update SolveResult with timing

### Backend — New Files
- `apps/api/src/services/cache.service.ts` — Redis/in-memory cache for question hash → answer
- `apps/api/src/middleware/request-id.ts` — propagate requestId for latency logging
- `apps/api/src/middleware/timeout.ts` — request timeout middleware
- `apps/api/src/routes/solve.routes.ts` (modify) — add hash check, cache lookup, timeout handling

### Backend — Modify Files
- `apps/api/src/services/solve.service.ts` — add hash generation, cache integration, detailed latency logging
- `apps/api/src/services/extraction.service.ts` — add captureLatencyMs, uploadLatencyMs tracking
- `apps/api/prisma/schema.prisma` — add `questionHash` field to Question model, add Redis URL env

### Docs
- `docs/architecture/07-performance-strategy.md` — performance strategy doc
- `docs/architecture/17-latency-and-caching.md` — latency breakdown and caching architecture
- `docs/report_phase_15_performance.md` — benchmark results and implementation report

---

## Task 1: Measure Extension Bundle Sizes

**Files:** Build the extension and analyze current bundle sizes in detail.

- [ ] **Step 1: Build extension with current config**

```bash
cd /home/oguz/Masaüstü/KarÇÖZ/apps/extension
npm run build
```

- [ ] **Step 2: Analyze each bundle**

```bash
# Measure raw sizes
wc -c dist/background/service-worker.js
wc -c dist/content/content-script.js

# Measure gzipped sizes (approximate)
gzip -c dist/background/service-worker.js | wc -c
gzip -c dist/content/content-script.js | wc -c

# List all modules in content script
grep -o "import.*from" dist/content/content-script.js | sort | uniq
```

- [ ] **Step 3: Document baseline in performance report**

Record: raw size, gzipped size, module composition for background and content scripts.

- [ ] **Step 4: Commit (if git available)**

```bash
git add docs/report_phase_15_performance.md
git commit -m "perf: measure baseline extension bundle sizes"
```

---

## Task 2: Enable Minification and Code Splitting in Build

**File:** `apps/extension/build.js`

Split heavy content script modules into separate chunks that load lazily.

- [ ] **Step 1: Update build.js with minification and splitting**

```javascript
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const outdir = path.join(__dirname, 'dist');
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

const baseConfig = {
  platform: 'browser',
  target: 'chrome120',
  minify: true,
  sourcemap: false,
  sourcesContent: false,
};

// Copy static assets
const staticAssets = [
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'src/popup/popup.html', dest: 'popup/popup.html' },
  { src: 'src/popup/popup.css', dest: 'popup/popup.css' },
  { src: 'src/popup/popup.js', dest: 'popup/popup.js' },
  { src: 'src/content/content-styles.css', dest: 'content/content-styles.css' },
  { src: 'src/content/result-bubble.css', dest: 'content/result-bubble.css' },
  { src: 'src/content/question-candidate-overlay.css', dest: 'content/question-candidate-overlay.css' },
  { src: 'src/sidepanel/sidepanel.html', dest: 'sidepanel/sidepanel.html' },
  { src: 'src/sidepanel/sidepanel.css', dest: 'sidepanel/sidepanel.css' },
  { src: 'src/sidepanel/sidepanel.js', dest: 'sidepanel/sidepanel.js' },
];

for (const asset of staticAssets) {
  const srcPath = path.join(__dirname, asset.src);
  const destPath = path.join(outdir, asset.dest);
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
  }
}

async function build() {
  // Background service worker
  await esbuild.build({
    ...baseConfig,
    entryPoints: [path.join(__dirname, 'src/background/service-worker.ts')],
    outfile: path.join(outdir, 'background/service-worker.js'),
    format: 'esm',
    bundle: true,
    splitting: false, // service worker can't use dynamic imports easily
  });
  console.log('Built background/service-worker.js');

  // Content script — SPLIT for lazy loading
  await esbuild.build({
    ...baseConfig,
    entryPoints: [path.join(__dirname, 'src/content/content-script.ts')],
    outfile: path.join(outdir, 'content/content-script.js'),
    format: 'iife',
    bundle: true,
    splitting: true, // creates content-script.js + chunk files
    chunkNames: 'content/chunks/[name]-[hash]', // lazy chunks go here
    preserveModules: false,
  });
  console.log('Built content/content-script.js + chunks');

  console.log('Build complete!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Update manifest.json for content script chunks**

The manifest currently references only `content/content-script.js`. After splitting, we need the main chunk to load first. esbuild will output the main entry plus chunk files. The HTML should only reference the entry point.

- [ ] **Step 3: Rebuild and measure**

```bash
npm run build
wc -c dist/background/service-worker.js
wc -c dist/content/content-script.js
wc -c dist/content/chunks/*.js 2>/dev/null || echo "No chunks yet"
gzip -c dist/background/service-worker.js | wc -c
gzip -c dist/content/content-script.js | wc -c
```

Expected: Background and content script both smaller after minification. Chunks appear for lazy modules.

- [ ] **Step 4: Commit**

---

## Task 3: Add Progress States to Result Bubble

**Files:**
- `apps/extension/src/lib/message-types.ts` — add `ProgressState` type
- `apps/extension/src/content/result-bubble.ts` — add "Reading", "Solving", "Validating" progress states
- `apps/extension/src/background/service-worker.ts` — wire progress states from capture flow

- [ ] **Step 1: Add ProgressState to message-types.ts**

```typescript
export type ProgressState = 'idle' | 'capturing' | 'reading' | 'uploading' | 'solving' | 'validating' | 'done' | 'error';

export interface SolveResult {
  answer: string;
  confidence: number;
  explanation: string;
  requestId: string;
  timestamp: number;
  // Timing (ms)
  captureLatencyMs?: number;
  uploadLatencyMs?: number;
  extractionLatencyMs?: number;
  solveLatencyMs?: number;
  validationLatencyMs?: number;
  totalLatencyMs?: number;
  // Progress
  progress?: ProgressState;
  progressMessage?: string;
}
```

- [ ] **Step 2: Update result-bubble.ts to show progress states**

In the result bubble, add a small progress indicator that shows the current state with a subtle animation. The bubble should update progressively:

```typescript
// In result-bubble.ts, add progress rendering

interface BubbleState {
  progress: ProgressState;
  progressMessage: string;
  answer?: string;
  confidence?: number;
}

function renderProgressIndicator(state: BubbleState): string {
  const icons: Record<ProgressState, string> = {
    idle: '',
    capturing: '◌',
    reading: '◉',
    uploading: '◉',
    solving: '◎',
    validating: '◎',
    done: '●',
    error: '✕',
  };
  const messages: Record<ProgressState, string> = {
    idle: '',
    capturing: 'Capturing...',
    reading: 'Reading...',
    uploading: 'Uploading...',
    solving: 'Solving...',
    validating: 'Validating...',
    done: '',
    error: 'Error',
  };
  const icon = icons[state.progress] ?? '';
  const msg = state.progressMessage || messages[state.progress] ?? '';
  if (!icon && !msg) return '';
  return `<span class="bubble-progress">${icon}${msg ? ' ' + msg : ''}</span>`;
}
```

Add CSS for progress state styling (small, muted text above the answer). When progress is 'done', hide the progress indicator and show the answer normally.

- [ ] **Step 3: Update capture-controller to emit progress**

In `capture-controller.ts`, wire the capture flow to emit progress states via the message system. When `handleCaptureMessage` starts, emit `{ progress: 'capturing' }`. When image is captured, emit `{ progress: 'reading' }`. etc.

The side panel and result bubble already receive messages from the service worker via `chrome.runtime.sendMessage`. We need to add a new message type `PROGRESS_UPDATE` that carries progress state.

- [ ] **Step 4: Wire in service-worker.ts**

Add `registerRoute('PROGRESS_UPDATE', ...)` handler that forwards to the content script's result bubble update function.

- [ ] **Step 5: Test by building and checking**

```bash
npm run build
```

- [ ] **Step 6: Commit**

---

## Task 4: Add Request Cancellation

**File:** `apps/extension/src/lib/request-cancellation.ts`

Prevent in-flight solve requests from completing when user starts a new capture. Each capture gets a unique requestId; only the latest one resolves.

- [ ] **Step 1: Create request-cancellation.ts**

```typescript
// Tracks the current in-flight request and cancels it on new capture
let currentRequestId: string | null = null;
let currentAbortController: AbortController | null = null;

export function startRequest(requestId: string): AbortController {
  // Cancel any previous in-flight request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentRequestId = requestId;
  currentAbortController = new AbortController();
  return currentAbortController;
}

export function getCurrentRequestId(): string | null {
  return currentRequestId;
}

export function cancelCurrentRequest(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    currentRequestId = null;
  }
}

export function clearRequest(): void {
  currentAbortController = null;
  currentRequestId = null;
}
```

- [ ] **Step 2: Integrate into api-client.ts**

In `RealApiClient.solve()`, pass the abort signal from the cancellation module to fetch:

```typescript
async solve(request: SolveRequest, requestId?: string): Promise<SolveResult> {
  const headers = await this.getHeaders();
  let abortController: AbortController | undefined;

  if (requestId) {
    abortController = startRequest(requestId);
  }

  const response = await fetch(`${API_BASE_URL}/solve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...request, requestId }),
    signal: abortController?.signal,
    // ... rest
  });
  // ...
}
```

Also add a timeout (10 seconds for compact answer mode):

```typescript
const timeoutMs = 10000; // 10s for compact answer
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

const response = await fetch(..., {
  signal: AbortSignal.any([abortController?.signal, timeoutController.signal].filter(Boolean)),
});
clearTimeout(timeoutId);
```

- [ ] **Step 3: Update capture-controller to pass requestId**

```typescript
async captureArea(tabId: number, payload: CapturePayload): Promise<SolveResult> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const abortController = startRequest(requestId);

  const imageData = await captureVisibleTab(tabId, abortController.signal);
  // ... emit progress states ...
  const result = await apiClient.solve({
    imageData: processedImage,
    mode: 'area',
    requestId,
  });
  return result;
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

- [ ] **Step 5: Commit**

---

## Task 5: Add Local Recent Result Cache (LRU)

**File:** `apps/extension/src/lib/recent-result-cache.ts`

Cache recent solve results keyed by normalized question hash. Avoid re-solving identical questions within a session.

- [ ] **Step 1: Create recent-result-cache.ts**

```typescript
const MAX_CACHE_SIZE = 20; // LRU cache size

interface CachedResult {
  hash: string;
  result: import('./message-types').SolveResult;
  timestamp: number;
}

const cache: CachedResult[] = [];

export function computeHash(text: string): string {
  // Simple hash for cache key — use normalized question text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function getCachedResult(normalizedText: string): Promise<SolveResult | null> {
  const hash = computeHash(normalizedText);
  const entry = cache.find(c => c.hash === hash);
  if (!entry) return null;

  // Check if older than 1 hour
  if (Date.now() - entry.timestamp > 60 * 60 * 1000) {
    // Remove expired entry
    const idx = cache.indexOf(entry);
    if (idx > -1) cache.splice(idx, 1);
    return null;
  }

  // Move to front (LRU)
  const idx = cache.indexOf(entry);
  if (idx > 0) {
    cache.splice(idx, 1);
    cache.unshift(entry);
  }

  return entry.result;
}

export async function setCachedResult(normalizedText: string, result: SolveResult): Promise<void> {
  const hash = computeHash(normalizedText);

  // Remove existing entry for this hash
  const existingIdx = cache.findIndex(c => c.hash === hash);
  if (existingIdx > -1) {
    cache.splice(existingIdx, 1);
  }

  // Add to front
  cache.unshift({ hash, result, timestamp: Date.now() });

  // Trim to max size
  while (cache.length > MAX_CACHE_SIZE) {
    cache.pop();
  }
}

export function clearCache(): void {
  cache.length = 0;
}
```

- [ ] **Step 2: Integrate into capture-controller.ts**

Before calling `apiClient.solve()`, check cache using the extracted/normalized question text. If cached result exists, return it immediately with cached flag set.

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

- [ ] **Step 4: Commit**

---

## Task 6: Add Backend Question Hash Cache (Redis + In-Memory)

**Files:**
- `apps/api/src/services/cache.service.ts` — new cache service
- `apps/api/src/services/solve.service.ts` — integrate hash cache lookup

**Strategy:** Check Redis for `question:hash:<hash>` → return cached answer. Fall back to in-memory LRU if Redis unavailable. Hash is SHA256 of normalized question text.

- [ ] **Step 1: Create cache.service.ts**

```typescript
import crypto from 'crypto';

const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

// In-memory fallback when Redis unavailable
const memoryCache = new Map<string, { data: unknown; expiry: number }>();

function getRedisClient() {
  if (!REDIS_URL) return null;
  // Lazy import redis only if URL is configured
  try {
    const { createClient } = require('redis');
    const client = createClient({ url: REDIS_URL });
    return client;
  } catch {
    return null;
  }
}

export function computeQuestionHash(normalizedText: string): string {
  return crypto.createHash('sha256').update(normalizedText).digest('hex').substring(0, 32);
}

export async function getCachedAnswer(hash: string): Promise<{
  answer: string;
  confidence: number;
  explanation: string;
  questionId: string;
} | null> {
  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.connect();
      const cached = await redis.get(`question:${hash}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Redis unavailable — fall through to memory cache
    } finally {
      try { await redis.quit(); } catch {}
    }
  }

  // In-memory fallback
  const entry = memoryCache.get(hash);
  if (entry && entry.expiry > Date.now()) {
    return entry.data as ReturnType<typeof getCachedAnswer>;
  }
  memoryCache.delete(hash);
  return null;
}

export async function setCachedAnswer(
  hash: string,
  data: { answer: string; confidence: number; explanation: string; questionId: string }
): Promise<void> {
  const payload = JSON.stringify(data);

  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.connect();
      await redis.setEx(`question:${hash}`, CACHE_TTL_SECONDS, payload);
      await redis.quit();
      return;
    } catch {
      // Redis unavailable — use memory cache
    } finally {
      try { await redis.quit(); } catch {}
    }
  }

  // In-memory fallback — trim if >1000 entries
  if (memoryCache.size > 1000) {
    const oldest = [...memoryCache.entries()]
      .sort((a, b) => a[1].expiry - b[1].expiry)
      .slice(0, 100);
    oldest.forEach(([k]) => memoryCache.delete(k));
  }
  memoryCache.set(hash, { data, expiry: Date.now() + CACHE_TTL_SECONDS * 1000 });
}
```

- [ ] **Step 2: Update solve.service.ts to use hash cache**

In `solveFromImage` and `solveFromText`, before calling `solveQuestion`:

```typescript
const questionHash = computeQuestionHash(extraction.normalizedText);

// Check cache first
const cached = await getCachedAnswer(questionHash);
if (cached) {
  // Use cached result — still log the request but skip solving
  return {
    questionId: cached.questionId,
    extraction,
    solution: { shortAnswer: cached.answer, confidence: cached.confidence, fullExplanation: cached.explanation } as Solution,
    performance: { totalLatencyMs: Date.now() - startTime, extractionLatencyMs, solvingLatencyMs: 0, validationLatencyMs: 0 },
  };
}

// ... normal solve flow ...

// After solving, cache the result
await setCachedAnswer(questionHash, {
  answer: solution.shortAnswer,
  confidence: solution.confidenceScore,
  explanation: solution.fullExplanation,
  questionId: question.id,
});
```

- [ ] **Step 3: Add questionHash to Prisma schema**

```prisma
model Question {
  // ... existing fields ...
  questionHash String?
  // Add index
  @@index([questionHash])
}
```

- [ ] **Step 4: Build and verify**

```bash
cd apps/api && npx tsc --noEmit
npx prisma generate
```

- [ ] **Step 5: Commit**

---

## Task 7: Add Detailed Latency Logging

**Files:**
- `apps/extension/src/lib/latency-tracker.ts` — new
- `apps/extension/src/lib/api-client.ts` — emit latency in solve result
- `apps/api/src/services/solve.service.ts` — log all latency phases

- [ ] **Step 1: Create latency-tracker.ts**

```typescript
export interface LatencyBreakdown {
  captureLatencyMs: number;
  uploadLatencyMs: number;
  extractionLatencyMs: number;
  solveLatencyMs: number;
  validationLatencyMs: number;
  totalLatencyMs: number;
}

export class LatencyTracker {
  private phases: Map<string, number> = new Map();
  private startTime: number = Date.now();

  start(phase: keyof LatencyBreakdown): void {
    this.phases.set(phase, Date.now());
  }

  end(phase: keyof LatencyBreakdown): number {
    const start = this.phases.get(phase);
    if (start === undefined) return 0;
    const elapsed = Date.now() - start;
    this.phases.set(phase, elapsed);
    return elapsed;
  }

  getBreakdown(): LatencyBreakdown {
    const get = (key: string) => this.phases.get(key) ?? 0;
    return {
      captureLatencyMs: get('captureLatencyMs'),
      uploadLatencyMs: get('uploadLatencyMs'),
      extractionLatencyMs: get('extractionLatencyMs'),
      solveLatencyMs: get('solveLatencyMs'),
      validationLatencyMs: get('validationLatencyMs'),
      totalLatencyMs: Date.now() - this.startTime,
    };
  }

  reset(): void {
    this.phases.clear();
    this.startTime = Date.now();
  }
}
```

- [ ] **Step 2: Update capture-controller to use LatencyTracker**

```typescript
import { LatencyTracker } from '../lib/latency-tracker';

async captureArea(tabId: number, payload: CapturePayload): Promise<SolveResult> {
  const tracker = new LatencyTracker();

  tracker.start('captureLatencyMs');
  const imageData = await captureVisibleTab(tabId);
  tracker.end('captureLatencyMs');

  // ... crop ...

  tracker.start('uploadLatencyMs');
  // Include latency info in solve request
  const result = await apiClient.solve({
    imageData: processedImage,
    mode: 'area',
    latencyMs: tracker.getBreakdown(),
  });
  tracker.end('uploadLatencyMs');

  // Merge server-side latency into result
  return { ...result, ...tracker.getBreakdown() };
}
```

- [ ] **Step 3: Update solve.service.ts to log all phases**

Add timing for each phase and include in the response:

```typescript
async function solveFromImage(request: SolveImageRequest, ctx: SolveContext): Promise<SolveServiceResult> {
  const startTime = Date.now();
  const captureStart = startTime; // time since request received (network overhead)
  const extractionStart = Date.now();

  // extraction...
  const extractionLatency = Date.now() - extractionStart;

  // topic classification...

  const solvingStart = Date.now();
  // solve...
  const solvingLatency = Date.now() - solvingStart;

  const validationStart = Date.now();
  // validate...
  const validationLatency = Date.now() - validationStart;

  const totalLatency = Date.now() - startTime;

  // Include network time in captureLatencyMs (time from request receipt to extraction start)
  const captureLatencyMs = extractionStart - startTime;
  const uploadLatencyMs = solvingStart - extractionStart - extractionLatency;

  return {
    questionId,
    extraction,
    solution,
    performance: {
      captureLatencyMs,    // server-side request parsing + queue
      uploadLatencyMs,      // placeholder (network is on client side)
      extractionLatencyMs,
      solveLatencyMs,
      validationLatencyMs,
      totalLatencyMs,
    },
  };
}
```

- [ ] **Step 4: Build and verify**

```bash
cd apps/extension && npm run build
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

---

## Task 8: Add Provider Fallback

**Files:**
- `apps/extension/src/lib/api-client.ts` — add fallback chain
- `apps/api/src/services/solve.service.ts` — add fallback model/provider

Strategy: If primary model fails (timeout, error), fall back to a faster/smaller model. Compact answer mode prioritizes speed over detail.

- [ ] **Step 1: Update api-client.ts with fallback chain**

```typescript
const PROVIDER_CHAIN = [
  { name: 'primary', timeout: 8000 },
  { name: 'fallback-fast', timeout: 5000 },
];

async solveWithFallback(request: SolveRequest): Promise<SolveResult> {
  const headers = await this.getHeaders();

  for (const provider of PROVIDER_CHAIN) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), provider.timeout);

      const response = await fetch(`${API_BASE_URL}/solve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...request, provider: provider.name }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      // Try next provider on non-OK response
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log(`[API] Provider ${provider.name} timed out, trying fallback...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All providers failed');
}
```

- [ ] **Step 2: Update solve.service.ts to handle provider parameter**

In `solveQuestion`, accept a `provider` parameter and use the appropriate model:

```typescript
async function solveQuestion(text: string, options: any, level: string, provider?: string): Promise<Solution> {
  // Primary: use best model
  // Fallback: use faster model (smaller context, quicker response)
}
```

- [ ] **Step 3: Build and verify**

```bash
cd apps/extension && npm run build
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

---

## Task 9: Compact-Answer-First Mode

**Files:**
- `apps/api/src/services/solution.service.ts` — add fast-path for compact mode
- `apps/api/src/routes/solve.routes.ts` — add `mode: 'compact'` parameter

- [ ] **Step 1: Update solution service for compact mode**

In `solution.service.ts`, add `mode` parameter to `solveQuestion`:

```typescript
export async function solveQuestion(
  text: string,
  options: any,
  level: 'brief' | 'standard' | 'detailed',
  mode: 'fast' | 'full' = 'full'
): Promise<Solution> {
  if (mode === 'fast') {
    // Use minimal prompt, no detailed reasoning chain
    // Return answer + confidence immediately, explanation can be null
    const result = await providerRegistry.complete(
      buildCompactPrompt(text, options),
      { model: 'fast-model', maxTokens: 50 }
    );
    return {
      shortAnswer: parseAnswer(result),
      fullExplanation: null, // Lazy loaded later
      reasoningSummary: null,
      confidenceScore: 0.85,
      validationStatus: 'not_validated',
    };
  }
  // ... full mode unchanged ...
}
```

- [ ] **Step 2: Update solve route to accept mode parameter**

In `solve.routes.ts`, add `mode: z.enum(['compact', 'full']).default('full')` to the request schema. Pass it to the solve service.

- [ ] **Step 3: Update extension api-client to request compact mode first**

In the extension, request compact mode for the initial solve. Show compact answer immediately when received. If user requests explanation, call `/api/solve/:id/explanation` to get full explanation lazily.

```typescript
async solve(request: SolveRequest): Promise<SolveResult> {
  // First try compact/fast mode
  const response = await fetch(`${API_BASE_URL}/solve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...request, mode: 'compact' }),
    signal: abortSignal,
  });

  if (response.ok) {
    return await response.json(); // Compact answer — fast
  }

  // Fall back to full mode
  const fallback = await fetch(`${API_BASE_URL}/solve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...request, mode: 'full' }),
  });
  return fallback.json();
}
```

- [ ] **Step 4: Build and verify**

```bash
cd apps/extension && npm run build
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

---

## Task 10: Lazy Load Side Panel / Details

**Files:**
- `apps/extension/src/content/lazy-details.ts` — new lazy loader
- `apps/extension/src/background/service-worker.ts` — update OPEN_DETAILS to use lazy loader

- [ ] **Step 1: Create lazy-details.ts**

```typescript
import type { SolveResult } from './message-types';

export async function loadDetails(requestId: string): Promise<void> {
  // Dynamically import the side panel logic
  const { getLastResult } = await import('./extension-storage');
  const result = await getLastResult();

  if (!result) {
    // Fetch from API if not in storage
    const response = await fetch(`http://localhost:8100/api/questions/${requestId}`);
    if (!response.ok) return;
    const question = await response.json();
    // Render explanation in side panel
    await renderExplanation(question.fullExplanation);
    return;
  }

  await renderExplanation(result.explanation);
}

async function renderExplanation(explanation: string): Promise<void> {
  // Open side panel and render
  const sidePanel = await chrome.sidePanel.open({ url: '/sidepanel/sidepanel.html' });
  // The sidepanel.html will receive the explanation via storage
  const { setLastResult } = await import('./extension-storage');
  await setLastResult({ explanation } as SolveResult);
}
```

- [ ] **Step 2: Update service-worker OPEN_DETAILS handler**

Replace the simple side panel open with a lazy load that fetches explanation data first:

```typescript
const handleOpenDetails = async (message: ExtensionMessage) => {
  // Load explanation lazily first, then open side panel
  const requestId = message.payload?.requestId;
  if (requestId) {
    // Fetch the full explanation in background
    fetch(`http://localhost:8100/api/questions/${requestId}`)
      .then(r => r.json())
      .then(question => {
        // Store for side panel to pick up
        import('./lib/extension-storage').then(m => m.setLastResult(question));
      })
      .catch(() => {});
  }

  if (sender.tab?.id) {
    await chrome.sidePanel.open({ tabId: sender.tab.id });
  } else {
    await chrome.sidePanel.open({ windowId: -1 });
  }
  return { opened: true };
};
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

- [ ] **Step 4: Commit**

---

## Task 11: Write Performance Strategy Doc

**File:** `docs/architecture/07-performance-strategy.md`

Write comprehensive performance strategy document.

- [ ] **Step 1: Write doc**

```markdown
# Performance Strategy — KARÇÖZ

## Performance Targets

| Metric | Target | Current (estimated) |
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
- Server solve (fast mode): 1500ms
- Server validation: 300ms
- Network download: 300ms
- Client render: 200ms
- Buffer: 300ms
- **Total**: ~4.5s (tight — using fallbacks and caching to beat target)

## Performance Strategies

1. **Minimize bundle size** — esbuild minification, code splitting
2. **Lazy load heavy modules** — page-text-extractor, study-scan-mode, candidate-overlay
3. **Progress states** — show "Reading/Solving/Validating" so latency feels intentional
4. **Compact answer first** — fast model for initial answer, lazy-load explanation
5. **Request cancellation** — abort in-flight on new capture
6. **Question hash cache** — skip solve for duplicate questions
7. **Provider fallback** — chain primary → fast-fallback to avoid timeouts
8. **Timeout handling** — 10s client-side timeout, retry with fallback

## Architecture

```
User clicks capture
  → Service worker wakes (200-400ms if cold)
  → captureVisibleTab + crop (300-600ms)
  → Check local LRU cache (hash of normalized text)
  → If cache hit: return cached answer immediately
  → If cache miss:
      → emit "Reading" progress state
      → POST /api/solve (compact mode, 10s timeout)
      → Server: hash check → cache hit? return cached
      → Server: extraction (800-1500ms)
      → Server: solve (fast model, 1500ms)
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
```

- [ ] **Step 2: Commit**

---

## Task 12: Write Latency and Caching Architecture Doc

**File:** `docs/architecture/17-latency-and-caching.md`

- [ ] **Step 1: Write doc**

Document the caching strategy, latency breakdown by phase, and Redis vs in-memory fallback.

- [ ] **Step 2: Commit**

---

## Task 13: Final Benchmark and Report

**File:** `docs/report_phase_15_performance.md`

- [ ] **Step 1: Rebuild everything with optimizations**

```bash
cd apps/extension && npm run build
cd apps/api && npx tsc --noEmit
```

- [ ] **Step 2: Measure final bundle sizes**

```bash
wc -c apps/extension/dist/background/service-worker.js
wc -c apps/extension/dist/content/content-script.js
gzip -c apps/extension/dist/background/service-worker.js | wc -c
gzip -c apps/extension/dist/content/content-script.js | wc -c
```

- [ ] **Step 3: Write benchmark report**

Document before/after sizes, latency improvements, cache hit rate, and any remaining issues.

- [ ] **Step 4: Commit**

---

## Validation Plan

After all tasks:

```bash
# Extension
cd apps/extension && npm run build && npx tsc --noEmit

# API
cd apps/api && npx tsc --noEmit && npx prisma generate

# All TypeScript clean
cd apps/extension && npx tsc --noEmit
cd packages/shared && npx tsc
cd apps/api && npx tsc --noEmit
```

Final end-to-end test sequence:
1. Open extension popup → should be <300ms
2. Click capture → progress states show → compact answer <4s
3. Click capture same question → cache hit, instant answer
4. Start new capture while solving → previous request cancels
5. Open details → explanation lazy loads

---

## Done Criteria

- [ ] Extension bundle minified and split — background <10KB gzipped, content <20KB gzipped main chunk
- [ ] Progress states visible in result bubble ("Reading", "Solving", "Validating")
- [ ] Request cancellation works — new capture aborts previous request
- [ ] Local LRU cache works — repeated capture returns cached result
- [ ] Backend question hash cache works — Redis + in-memory fallback
- [ ] Provider fallback chain implemented
- [ ] Compact-answer-first mode — initial answer is fast
- [ ] Lazy-load side panel/details
- [ ] Detailed latency logging in solve result
- [ ] All TypeScript passes with 0 errors
- [ ] Performance docs written
- [ ] Benchmark report written with results

---

## Rollback Plan

If bundle splitting breaks extension:
```bash
# Revert build.js to non-splitting config
# Rebuild
npm run build
```

If cache causes issues, add feature flag:
```typescript
const USE_CACHE = process.env.KARCOZ_CACHE_ENABLED !== 'false';
```

---

**Plan saved to:** `docs/superpowers/plans/2026-05-16-performance-optimization.md`