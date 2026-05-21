import type { ExplanationLevel } from '@karcoz/shared';
export interface SolveResult {
    shortAnswer: string;
    selectedOption: number | undefined;
    fullExplanation: string;
    reasoningSummary: string;
    confidenceScore: number;
    validationStatus: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
}
export declare function solveQuestion(extractedText: string, options: {
    label: string;
    value: string;
    order: number;
}[] | undefined, explanationLevel?: ExplanationLevel, mode?: 'compact' | 'full'): Promise<SolveResult>;
//# sourceMappingURL=solution.service.d.ts.map