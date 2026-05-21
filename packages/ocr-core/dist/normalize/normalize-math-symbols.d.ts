import { NormalizeResult } from '../types.js';
/**
 * Normalize mathematical symbols:
 * - Superscripts: x², x³ → x^2, x^3
 * - Roots: √ → sqrt
 * - Fractions: ½ → 1/2
 * - Operators: ÷ → /, ≠ → !=, ≤ → <=, etc.
 * - Turkish decimal comma → period
 */
export declare function normalizeMathSymbols(text: string): NormalizeResult;
//# sourceMappingURL=normalize-math-symbols.d.ts.map