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
export declare function computeConfidence(input: ConfidenceInput): number;
/**
 * Rate extraction quality based on text characteristics.
 */
export declare function assessTextQuality(text: string): number;
//# sourceMappingURL=ocr-confidence.d.ts.map