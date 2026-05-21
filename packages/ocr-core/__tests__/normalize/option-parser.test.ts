import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/normalize/option-parser.js';

describe('parseOptions', () => {
  it('parses A) B) C) D) format', () => {
    const text = 'What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6';
    const options = parseOptions(text);
    expect(options).toHaveLength(4);
    expect(options[0]).toEqual({ label: 'A', value: '3', order: 0 });
    expect(options[1]).toEqual({ label: 'B', value: '4', order: 1 });
  });

  it('parses A. B. C. format', () => {
    const text = 'A. Paris\nB. London\nC. Berlin';
    const options = parseOptions(text);
    expect(options).toHaveLength(3);
    expect(options[0].label).toBe('A');
    expect(options[0].value).toBe('Paris');
  });

  it('parses Turkish A) B) C) D) E)', () => {
    const text = 'Bir üçgenin iç açıları toplamı kaçtır?\nA) 90°\nB) 180°\nC) 270°\nD) 360°\nE) 450°';
    const options = parseOptions(text);
    expect(options).toHaveLength(5);
    expect(options[2].value).toBe('270°');
  });

  it('parses line-broken options', () => {
    const text = 'A) Bu seçenek uzun bir açıklamadır\n   ve ikinci satırda devam eder\nB) Kısa seçenek';
    const options = parseOptions(text);
    expect(options[0].value).toContain('devam eder');
  });

  it('returns empty array for short answer', () => {
    const text = 'What is the capital of France?';
    const options = parseOptions(text);
    expect(options).toHaveLength(0);
  });
});