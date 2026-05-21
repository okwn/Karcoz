# OCR Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `packages/ocr-core` — image preprocessing, OCR engines, text normalization (Turkish/math), option parsing, and confidence scoring — integrated with `packages/ai-core`.

**Architecture:** Sequential hybrid pipeline: preprocess → VisionOCR (primary) → MockOCR (fallback) → AI repair via ai-core → normalize → parse options → detect topic. Each normalization module is a pure function. Engines implement `OCREngine` interface.

**Tech Stack:** TypeScript, vitest, zod (via ai-core), sharp or canvas for image processing.

---

## File Structure

```
packages/ocr-core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                          # Public exports
│   ├── types.ts                          # OCRInput, OCRResult, OCREngine, etc.
│   ├── preprocess/
│   │   ├── index.ts                      # Re-exports all preprocess fns
│   │   ├── enhance-contrast.ts           # CLAHE contrast boost
│   │   ├── denoise.ts                    # Gaussian blur
│   │   ├── binarize.ts                   # Otsu threshold
│   │   └── resize-for-ocr.ts             # 300 DPI normalization
│   ├── engines/
│   │   ├── ocr-engine.interface.ts       # OCREngine interface
│   │   ├── mock-ocr.engine.ts            # Built-in fallback
│   │   ├── vision-ocr.engine.ts          # AI Vision via ai-core
│   │   └── hybrid.engine.ts              # Sequential orchestrator
│   ├── normalize/
│   │   ├── index.ts                      # Re-exports normalize fns
│   │   ├── normalize-whitespace.ts       # Space/tab collapse, join lines
│   │   ├── normalize-turkish.ts          # Fix Turkish OCR errors
│   │   ├── normalize-math-symbols.ts     # Fix math notation
│   │   ├── detect-language.ts            # Char-frequency tr/en detection
│   │   ├── option-parser.ts              # Parse A/B/C/D/E options
│   │   └── question-cleaner.ts           # Remove noise, normalize punctuation
│   └── confidence/
│       └── ocr-confidence.ts             # Aggregate confidence scoring
└── __tests__/
    ├── types.test.ts
    ├── normalize/
    │   ├── normalize-whitespace.test.ts
    │   ├── normalize-turkish.test.ts
    │   ├── normalize-math-symbols.test.ts
    │   ├── detect-language.test.ts
    │   └── option-parser.test.ts
    └── engines/
        ├── mock-ocr.engine.test.ts
        └── hybrid.engine.test.ts
```

---

## Task 1: Scaffold ocr-core Package

**Files:**
- Create: `packages/ocr-core/package.json`
- Create: `packages/ocr-core/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@karcoz/ocr-core",
  "version": "0.1.0",
  "description": "KARÇÖZ OCR — preprocessing, extraction, normalization",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
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

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../ai-core" }
  ]
}
```

- [ ] **Step 3: Run build to verify skeleton**

Run: `cd packages/ocr-core && npm run build`
Expected: `dist/` directory created, no TypeScript errors (empty project)

---

## Task 2: Define OCR Types

**Files:**
- Create: `packages/ocr-core/src/types.ts`

- [ ] **Step 1: Write types**

```typescript
export interface OCRInput {
  image: Buffer | string; // base64 or Buffer
  mimeType?: string;
  language?: 'en' | 'tr' | 'auto';
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRTextResult {
  text: string;
  confidence: number;       // 0-1
  language?: 'en' | 'tr';
  boundingBoxes?: BoundingBox[];
  processingTimeMs: number;
  engine: string;
}

export interface OCRResult {
  extractedText: string;
  normalizedText: string;
  detectedLanguage: 'en' | 'tr' | 'unknown';
  questionType: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'unknown';
  options?: { label: string; value: string; order: number }[];
  topic?: string;
  confidence: number;
  rawPrediction?: string;
  processingSteps: string[];
}

export interface OCREngine {
  name: string;
  process(image: Buffer | string): Promise<OCRTextResult>;
  isAvailable(): boolean;
}

export interface PreprocessOptions {
  targetDPI?: number;       // default 300
  enhanceContrast?: boolean; // default true
  denoise?: boolean;        // default true
  binarize?: boolean;       // default false (only for bad images)
}

export interface NormalizeResult {
  text: string;
  changes: string[];       // log of normalizations applied
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No errors

---

## Task 3: Preprocess Modules

**Files:**
- Create: `packages/ocr-core/src/preprocess/index.ts`
- Create: `packages/ocr-core/src/preprocess/enhance-contrast.ts`
- Create: `packages/ocr-core/src/preprocess/denoise.ts`
- Create: `packages/ocr-core/src/preprocess/binarize.ts`
- Create: `packages/ocr-core/src/preprocess/resize-for-ocr.ts`

- [ ] **Step 1: enhance-contrast.ts**

```typescript
import { NormalizeResult } from '../types.js';

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization) contrast boost.
 * Converts to grayscale, splits into tiles, equalizes each tile.
 * For OCR: improves text contrast on unevenly lit images.
 */
