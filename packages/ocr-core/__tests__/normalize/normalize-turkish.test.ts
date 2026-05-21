import { describe, it, expect } from 'vitest';
import { normalizeTurkish } from '../../src/normalize/normalize-turkish.js';

describe('normalizeTurkish', () => {
  it('fixes dotted I / dotless ı confusion', () => {
    const result = normalizeTurkish('İstanbul');
    expect(result.text).toBe('Istanbul');
    expect(result.changes).toContain('fixTurkishI');
  });

  it('keeps Turkish characters intact when no confusion', () => {
    const result = normalizeTurkish('çözüm');
    expect(result.text).toBe('çözüm');
  });

  it('handles mixed Turkish text', () => {
    const result = normalizeTurkish('x² + 2x + 1 = 0 denkleminin çözümü');
    expect(result.text).toBe('x^2 + 2x + 1 = 0 denkleminin çözümü');
  });
});