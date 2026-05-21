# 07 — AI / OCR / Solver Review

## Purpose
Analyze AI providers, OCR engines, solver pipeline, prompt quality, hallucination risks, and latency expectations.

---

## AI Providers — Real vs Mock

| Provider | Status | Implementation | External Calls |
|---|---|---|---|
| `mock` | ✅ REAL mock | `MockProvider` in `providers/mock.provider.ts` | None — returns hardcoded answers |
| `openai` | ✅ REAL | `OpenAIProvider` in `providers/openai.provider.ts` | `api.openai.com/v1/chat/completions` |
| `openrouter` | ✅ REAL | `OpenRouterProvider` in `providers/openrouter.provider.ts` | `openrouter.ai/api/v1/chat/completions` |
| `anthropic` | ❌ NOT IMPLEMENTED | `provider-registry.ts` throws `PROVIDER_NOT_CONFIGURED` | Never called |
| `gemini` | ❌ NOT IMPLEMENTED | Same as above | Never called |

**Default provider:** Controlled by `AI_PROVIDER` env var; `mock` is the default if no key is set.

---

## Provider Configuration

**File:** `packages/ai-core/src/providers/provider-registry.ts`

```typescript
// Throws for unconfigured providers
if (provider === 'anthropic' && !env.ANTHROPIC_API_KEY) throw PROVIDER_NOT_CONFIGURED
if (provider === 'gemini' && !env.GEMINI_API_KEY) throw PROVIDER_NOT_CONFIGURED
```

**Evidence:** Only `openai`, `openrouter`, and `mock` are actually instantiated.

---

## OpenAI Provider — Real Implementation

**File:** `packages/ai-core/src/providers/openai.provider.ts`

- **Vision model:** `gpt-4o` (for image extraction)
- **Text model:** `gpt-4o-mini` (for solving)
- Timeout: 30s (configurable via `AI_TIMEOUT_MS`)
- Max tokens: 2048
- Temperature: 0.3 (low for deterministic answers)
- JSON extraction with fallback parsing

**System prompts:** Turkish and English versions for all operations.

**Evidence:** Real `fetch()` call to `https://api.openai.com/v1/chat/completions` with proper Authorization header.

---

## OpenRouter Provider — Real Implementation

**File:** `packages/ai-core/src/providers/openrouter.provider.ts`

- **Default model:** `anthropic/claude-3.5-sonnet` via OpenRouter
- Timeout: 30s
- HTTP-Referer and X-Title headers set
- Same JSON extraction pattern as OpenAI

**Evidence:** Real `fetch()` call to `https://openrouter.ai/api/v1/chat/completions` with Authorization header.

---

## OCR Engine System

**File:** `packages/ocr-core/src/engines/hybrid.engine.ts`

```
hybridOCR(input):
  1. VisionOCREngine.extract() — real AI OCR
  2. If confidence < 0.5 → MockOCREngine.extract()
  3. Merge results: prefer Vision text, fill gaps from Mock
```

### VisionOCREngine
- Wraps `AIProvider` from `@karcoz/ai-core`
- Calls `extractQuestion()` with image
- Real AI-powered text extraction

### MockOCREngine
- Returns hardcoded: "What is the capital of France? A) Paris B) London C) Berlin D) Madrid"
- Only used as fallback when Vision confidence is low

**Status: ✅ Well-designed hybrid approach**

---

## Preprocessing Pipeline

**Files:** `packages/ocr-core/src/preprocess/*.ts`

| Step | File | Description |
|---|---|---|
| Contrast enhancement | `enhance-contrast.ts` | CLAHE (Contrast Limited Adaptive Histogram Equalization) |
| Denoise | `denoise.ts` | Gaussian blur |
| Binarization | `binarize.ts` | Otsu threshold |
| Resize | `resize-for-ocr.ts` | DPI normalization to 300 DPI |

**Note:** These preprocessing functions exist but are NOT wired into the hybrid OCR pipeline. The pipeline uses `VisionOCREngine` directly on the raw image.

**Evidence:** `hybrid.engine.ts` calls `visionEngine.extract(input)` directly without preprocessing steps.

---

## Normalization Pipeline

**File:** `packages/ocr-core/src/normalize/*.ts`

| Function | Purpose |
|---|---|
| `normalizeWhitespace` | Collapse multiple spaces, trim |
| `normalizeTurkish` | Fix common Turkish character issues (ı/i, ş/s, etc.) |
| `normalizeMathSymbols` | Standardize ±, √, ², ³, ∑, ∫, etc. |
| `detectLanguage` | Turkish character regex: `[şçğüöı]/i` |
| `parseOptions` | Extract MC options from text (A. B. C. D. / (a) (b) / 1. 2. 3.) |

**Status: ✅ Thorough, Turkish-aware**

---

## Solver Pipeline

**File:** `packages/solver-core/src/index.ts`

```
solve(question, options?, context?):
  1. Classify question type (regex-based)
  2. Route to deterministic solver if confidence will be high:
     - arithmetic → solveArithmetic
     - percentage → solvePercentage
     - ratio → solveRatio
     - simple_algebra → solveSimpleAlgebra
     - sequence → solveSequence
     - multiple_choice → solveMultipleChoice
  3. If deterministic confidence < 0.5 → fallback to AI (aiFallback=true)
  4. Validate answer
  5. Calculate combined confidence: OCR(0.3) + solver(0.6) + validation(0.1)
  6. If final < 0.5 → mark isLowConfidence
```