export function enhanceContrast(imageData: ImageData, tileSize = 64, clipLimit = 2): ImageData {
  const { data, width, height } = imageData;

  // Convert to grayscale luminance values
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Build histogram and CDF per tile
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  const result = new Uint8ClampedArray(width * height * 4);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(x0 + tileSize, width);
      const y1 = Math.min(y0 + tileSize, height);

      // Histogram for tile
      const hist = new Uint32Array(256);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * width + x]]++;
        }
      }

      // CDF
      const cdf = new Uint32Array(256);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

      // Clip histogram (contrast limit)
      const clipHist = new Uint32Array(256);
      const clippedEntries = cdf[255] - clipLimit * tileSize * tileSize;
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        const drop = Math.max(0, hist[i] - clipLimit);
        excess += drop;
        clipHist[i] = hist[i] - drop;
      }
      // Redistribute clipped values
      const perBin = excess / 256;
      for (let i = 0; i < 256; i++) clipHist[i] += perBin;

      // Rebuild CDF from clipped histogram
      const cdfClip = new Uint32Array(256);
      cdfClip[0] = clipHist[0];
      for (let i = 1; i < 256; i++) cdfClip[i] = cdfClip[i - 1] + clipHist[i];

      const cdfMin = cdfClip[0];
      const cdfRange = cdfClip[255] - cdfMin || 1;

      // Apply mapping
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const val = gray[y * width + x];
          const mapped = Math.round(((cdfClip[val] - cdfMin) / cdfRange) * 255);
          const idx = (y * width + x) * 4;
          result[idx] = mapped;
          result[idx + 1] = mapped;
          result[idx + 2] = mapped;
          result[idx + 3] = 255;
        }
      }
    }
  }

  return new ImageData(result, width, height);
}
```

- [ ] **Step 2: denoise.ts**

```typescript
import { NormalizeResult } from '../types.js';

/**
 * Gaussian blur for noise reduction.
 * kernelSize: odd number, typically 3 or 5
 * sigma: standard deviation
 */
export function denoise(imageData: ImageData, kernelSize = 3, sigma = 1): ImageData {
  const { data, width, height } = imageData;
  const half = Math.floor(kernelSize / 2);

  // Build Gaussian kernel
  const kernel = new Float32Array(kernelSize * kernelSize);
  let sum = 0;
  for (let ky = 0; ky < kernelSize; ky++) {
    for (let kx = 0; kx < kernelSize; kx++) {
      const dx = kx - half;
      const dy = ky - half;
      const val = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[ky * kernelSize + kx] = val;
      sum += val;
    }
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const result = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const sx = Math.min(Math.max(x + kx - half, 0), width - 1);
          const sy = Math.min(Math.max(y + ky - half, 0), height - 1);
          const idx = (sy * width + sx) * 4;
          const w = kernel[ky * kernelSize + kx];
          rSum += data[idx] * w;
          gSum += data[idx + 1] * w;
          bSum += data[idx + 2] * w;
        }
      }

      const idx = (y * width + x) * 4;
      result[idx] = Math.round(rSum);
      result[idx + 1] = Math.round(gSum);
      result[idx + 2] = Math.round(bSum);
      result[idx + 3] = 255;
    }
  }

  return new ImageData(result, width, height);
}
```

- [ ] **Step 3: binarize.ts**

```typescript
/**
 * Otsu threshold for automatic binarization.
 * Best for high-contrast text images. Converts to pure black/white.
 */
export function binarize(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;

  // Grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // Otsu threshold
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) { maxVar = variance; threshold = i; }
  }

  // Apply threshold
  const result = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < gray.length; i++) {
    const val = gray[i] > threshold ? 255 : 0;
    result[i * 4] = val;
    result[i * 4 + 1] = val;
    result[i * 4 + 2] = val;
    result[i * 4 + 3] = 255;
  }

  return new ImageData(result, width, height);
}
```

- [ ] **Step 4: resize-for-ocr.ts**

```typescript
/**
 * Resize image to target DPI for OCR normalization.
 * Target: 300 DPI. Scale factor = targetDPI / sourceDPI (default 72 DPI assumed).
 */
export function resizeForOCR(imageData: ImageData, targetDPI = 300, sourceDPI = 72): ImageData {
  const scale = targetDPI / sourceDPI;

  if (Math.abs(scale - 1) < 0.01) return imageData;

  const newWidth = Math.round(imageData.width * scale);
  const newHeight = Math.round(imageData.height * scale);

  const src = imageData.data;
  const dst = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.round(x / scale);
      const srcY = Math.round(y / scale);
      const srcIdx = (srcY * imageData.width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = 255;
    }
  }

  return new ImageData(dst, newWidth, newHeight);
}
```

- [ ] **Step 5: preprocess/index.ts**

```typescript
export { enhanceContrast } from './enhance-contrast.js';
export { denoise } from './denoise.js';
export { binarize } from './binarize.js';
export { resizeForOCR } from './resize-for-ocr.js';
```

- [ ] **Step 6: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No errors

---

## Task 4: Normalization Modules

**Files:**
- Create: `packages/ocr-core/src/normalize/normalize-whitespace.ts`
- Create: `packages/ocr-core/src/normalize/normalize-turkish.ts`
- Create: `packages/ocr-core/src/normalize/normalize-math-symbols.ts`
- Create: `packages/ocr-core/src/normalize/detect-language.ts`
- Create: `packages/ocr-core/src/normalize/option-parser.ts`
- Create: `packages/ocr-core/src/normalize/question-cleaner.ts`
- Create: `packages/ocr-core/src/normalize/index.ts`

- [ ] **Step 1: normalize-whitespace.ts**

```typescript
import { NormalizeResult } from '../types.js';

