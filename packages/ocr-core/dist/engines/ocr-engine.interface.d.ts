import { OCRTextResult } from '../types.js';
export interface OCREngine {
    name: string;
    process(image: Buffer | string): Promise<OCRTextResult>;
    isAvailable(): boolean;
}
//# sourceMappingURL=ocr-engine.interface.d.ts.map