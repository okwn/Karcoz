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
    const hasMath = /[²³√∑÷≠≠≤≥]/i.test(imageStr);
    const confidence = hasTurkish || hasMath ? 0.72 : 0.80;

    const text = imageStr.startsWith('MOCK:')
      ? imageStr.slice(5)
      : 'What is the capital of France?\nA) Paris\nB) London\nC) Berlin\nD) Madrid';

    const detectedLang = detectLanguage(text);
    const language = detectedLang === 'unknown' ? undefined : detectedLang;

    return {
      text,
      confidence,
      language,
      processingTimeMs: Date.now() - start,
      engine: 'mock',
    };
  }
}