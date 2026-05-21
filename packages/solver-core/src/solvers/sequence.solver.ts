import type { SolverQuestion, SolverResult } from '../types.js';
import { formatExplanation } from '../explain/explanation-formatter.js';

/**
 * Sequence solver — detects patterns in number sequences.
 * Finds next term in: arithmetic, geometric, square, cube sequences.
 */
export function solveSequence(question: SolverQuestion): SolverResult {
  const text = question.normalizedText;
  const lang = question.language ?? 'tr';

  // Find number sequence in text
  const numberMatch = text.match(/[\d.,]+(?:\s*,\s*[\d.,]+){2,}/);
  if (!numberMatch) {
    return {
      shortAnswer: '?',
      confidenceScore: 0.3,
      solverUsed: 'sequence',
      fullExplanation: 'Dizi bulunamadı.',
      reasoningSummary: 'Dizi bulunamadı.',
      validationStatus: 'low_confidence',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.3,
        validationConfidence: 0,
        finalConfidence: 0.3,
      },
    };
  }

  const numStr = numberMatch[0];
  const numbers = numStr.split(/[,\s]+/).map(s => parseFloat(s.replace(',', '.'))).filter(n => !isNaN(n));

  if (numbers.length < 3) {
    return {
      shortAnswer: '?',
      confidenceScore: 0.3,
      solverUsed: 'sequence',
      fullExplanation: 'Yetersiz dizi elemanı.',
      reasoningSummary: 'Yetersiz dizi elemanı.',
      validationStatus: 'low_confidence',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: 0.3,
        validationConfidence: 0,
        finalConfidence: 0.3,
      },
    };
  }

  let nextTerm: number | null = null;
  let seqType = 'unknown';
  let confidence = 0.7;

  // Arithmetic sequence: difference is constant
  const diffs = numbers.slice(1).map((n, i) => n - numbers[i]);
  if (diffs.every(d => Math.abs(d - diffs[0]) < 0.001)) {
    const d = diffs[0];
    nextTerm = numbers[numbers.length - 1] + d;
    seqType = 'arith';
    confidence = 0.95;
  }

  // Geometric sequence: ratio is constant
  if (nextTerm === null && numbers[0] !== 0) {
    const ratios = numbers.slice(1).map((n, i) => n / numbers[i]);
    if (ratios.every(r => Math.abs(r - ratios[0]) < 0.001)) {
      const r = ratios[0];
      nextTerm = numbers[numbers.length - 1] * r;
      seqType = 'geom';
      confidence = 0.95;
    }
  }

  // Square sequence: 1, 4, 9, 16 → n²
  if (nextTerm === null) {
    const squares = numbers.map((n, i) => Math.pow(i + 1, 2));
    if (numbers.every((n, i) => Math.abs(n - squares[i]) < 0.001)) {
      nextTerm = Math.pow(numbers.length + 1, 2);
      seqType = 'square';
      confidence = 0.9;
    }
  }

  // Cube sequence: 1, 8, 27, 64 → n³
  if (nextTerm === null) {
    const cubes = numbers.map((n, i) => Math.pow(i + 1, 3));
    if (numbers.every((n, i) => Math.abs(n - cubes[i]) < 0.001)) {
      nextTerm = Math.pow(numbers.length + 1, 3);
      seqType = 'cube';
      confidence = 0.9;
    }
  }

  // Fibonacci-like: each term is sum of previous two
  if (nextTerm === null && numbers.length >= 4) {
    let isFibLike = true;
    for (let i = 2; i < numbers.length; i++) {
      if (Math.abs(numbers[i] - (numbers[i-1] + numbers[i-2])) > 0.001) {
        isFibLike = false;
        break;
      }
    }
    if (isFibLike) {
      nextTerm = numbers[numbers.length - 1] + numbers[numbers.length - 2];
      seqType = 'fib';
      confidence = 0.85;
    }
  }

  if (nextTerm !== null) {
    const shortAnswer = Number.isInteger(nextTerm)
      ? String(nextTerm)
      : nextTerm.toFixed(3).replace(/\.?0+$/, '');

    const seqTypeNames: Record<string, string> = {
      arith: 'aritmetik',
      geom: 'geometrik',
      square: 'kare',
      cube: 'küp',
      fib: 'fibonacci',
    };

    return {
      shortAnswer,
      confidenceScore: confidence,
      solverUsed: 'sequence',
      fullExplanation: formatExplanation('sequence', lang, {
        sequence: numbers.join(', '),
        nextTerm: shortAnswer,
        type: seqTypeNames[seqType] ?? seqType,
      }),
      reasoningSummary: `${seqTypeNames[seqType] ?? seqType} dizi → bir sonraki: ${shortAnswer}`,
      validationStatus: 'not_validated',
      confidenceBreakdown: {
        ocrConfidence: question.ocrConfidence ?? 0.8,
        solverConfidence: confidence,
        validationConfidence: 0,
        finalConfidence: confidence,
      },
    };
  }

  return {
    shortAnswer: '?',
    confidenceScore: 0.3,
    solverUsed: 'sequence',
    fullExplanation: 'Dizi kalıbı tanımlanamadı.',
    reasoningSummary: 'Dizi kalıbı tanımlanamadı.',
    validationStatus: 'low_confidence',
    confidenceBreakdown: {
      ocrConfidence: question.ocrConfidence ?? 0.8,
      solverConfidence: 0.3,
      validationConfidence: 0,
      finalConfidence: 0.3,
    },
  };
}