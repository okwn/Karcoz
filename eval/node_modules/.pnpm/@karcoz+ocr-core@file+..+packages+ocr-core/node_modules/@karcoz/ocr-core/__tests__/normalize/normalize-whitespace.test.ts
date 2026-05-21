import { describe, it, expect } from 'vitest';
import { normalizeWhitespace } from '../../src/normalize/normalize-whitespace.js';

describe('normalizeWhitespace', () => {
  it('collapses multiple spaces', () => {
    const result = normalizeWhitespace('Hello    World');
    expect(result.text).toBe('Hello World');
    expect(result.changes).toContain('collapse-multiple-spaces');
  });

  it('trims line ends', () => {
    const result = normalizeWhitespace('  Hello  \n  World  ');
    expect(result.text).toBe('Hello\nWorld');
    expect(result.changes).toContain('trim-line-ends');
  });

  it('joins line-broken words', () => {
    const result = normalizeWhitespace('examp-\nle text');
    expect(result.text).toBe('example text');
  });

  it('preserves paragraph breaks', () => {
    const result = normalizeWhitespace('Para 1\n\n\n\nPara 2');
    expect(result.text).toBe('Para 1\n\nPara 2');
  });
});