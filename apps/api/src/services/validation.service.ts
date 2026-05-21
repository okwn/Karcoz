export type ValidationStatus = 'pass' | 'fail' | 'low_confidence' | 'not_validated';

export interface ValidationResult {
  status: ValidationStatus;
  issues: string[];
  confidenceAdjustment: number;
}

export async function validateSolution(
  shortAnswer: string,
  extractedText: string,
  extractedConfidence: number
): Promise<ValidationResult> {
  await new Promise((r) => setTimeout(r, 100));

  const issues: string[] = [];
  let confidenceAdjustment = 0;

  if (!shortAnswer || shortAnswer.trim().length === 0) {
    issues.push('Empty answer provided');
    return {
      status: 'fail',
      issues,
      confidenceAdjustment: -0.3,
    };
  }

  if (extractedConfidence < 0.5) {
    issues.push('Low extraction confidence');
    confidenceAdjustment -= 0.1;
  }

  if (shortAnswer.length > 5000) {
    issues.push('Answer exceeds reasonable length');
  }

  if (extractedText.length > 0 && shortAnswer.length < extractedText.length * 0.1) {
    issues.push('Answer seems disproportionately short compared to question');
    confidenceAdjustment -= 0.05;
  }

  const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(shortAnswer);
  if (hasInvalidChars) {
    issues.push('Answer contains control characters');
  }

  if (issues.length === 0) {
    return {
      status: 'pass',
      issues: [],
      confidenceAdjustment: 0,
    };
  }

  if (confidenceAdjustment <= -0.2) {
    return {
      status: 'low_confidence',
      issues,
      confidenceAdjustment,
    };
  }

  return {
    status: 'not_validated',
    issues,
    confidenceAdjustment,
  };
}