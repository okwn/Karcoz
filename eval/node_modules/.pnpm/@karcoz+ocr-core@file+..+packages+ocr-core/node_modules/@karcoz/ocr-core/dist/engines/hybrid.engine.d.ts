import type { OCRInput, OCRResult } from '../types.js';
export interface HybridOCRConfig {
    visionProvider?: unknown;
    confidenceThreshold?: number;
    enableMockFallback?: boolean;
    /** Enable preprocessing (contrast, denoise, binarize) before VisionOCR */
    preprocessBeforeVision?: boolean;
    /** Skip preprocessing for certain image types (e.g. already clean screenshots) */
    skipPreprocessingForTypes?: string[];
}
export declare function initHybridEngine(config: HybridOCRConfig): void;
export declare function hybridOCR(input: OCRInput): Promise<OCRResult>;
//# sourceMappingURL=hybrid.engine.d.ts.map