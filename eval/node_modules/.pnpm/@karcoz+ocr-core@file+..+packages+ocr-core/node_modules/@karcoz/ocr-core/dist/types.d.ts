export interface OCRInput {
    image: Buffer | string;
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
    confidence: number;
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
    options?: {
        label: string;
        value: string;
        order: number;
    }[];
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
    targetDPI?: number;
    enhanceContrast?: boolean;
    denoise?: boolean;
    binarize?: boolean;
}
export interface NormalizeResult {
    text: string;
    changes: string[];
}
//# sourceMappingURL=types.d.ts.map