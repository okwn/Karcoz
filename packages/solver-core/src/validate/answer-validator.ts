import type { SolverResult } from '../types.js';

/**
 * Validate that the solver's answer is reasonable.
 * Checks: non-empty, within expected bounds, format correctness.
 */
export function validateAnswer(result: SolverResult, expectedFormat?: 'number' | 'letter' | 'text'): {
  status: 'pass' | 'fail' | 'low_confidence';
  issues: string[];
  confidenceAdjustment: number;
} {
  const issues: string[] = [];
  let adjustment = 0;

  if (!result.shortAnswer || result.shortAnswer === '?' || result.shortAnswer.trim() === '') {
    issues.push('Boş veya belirsiz cevap');
    adjustment -= 0.3;
    return { status: 'low_confidence', issues, confidenceAdjustment: adjustment };
  }

  if (result.confidenceScore < 0.3) {
    issues.push('Düşük güvenilirlik puanı');
    adjustment -= 0.2;
  }

  // Format-specific validation
  if (expectedFormat === 'number') {
    const numeric = parseFloat(result.shortAnswer.replace(',', '.'));
    if (isNaN(numeric)) {
      issues.push('Beklenen sayısal cevap değil');
      adjustment -= 0.3;
    } else if (!isFinite(numeric)) {
      issues.push('Sonsuz veya geçersiz sayı');
      adjustment -= 0.4;
    }
  } else if (expectedFormat === 'letter') {
    if (!/^[A-Ea-e]$/.test(result.shortAnswer.trim())) {
      // May be a letter index like "A" or "B"
      if (!/^[A-Ea-e]\s*[-.)]?\s*.+/.test(result.shortAnswer)) {
        // It's fine - a letter answer
      }
    }
  }

  // Low-confidence solvers get penalization
  if (result.solverUsed === 'ai_fallback' && result.confidenceScore > 0.8) {
    // AI might be overconfident - slightly reduce
    adjustment -= 0.05;
    issues.push('AI güvenilirlik fazla yüksek olabilir');
  }

  const finalStatus = issues.length === 0
    ? 'pass'
    : issues.some(i => i.includes('Düşük') || i.includes('Belirsiz'))
      ? 'low_confidence'
      : 'fail';

  return {
    status: finalStatus,
    issues,
    confidenceAdjustment: adjustment,
  };
}