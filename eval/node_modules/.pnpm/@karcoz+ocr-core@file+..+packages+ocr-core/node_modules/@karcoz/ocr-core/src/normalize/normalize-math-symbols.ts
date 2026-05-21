import { NormalizeResult } from '../types.js';

/**
 * Normalize mathematical symbols:
 * - Superscripts: x², x³ → x^2, x^3
 * - Roots: √ → sqrt
 * - Fractions: ½ → 1/2
 * - Operators: ÷ → /, ≠ → !=, ≤ → <=, etc.
 * - Turkish decimal comma → period
 */
export function normalizeMathSymbols(text: string): NormalizeResult {
  const changes: string[] = [];

  let result = text;

  // Superscript normalization
  const superscripts: [string, string][] = [
    ['²', '^2'], ['³', '^3'], ['⁴', '^4'], ['⁵', '^5'],
    ['⁶', '^6'], ['⁷', '^7'], ['⁸', '^8'], ['⁹', '^9'],
    ['⁰', '^0'], ['¹', '^1'],
  ];
  for (const [sup, norm] of superscripts) {
    if (result.includes(sup)) {
      changes.push(`superscript-${sup}`);
      result = result.split(sup).join(norm);
    }
  }

  // Roots
  if (result.includes('√')) {
    changes.push('sqrt-normalize');
    result = result.replace(/√/g, 'sqrt');
    result = result.replace(/∛/g, 'cbrt');
    result = result.replace(/∜/g, '4rt');
  }

  // Division operators
  if (/[÷∕∣]/.test(result)) {
    changes.push('division-normalize');
    result = result.replace(/÷/g, '/');
    result = result.replace(/∕/g, '/');
    result = result.replace(/∣/g, '|');
  }

  // Comparison operators
  if (/[≠≤≥]/.test(result)) {
    changes.push('comparison-normalize');
    result = result.replace(/≠/g, '!=');
    result = result.replace(/≤/g, '<=');
    result = result.replace(/≥/g, '>=');
  }

  // Implication arrows
  if (/[→⇒]/.test(result)) {
    changes.push('implication-normalize');
    result = result.replace(/→/g, '->');
    result = result.replace(/⇒/g, '=>');
  }

  // Set membership
  if (/[∈∉]/.test(result)) {
    changes.push('membership-normalize');
    result = result.replace(/∈/g, 'in');
    result = result.replace(/∉/g, 'not in');
  }

  // Greek letters common in math
  const greek: [string, string][] = [
    ['∑', 'sum'], ['Σ', 'sum'],
    ['∏', 'product'],
    ['α', 'alpha'], ['β', 'beta'], ['γ', 'gamma'],
    ['δ', 'delta'], ['Δ', 'delta'],
    ['θ', 'theta'], ['λ', 'lambda'], ['μ', 'mu'],
    ['φ', 'phi'], ['ω', 'omega'], ['Ω', 'Omega'],
    ['∞', 'infinity'],
  ];
  // Don't convert π to 'pi' - preserve it
  for (const [sym, name] of greek) {
    if (result.includes(sym)) {
      changes.push(`greek-${sym}`);
      result = result.split(sym).join(name);
    }
  }

  // Fractions
  const fractions: [string, string][] = [
    ['½', '1/2'], ['⅓', '1/3'], ['¼', '1/4'], ['¾', '3/4'],
    ['⅕', '1/5'], ['⅖', '2/5'], ['⅗', '3/5'], ['⅘', '4/5'],
    ['⅙', '1/6'], ['⅚', '5/6'], ['⅛', '1/8'], ['⅜', '3/8'],
    ['⅝', '5/8'], ['⅞', '7/8'],
  ];
  for (const [frac, norm] of fractions) {
    if (result.includes(frac)) {
      changes.push(`fraction-${norm}`);
      result = result.split(frac).join(norm);
    }
  }

  // Turkish decimal comma → period (digit,digit pattern)
  if (result.includes(',')) {
    const decimalComma = result.replace(/(\d),(\d)/g, '$1.$2');
    if (decimalComma !== result) {
      changes.push('decimal-comma-to-dot');
      result = decimalComma;
    }
  }

  return { text: result, changes };
}