import { z } from 'zod';

// ── Dataset entry ─────────────────────────────────────────────────────────────

export const EvalDatasetEntrySchema = z.object({
  id: z.string(),
  language: z.enum(['tr', 'en']),
  topic: z.string(),
  difficulty: z.enum(['kolay', 'orta', 'zor', 'easy', 'medium', 'hard']),
  questionText: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string(), // 'A', 'B', 'C', 'D' or the actual answer text
  imagePath: z.string().optional(),
  expectedNormalizedText: z.string().optional(),
});

export type EvalDatasetEntry = z.infer<typeof EvalDatasetEntrySchema>;

// ── Evaluation result for a single question ───────────────────────────────────

export const OcrScoreSchema = z.object({
  rawTextMatch: z.boolean(),
  normalizedTextSimilarity: z.number().min(0).max(1),
  characterAccuracy: z.number().min(0).max(1),
  missingTokens: z.array(z.string()),
  extraTokens: z.array(z.string()),
});

export type OcrScore = z.infer<typeof OcrScoreSchema>;

export const OptionParseScoreSchema = z.object({
  optionsExtracted: z.number(),
  optionsExpected: z.number(),
  optionsMatched: z.number(),
  optionAccuracy: z.number().min(0).max(1),
  matchedOptions: z.array(z.object({
    expected: z.string(),
    actual: z.string(),
    labelCorrect: z.boolean(),
  })),
});

export type OptionParseScore = z.infer<typeof OptionParseScoreSchema>;

export const TopicScoreSchema = z.object({
  topicMatch: z.boolean(),
  expectedTopic: z.string(),
  actualTopic: z.string().nullable(),
});

export type TopicScore = z.infer<typeof TopicScoreSchema>;

export const AnswerScoreSchema = z.object({
  exactMatch: z.boolean(),
  labelMatch: z.boolean(),
  correctAnswer: z.string(),
  givenAnswer: z.string(),
});

export type AnswerScore = z.infer<typeof AnswerScoreSchema>;

export const ConfidenceScoreSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  isWellCalibrated: z.boolean(), // confidence matches accuracy within 0.15
  calibrationError: z.number(),
});

export type ConfidenceScoreResult = z.infer<typeof ConfidenceScoreSchema>;

export const LatencyScoreSchema = z.object({
  extractionLatencyMs: z.number(),
  solvingLatencyMs: z.number(),
  totalLatencyMs: z.number(),
  withinSla: z.boolean(), // < 5000ms total for text, < 8000ms for image
});

export type LatencyScore = z.infer<typeof LatencyScoreSchema>;

export const ExplanationScoreSchema = z.object({
  hasExplanation: z.boolean(),
  explanationLength: z.number(),
  explanationQualityHint: z.string().optional(), // not automated
});

export type ExplanationScore = z.infer<typeof ExplanationScoreSchema>;

// ── Per-question eval result ───────────────────────────────────────────────────

export const QuestionEvalResultSchema = z.object({
  datasetEntryId: z.string(),
  timestamp: z.string(),

  ocrScore: OcrScoreSchema.optional(),
  optionParseScore: OptionParseScoreSchema.optional(),
  topicScore: TopicScoreSchema.optional(),
  answerScore: AnswerScoreSchema,
  confidenceScore: ConfidenceScoreSchema.optional(),
  latencyScore: LatencyScoreSchema,
  explanationScore: ExplanationScoreSchema.optional(),

  passed: z.boolean(),
  passedDimensions: z.array(z.string()),
  failedDimensions: z.array(z.string()),
  notes: z.string().optional(),
});

export type QuestionEvalResult = z.infer<typeof QuestionEvalResultSchema>;

// ── Aggregate eval report ─────────────────────────────────────────────────────

export const EvalDimensionSummarySchema = z.object({
  dimension: z.string(),
  total: z.number(),
  passed: z.number(),
  rate: z.number().min(0).max(1),
  avgLatencyMs: z.number().optional(),
});

export type EvalDimensionSummary = z.infer<typeof EvalDimensionSummarySchema>;

export const EvalReportSchema = z.object({
  evalId: z.string(),
  runAt: z.string(),
  scope: z.enum(['full', 'solver', 'ocr']),
  datasetName: z.string(),
  providerUsed: z.string().optional(),
  datasetSize: z.number(),
  totalPassed: z.number(),
  overallPassRate: z.number().min(0).max(1),

  dimensionSummaries: z.array(EvalDimensionSummarySchema),
  latencyStats: z.object({
    meanMs: z.number(),
    p50Ms: z.number(),
    p95Ms: z.number(),
    p99Ms: z.number(),
    maxMs: z.number(),
  }),
  confidenceStats: z.object({
    mean: z.number(),
    wellCalibrated: z.number(),
    totalWithConfidence: z.number(),
  }),
  results: z.array(QuestionEvalResultSchema),
  notes: z.string().optional(),
});

export type EvalReport = z.infer<typeof EvalReportSchema>;