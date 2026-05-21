interface AIProviderLike {
    solveQuestion(input: {
        question: string;
        questionType: string;
        options?: any;
        explanationLevel?: string;
        language?: string;
    }): Promise<{
        shortAnswer: string;
        selectedOption?: number;
        fullExplanation?: string;
        reasoningSummary?: string;
        confidenceScore?: number;
        validationStatus?: string;
    }>;
}
import type { SolverResult, SolveInput, QuestionTypePrediction } from './types.js';
export * from './types.js';
/**
 * Main solver entry point.
 * 1. Classify question type
 * 2. Route to deterministic solver if supported
 * 3. Fall back to AI if allowed and needed
 * 4. Validate and calibrate confidence
 */
export declare function solve(input: SolveInput, aiProvider?: AIProviderLike): Promise<SolverResult>;
/**
 * Classify a question's type without solving it.
 */
export declare function classify(input: {
    text: string;
    options?: {
        label: string;
        value: string;
        order: number;
    }[];
}): QuestionTypePrediction;
/**
 * Check if solver confidence is low enough to warn user.
 */
export declare function needsBetterCrop(confidence: number): boolean;