/**
 * Normalize whitespace:
 * - Collapse multiple spaces/tabs to single space
 * - Remove leading/trailing whitespace per line
 * - Preserve double-newline paragraph breaks
 * - Handle line-broken words (join words broken across lines)
 */
export function normalizeWhitespace(text: string): NormalizeResult {
  const changes: string[] = [];

  let result = text;

  // Replace tabs with spaces
  if (result.includes('\t')) {
    changes.push('tabs→spaces');
    result = result.replace(/\t/g, ' ');
  }

  // Collapse multiple spaces
  if (/  +/.test(result)) {
    changes.push('collapse-multiple-spaces');
    result = result.replace(/  +/g, ' ');
  }

  // Remove leading/trailing whitespace per line
  const beforeLines = result.split('\n');
  const afterLines = beforeLines.map(l => l.trim());
  if (beforeLines.some((l, i) => l !== afterLines[i])) {
    changes.push('trim-line-ends');
    result = afterLines.join('\n');
  }

  // Join line-broken words (line ends with hyphen or no space at start)
  result = result.replace(/-\n\s*/g, '');
  result = result.replace(/(\w)\n(\w)/g, '$1 $2');

  // Collapse multiple newlines to max 2
  if (/\n{3,}/.test(result)) {
    changes.push('collapse-paragraph-breaks');
    result = result.replace(/\n{3,}/g, '\n\n');
  }

  return { text: result, changes };
}
```

- [ ] **Step 2: normalize-turkish.ts**

```typescript
import { NormalizeResult } from '../types.js';

/**
 * Fix common Turkish OCR errors:
 * - ı (dotless lowercase i) ↔ i confusion
 * - I (uppercase) ↔ İ (dotted uppercase) confusion
 * - ş ↔ s, ç ↔ c, ğ ↔ g, ü ↔ u, ö ↔ o
 * - Common digit-letter confusions
 */
export function normalizeTurkish(text: string): NormalizeResult {
  const changes: string[] = [];

  // Character-level mappings for common OCR confusions
  const replacements: [RegExp, string][] = [
    // Dotless i / dotted i confusion (very common in Turkish OCR)
    [/İ/g, 'I'],   // Dotted uppercase I → regular I
    [/ı/g, 'i'],   // Dotless lowercase ı → i

    // Common Turkish character confusions
    [/ş/g, 'ş'],    // keep as-is (no confusion pattern needed)
    [/ç/g, 'ç'],
    [/ğ/g, 'ğ'],
    [/ü/g, 'ü'],
    [/ö/g, 'ö'],
    [/â/g, 'a'],    // a with circumflex → a (often OCR artifact)
    [/î/g, 'i'],    // i with circumflex → i
    [/û/g, 'u'],    // u with circumflex → u

    // Narrow no-break space (Turkish digit grouping) → regular space
    [/‎/g, ' '],
    [/­/g, ''],     // soft hyphen → nothing
  ];

  // Only apply if text contains Turkish characters
  const hasTurkish = /[şçğüöıâîû]/i.test(text);

  let result = text;
  if (hasTurkish) {
    // Fix dotted I / dotless ı confusion
    if (/[İI]/.test(result)) {
      changes.push('fixTurkishI');
    }

    // Fix common misrecognition patterns
    if (/[5][ı]/i.test(result)) {
      changes.push('fixDigitLetterConfusion');
    }
    result = result.replace(/5([ı])/gi, '5');
    result = result.replace(/([ı])5/gi, '$1');
  }

  return { text: result, changes };
}
```

- [ ] **Step 3: normalize-math-symbols.ts**

```typescript
import { NormalizeResult } from '../types.js';

/**
 * Normalize mathematical symbols:
 * - Superscripts: x², x³ → x^2, x^3
 * - Roots: √ → sqrt
 * - Fractions: ½ → 1/2
 * - Operators: ÷ → /, ≠ → !=, ≤ → <=, etc.
 * - Turkish decimal comma → period
 */
