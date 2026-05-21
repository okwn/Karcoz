import type { SolverQuestion, SolverResult } from '../types.js';
import { formatExplanation } from '../explain/explanation-formatter.js';

/**
 * Percentage solver — handles "X percent of Y is what?", "what is X% of Y?"
 */
export function solvePercentage(question: SolverQuestion): SolverResult {
  const text = question.normalizedText;
  const lang = question.language ?? 'tr';

  // Turkish patterns
  // "X%'i Y'nin kaçıdır?" → X% of Y = ?
  // "Y'nin X%'i kaçtır?" → X% of Y = ?
  // "X sayısının Y%'si kaçtır?" → X's Y% = ?

  // Pattern 1: "X%'i Y'nin kaçıdır?" → X% of Y
  let match = text.match(/(\d+(?:[.,]\d+)?)\s*%[\s]*['iı]?\s*(?:Y)?['n]?nin\s*ka[çcı]/i);
  if (match) {
    const percent = parseFloat(match[1].replace(',', '.'));
    const yMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:['n]?nin|say[ıi]s[ıi]n[ıi]n)/);
    if (yMatch) {
      const base = parseFloat(yMatch[1].replace(',', '.'));
      const result = (percent / 100) * base;
      const shortAnswer = formatNumber(result);
      return {
        shortAnswer,
        confidenceScore: 0.95,
        solverUsed: 'percentage',
        fullExplanation: formatExplanation('percentage', lang, { percent, base, result: shortAnswer }),
        reasoningSummary: `%${percent} × ${base} = ${shortAnswer}`,
        validationStatus: 'not_validated',
        confidenceBreakdown: {
          ocrConfidence: question.ocrConfidence ?? 0.8,
          solverConfidence: 0.95,
          validationConfidence: 0,
          finalConfidence: 0.95,
        },
      };
    }
  }

  // Pattern 2: "Y'nin X%'si kaçtır?" → X% of Y
  match = text.match(/(?:Y|y)['n]?nin\s*(\d+(?:[.,]\d+)?)\s*%[\s]*['s]?[şs]?[ıi]?\s*ka[çc]/i);
  if (match) {
    const percent = parseFloat(match[1].replace(',', '.'));
    const baseMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:['n]?nin)/);
    if (baseMatch) {
      const base = parseFloat(baseMatch[1].replace(',', '.'));
      const result = (percent / 100) * base;
      const shortAnswer = formatNumber(result);
      return {
        shortAnswer,
        confidenceScore: 0.95,
        solverUsed: 'percentage',
        fullExplanation: formatExplanation('percentage', lang, { percent, base, result: shortAnswer }),
        reasoningSummary: `%${percent} × ${base} = ${shortAnswer}`,
        validationStatus: 'not_validated',
        confidenceBreakdown: {
          ocrConfidence: question.ocrConfidence ?? 0.8,
          solverConfidence: 0.95,
          validationConfidence: 0,
          finalConfidence: 0.95,
        },
      };
    }
  }

  // Pattern 3: "X sayısının Y%'si kaçtır?"
  match = text.match(/(\d+(?:[.,]\d+)?)\s*say[ıi]s[ıi]n[ıi]n\s*(\d+(?:[.,]\d+)?)\s*%[\s]*['s]?[şsıi]?\s*ka[çc]/i);
  if (match) {
    const base = parseFloat(match[1].replace(',', '.'));
    const percent = parseFloat(match[2].replace(',', '.'));
    const result = (percent / 100) * base;
    const shortAnswer = formatNumber(result);
    return {
      shortAnswer,
      confidenceScore: 0.95,
      solverUsed: 'percentage',
      fullExplanation: formatExplanation('percentage', lang, { base, percent, result: shortAnswer }),
      reasoningSummary: `${base}'nin %${percent}'si = ${shortAnswer}`,
      validationStatus: 'not_validated',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.95,
        validationConfidence: 0,
        finalConfidence: 0.95,
      },
    };
  }

  // Pattern 4: "%15 indirim" / "indirim %15" → compute discount amount
  match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:TL|₺|lira)?\s*%?\s*(\d+(?:[.,]\d+)?)\s*(?:indirim|kar|zarar)/i);
  if (match) {
    const amount = parseFloat(match[1].replace(',', '.'));
    const percent = parseFloat(match[2].replace(',', '.'));
    const result = (percent / 100) * amount;
    const shortAnswer = formatNumber(result);
    return {
      shortAnswer,
      confidenceScore: 0.9,
      solverUsed: 'percentage',
      fullExplanation: formatExplanation('percentage', lang, { base: amount, percent, result: shortAnswer, type: 'discount' }),
      reasoningSummary: `%${percent} × ${amount} = ${shortAnswer}`,
      validationStatus: 'not_validated',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.9,
        validationConfidence: 0,
        finalConfidence: 0.9,
      },
    };
  }

  return {
    shortAnswer: '?',
    confidenceScore: 0.3,
    solverUsed: 'percentage',
    fullExplanation: 'Yüzde hesaplanamadı.',
    reasoningSummary: 'Yüzde hesaplanamadı.',
    validationStatus: 'low_confidence',
    confidenceBreakdown: {
      ocrConfidence: question.ocrConfidence ?? 0.8,
      solverConfidence: 0.3,
      validationConfidence: 0,
      finalConfidence: 0.3,
    },
  };
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}