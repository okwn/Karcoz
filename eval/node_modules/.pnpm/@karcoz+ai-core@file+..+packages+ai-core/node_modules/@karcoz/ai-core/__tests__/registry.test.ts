import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProviderRegistry, globalRegistry, initializeProviders } from '../src/provider-registry';
import type { AIProvider, ProviderName, ModelConfig } from '../src/types';

const mockProvider: AIProvider = {
  name: 'mock',
  extractQuestion: async () => ({ data: { extractedText: 'test', normalizedText: 'test', detectedLanguage: 'en', questionType: 'unknown' as const, confidence: 0.9 }, provider: 'mock', latencyMs: 10, confidence: 0.9, cached: false }),
  solveQuestion: async () => ({ data: { shortAnswer: '42', fullExplanation: 'Answer is 42', reasoningSummary: 'Simple', confidenceScore: 0.9, validationStatus: 'not_validated' as const }, provider: 'mock', latencyMs: 10, confidence: 0.9, cached: false }),
  validateAnswer: async () => ({ data: { status: 'pass' as const, issues: [], confidenceAdjustment: 0 }, provider: 'mock', latencyMs: 10, confidence: 0.9, cached: false }),
  classifyTopic: async () => ({ data: { topic: 'Math', confidence: 0.8 }, provider: 'mock', latencyMs: 10, confidence: 0.8, cached: false }),
};

describe('provider-registry', () => {
  beforeEach(() => {
    globalRegistry.providers?.clear?.();
  });

  describe('createProviderRegistry', () => {
    it('starts empty', () => {
      const registry = createProviderRegistry();
      expect(registry.list()).toHaveLength(0);
    });

    it('registers and retrieves a provider', () => {
      const registry = createProviderRegistry();
      registry.register('mock', mockProvider);
      expect(registry.get('mock')).toBe(mockProvider);
    });

    it('returns undefined for unknown provider', () => {
      const registry = createProviderRegistry();
      expect(registry.get('openai')).toBeUndefined();
    });

    it('lists all registered providers', () => {
      const registry = createProviderRegistry();
      registry.register('mock', mockProvider);
      registry.register('openai', { ...mockProvider, name: 'openai' as ProviderName });
      expect(registry.list()).toContain('mock');
      expect(registry.list()).toContain('openai');
    });

    it('getPrimary returns configured provider', () => {
      const registry = createProviderRegistry();
      registry.register('mock', mockProvider);
      const config: ModelConfig = { provider: 'mock', timeoutMs: 30000, maxTokens: 2048, temperature: 0.3, maxImageSizeBytes: 10 * 1024 * 1024, explanationLevel: 'standard', enableValidation: true, enableFallback: false };
      expect(registry.getPrimary(config)).toBe(mockProvider);
    });

    it('getPrimary throws for unknown provider', () => {
      const registry = createProviderRegistry();
      registry.register('mock', mockProvider);
      const config: ModelConfig = { provider: 'openai' as ProviderName, timeoutMs: 30000, maxTokens: 2048, temperature: 0.3, maxImageSizeBytes: 10 * 1024 * 1024, explanationLevel: 'standard', enableValidation: true, enableFallback: false };
      expect(() => registry.getPrimary(config)).toThrow('Provider openai not found');
    });

    it('getFallback returns fallback when enabled', () => {
      const registry = createProviderRegistry();
      registry.register('mock', mockProvider);
      registry.register('openai', { ...mockProvider, name: 'openai' as ProviderName });
      const config: ModelConfig = { provider: 'mock', fallbackProvider: 'openai', timeoutMs: 30000, maxTokens: 2048, temperature: 0.3, maxImageSizeBytes: 10 * 1024 * 1024, explanationLevel: 'standard', enableValidation: true, enableFallback: true };
      expect(registry.getFallback(config)?.name).toBe('openai');
    });

    it('getFallback returns undefined when disabled', () => {
      const registry = createProviderRegistry();
      registry.register('mock', mockProvider);
      const config: ModelConfig = { provider: 'mock', timeoutMs: 30000, maxTokens: 2048, temperature: 0.3, maxImageSizeBytes: 10 * 1024 * 1024, explanationLevel: 'standard', enableValidation: true, enableFallback: false };
      expect(registry.getFallback(config)).toBeUndefined();
    });
  });
});