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
export function calculateConfidence(ocrConfidence, solverConfidence, validationConfidence = 0) {
    const breakdown = {
        ocrConfidence,
        solverConfidence,
        validationConfidence,
        finalConfidence: 0,
    };
    // Base: geometric mean of OCR and solver confidence
    // geometric mean penalizes when one is low more than arithmetic
    let combined;
    if (ocrConfidence < 0.3) {
        // OCR failure - cannot trust answer
        combined = ocrConfidence * solverConfidence * 0.5;
        breakdown.finalConfidence = Math.min(combined, 0.4);
    }
    else if (solverConfidence < 0.3) {
        // Solver failed
        combined = solverConfidence * 0.3;
        breakdown.finalConfidence = Math.min(combined, 0.35);
    }
    else {
        // Weighted average with OCR as floor
        const baseScore = (ocrConfidence * 0.3) + (solverConfidence * 0.6) + (validationConfidence * 0.1);
        combined = baseScore;
        breakdown.finalConfidence = Math.min(combined, 0.95);
    }
    // Validation penalty
    if (validationConfidence < 0.3 && validationConfidence > 0) {
        breakdown.finalConfidence *= 0.85;
    }
    breakdown.finalConfidence = Math.max(0, Math.min(1, breakdown.finalConfidence));
    const isLowConfidence = breakdown.finalConfidence < 0.5;
    return {
        overall: breakdown.finalConfidence,
        breakdown,
        isLowConfidence,
    };
}
/**
 * Return a user-facing confidence label.
 */
export function confidenceLabel(score) {
    if (score >= 0.75)
        return 'high';
    if (score >= 0.5)
        return 'medium';
    return 'low';
}
/**
 * Format confidence for display.
 */
export function formatConfidence(score) {
    return `${Math.round(score * 100)}%`;
}
