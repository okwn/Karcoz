import type { CombinedConfidence } from '../types.js';
/**
 * Combine OCR confidence + solver confidence + validation confidence
 * into a final calibrated confidence score.
 *
 * Calibration principles:
 * - OCR low → overall cannot be high (max 0.6)
 * - Deterministic solver → higher trust (no model uncertainty)
 * - AI fallback → cap at 0.85 to avoid overconfidence
 * - Low validation score → penalize
 * - Known failure patterns → penalize
 */
export declare function calculateConfidence(ocrConfidence: number, solverConfidence: number, validationConfidence?: number): CombinedConfidence;
/**
 * Return a user-facing confidence label.
 */
export declare function confidenceLabel(score: number): 'high' | 'medium' | 'low';
/**
 * Format confidence for display.
 */
export declare function formatConfidence(score: number): string;