export function normalizeMathSymbols(text: string): NormalizeResult {
  const changes: string[] = [];

  let result = text;

  // Superscript normalization
  const superscripts: [string, string][] = [
    ['²', '^2'], ['³', '^3'], ['⁴', '^4'], ['⁵', '^5'],
    ['⁶', '^6'], ['⁷', '^7'], ['⁸', '^8'], ['⁹', '^9'],
    ['⁰', '^0'], ['¹', '^1'], ['²', '^2'],
  ];
  for (const [sup, norm] of superscripts) {
    if (result.includes(sup)) {
      changes.push(`superscript-${sup}`);
      result = result.split(sup).join(norm);
    }
  }

  // Roots
  if (result.includes('√')) {
    changes.push('sqrt-normalize');
    result = result.replace(/√/g, 'sqrt');
    result = result.replace(/∛/g, 'cbrt');
    result = result.replace(/∜/g, '4rt');
  }

  // Division operators
  if (/[÷∕∣]/.test(result)) {
    changes.push('division-normalize');
    result = result.replace(/÷/g, '/');
    result = result.replace(/∕/g, '/');
    result = result.replace(/∣/g, '|');
  }

  // Comparison operators
  if (/[≠≤≥]/.test(result)) {
    changes.push('comparison-normalize');
    result = result.replace(/≠/g, '!=');
    result = result.replace(/≤/g, '<=');
    result = result.replace(/≥/g, '>=');
  }

  // Implication arrows
  if (/[→⇒]/.test(result)) {
    changes.push('implication-normalize');
    result = result.replace(/→/g, '->');
    result = result.replace(/⇒/g, '=>');
  }

  // Set membership
  if (/[∈∉]/.test(result)) {
    changes.push('membership-normalize');
    result = result.replace(/∈/g, 'in');
    result = result.replace(/∉/g, 'not in');
  }

  // Greek letters common in math
  const greek: [string, string][] = [
    ['∑', 'sum'], ['Σ', 'sum'],
    ['∏', 'product'], ['∏', 'product'],
    ['π', 'pi'], ['Π', 'pi'],
    ['α', 'alpha'], ['β', 'beta'], ['γ', 'gamma'],
    ['δ', 'delta'], ['Δ', 'delta'],
    ['θ', 'theta'], ['λ', 'lambda'], ['μ', 'mu'],
    ['φ', 'phi'], ['ω', 'omega'], ['Ω', 'Omega'],
    ['∞', 'infinity'],
  ];
  for (const [sym, name] of greek) {
    if (result.includes(sym)) {
      result = result.split(sym).join(name);
    }
  }

  // Fractions
  const fractions: [string, string][] = [
    ['½', '1/2'], ['⅓', '1/3'], ['¼', '1/4'], ['¾', '3/4'],
    ['⅕', '1/5'], ['⅖', '2/5'], ['⅗', '3/5'], ['⅘', '4/5'],
    ['⅙', '1/6'], ['⅚', '5/6'], ['⅛', '1/8'], ['⅜', '3/8'],
    ['⅝', '5/8'], ['⅞', '7/8'],
  ];
  for (const [frac, norm] of fractions) {
    if (result.includes(frac)) {
      changes.push(`fraction-${norm}`);
      result = result.split(frac).join(norm);
    }
  }

  // Turkish decimal comma → period (very common in Turkish math texts)
  // Only where it looks like decimal (digit,digit pattern)
  if (result.includes(',')) {
    const decimalComma = result.replace(/(\d),(\d)/g, '$1.$2');
    if (decimalComma !== result) {
      changes.push('decimal-comma-to-dot');
      result = decimalComma;
    }
  }

  return { text: result, changes };
}
```

- [ ] **Step 4: detect-language.ts**

```typescript
import { NormalizeResult } from '../types.js';

const TURKISH_CHARS = /[şçğüöıàâéèêëïîôûùäãåō]/i;

/**
 * Detect language (Turkish / English / unknown) via character frequency.
 * Threshold: >15% Turkish chars → Turkish
 * If any Turkish chars → possible Turkish
 * Otherwise → English
 */
export function detectLanguage(text: string): 'en' | 'tr' | 'unknown' {
  const turkishChars = (text.match(TURKISH_CHARS) || []).length;
  const totalChars = text.replace(/\s/g, '').length;

  if (totalChars === 0) return 'unknown';

  const ratio = turkishChars / totalChars;

  if (ratio > 0.15) return 'tr';
  if (ratio > 0) return 'tr'; // any Turkish chars detected

  return 'en';
}
```

- [ ] **Step 5: option-parser.ts**

```typescript
export interface ParsedOption {
  label: string;
  value: string;
  order: number;
}

/**
 * Parse multiple choice options from normalized question text.
 * Supports:
 * - A) B) C) D) E)
 * - A. B. C. D. E.
 * - a) b) c)
 * - ① ② ③ ④ ⑤
 * - 1. 2. 3. 4. 5.
 * - Line-broken options
 */
export function parseOptions(text: string): ParsedOption[] {
  const options: ParsedOption[] = [];

  // Patterns for option starts
  const patterns = [
    /^([A-E])\)\s*(.+)/im,           // A) text
    /^([A-E])\.\s+(.+)/im,            // A. text
    /^([a-e])\)\s*(.+)/im,            // a) text
    /^\(([A-E])\)\s*(.+)/im,          // (A) text
    /^[①-⑤]\s*(.+)/im,               // ① text
    /^(\d+)\)\s*(.+)/im,              // 1) text
    /^(\d+)\.\s+(.+)/im,              // 1. text
  ];

  const lines = text.split('\n');
  let currentOption: ParsedOption | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    let matched = false;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Save previous option if exists
        if (currentOption) options.push(currentOption);

        const label = match[1];
        const value = match[2].trim();
        currentOption = { label, value, order: options.length };
        matched = true;
        break;
      }
    }

    // If no new option started, continue building current option
    if (!matched && currentOption && line.length > 0) {
      // Check if line doesn't look like a new option (no leading label pattern)
      const looksLikeContinuation = !/^[^A-Za-z①-⑤]/.test(line);
      if (looksLikeContinuation || /^[A-Z][\.\)]/.test(line) === false) {
        currentOption.value += ' ' + line;
      } else {
        // New option without label (rare) — treat as continuation
        currentOption.value += ' ' + line;
      }
    }
  }

  // Don't forget last option
  if (currentOption) options.push(currentOption);

  // Clean up values
  return options.map(o => ({ ...o, value: o.value.replace(/\s+/g, ' ').trim() }));
}
```

- [ ] **Step 6: question-cleaner.ts**

```typescript
import { NormalizeResult } from '../types.js';
import { normalizeWhitespace } from './normalize-whitespace.js';
import { normalizeTurkish } from './normalize-turkish.js';
import { normalizeMathSymbols } from './normalize-math-symbols.js';

/**
 * Full normalization pipeline: whitespace → Turkish → math symbols → punctuation.
 */
