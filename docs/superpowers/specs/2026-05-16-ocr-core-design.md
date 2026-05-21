# OCR Core Package Design

**Status:** Draft
**Date:** 2026-05-16
**Author:** KARÇÖZ Engineering

---

## 1. Overview

`packages/ocr-core` provides image preprocessing, OCR extraction, text normalization, option parsing, and language detection for the KARÇÖZ solve pipeline. It integrates with `packages/ai-core` as the first stage of the full solve chain.

## 2. Architecture

```
Image (Buffer / base64)
    │
    ▼
preprocess/
    ├── enhance-contrast.ts   ← CLAHE contrast boost, grayscale
    ├── denoise.ts            ← Gaussian blur for noise
    ├── binarize.ts           ← Otsu threshold for text clarity
    └── resize-for-ocr.ts     ← Target 300 DPI normalization
    │
    ▼
engines/
    ├── mock-ocr.engine.ts    ← Always-available fallback
    ├── vision-ocr.engine.ts ← AI Vision extraction via ai-core
    └── hybrid.engine.ts      ← Sequential: preprocess → Vision → repair → options → topic
    │
    ▼
normalize/
    ├── normalize-whitespace.ts   ← Collapse spaces/lines
    ├── normalize-turkish.ts       ← Fix common Turkish OCR errors
    ├── normalize-math-symbols.ts  ← Fix superscripts, roots, fractions
    ├── detect-language.ts        ← tr/en detection via char frequency
    ├── option-parser.ts          ← Extract A/B/C/D/E options, broken lines
    └── question-cleaner.ts       ← Remove noise, normalize punctuation
    │
    ▼
confidence/
    └── ocr-confidence.ts    ← Aggregate confidence from all stages
```

## 3. Engine Strategy

### Sequential Pipeline (Hybrid Engine)

```typescript
async function hybridOCR(input: OCRInput): Promise<OCRResult> {
  // 1. Preprocess
  const preprocessed = await preprocessImage(input.image);

  // 2. Primary OCR via Vision
  const visionResult = await visionOCR(preprocessed);
  if (visionResult.confidence >= 0.85) {
    return finalize(visionResult);
  }

  // 3. Fallback to Mock OCR
  const mockResult = await mockOCR(preprocessed);
  const merged = mergeResults(visionResult, mockResult);

  // 4. AI repair via ai-core
  const repaired = await aiRepair(merged.text, input.language);

  // 5. Normalize and parse options
  const normalized = normalize(repaired);
  const options = parseOptions(normalized);
  const topic = detectTopic(normalized.text);

  return { ...normalized, options, topic, confidence: repaired.confidence };
}
```

### OCR Engine Interface

```typescript
interface OCREngine {
  name: string;
  process(image: ImageData): Promise<OCRTextResult>;
  isAvailable(): boolean;
}

interface OCRTextResult {
  text: string;
  confidence: number;        // 0-1
  language?: 'en' | 'tr';
  boundingBoxes?: BoundingBox[];
  processingTimeMs: number;
}
```

### Available Engines

| Engine | Source | Enabled | Notes |
|--------|--------|---------|-------|
| MockOCR | Built-in | Always | Deterministic, no API calls |
| VisionOCR | ai-core (OpenAI) | Yes (via ai-core) | Primary OCR for production |
| TesseractOCR | tesseract.js | No (disabled by default) | Opt-in, heavy bundle |

## 4. Normalization Modules

### 4.1 Whitespace Normalization
- Collapse multiple spaces/tabs to single space
- Remove leading/trailing whitespace per line
- Preserve paragraph breaks (double newline) for question structure
- Handle line-broken words (hyphenation or line wrap)

### 4.2 Turkish Normalization
Fix common OCR errors:
- `ı` ↔ `i` confusion (especially with dotless i)
- `ş` ↔ `s`, `ç` ↔ `c`, `ğ` ↔ `g`, `ü` ↔ `u`, `ö` ↔ `o`
- `I` (uppercase i) ↔ `İ` (dotted uppercase i)
- Common digit-letter confusions in handwriting

### 4.3 Math Symbol Normalization

