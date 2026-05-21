import type { OCREngine, OCRTextResult } from '../types.js';
export declare class VisionOCREngine implements OCREngine {
    name: string;
    private provider;
    constructor(provider: any);
    isAvailable(): boolean;
    process(image: Buffer | string): Promise<OCRTextResult>;
}
//# sourceMappingURL=vision-ocr.engine.d.ts.map