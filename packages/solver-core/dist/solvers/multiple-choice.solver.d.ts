import type { SolverQuestion, SolverResult } from '../types.js';
/**
 * Multiple choice solver — validates selected option and picks best answer
 * when options are available. Requires option validation to confirm answer.
 */
export declare function solveMultipleChoice(question: SolverQuestion): SolverResult;