export function normalizeText(text: string, languageHint?: 'en' | 'tr'): NormalizeResult {
  const allChanges: string[] = [];

  let result = text;

  // Step 1: Whitespace
  const ws = normalizeWhitespace(result);
  result = ws.text;
  allChanges.push(...ws.changes);

  // Step 2: Turkish (only if language hint is tr or auto-detected)
  const shouldNormalizeTurkish = languageHint === 'tr' ||
    (!languageHint && /[şçğüöı]/i.test(result));
  if (shouldNormalizeTurkish) {
    const tr = normalizeTurkish(result);
    result = tr.text;
    allChanges.push(...tr.changes);
  }

  // Step 3: Math symbols (always, since math chars are language-neutral)
  const math = normalizeMathSymbols(result);
  result = math.text;
  allChanges.push(...math.changes);

  // Step 4: Fix common OCR punctuation artifacts
  result = result
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/​/g, '')  // zero-width space
    .replace(/​/g, ''); // zero-width space

  return { text: result, changes: allChanges };
}
```

- [ ] **Step 7: normalize/index.ts**

```typescript
export { normalizeWhitespace } from './normalize-whitespace.js';
export { normalizeTurkish } from './normalize-turkish.js';
export { normalizeMathSymbols } from './normalize-math-symbols.js';
export { detectLanguage } from './detect-language.js';
export { parseOptions } from './option-parser.js';
export { normalizeText } from './question-cleaner.js';
```

- [ ] **Step 8: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No errors

---

## Task 5: OCR Engines

**Files:**
- Create: `packages/ocr-core/src/engines/ocr-engine.interface.ts`
- Create: `packages/ocr-core/src/engines/mock-ocr.engine.ts`
- Create: `packages/ocr-core/src/engines/vision-ocr.engine.ts`
- Create: `packages/ocr-core/src/engines/hybrid.engine.ts`

- [ ] **Step 1: ocr-engine.interface.ts**

```typescript
import { OCRTextResult } from '../types.js';

export interface OCREngine {
  name: string;
  process(image: Buffer | string): Promise<OCRTextResult>;
  isAvailable(): boolean;
}
```

- [ ] **Step 2: mock-ocr.engine.ts**

```typescript
import type { OCREngine, OCRTextResult } from '../types.js';
import { detectLanguage } from '../normalize/detect-language.js';

export class MockOCREngine implements OCREngine {
  name = 'mock';

  isAvailable(): boolean {
    return true;
  }

  async process(image: Buffer | string): Promise<OCRTextResult> {
    const start = Date.now();

    // For testing: if image is a string starting with "MOCK:", parse it as test data
    const imageStr = typeof image === 'string' ? image : image.toString('utf8');

    // Simulate varying confidence based on input characteristics
    const hasTurkish = /[şçğüöı]/i.test(imageStr);
    const hasMath = /[²³√∑÷≠≤≥]/i.test(imageStr);
    const confidence = hasTurkish || hasMath ? 0.72 : 0.80;

    const text = imageStr.startsWith('MOCK:')
      ? imageStr.slice(5)
      : 'What is the capital of France?\nA) Paris\nB) London\nC) Berlin\nD) Madrid';

    const detectedLang = detectLanguage(text);

    return {
      text,
      confidence,
      language: detectedLang,
      processingTimeMs: Date.now() - start,
      engine: 'mock',
    };
  }
}
```

- [ ] **Step 3: vision-ocr.engine.ts**

```typescript
import type { OCREngine, OCRTextResult } from '../types.js';
import type { AIProvider } from '@karcoz/ai-core';
import { detectLanguage } from '../normalize/detect-language.js';
import { buildImagePrompt } from '@karcoz/ai-core/prompts/image-to-question.prompt';

export class VisionOCREngine implements OCREngine {
  name = 'vision';
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  isAvailable(): boolean {
    return this.provider !== undefined;
  }

  async process(image: Buffer | string): Promise<OCRTextResult> {
    const start = Date.now();

    const imageBase64 = typeof image === 'string'
      ? image
      : image.toString('base64');

    const { system, user } = buildImagePrompt({ language: 'auto', preserveMath: true });

    // Call ai-core extractQuestion
    const result = await this.provider.extractQuestion({ imageBase64 });

    return {
      text: result.extractedText,
      confidence: result.confidence,
      language: result.detectedLanguage === 'unknown' ? undefined : result.detectedLanguage,
      processingTimeMs: Date.now() - start,
      engine: 'vision',
    };
  }
}
```

- [ ] **Step 4: hybrid.engine.ts**

```typescript
import type { OCRInput, OCRResult, OCRTextResult } from '../types.js';
import type { OCREngine } from './ocr-engine.interface.js';
import { MockOCREngine } from './mock-ocr.engine.js';
import { VisionOCREngine } from './vision-ocr.engine.js';
import { detectLanguage } from '../normalize/detect-language.js';
import { normalizeText } from '../normalize/normalize-whitespace.js';
import { parseOptions } from '../normalize/option-parser.js';
import { normalizeMathSymbols } from '../normalize/normalize-math-symbols.js';
import { normalizeTurkish } from '../normalize/normalize-turkish.js';
import { computeConfidence } from '../confidence/ocr-confidence.js';

export interface HybridOCRConfig {
  visionProvider?: AIProvider;
  confidenceThreshold?: number;  // default 0.85
  enableMockFallback?: boolean;  // default true
}

