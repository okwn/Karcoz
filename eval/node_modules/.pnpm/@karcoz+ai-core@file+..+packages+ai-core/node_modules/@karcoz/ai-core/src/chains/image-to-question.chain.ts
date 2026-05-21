import type { AIProvider, ChainContext, ChainResult, ChainStep, ModelConfig, ExtractionInput, QuestionExtraction, QuestionSolution, ValidationResult } from '../types.js';
import { ChainError, LowConfidenceError } from '../errors.js';
import { mergeConfig } from '../model-config.js';

export async function runExtractChain(
  provider: AIProvider,
  input: ExtractionInput,
  config?: Partial<ModelConfig>
): Promise<ChainResult<QuestionExtraction>> {
  const merged = mergeConfig(config);
  const start = Date.now();
  const steps: ChainStep[] = [];

  try {
    const data = await provider.extractQuestion(input);
    steps.push({ step: 'extract', provider: provider.name, latencyMs: Date.now() - start });
    if (data.confidence < 0.3) throw new LowConfidenceError(data.confidence, 0.3);
    return { data, ctx: { requestId: randomId(), modelConfig: merged, trace: steps } };
  } catch (err) {
    steps.push({ step: 'extract', provider: provider.name, latencyMs: Date.now() - start, error: String(err) });
    throw new ChainError('Extract chain failed', 'EXTRACTION_FAILED', steps.map(s => ({ step: s.step, error: s.error ?? 'unknown' })));
  }
}

export async function runSolveChain(
  provider: AIProvider,
  question: string,
  questionType: string,
  options: { label: string; value: string; order: number }[] | undefined,
  explanationLevel: string,
  config?: Partial<ModelConfig>
): Promise<ChainResult<QuestionSolution>> {
  const merged = mergeConfig(config);
  const start = Date.now();
  const steps: ChainStep[] = [];

  try {
    const data = await provider.solveQuestion({ question, questionType: questionType as any, options, explanationLevel: explanationLevel as any });
    steps.push({ step: 'solve', provider: provider.name, latencyMs: Date.now() - start });
    return { data, ctx: { requestId: randomId(), modelConfig: merged, trace: steps } };
  } catch (err) {
    steps.push({ step: 'solve', provider: provider.name, latencyMs: Date.now() - start, error: String(err) });
    throw new ChainError('Solve chain failed', 'SOLVE_FAILED', steps.map(s => ({ step: s.step, error: s.error ?? 'unknown' })));
  }
}

export async function runValidateChain(
  provider: AIProvider,
  shortAnswer: string,
  question: string,
  config?: Partial<ModelConfig>
): Promise<ChainResult<ValidationResult>> {
  const merged = mergeConfig(config);
  const start = Date.now();
  const steps: ChainStep[] = [];

  try {
    const data = await provider.validateAnswer({ shortAnswer, question, confidenceScore: 0.9 });
    steps.push({ step: 'validate', provider: provider.name, latencyMs: Date.now() - start });
    return { data, ctx: { requestId: randomId(), modelConfig: merged, trace: steps } };
  } catch (err) {
    steps.push({ step: 'validate', provider: provider.name, latencyMs: Date.now() - start, error: String(err) });
    throw new ChainError('Validate chain failed', 'VALIDATION_FAILED', steps.map(s => ({ step: s.step, error: s.error ?? 'unknown' })));
  }
}

function randomId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}