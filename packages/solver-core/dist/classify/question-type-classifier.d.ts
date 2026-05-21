import type { SolverQuestion, QuestionTypePrediction } from '../types.js';
/**
 * Classify question type from text patterns.
 * Order matters: check more specific patterns (algebra, sequence) before general ones (arithmetic).
 */
export declare function classifyQuestionType(question: SolverQuestion): QuestionTypePrediction;
