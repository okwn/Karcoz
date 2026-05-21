import type { SolverQuestion, SolverResult } from '../types.js';
/**
 * Arithmetic solver — handles basic operations, equations.
 * Supports: +, -, *, /, ^, sqrt
 * Turkish decimal comma → period
 */
export declare function solveArithmetic(question: SolverQuestion): SolverResult;
