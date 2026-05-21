import type { ModelConfig, ProviderName, ExplanationLevel } from './types.js';

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'mock',
  fallbackProvider: undefined,
  timeoutMs: 30_000,
  maxTokens: 2048,
  temperature: 0.3,
  maxImageSizeBytes: 10 * 1024 * 1024,
  explanationLevel: 'standard',
  enableValidation: true,
  enableFallback: false,
};

export interface ProviderModel {
  name: string;
  provider: ProviderName;
  model: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const PROVIDER_MODELS: Record<ProviderName, ProviderModel[]> = {
  mock: [
    {
      name: 'mock',
      provider: 'mock',
      model: 'mock',
      maxTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: false,
      costPer1kInput: 0,
      costPer1kOutput: 0,
    },
  ],
  openai: [
    {
      name: 'GPT-4o',
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 128_000,
      supportsVision: true,
      supportsFunctionCalling: true,
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
    },
    {
      name: 'GPT-4o-Mini',
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 128_000,
      supportsVision: true,
      supportsFunctionCalling: true,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
    },
  ],
  openrouter: [
    {
      name: 'Claude 3.5 Sonnet',
      provider: 'openrouter',
      model: 'anthropic/claude-3.5-sonnet',
      maxTokens: 200_000,
      supportsVision: true,
      supportsFunctionCalling: false,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      name: 'GPT-4o',
      provider: 'openrouter',
      model: 'openai/gpt-4o',
      maxTokens: 128_000,
      supportsVision: true,
      supportsFunctionCalling: true,
      costPer1kInput: 0.005,
      costPer1kOutput: 0.015,
    },
  ],
  anthropic: [
    {
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 200_000,
      supportsVision: true,
      supportsFunctionCalling: false,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      model: 'claude-3-opus-20240229',
      maxTokens: 200_000,
      supportsVision: true,
      supportsFunctionCalling: false,
      costPer1kInput: 0.015,
      costPer1kOutput: 0.075,
    },
  ],
  gemini: [
    {
      name: 'Gemini 1.5 Flash',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      maxTokens: 128_000,
      supportsVision: true,
      supportsFunctionCalling: false,
      costPer1kInput: 0.000075,
      costPer1kOutput: 0.0003,
    },
    {
      name: 'Gemini 1.5 Pro',
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      maxTokens: 128_000,
      supportsVision: true,
      supportsFunctionCalling: false,
      costPer1kInput: 0.00125,
      costPer1kOutput: 0.005,
    },
  ],
};

export function getProviderModels(provider: ProviderName): ProviderModel[] {
  return PROVIDER_MODELS[provider] ?? [];
}

export function getDefaultModel(provider: ProviderName): ProviderModel | undefined {
  const models = PROVIDER_MODELS[provider];
  return models?.[0];
}

export function mergeConfig(
  partial?: Partial<ModelConfig>
): ModelConfig {
  return {
    ...DEFAULT_MODEL_CONFIG,
    ...partial,
  };
}