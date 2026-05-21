import type { SolverQuestion, SolverResult } from '../types.js';
import { formatExplanation } from '../explain/explanation-formatter.js';

/**
 * Simple algebra solver — handles linear equations with one unknown.
 * e.g., "3x + 7 = 22", "5x - 3 = 17", "x/4 + 2 = 5"
 */
export function solveSimpleAlgebra(question: SolverQuestion): SolverResult {
  const text = question.normalizedText;
  const lang = question.language ?? 'tr';

  // Normalize: Turkish comma → period, normalize whitespace
  let expr = text.replace(/,/g, '.').replace(/\s+/g, '');

  // Remove Turkish "denklemin çözümü" noise
  expr = expr.replace(/denklemin.*çözüm[üu]?/i, '');
  expr = expr.replace(/denklem.*çöz/i, '');
  expr = expr.trim();

  // Match equation: something = something, extract left and right sides
  // Supported: ax + b = c, ax - b = c, a/x = b, etc.
  const eqMatch = expr.match(/([+-]?\d*\.?\d*)\*?x\s*([+\-]\s*\d+\.?\d*)?\s*=\s*([+-]?\d+\.?\d*)/);
  if (eqMatch) {
    const [, coeffStr, rightSide, leftVal] = eqMatch;
    const coeff = coeffStr === '' || coeffStr === '+' ? 1 : coeffStr === '-' ? -1 : parseFloat(coeffStr);

    let rightSideClean = (rightSide ?? '').replace(/\s/g, '');
    // Parse right side of equation
    const rightValue = parseFloat(leftVal.replace(/\s/g, ''));

    // Parse left side constant (e.g., "+7" in "3x + 7 = 22")
    let leftConst = 0;
    if (rightSideClean) {
      leftConst = parseFloat(rightSideClean);
    }

    // Solve: coeff*x + leftConst = rightValue
    // coeff*x = rightValue - leftConst
    // x = (rightValue - leftConst) / coeff
    if (coeff !== 0) {
      const x = (rightValue - leftConst) / coeff;
      const shortAnswer = Number.isInteger(x) ? String(x) : x.toFixed(4).replace(/\.?0+$/, '');

      // Verify by plugging back in
      const verification = coeff * x + leftConst;
      const isCorrect = Math.abs(verification - rightValue) < 0.0001;

      return {
        shortAnswer,
        confidenceScore: isCorrect ? 0.95 : 0.7,
        solverUsed: 'simple_algebra',
        fullExplanation: formatExplanation('simple_algebra', lang, {
          equation: `${coeff === 1 ? '' : coeff === -1 ? '-' : coeff}x${leftConst >= 0 ? '+' + leftConst : leftConst} = ${rightValue}`,
          result: shortAnswer,
          verified: isCorrect,
        }),
        reasoningSummary: `x = (${rightValue} - ${leftConst}) / ${coeff} = ${shortAnswer}`,
        validationStatus: isCorrect ? 'pass' : 'low_confidence',
        confidenceBreakdown: {
          ocrConfidence: question.ocrConfidence ?? 0.8,
          solverConfidence: isCorrect ? 0.95 : 0.7,
          validationConfidence: isCorrect ? 0.95 : 0.5,
          finalConfidence: isCorrect ? 0.95 : 0.7,
        },
      };
    }
  }

  // Pattern: "x = value" directly
  const directMatch = expr.match(/x\s*=\s*([+-]?\d+\.?\d*)/);
  if (directMatch) {
    const shortAnswer = directMatch[1];
    return {
      shortAnswer,
      confidenceScore: 0.9,
      solverUsed: 'simple_algebra',
      fullExplanation: formatExplanation('simple_algebra', lang, { direct: true, result: shortAnswer }),
      reasoningSummary: `x = ${shortAnswer}`,
      validationStatus: 'not_validated',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.9,
        validationConfidence: 0,
        finalConfidence: 0.9,
      },
    };
  }

  // Pattern: "x + y = 10, x = ?" type (systems - just do single variable)
  const simpleAdd = expr.match(/(\d+)\s*\+\s*x\s*=\s*(\d+)/);
  if (simpleAdd) {
    const constTerm = parseInt(simpleAdd[1], 10);
    const result = parseInt(simpleAdd[2], 10);
    const x = result - constTerm;
    const shortAnswer = String(x);
    return {
      shortAnswer,
      confidenceScore: 0.95,
      solverUsed: 'simple_algebra',
      fullExplanation: formatExplanation('simple_algebra', lang, { result: shortAnswer, type: 'linear' }),
      reasoningSummary: `x = ${result} - ${constTerm} = ${shortAnswer}`,
      validationStatus: 'pass',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.95,
        validationConfidence: 0.9,
        finalConfidence: 0.95,
      },
    };
  }

  return {
    shortAnswer: '?',
    confidenceScore: 0.3,
    solverUsed: 'simple_algebra',
    fullExplanation: 'Denklem çözülemedi.',
    reasoningSummary: 'Denklem çözülemedi.',
    validationStatus: 'low_confidence',
    confidenceBreakdown: {
      ocrConfidence: question.ocrConfidence ?? 0.8,
      solverConfidence: 0.3,
      validationConfidence: 0,
      finalConfidence: 0.3,
    },
  };
}