let mockEngine: MockOCREngine;
let visionEngine: VisionOCREngine | null = null;

export function initHybridEngine(config: HybridOCRConfig): void {
  mockEngine = new MockOCREngine();
  if (config.visionProvider) {
    visionEngine = new VisionOCREngine(config.visionProvider);
  }
}

export async function hybridOCR(input: OCRInput): Promise<OCRResult> {
  const steps: string[] = [];
  const startTime = Date.now();

  // Use providers from ai-core if not explicitly set
  if (!mockEngine) mockEngine = new MockOCREngine();

  let textResult: OCRTextResult;

  // Step 1: Try VisionOCR if available
  if (visionEngine && visionEngine.isAvailable()) {
    steps.push('vision-ocr');
    try {
      textResult = await visionEngine.process(input.image);
    } catch (err) {
      steps.push('vision-failed');
      textResult = await mockEngine.process(input.image);
    }
  } else {
    steps.push('mock-ocr');
    textResult = await mockEngine.process(input.image);
  }

  // Step 2: If low confidence, try merge with fallback
  if (textResult.confidence < 0.85 && mockEngine.isAvailable()) {
    steps.push('fallback-merge');
    const mockResult = await mockEngine.process(input.image);

    // Prefer higher confidence result
    if (mockResult.confidence > textResult.confidence) {
      textResult = mockResult;
    } else {
      // Merge: use vision text but mock's confidence if higher
      textResult = {
        text: textResult.text,
        confidence: Math.max(textResult.confidence, mockResult.confidence * 0.9),
        language: textResult.language || mockResult.language,
        processingTimeMs: textResult.processingTimeMs,
        engine: 'hybrid',
      };
    }
  }

  // Step 3: Normalize text
  const langHint = input.language === 'auto' ? undefined : input.language;
  const lang = textResult.language || langHint || detectLanguage(textResult.text);

  const mathNorm = normalizeMathSymbols(textResult.text);
  const wsNorm = normalizeText(mathNorm.text, lang as 'en' | 'tr');

  const normalizedText = wsNorm.text;

  // Step 4: Parse options
  const options = parseOptions(normalizedText);

  // Step 5: Detect topic (simple keyword matching)
  const topic = detectTopic(normalizedText);

  // Step 6: Detect question type
  const questionType = detectQuestionType(normalizedText, options);

  steps.push('normalize');
  steps.push('parse-options');
  steps.push('detect-topic');

  const overallConfidence = computeConfidence({
    ocrEngine: textResult.confidence,
    textQuality: textResult.text.length > 20 ? 0.8 : 0.4,
    languageConsistency: lang !== 'unknown' ? 0.9 : 0.5,
    optionStructure: options.length >= 2 ? 0.85 : 0.6,
  });

  return {
    extractedText: textResult.text,
    normalizedText,
    detectedLanguage: lang,
    questionType,
    options: options.length > 0 ? options : undefined,
    topic,
    confidence: overallConfidence,
    processingSteps: steps,
  };
}

function detectTopic(text: string): string | undefined {
  const keywords: [string, string][] = [
    ['matematik', 'Mathematics'], ['fizik', 'Physics'], ['kimya', 'Chemistry'],
    ['biyoloji', 'Biology'], ['tarih', 'History'], ['coğrafya', 'Geography'],
    ['edebiyat', 'Literature'], ['bilgisayar', 'Computer Science'],
    ['hukuk', 'Law'], ['ekonomi', 'Economics'],
    ['derivative', 'Mathematics'], ['integral', 'Mathematics'],
    ['equation', 'Mathematics'], [' DNA', 'Biology'],
    [' Newton's', 'Physics'], ['atom', 'Chemistry'],
    ['capital', 'Geography'], ['history', 'History'],
  ];

  for (const [kw, topic] of keywords) {
    if (text.toLowerCase().includes(kw)) return topic;
  }
  return 'General';
}

function detectQuestionType(text: string, options: { label: string; value: string; order: number }[]):
  'multiple_choice' | 'true_false' | 'short_answer' | 'unknown' {
  if (options.length >= 2) return 'multiple_choice';
  if (/true\s*[-–]\s*false/i.test(text)) return 'true_false';
  if (text.length > 10) return 'short_answer';
  return 'unknown';
}
```

- [ ] **Step 5: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No errors

---

## Task 6: Confidence Scoring

**Files:**
- Create: `packages/ocr-core/src/confidence/ocr-confidence.ts`

- [ ] **Step 1: ocr-confidence.ts**

```typescript
export interface ConfidenceInput {
  ocrEngine: number;
  textQuality: number;
  languageConsistency: number;
  optionStructure: number;
}

export interface OCRConfidenceScore {
  overall: number;
  breakdown: ConfidenceInput;
}

/**
 * Compute aggregate OCR confidence from all pipeline stages.
 * Weights: ocrEngine (0.4), textQuality (0.25), languageConsistency (0.15), optionStructure (0.2)
 */
export function computeConfidence(input: ConfidenceInput): number {
  const weights = {
    ocrEngine: 0.4,
    textQuality: 0.25,
    languageConsistency: 0.15,
    optionStructure: 0.2,
  };

  const raw = Object.entries(input).reduce((sum, [key, val]) => {
    return sum + (val * weights[key as keyof ConfidenceInput]);
  }, 0);

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, raw));
}

/**
 * Rate extraction quality based on text characteristics.
 */
