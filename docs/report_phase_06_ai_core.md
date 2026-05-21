# Phase 6 Report: AI Core — Multi-Provider Pipeline

## Objective

Create a modular AI provider system with mock fallback, structured JSON prompts, and chain orchestration for the KARÇÖZ study assistant.

## Safety Boundary

Study/practice assistant only. No hidden exam mode, proctoring bypass, or auto-answer clicking. All AI calls are user-initiated via the solve API.

## Deliverables

### packages/ai-core

```
src/
├── types.ts                    # AIProvider interface, QuestionExtraction, QuestionSolution, Chain types
├── errors.ts                  # AIProviderError, LowConfidenceError, ChainError, etc.
├── model-config.ts            # ProviderModels, DEFAULT_MODEL_CONFIG, mergeConfig
├── provider-registry.ts       # createProviderRegistry(), globalRegistry
├── providers/
│   ├── mock.provider.ts       # MockProvider (default, dev)
│   └── openai.provider.ts     # OpenAIProvider, OpenRouterProvider, AnthropicProvider, GeminiProvider
├── prompts/
│   └── image-to-question.prompt.ts  # buildImagePrompt, buildSolvePrompt, buildValidatePrompt
├── chains/
│   └── image-to-question.chain.ts  # runExtractChain, runSolveChain, runValidateChain
└── __tests__/
    ├── registry.test.ts      # 8 tests ✅
    └── provider.test.ts       # 9 tests ✅
```

## Provider Interface

```typescript
interface AIProvider {
  name: ProviderName;
  extractQuestion(input: ExtractionInput): Promise<QuestionExtraction>;
  solveQuestion(input: SolveInput): Promise<QuestionSolution>;
  validateAnswer(input: ValidationInput): Promise<ValidationResult>;
  classifyTopic(input: TopicClassificationInput): Promise<TopicClassification>;
  generatePractice?(input: PracticeGenerationInput): Promise<GeneratedQuestion[]>;
}
```

## Fallback Logic

- If primary provider fails with retryable error → use fallback
- If extraction confidence < 0.3 → throw `LowConfidenceError`
- If chain step fails → wrapped in `ChainError` with trace
- Each chain function (`runExtractChain`, `runSolveChain`, `runValidateChain`) is independent and composable

## Prompt Requirements

1. Return structured JSON only (no prose)
2. Extract question and answer choices with `{label, value, order}`
3. Preserve math symbols (², √, ∑, etc.)
4. Support Turkish and English
5. Mark uncertainty via confidence score (0.0–1.0)
6. Compact mode avoids over-explaining
7. Multiple choice includes `selectedOption` index
8. Provider-specific fallback providers configurable

## Validation

| Check | Result |
|-------|--------|
| TypeScript | ✅ 0 errors |
| Tests | ✅ 17/17 passed |
| Build | ✅ dist/ compiled |

## Docs

- `docs/architecture/03-ai-ocr-solver-pipeline.md`
- `docs/architecture/11-ai-provider-system.md`
- `docs/product/06-solution-quality.md`
- `docs/report_phase_06_ai_core.md`

## Next Steps

1. Wire `ai-core` into `apps/api/src/services/extraction.service.ts` (replace mock)
2. Wire `ai-core` into `apps/api/src/services/solution.service.ts` (replace mock)
3. Add real API keys via environment variables (`OPENAI_API_KEY`, etc.)
4. Add streaming response support for long explanations
5. Add cost tracking per provider

## Verdict

**✅ READY** — AI core fully implemented with mock provider as default. Provider interface stable. Real providers can replace mock without changing any call sites.