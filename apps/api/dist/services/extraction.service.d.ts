export interface ExtractionResult {
    extractedText: string;
    normalizedText: string;
    detectedLanguage: string | undefined;
    questionType: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'matching' | 'ordering' | 'unknown';
    topic: string | undefined;
    options: {
        label: string;
        value: string;
        order: number;
    }[] | undefined;
    confidence: number;
}
export declare function extractFromImage(imageBase64: string): Promise<ExtractionResult>;
export declare function extractFromText(text: string): Promise<ExtractionResult>;
//# sourceMappingURL=extraction.service.d.ts.map