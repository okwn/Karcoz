import type { SolverQuestion, SolverResult } from '../types.js';
import { formatExplanation } from '../explain/explanation-formatter.js';

/**
 * Ratio solver — handles "a:b = c:d", "oran", "doğru orantı", "ters orantı"
 */
export function solveRatio(question: SolverQuestion): SolverResult {
  const text = question.normalizedText;
  const lang = question.language ?? 'tr';

  // Pattern: "a:b = c:d" → find missing value
  // Turkish: "a/b = c/x" format
  const ratioPattern = /(\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?)\s*=\s*(\d+(?:[.,]\d+)?)\s*:\s*(\d+(?:[.,]\d+)?|[xXyY?])/g;
  let match;
  let found = false;
  let result: { a: number; b: number; c: number; d: number; missing: 'd' | 'a' | 'b' | 'c'; value: number } | null = null;

  while ((match = ratioPattern.exec(text)) !== null) {
    const [full, aStr, bStr, cStr, dStr] = match;
    const a = parseFloat(aStr.replace(',', '.'));
    const b = parseFloat(bStr.replace(',', '.'));
    const c = parseFloat(cStr.replace(',', '.'));
    const dRaw = dStr.replace(',', '.');

    if (dRaw === '?' || dRaw === 'x' || dRaw === 'X' || dRaw === 'y' || dRaw === 'Y') {
      // d is missing: a/b = c/x → x = (b*c)/a
      const value = (b * c) / a;
      result = { a, b, c, d: value, missing: 'd', value };
      found = true;
    } else if (bStr === '?' || bStr === 'x' || bStr === 'X') {
      // b is missing: a/x = c/d → x = (a*d)/c
      const d = parseFloat(dRaw);
      const value = (a * d) / c;
      result = { a, b: value, c, d, missing: 'b', value };
      found = true;
    }
    break; // only process first match
  }

  if (found && result) {
    const formatted = Number.isInteger(result.value)
      ? String(result.value)
      : result.value.toFixed(3).replace(/\.?0+$/, '');
    return {
      shortAnswer: formatted,
      confidenceScore: 0.9,
      solverUsed: 'ratio',
      fullExplanation: formatExplanation('ratio', lang, {
        ratio: `${result.a}:${result.b} = ${result.c}:${result.d}`,
        missing: result.missing,
        value: formatted,
      }),
      reasoningSummary: `${result.a}:${result.b} = ${result.c}:${formatted} → ${formatted}`,
      validationStatus: 'not_validated',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.9,
        validationConfidence: 0,
        finalConfidence: 0.9,
      },
    };
  }

  // Pattern: "doğru orantı" or "ters orantı" with values
  const turkishOran = text.match(/(\d+(?:[.,]\d+)?)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(?:do[ğg]ru|ters)\s*oran[tl]?[ıi]?\s*:?\s*(\d+(?:[.,]\d+)?)\s*:?\s*(\d+(?:[.,]\d+)?)/i);
  if (turkishOran) {
    const [, a, b, c, d] = turkishOran.map(s => parseFloat((s as string).replace(',', '.')));
    if (!isNaN(a) && !isNaN(d)) {
      const ratio = a / b;
      const result = c * ratio;
      const shortAnswer = Number.isInteger(result) ? String(result) : result.toFixed(3).replace(/\.?0+$/, '');
      return {
        shortAnswer,
        confidenceScore: 0.85,
        solverUsed: 'ratio',
        fullExplanation: formatExplanation('ratio', lang, { a, b, c, d, result: shortAnswer, type: 'oran' }),
        reasoningSummary: `${a}/${b} = ${shortAnswer}/${d}`,
        validationStatus: 'not_validated',
        confidenceBreakdown: {
          ocrConfidence: question.ocrConfidence ?? 0.8,
          solverConfidence: 0.85,
          validationConfidence: 0,
          finalConfidence: 0.85,
        },
      };
    }
  }

  return {
    shortAnswer: '?',
    confidenceScore: 0.3,
    solverUsed: 'ratio',
    fullExplanation: 'Oran hesaplanamadı.',
    reasoningSummary: 'Oran hesaplanamadı.',
    validationStatus: 'low_confidence',
    confidenceBreakdown: {
      ocrConfidence: question.ocrConfidence ?? 0.8,
      solverConfidence: 0.3,
      validationConfidence: 0,
      finalConfidence: 0.3,
    },
  };
}