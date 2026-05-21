# 04 — AI / OCR / Solver Review

**Core Pipeline Components Review**

---

## AI Core (ai-core)

### Provider Registry

Supported providers: `mock`, `openai`, `openrouter`, `anthropic`, `gemini`

### Provider Implementations

| Provider | File | Status |
|---------|------|--------|
| `MockProvider` | `providers/mock.provider.ts` | Intentional test mock |
| `OpenAIProvider` | `providers/openai.provider.ts` | **MOCKED** — hardcoded sample data |
| `OpenRouterProvider` | providers/openrouter | **MOCKED** |
| `AnthropicProvider` | providers/anthropic | **MOCKED** |
| `GeminiProvider` | providers/gemini | **MOCKED** |

**All providers are mocks.** No real API calls to OpenAI, Anthropic, Gemini, or any external provider. The `OpenAIProvider` accepts an API key and model name but never makes actual requests.

### Chains

`image-to-question.chain.ts` implements:
- `runExtractChain()` — extract text from image via provider
- `runSolveChain()` — solve extracted question via provider
- `runValidateChain()` — validate solution via provider
- All call mocked providers → all return hardcoded responses

### Safety Checks

- `ImageTooLargeError` — thrown at HTTP 413 for oversized images
- `LowConfidenceError` — thrown when confidence < 0.3
- `NoQuestionDetectedError` — thrown when extraction returns empty/too-short text
- `FallbackExhaustedError` — thrown when all providers in fallback chain fail
- `isRetryableError()` — identifies timeout and rate-limit errors for retry

---

## OCR Core (ocr-core)

### Pipeline

```
Image → preprocess (denoise, binarize, resize, contrast) → normalize (turkish, math-symbols, whitespace, option-parser) → OCR engine → confidence scoring
```

### OCR Engines

| Engine | File | Status |
|--------|------|--------|
| `MockOCREngine` | `engines/mock-ocr.engine.ts` | Hardcoded sample text; confidence 0.72–0.80 |
| `VisionOCREngine` | `engines/vision-ocr.engine.ts` | Delegates to ai-core provider (mocked) |
| `HybridOCREngine` | `engines/hybrid.engine.ts` | VisionOCR first → MockOCR fallback → merge if confidence < 0.85 |

### Normalizers

- Turkish character fixes (dotless i / dotted I)
- Math symbol normalization
- Whitespace normalization
- Option parser (A/B/C/D detection)
- Language detection

### Confidence Scoring

`computeConfidence()` — weighted aggregate:
- ocrEngine: 0.4
- textQuality: 0.25
- languageConsistency: 0.15
- optionStructure: 0.2

`assessTextQuality()` — detects garbled OCR artifacts, penalizes low clean-char ratio.

---

## Solver Core (solver-core)

**EMPTY DIRECTORY** — No files exist. No solver algorithm is implemented.

The implicit "solving" is handled by the AI provider's `solveQuestion()` method which is mocked.

---

## Capture Core (capture-core)

### Components

- `crop.ts` — Rectangle cropping with coordinate validation
- `compression.ts` — JPEG quality compression to max byte size (binary search)
- `validation.ts` — Source required, max dimensions, max size (1KB min, default 10MB), quality range [0,1], crop rect minimum 10×10px
- `canvas-utils.ts` — Luminance-based contrast stretch using `requestIdleCallback`
- `image-normalize.ts` — Image orientation normalization

### Validation Rules

- Negative coordinates: rejected
- Bounds overflow: rejected
- Crop rect minimum: 10×10px
- Image dimensions: max validation
- Payload size: enforced via `maxSizeBytes`

---

## Eval System

### Results (eval_1778966335964)

- **Dataset**: 5 questions (combined)
- **Pass rate**: 100% (5/5)
- **Latency mean**: 553ms
- **Confidence mean**: 0.93
- **Confidence calibration**: 0/5 (not well calibrated)

### Dimension Breakdown

| Dimension | Passed | Rate |
|-----------|--------|------|
| ocr | 5/5 | 100% |
| options | 5/5 | 100% |
| topic | 5/5 | 100% |
| answer | 5/5 | 100% |
| latency | 5/5 | 100% |
| explanation | 5/5 | 100% |
| confidence | 0/5 | 0% |

Note: High pass rates reflect mock data quality, not real-world performance.

---

## Verdict

**MOCKED PIPELINE** — ai-core, ocr-core, and solver-core are all non-functional for real questions. All external AI/OCR integrations are stubs. The eval system uses mock data and shows 100% pass rates because the mock returns deterministic sample answers. Real API keys are required for production use.