**Status: ✅ Solid architecture**

---

## Deterministic Solvers

| Solver | File | Status |
|---|---|---|
| Arithmetic | `solvers/arithmetic.ts` | ✅ Real implementation |
| Percentage | `solvers/percentage.ts` | ✅ Real implementation |
| Ratio | `solvers/ratio.ts` | ✅ Real implementation |
| Simple Algebra | `solvers/simple-algebra.ts` | ✅ Real implementation |
| Sequence | `solvers/sequence.ts` | ✅ Real implementation |
| Multiple Choice | `solvers/multiple-choice.ts` | ✅ Real implementation |
| AI Fallback | `solvers/fallback-ai.ts` | ✅ Real — calls AI provider |

---

## Prompt Engineering

**File:** `packages/ai-core/src/prompt-templates/image-to-question.prompt.ts`

### Extract Prompt (Turkish)
```
Sen bir soru çıkarıcısısın. Verilen görüntüden soruyu ve seçenekleri çıkar.
Kurallar:
- Yalnızca geçerli JSON döndür — başka hiçbir şey yazma
- Matematik sembollerini koru (², √, ∑, vb.)
- Seçenekleri {label, value, order} formatında döndür
- Bilmediğin bir şey varsa extractedText boş bırak
- confidence 0.0-1.0 arasında
- detectedLanguage: "en", "tr", veya "unknown"
- questionType: "multiple_choice", "true_false", "short_answer", ...
```

### Solve Prompt (Turkish)
```
Sen bir çalışma asistanısın. Soruyu çöz ve net cevap ver.
Kurallar:
- Yalnızca geçerli JSON döndür
- shortAnswer: kısa cevap metni
- selectedOption: çoktan seçmeli ise 0 tabanlı seçenek indeksi
- fullExplanation: detaylı açıklama
- reasoningSummary: özetli akıl yürütme
- confidenceScore: 0.0-1.0 arası güven skoru
- validationStatus: "pass", "fail", "low_confidence", "not_validated"
```

**Status: ✅ Well-crafted prompts with Turkish support**

---

## Hallucination Risks

| Risk | Level | Mitigation |
|---|---|---|
| AI returns non-JSON | Medium | Fallback extraction/solve on parse failure |
| AI returns wrong answer | Medium | Validation step after solve; confidence scoring |
| AI misclassifies topic | Low | Deterministic solvers used first when possible |
| AI low confidence → wrong fallback | Medium | `isLowConfidence` flag propagated to client |
| OCR text wrong → wrong solve | Medium | `computeTextQuality()` checks OCR confidence; affects overall score |

**Missing:** No cross-validation against known answer keys. No human-in-the-loop for low-confidence answers.

---

## Latency Expectations

| Operation | Typical Latency | Notes |
|---|---|---|
| Tab capture (extension) | 50–200ms | `chrome.tabs.captureVisibleTab` |
| Image compression (canvas) | 20–100ms | WebP encoding, quality 0.85 |
| Network: extension → API | 100–500ms | Depends on network + image size |
| OCR extraction (GPT-4o vision) | 1–3s | API call with 30s timeout |
| Text solve (GPT-4o-mini) | 500ms–2s | API call with 30s timeout |
| Deterministic solve | 10–50ms | No network call |
| Validation | 50–200ms | Optional AI validation |
| Cache hit | <10ms | Redis lookup |
| **Total (cache miss, GPT-4o)** | **2–6 seconds** | End-to-end |
| **Total (cache hit)** | **<1 second** | LRU cache in capture-controller |

---

## Confidence Scoring

**File:** `packages/solver-core/src/validate/confidence-calculator.ts`

```typescript
combined = OCR(0.3) + solver(0.6) + validation(0.1)

// Adjustments:
// - OCR < 0.3: combined = ocrConf * solverConf * 0.5, cap at 0.4
// - solver < 0.3: combined = solverConf * 0.3, cap at 0.35
// - validation < 0.3: multiplied by 0.85
// - isLowConfidence: final < 0.5
```

**Status: ✅ Weighted confidence with fallback adjustments**

---

## Eval System

**File:** `eval/run-eval.ts` — **MISSING**

The evaluation runner does not exist:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/oguz/Masaüstü/KarÇÖZ/eval/run-eval.ts'
```

**Datasets exist:** `turkish_math_basic.json`, `turkish_logic_basic.json`, `multiple_choice_mixed.json`, `expanded_50.json`

**Scripts exist:** `eval/scripts/run-eval.ts` — but the referenced path from `package.json` is `eval/run-eval.ts`

**Status: ❌ BROKEN — Eval system cannot run**

---

## Real Answer Quality Readiness

| Aspect | Status |
|---|---|
| Deterministic solvers (arithmetic, etc.) | ✅ Production-ready |
| AI fallback solver | ⚠️ Depends on provider quality |
| Turkish language support | ✅ System prompts + normalization |
| Math symbol handling | ✅ In prompts + normalization |
| Option parsing | ✅ Robust option parser |
| Multiple choice solving | ✅ Implemented |
| Confidence scoring | ✅ Multi-factor weighted |
| Validation step | ✅ Answer consistency check |

**Overall:** Core pipeline is production-quality. Missing eval system prevents quantitative quality measurement.