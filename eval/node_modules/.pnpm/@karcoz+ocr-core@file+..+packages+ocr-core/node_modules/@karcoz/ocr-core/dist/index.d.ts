export type { OCRInput, OCRResult, OCRTextResult, BoundingBox } from './types.js';
export { enhanceContrast, denoise, binarize, resizeForOCR } from './preprocess/index.js';
export { normalizeWhitespace, normalizeTurkish, normalizeMathSymbols, detectLanguage, parseOptions, normalizeText, } from './normalize/index.js';
export { computeConfidence, assessTextQuality } from './confidence/ocr-confidence.js';
export type { OCREngine } from './engines/ocr-engine.interface.js';
export { MockOCREngine } from './engines/mock-ocr.engine.js';
export { VisionOCREngine } from './engines/vision-ocr.engine.js';
export { hybridOCR, initHybridEngine } from './engines/hybrid.engine.js';
//# sourceMappingURL=index.d.ts.map