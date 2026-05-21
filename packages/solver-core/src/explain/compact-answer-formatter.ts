import type { SolverOption } from '../types.js';

/**
 * Format a compact answer for quick display.
 * Returns the selected option's label and value.
 */
export function formatCompactAnswer(
  shortAnswer: string,
  selectedOption: number | undefined,
  options: SolverOption[] | undefined
): string {
  if (selectedOption !== undefined && options && options[selectedOption]) {
    const opt = options[selectedOption];
    return `${opt.label}) ${opt.value}`;
  }

  // Try to match shortAnswer to an option label
  if (options) {
    const matched = options.find(
      o => o.label.toUpperCase() === shortAnswer.toUpperCase() ||
           o.value.toLowerCase().includes(shortAnswer.toLowerCase())
    );
    if (matched) {
      return `${matched.label}) ${matched.value}`;
    }
  }

  return shortAnswer;
}