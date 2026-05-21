import type { OCREngine, OCRTextResult } from '../types.js';
export declare class MockOCREngine implements OCREngine {
    name: string;
    isAvailable(): boolean;
    process(image: Buffer | string): Promise<OCRTextResult>;
}
//# sourceMappingURL=mock-ocr.engine.d.ts.map