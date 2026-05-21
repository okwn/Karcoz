import type { OCREngine, OCRTextResult } from '../types.js';
import type { AIProvider } from '@karcoz/ai-core';
import { detectLanguage } from '../normalize/detect-language.js';

export class VisionOCREngine implements OCREngine {
  name = 'vision';
  private provider: AIProvider;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(provider: any) {
    this.provider = provider as AIProvider;
  }

  isAvailable(): boolean {
    return this.provider !== undefined;
  }

  async process(image: Buffer | string): Promise<OCRTextResult> {
    const start = Date.now();

    const imageBase64 = typeof image === 'string'
      ? image
      : image.toString('base64');

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