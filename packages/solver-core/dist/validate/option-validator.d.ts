import type { SolverOption } from '../types.js';
/**
 * Validate that a selected option (by label/index) matches the answer.
 * Used for multiple choice questions where answer is a letter label (A/B/C/D).
 */
export declare function validateOption(selectedOption: number | undefined, shortAnswer: string, options: SolverOption[]): {
    status: 'pass' | 'fail' | 'low_confidence';
    issues: string[];
    confidenceAdjustment: number;
};
