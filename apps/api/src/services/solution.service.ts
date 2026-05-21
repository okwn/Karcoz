import type { ExplanationLevel } from '@karcoz/shared';
import { getConfiguredProviderName, globalRegistry } from '@karcoz/ai-core';
import type { AIProvider } from '@karcoz/ai-core';
import { AIProviderError } from '@karcoz/ai-core';

export interface SolveResult {
  shortAnswer: string;
  selectedOption: number | undefined;
  fullExplanation: string;
  reasoningSummary: string;
  confidenceScore: number;
  validationStatus: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
}

function isValidProviderName(name: string): name is AIProvider['name'] {
  return ['mock', 'openai', 'openrouter', 'anthropic', 'gemini'].includes(name);
}

interface ProviderWithFallback {
  primary: AIProvider;
  fallback: AIProvider | undefined;
}

function getProviderWithFallback(): ProviderWithFallback {
  const primaryName = getConfiguredProviderName();
  const fallbackName = process.env.AI_FALLBACK_PROVIDER;

  const primary = (() => {
    if (primaryName === 'mock') return globalRegistry.get('mock')!;
    const p = globalRegistry.get(primaryName);
    if (p) return p;
    try {
      return (globalRegistry as unknown as { getConfiguredProvider: (n: string) => AIProvider }).getConfiguredProvider(primaryName);
    } catch {
      throw new AIProviderError(
        `AI_PROVIDER="${primaryName}" is not configured. Set ${primaryName.toUpperCase()}_API_KEY.`,
        'PROVIDER_NOT_CONFIGURED',
        primaryName
      );
    }
  })();

  let fallback: AIProvider | undefined;
  if (fallbackName && fallbackName !== primaryName && isValidProviderName(fallbackName)) {
    try {
      fallback = globalRegistry.get(fallbackName) ?? (globalRegistry as unknown as {
        getConfiguredProvider: (n: string) => AIProvider;
      }).getConfiguredProvider(fallbackName);
    } catch {
      // Fallback not available
    }
  }

  return { primary, fallback };
}

export async function solveQuestion(
  extractedText: string,
  options: { label: string; value: string; order: number }[] | undefined,
  explanationLevel: ExplanationLevel = 'standard',
  mode: 'compact' | 'full' = 'full'
): Promise<SolveResult> {
  const { primary, fallback } = getProviderWithFallback();

  let result: Awaited<ReturnType<AIProvider['solveQuestion']>> | undefined;
  let lastError: unknown;

  try {
    result = await primary.solveQuestion({
      question: extractedText,
      questionType: options ? 'multiple_choice' : 'short_answer',
      options,
      explanationLevel,
      language: 'en',
    });
  } catch (err) {
    lastError = err;
    if (fallback) {
      try {
        result = await fallback.solveQuestion({
          question: extractedText,
          questionType: options ? 'multiple_choice' : 'short_answer',
          options,
          explanationLevel,
          language: 'en',
        });
        // Discount confidence slightly for fallback
        if (result) {
          result.confidenceScore = Math.min(result.confidenceScore * 0.9, 0.85);
        }
      } catch {
        // Both failed
      }
    }
  }

  if (!result && lastError) throw lastError;

  if (!result) {
    return {
      shortAnswer: '?',
      selectedOption: undefined,
      fullExplanation: mode === 'compact' ? '' : 'AI provider failed to produce a result.',
      reasoningSummary: mode === 'compact' ? '' : 'No result from AI provider.',
      confidenceScore: 0.1,
      validationStatus: 'low_confidence',
    };
  }

  return {
    shortAnswer: result.shortAnswer,
    selectedOption: result.selectedOption,
    fullExplanation: mode === 'compact' ? '' : result.fullExplanation,
    reasoningSummary: mode === 'compact' ? '' : result.reasoningSummary,
    confidenceScore: result.confidenceScore,
    validationStatus: result.validationStatus ?? 'not_validated',
  };
}