| Pattern | Normalized | Notes |
|---------|------------|-------|
| `x²`, `x⁲` | `x^2` | Superscript 2 |
| `x³`, `x⁳` | `x^3` | Superscript 3 |
| `x⁴`–`x⁹` | `x^n` | General superscript |
| `√`, `√¯` | `sqrt` | Square root |
| `∛`, `∜` | `cbrt`, `4rt` | Cube/4th root |
| `∑`, `Σ` | `sum` | Summation |
| `π`, `∏` | `pi`, `product` | Pi/product |
| `÷`, `∕`, `∣` | `/` | Division |
| `≠`, `≠` | `!=` | Not equal |
| `≤`, `≥` | `<=`, `>=` | Comparisons |
| `→`, `⇒` | `->`, `=>` | Implication |
| `∈`, `∉` | `in`, `not in` | Membership |
| `∞` | `infinity` | Infinity |
| `½`, `⅓`, `¾` | `1/2`, `1/3`, `3/4` | Fractions |
| `,` (decimal in Turkish) | `.` | Decimal point normalization |
| `  (Turkish space) | ` ` | Narrow space removal |

### 4.4 Option Parser

Supported formats:
- `A) Text` / `B) Text` / `C) Text` / `D) Text` / `E) Text`
- `A. Text` / `B. Text` / `C. Text` / `D. Text` / `E. Text`
- `a) Text` / `b) Text` / `c) Text`
- `① Text` / `② Text` / `③ Text` / `④ Text` / `⑤ Text`
- `1.` / `2.` / `3.` / `4.` / `5.`

Line-broken option handling:
- Options that span multiple lines are joined
- If line ends with option label pattern, assume continuation
- Non-letter prefixes (numbers) treated as valid options

Output:
```typescript
interface ParsedOption {
  label: string;   // "A", "B", "1", etc.
  value: string;   // Full text of option
  order: number;   // 0-based index
}
```

### 4.5 Language Detection

Simple character-frequency approach:
- Turkish charset: `şçğüöıàâéèêëïîôûùäãåō`
- Count Turkish-specific chars vs total chars
- If > 15% Turkish chars → Turkish
- If any Turkish chars → possible Turkish
- English fallback with Latin-only check

## 5. Confidence Scoring

```typescript
interface OCRConfidence {
  overall: number;          // Weighted average
  ocrEngine: number;       // Raw OCR engine confidence
  textQuality: number;     // Based on: character ratio, no garbled text
  languageConsistency: number;
  optionStructure: number; // Well-formed options boost confidence
}
```

## 6. Integration with ai-core

```
Image
  → ocrCore.hybridOCR()    # preprocess + extract + normalize
  → produces normalized question + options
  → ai-core.runSolveChain() # solve the normalized question
  → ai-core.runValidateChain() # validate the answer
```

The `QuestionExtraction` type from `ai-core/src/types.ts` is the target output format.

## 7. File Structure

```
packages/ocr-core/src/
├── index.ts                      # Public exports
├── types.ts                      # OCR types (OCRInput, OCRResult, etc.)
├── preprocess/
│   ├── enhance-contrast.ts
│   ├── denoise.ts
│   ├── binarize.ts
│   └── resize-for-ocr.ts
├── engines/
│   ├── ocr-engine.interface.ts  # OCREngine interface
│   ├── mock-ocr.engine.ts
│   ├── vision-ocr.engine.ts     # Uses ai-core provider
│   └── hybrid.engine.ts         # Sequential orchestration
├── normalize/
│   ├── normalize-whitespace.ts
│   ├── normalize-turkish.ts
│   ├── normalize-math-symbols.ts
│   ├── option-parser.ts
│   ├── question-cleaner.ts
│   └── detect-language.ts
├── confidence/
│   └── ocr-confidence.ts
└── utils/
    └── image-utils.ts           # Shared image manipulation helpers

packages/ocr-core/__tests__/
├── normalize/
│   ├── normalize-turkish.test.ts
│   ├── normalize-math-symbols.test.ts
│   ├── option-parser.test.ts
│   └── detect-language.test.ts
└── engines/
    └── hybrid.engine.test.ts
```

## 8. Dependencies

```json
{
  "dependencies": {
    "@karcoz/ai-core": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

Tesseract.js is NOT included by default — it's an opt-in path. If user adds it, it goes in `optionalDependencies`.

## 9. Testing Strategy

Test samples for Turkish and English questions:

```typescript
const TURKISH_SAMPLES = [
  "Bir üçgenin iç açıları toplamı kaçtır?\nA) 90°\nB) 180°\nC) 270°\nD) 360°",
  "x² + 2x + 1 = 0 denkleminin çözüm kümesi nedir?\nA) {-1}\nB) {1}\nC) {-1, 1}\nD) ∅",
];

const ENGLISH_SAMPLES = [
  "What is the derivative of f(x) = x³?\nA) x²\nB) 3x²\nC) 3x³\nD) 2x³",
  "Solve: 2x + 5 = 15\nA) x = 5\nB) x = 10\nC) x = 7.5\nD) x = 20",
];
```

## 10. API Surface

```typescript
// packages/ocr-core/src/index.ts
export { hybridOCR, extractFromImage } from './engines/hybrid.engine.js';
export { preprocessImage } from './preprocess/index.js';
export { normalizeText } from './normalize/question-cleaner.js';
export { parseOptions } from './normalize/option-parser.js';
export { detectLanguage } from './normalize/detect-language.js';
export * from './types.js';
```

## 11. MVP Scope

**In scope:**
- MockOCR + VisionOCR via ai-core
- All normalization modules
- Option parser for all listed formats
- Turkish + English language detection
- Confidence scoring
- Integration with ai-core chains

**Out of scope (v1):**
- Tesseract.js (opt-in later)
- PDF OCR
- Handwriting recognition specialized engines
- Multi-page question support

## 12. Error Handling

| Error | Code | Handling |
|-------|------|----------|
| Image decode failure | `IMAGE_DECODE_FAILED` | Return empty result, confidence = 0 |
| All engines fail | `OCR_ALL_FAILED` | Throw, let caller handle |
| Low confidence | `LOW_CONFIDENCE` | Return result with warning flag |
| No options detected | `NO_OPTIONS` | Return result without options (short answer question) |

## 13. Validation Commands

```bash
cd packages/ocr-core
npm run build          # TypeScript compile
npm run test           # Vitest unit tests
npm run typecheck      # tsc --noEmit
```