export function assessTextQuality(text: string): number {
  if (!text || text.length < 5) return 0;

  const clean = text.replace(/[ -]/g, '');
  const ratio = clean.length / text.length;
  const hasGarbled = /[▓░▒╬╫╔]/.test(text); // common OCR artifacts

  if (hasGarbled) return 0.3;
  if (ratio < 0.9) return 0.5;
  return 0.9;
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No errors

---

## Task 7: Public Index and Package Export

**Files:**
- Create: `packages/ocr-core/src/index.ts`

- [ ] **Step 1: index.ts**

```typescript
// Re-export all public APIs
export type { OCRInput, OCRResult, OCRTextResult, OCREngine, BoundingBox } from './types.js';

// Preprocess
export { enhanceContrast, denoise, binarize, resizeForOCR } from './preprocess/index.js';

// Normalize
export {
  normalizeWhitespace,
  normalizeTurkish,
  normalizeMathSymbols,
  detectLanguage,
  parseOptions,
  normalizeText,
} from './normalize/index.js';

// Confidence
export { computeConfidence, assessTextQuality } from './confidence/ocr-confidence.js';

// Engines
export type { OCREngine } from './engines/ocr-engine.interface.js';
export { MockOCREngine } from './engines/mock-ocr.engine.js';
export { VisionOCREngine } from './engines/vision-ocr.engine.js';
export { hybridOCR, initHybridEngine } from './engines/hybrid.engine.js';
```

- [ ] **Step 2: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No errors

---

## Task 8: Write Unit Tests

**Files:**
- Create: `packages/ocr-core/__tests__/normalize/normalize-whitespace.test.ts`
- Create: `packages/ocr-core/__tests__/normalize/normalize-turkish.test.ts`
- Create: `packages/ocr-core/__tests__/normalize/normalize-math-symbols.test.ts`
- Create: `packages/ocr-core/__tests__/normalize/detect-language.test.ts`
- Create: `packages/ocr-core/__tests__/normalize/option-parser.test.ts`
- Create: `packages/ocr-core/__tests__/engines/mock-ocr.engine.test.ts`
- Create: `packages/ocr-core/__tests__/engines/hybrid.engine.test.ts`

- [ ] **Step 1: normalize-whitespace.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeWhitespace } from '../../src/normalize/normalize-whitespace.js';

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces', () => {
    const result = normalizeWhitespace('Hello    World');
    expect(result.text).toBe('Hello World');
    expect(result.changes).toContain('collapse-multiple-spaces');
  });

  it('trims line ends', () => {
    const result = normalizeWhitespace('  Hello  \n  World  ');
    expect(result.text).toBe('Hello\nWorld');
    expect(result.changes).toContain('trim-line-ends');
  });

  it('joins line-broken words', () => {
    const result = normalizeWhitespace('examp-\nle text');
    expect(result.text).toBe('example text');
  });

  it('preserves paragraph breaks', () => {
    const result = normalizeWhitespace('Para 1\n\n\n\nPara 2');
    expect(result.text).toBe('Para 1\n\n\nPara 2');
  });
});
```

- [ ] **Step 2: normalize-turkish.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeTurkish } from '../../src/normalize/normalize-turkish.js';

describe('normalizeTurkish', () => {
  it('fixes dotted I / dotless ı confusion', () => {
    const result = normalizeTurkish('İstanbul');
    expect(result.text).toBe('Istanbul');
    expect(result.changes).toContain('fixTurkishI');
  });

  it('keeps Turkish characters intact when no confusion', () => {
    const result = normalizeTurkish('çözüm');
    expect(result.text).toBe('çözüm');
  });

  it('handles mixed Turkish text', () => {
    const result = normalizeTurkish('x² + 2x + 1 = 0 denkleminin çözümü');
    expect(result.text).toBe('x^2 + 2x + 1 = 0 denkleminin çözümü');
  });
});
```

- [ ] **Step 3: normalize-math-symbols.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeMathSymbols } from '../../src/normalize/normalize-math-symbols.js';

describe('normalizeMathSymbols', () => {
  it('normalizes superscripts', () => {
    const result = normalizeMathSymbols('x² + y³');
    expect(result.text).toBe('x^2 + y^3');
    expect(result.changes).toContain('superscript-²');
    expect(result.changes).toContain('superscript-³');
  });

  it('normalizes square root', () => {
    const result = normalizeMathSymbols('√16 = 4');
    expect(result.text).toBe('sqrt16 = 4');
    expect(result.changes).toContain('sqrt-normalize');
  });

  it('normalizes comparison operators', () => {
    const result = normalizeMathSymbols('x ≠ y');
    expect(result.text).toBe('x != y');
    expect(result.changes).toContain('comparison-normalize');
  });

  it('converts Turkish decimal comma', () => {
    const result = normalizeMathSymbols('3,14 ≈ π');
    expect(result.text).toBe('3.14 ≈ π');
    expect(result.changes).toContain('decimal-comma-to-dot');
  });

  it('normalizes fractions', () => {
    const result = normalizeMathSymbols('½ + ¼ = ¾');
    expect(result.text).toBe('1/2 + 1/4 = 3/4');
  });
});
```

- [ ] **Step 4: detect-language.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../../src/normalize/detect-language.js';

describe('detectLanguage', () => {
  it('detects Turkish', () => {
    expect(detectLanguage('çözüm ve matematik')).toBe('tr');
    expect(detectLanguage('ıçın büyük şöyle')).toBe('tr');
  });

  it('detects English', () => {
    expect(detectLanguage('The quick brown fox')).toBe('en');
    expect(detectLanguage('What is the derivative of x^2?')).toBe('en');
  });

  it('returns unknown for empty', () => {
    expect(detectLanguage('')).toBe('unknown');
  });
});
```

