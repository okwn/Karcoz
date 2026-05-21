// Re-export all public APIs
export type { OCRInput, OCRResult, OCRTextResult, BoundingBox } from './types.js';

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