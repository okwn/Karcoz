import { describe, it, expect, beforeEach } from 'vitest';
import { MockProvider } from '../src/providers/mock.provider.js';
import { LowConfidenceError, NoQuestionDetectedError } from '../src/errors.js';

describe('mock-provider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
    provider.setMockDelay(10);
  });

  it('extractQuestion returns extraction result', async () => {
    const result = await provider.extractQuestion({ imageBase64: 'test' });
    expect(result.extractedText).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('extractQuestion returns result for non-empty input', async () => {
    const result = await provider.extractQuestion({ imageBase64: 'x'.repeat(100) });
    expect(result.extractedText).toBeTruthy();
    expect(result.questionType).toBeTruthy();
  });

  it('solveQuestion returns solution', async () => {
    const result = await provider.solveQuestion({ question: 'What is 2+2?', questionType: 'multiple_choice', explanationLevel: 'standard' });
    expect(result.shortAnswer).toBeTruthy();
    expect(result.confidenceScore).toBeGreaterThan(0.5);
  });

  it('validateAnswer returns validation result', async () => {
    const result = await provider.validateAnswer({ shortAnswer: 'Paris', question: 'Capital of France?' });
    expect(result.status).toBeTruthy();
  });

  it('validateAnswer detects empty answer', async () => {
    const result = await provider.validateAnswer({ shortAnswer: '', question: 'Capital of France?' });
    expect(result.status).toBe('fail');
    expect(result.issues).toContain('Empty answer');
  });

  it('classifyTopic returns topic', async () => {
    const result = await provider.classifyTopic({ text: 'What is photosynthesis?' });
    expect(result.topic).toBeTruthy();
  });

  it('generatePractice returns questions', async () => {
    const result = await provider.generatePractice({ topic: 'Biology', count: 3 });
    expect(result).toHaveLength(3);
  });
});

describe('chain error handling', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  it('runExtractChain wraps result in ChainResult', async () => {
    const { runExtractChain } = await import('../src/chains/image-to-question.chain.js');
    const result = await runExtractChain(provider, { imageBase64: 'test' });
    expect(result.data).toBeTruthy();
    expect(result.ctx).toBeTruthy();
  });

  it('runExtractChain throws ChainError on provider error', async () => {
    const { runExtractChain } = await import('../src/chains/image-to-question.chain.js');
    const badProvider = { ...provider, extractQuestion: async () => { throw new Error('test'); } } as any;
    await expect(runExtractChain(badProvider, {})).rejects.toThrow();
  });
});