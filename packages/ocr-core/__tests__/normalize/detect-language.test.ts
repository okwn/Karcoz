import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../../src/normalize/detect-language.js';

describe('detectLanguage', () => {
  it('detects Turkish', () => {
    expect(detectLanguage('çözüm ve matematik')).toBe('tr');
    expect(detectLanguage('ıçın büyük şöyle')).toBe('tr');
  });

  it('detects English', () => {
    expect(detectLanguage('The quick brown fox')).toBe('en');
    expect(detectLanguage('What is the derivative of x^2?')).toBe('en');
  });

  it('detects English with minimal Turkish chars', () => {
    expect(detectLanguage('The solution with çözüm word')).toBe('en'); // ~8% Turkish chars < 15%
    expect(detectLanguage('The quick brown fox')).toBe('en');
  });

  it('returns unknown for empty', () => {
    expect(detectLanguage('')).toBe('unknown');
  });
});