import { describe, it, expect } from 'vitest';
import { normalizeMathSymbols } from '../../src/normalize/normalize-math-symbols.js';

describe('normalizeMathSymbols', () => {
  it('normalizes superscripts', () => {
    const result = normalizeMathSymbols('x² + y³');
    expect(result.text).toBe('x^2 + y^3');
    expect(result.changes).toContain('superscript-²');
    expect(result.changes).toContain('superscript-³');
  });

  it('normalizes square root', () => {
    const result = normalizeMathSymbols('√16 = 4');
    expect(result.text).toBe('sqrt16 = 4');
    expect(result.changes).toContain('sqrt-normalize');
  });

  it('normalizes comparison operators', () => {
    const result = normalizeMathSymbols('x ≠ y');
    expect(result.text).toBe('x != y');
    expect(result.changes).toContain('comparison-normalize');
  });

  it('converts Turkish decimal comma', () => {
    const result = normalizeMathSymbols('3,14 ≈ π');
    expect(result.text).toBe('3.14 ≈ π');
    expect(result.changes).toContain('decimal-comma-to-dot');
  });

  it('normalizes fractions', () => {
    const result = normalizeMathSymbols('½ + ¼ = ¾');
    expect(result.text).toBe('1/2 + 1/4 = 3/4');
  });
});