import type { SolverResult } from '../types.js';
/**
 * Validate that the solver's answer is reasonable.
 * Checks: non-empty, within expected bounds, format correctness.
 */
export declare function validateAnswer(result: SolverResult, expectedFormat?: 'number' | 'letter' | 'text'): {
    status: 'pass' | 'fail' | 'low_confidence';
    issues: string[];
    confidenceAdjustment: number;
};
