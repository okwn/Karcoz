import { describe, it, expect } from 'vitest';
import { MockOCREngine } from '../../src/engines/mock-ocr.engine.js';

describe('MockOCREngine', () => {
  const engine = new MockOCREngine();

  it('is always available', () => {
    expect(engine.isAvailable()).toBe(true);
    expect(engine.name).toBe('mock');
  });

  it('processes text and returns result', async () => {
    const result = await engine.process(Buffer.from('MOCK:Test question?\nA) Yes\nB) No'));
    expect(result.text).toContain('Test question');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.engine).toBe('mock');
  });

  it('detects Turkish in mock text', async () => {
    const result = await engine.process(Buffer.from('MOCK:çözüm'));
    expect(result.language).toBe('tr');
  });
});