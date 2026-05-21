import type { SolverQuestion, SolverResult } from '../types.js';
/**
 * Simple algebra solver — handles linear equations with one unknown.
 * e.g., "3x + 7 = 22", "5x - 3 = 17", "x/4 + 2 = 5"
 */
export declare function solveSimpleAlgebra(question: SolverQuestion): SolverResult;
