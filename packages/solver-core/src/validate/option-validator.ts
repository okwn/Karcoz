import type { SolverOption } from '../types.js';

/**
 * Validate that a selected option (by label/index) matches the answer.
 * Used for multiple choice questions where answer is a letter label (A/B/C/D).
 */
export function validateOption(
  selectedOption: number | undefined,
  shortAnswer: string,
  options: SolverOption[]
): {
  status: 'pass' | 'fail' | 'low_confidence';
  issues: string[];
  confidenceAdjustment: number;
} {
  const issues: string[] = [];
  let adjustment = 0;

  if (selectedOption === undefined) {
    // No option selected - check if answer text matches any option
    const matchedIndex = options.findIndex(
      o => o.value.toLowerCase().trim() === shortAnswer.toLowerCase().trim() ||
           o.label.toLowerCase() === shortAnswer.toUpperCase().trim()
    );

    if (matchedIndex !== -1) {
      return { status: 'pass', issues: [], confidenceAdjustment: 0.05 };
    }

    issues.push('Seçenek seçilmedi ve eşleşme bulunamadı');
    adjustment -= 0.15;
    return { status: 'low_confidence', issues, confidenceAdjustment: adjustment };
  }

  if (selectedOption < 0 || selectedOption >= options.length) {
    issues.push(`Geçersiz seçenek indeksi: ${selectedOption}`);
    adjustment -= 0.3;
    return { status: 'fail', issues, confidenceAdjustment: adjustment };
  }

  const selectedLabel = options[selectedOption]?.label;

  // Check if answer label matches the selected option
  const answerLabel = shortAnswer.toUpperCase().trim();
  if (selectedLabel && answerLabel !== selectedLabel && answerLabel.length === 1) {
    issues.push(`Cevap etiketi (${answerLabel}) seçili seçenekle (${selectedLabel}) uyuşmuyor`);
    adjustment -= 0.2;
    return { status: 'low_confidence', issues, confidenceAdjustment: adjustment };
  }

  return { status: 'pass', issues: [], confidenceAdjustment: 0 };
}