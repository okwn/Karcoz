import type { SolverOption } from '../types.js';
/**
 * Format a compact answer for quick display.
 * Returns the selected option's label and value.
 */
export declare function formatCompactAnswer(shortAnswer: string, selectedOption: number | undefined, options: SolverOption[] | undefined): string;
