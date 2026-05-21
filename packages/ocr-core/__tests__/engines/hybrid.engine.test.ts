import { describe, it, expect } from 'vitest';
import { hybridOCR, initHybridEngine } from '../../src/engines/hybrid.engine.js';
import { MockOCREngine } from '../../src/engines/mock-ocr.engine.js';

describe('hybridOCR', () => {
  it('processes question through mock engine', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:What is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6'),
      language: 'en',
    });
    expect(result.extractedText).toContain('2+2');
    expect(result.normalizedText).toBeDefined();
    expect(result.processingSteps.length).toBeGreaterThan(0);
  });

  it('normalizes math symbols', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:x² + y² = z²\nA) 1\nB) 2'),
      language: 'en',
    });
    expect(result.normalizedText).toContain('x^2');
    expect(result.normalizedText).toContain('y^2');
  });

  it('detects Turkish question', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:Bir üçgenin iç açıları toplamı kaçtır?\nA) 90°\nB) 180°\nC) 270°'),
      language: 'tr',
    });
    expect(result.detectedLanguage).toBe('tr');
    expect(result.options).toHaveLength(3);
  });

  it('detects topic from question text', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:Solve: x² - 4 = 0\nA) x=2\nB) x=-2'),
      language: 'en',
    });
    expect(result.topic).toBe('Mathematics');
  });

  it('computes confidence score', async () => {
    initHybridEngine({ enableMockFallback: true });
    const result = await hybridOCR({
      image: Buffer.from('MOCK:What is the capital of France?\nA) Paris\nB) London\nC) Berlin\nD) Madrid'),
      language: 'en',
    });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});