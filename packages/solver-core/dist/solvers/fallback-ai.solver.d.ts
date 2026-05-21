export interface AIFallbackOptions {
    provider?: {
        solveQuestion(input: any): Promise<any>;
    };
    explanationLevel?: string;
    timeoutMs?: number;
}
/**
 * AI fallback solver — delegates to an AI provider when deterministic solvers fail.
 * This is the last resort before returning low-confidence.
 */
export declare function solveWithAI(question: {
    normalizedText: string;
    options?: unknown;
    language: string | undefined;
    ocrConfidence?: number;
}, options?: AIFallbackOptions): Promise<{
    shortAnswer: string;
    selectedOption?: number;
    fullExplanation: string;
    reasoningSummary: string;
    confidenceScore: number;
    validationStatus: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
    solverUsed: 'ai_fallback';
    confidenceBreakdown?: {
        ocrConfidence: number;
        solverConfidence: number;
        validationConfidence: number;
        finalConfidence: number;
    };
}>;