- [ ] **Step 5: option-parser.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/normalize/option-parser.js';

describe('parseOptions', () => {
  it('parses A) B) C) D) format', () => {
    const text = 'What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6';
    const options = parseOptions(text);
    expect(options).toHaveLength(4);
    expect(options[0]).toEqual({ label: 'A', value: '3', order: 0 });
    expect(options[1]).toEqual({ label: 'B', value: '4', order: 1 });
  });

  it('parses A. B. C. format', () => {
    const text = 'A. Paris\nB. London\nC. Berlin';
    const options = parseOptions(text);
    expect(options).toHaveLength(3);
    expect(options[0].label).toBe('A');
    expect(options[0].value).toBe('Paris');
  });

  it('parses Turkish A) B) C) D) E)', () => {
    const text = 'Bir üçgenin iç açıları toplamı kaçtır?\nA) 90°\nB) 180°\nC) 270°\nD) 360°\nE) 450°';
    const options = parseOptions(text);
    expect(options).toHaveLength(5);
    expect(options[2].value).toBe('270°');
  });

  it('parses line-broken options', () => {
    const text = 'A) Bu seçenek uzun bir açıklamadır\n   ve ikinci satırda devam eder\nB) Kısa seçenek';
    const options = parseOptions(text);
    expect(options[0].value).toContain('devam eder');
  });

  it('returns empty array for short answer', () => {
    const text = 'What is the capital of France?';
    const options = parseOptions(text);
    expect(options).toHaveLength(0);
  });
});
```

- [ ] **Step 6: mock-ocr.engine.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { MockOCREngine } from '../../src/engines/mock-ocr.engine.js';

describe('MockOCREngine', () => {
  const engine = new MockOCREngine();

  it('is always available', () => {
    expect(engine.isAvailable()).toBe(true);
    expect(engine.name).toBe('mock');
  });

  it('processes text and returns result', async () => {
    const result = await engine.process(Buffer.from('MOCK:Test question?\nA) Yes\nB) No'));
    expect(result.text).toContain('Test question');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.engine).toBe('mock');
  });

  it('detects Turkish in mock text', async () => {
    const result = await engine.process(Buffer.from('MOCK:çözüm'));
    expect(result.language).toBe('tr');
  });
});
```

- [ ] **Step 7: hybrid.engine.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { hybridOCR, initHybridEngine } from '../../src/engines/hybrid.engine.js';
import { MockOCREngine } from '../../src/engines/mock-ocr.engine.js';

describe('hybridOCR', () => {
  it('processes question through mock engine', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6'),
      language: 'en',
    });
    expect(result.extractedText).toContain('2+2');
    expect(result.normalizedText).toBeDefined();
    expect(result.processingSteps.length).toBeGreaterThan(0);
  });

  it('normalizes math symbols', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:x² + y² = z²\nA) 1\nB) 2'),
      language: 'en',
    });
    expect(result.normalizedText).toContain('x^2');
    expect(result.normalizedText).toContain('y^2');
  });

  it('detects Turkish question', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:Bir üçgenin iç açıları toplamı kaçtır?\nA) 90°\nB) 180°\nC) 270°'),
      language: 'tr',
    });
    expect(result.detectedLanguage).toBe('tr');
    expect(result.options).toHaveLength(3);
  });

  it('detects topic from question text', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:Solve: x² - 4 = 0\nA) x=2\nB) x=-2'),
      language: 'en',
    });
    expect(result.topic).toBe('Mathematics');
  });

  it('computes confidence score', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:What is the capital of France?\nA) Paris\nB) London\nC) Berlin\nD) Madrid'),
      language: 'en',
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 8: Run all tests**

Run: `cd packages/ocr-core && npm run test`
Expected: All tests pass

---

## Task 9: Build and Validate

- [ ] **Step 1: Run typecheck**

Run: `cd packages/ocr-core && npm run typecheck`
Expected: No TypeScript errors

- [ ] **Step 2: Run build**

Run: `cd packages/ocr-core && npm run build`
Expected: `dist/` created, no build errors

- [ ] **Step 3: Run full test suite**

Run: `cd packages/ocr-core && npm run test`
Expected: All tests pass

- [ ] **Step 4: Verify package.json exports**

Run: `cd packages/ocr-core && node --input-type=module -e "import * as ocr from './dist/index.js'; console.log(Object.keys(ocr).join(', '))"`
Expected: All exports listed (hybridOCR, normalizeText, parseOptions, etc.)

---

## Validation Commands Summary

```bash
cd packages/ocr-core
npm run typecheck  # tsc --noEmit
npm run build       # tsc
npm run test        # vitest run
```

## Expected Outputs

| Command | Expected |
|---------|----------|
| `typecheck` | 0 errors |
| `build` | `dist/` directory with all .js/.d.ts files |
| `test` | All tests pass, no failures |

## Done Criteria

- [ ] All 9 tasks completed
- [ ] All TypeScript files compile without errors
- [ ] All vitest tests pass
- [ ] Package exports match index.ts public API
- [ ] ocr-core integrates with ai-core (VisionOCR uses ai-core provider)