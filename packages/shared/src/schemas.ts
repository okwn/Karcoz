import { z } from 'zod';

export const ImageSourceTypeSchema = z.enum(['upload', 'url', 'clipboard', 'screen']);
export type ImageSourceType = z.infer<typeof ImageSourceTypeSchema>;

export const ExplanationLevelSchema = z.enum(['brief', 'standard', 'detailed']);
export type ExplanationLevel = z.infer<typeof ExplanationLevelSchema>;

export const ResultModeSchema = z.enum(['short', 'full', 'detailed']);
export type ResultMode = z.infer<typeof ResultModeSchema>;

export const QuestionTypeSchema = z.enum([
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'fill_blank',
  'matching',
  'ordering',
  'unknown',
]);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

export const SolveImageRequestSchema = z.object({
  imageBase64: z.string().max(10 * 1024 * 1024, 'Image exceeds maximum size of 10MB').optional(),
  imageUrl: z.string().url().optional(),
  sourceType: ImageSourceTypeSchema,
  sourceUrl: z.string().url().optional(),
  pageTitle: z.string().max(500).optional(),
  explanationLevel: ExplanationLevelSchema.default('standard'),
  resultMode: ResultModeSchema.default('full'),
  mode: z.enum(['compact', 'full']).default('full').optional(),
});

export type SolveImageRequest = z.infer<typeof SolveImageRequestSchema>;

export const SolveTextRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  sourceUrl: z.string().url().optional(),
  pageTitle: z.string().max(500).optional(),
  explanationLevel: ExplanationLevelSchema.default('standard'),
  resultMode: ResultModeSchema.default('full'),
  mode: z.enum(['compact', 'full']).default('full').optional(),
});

export type SolveTextRequest = z.infer<typeof SolveTextRequestSchema>;

export const ExtractedOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  order: z.number(),
});

export const ExtractionSchema = z.object({
  extractedText: z.string(),
  normalizedText: z.string(),
  detectedLanguage: z.string().optional(),
  questionType: QuestionTypeSchema,
  topic: z.string().optional(),
  options: z.array(ExtractedOptionSchema).optional(),
});

export type Extraction = z.infer<typeof ExtractionSchema>;

export const SolutionSchema = z.object({
  shortAnswer: z.string(),
  selectedOption: z.number().optional(),
  fullExplanation: z.string(),
  reasoningSummary: z.string(),
  confidenceScore: z.number().min(0).max(1),
  validationStatus: z.enum(['pass', 'fail', 'low_confidence', 'not_validated']),
});

export type Solution = z.infer<typeof SolutionSchema>;

export const PerformanceMetricsSchema = z.object({
  captureLatencyMs: z.number(),
  uploadLatencyMs: z.number(),
  extractionLatencyMs: z.number(),
  solvingLatencyMs: z.number(),
  validationLatencyMs: z.number(),
  totalLatencyMs: z.number(),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

export const SolveResponseSchema = z.object({
  questionId: z.string(),
  extraction: ExtractionSchema,
  solution: SolutionSchema,
  performance: PerformanceMetricsSchema,
});

export type SolveResponse = z.infer<typeof SolveResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const QuestionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  pageTitle: z.string().optional(),
  sourceType: ImageSourceTypeSchema,
  extractedText: z.string(),
  normalizedText: z.string(),
  questionType: QuestionTypeSchema,
  topic: z.string().optional(),
  options: z.array(ExtractedOptionSchema).optional(),
  shortAnswer: z.string().optional(),
  selectedOption: z.number().optional(),
  fullExplanation: z.string().optional(),
  confidenceScore: z.number().optional(),
  status: z.enum(['pending', 'solved', 'saved', 'error']),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Question = z.infer<typeof QuestionSchema>;

export const QuestionSaveSchema = z.object({
  selectedOption: z.number().optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

export type QuestionSave = z.infer<typeof QuestionSaveSchema>;

export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);

export const PracticeGenerationRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  subtopic: z.string().max(200).optional(),
  difficulty: DifficultySchema.default('medium'),
  count: z.number().int().min(1).max(20).default(5),
  basedOnQuestionId: z.string().optional(),
  language: z.enum(['en', 'tr']).default('en'),
  includeExplanations: z.boolean().default(true),
});

export type PracticeGenerationRequest = z.infer<typeof PracticeGenerationRequestSchema>;

export const PracticeQuestionSchema = z.object({
  questionText: z.string(),
  options: z.array(ExtractedOptionSchema).optional(),
  correctAnswer: z.string(),
  explanation: z.string().optional(),
  difficulty: DifficultySchema,
  topic: z.string().optional(),
});

export type PracticeQuestion = z.infer<typeof PracticeQuestionSchema>;

export const PracticeGenerationResponseSchema = z.object({
  practiceSetId: z.string(),
  questions: z.array(PracticeQuestionSchema),
});

export type PracticeGenerationResponse = z.infer<typeof PracticeGenerationResponseSchema>;

export const PracticeSetSchema = z.object({
  id: z.string(),
  topic: z.string(),
  subtopic: z.string().optional(),
  difficulty: z.string(),
  language: z.string(),
  basedOnQuestionId: z.string().optional(),
  createdAt: z.number(),
  questionCount: z.number().optional(),
  attemptCount: z.number().optional(),
});

export type PracticeSet = z.infer<typeof PracticeSetSchema>;

export const PracticeAttemptAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
});

export const PracticeAttemptRequestSchema = z.object({
  answers: z.array(PracticeAttemptAnswerSchema),
  timeSpentMs: z.number().int().optional(),
});

export type PracticeAttemptRequest = z.infer<typeof PracticeAttemptRequestSchema>;

export const PracticeAttemptResponseSchema = z.object({
  attemptId: z.string(),
  score: z.number(),
  totalQuestions: z.number(),
  correctCount: z.number(),
  results: z.array(z.object({
    questionId: z.string(),
    correctAnswer: z.string(),
    userAnswer: z.string(),
    isCorrect: z.boolean(),
    explanation: z.string().optional(),
  })),
});

export type PracticeAttemptResponse = z.infer<typeof PracticeAttemptResponseSchema>;

export const RecommendedPracticeSchema = z.object({
  topic: z.string(),
  reason: z.string(),
  questionCount: z.number().int().min(1).max(10),
  difficulty: DifficultySchema.default('medium'),
});

export type RecommendedPractice = z.infer<typeof RecommendedPracticeSchema>;

// ── Auth ────────────────────────────────────────────────────────────────────

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
  type: z.enum(['login', 'register']).default('login'),
});

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(32).max(64),
});

export type MagicLinkVerify = z.infer<typeof MagicLinkVerifySchema>;

export const SessionResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email().nullable(),
  expiresAt: z.number(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const ExtensionTokenCreateSchema = z.object({
  deviceName: z.string().max(100).optional(),
});

export type ExtensionTokenCreate = z.infer<typeof ExtensionTokenCreateSchema>;

export const ExtensionTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.number(),
});

export type ExtensionTokenResponse = z.infer<typeof ExtensionTokenResponseSchema>;

export const UserSettingsSchema = z.object({
  storeHistory: z.boolean(),
  storeImages: z.boolean(),
  maxHistoryItems: z.number().int().min(10).max(200),
  explanationLevel: ExplanationLevelSchema,
  resultMode: ResultModeSchema,
  telegramEnabled: z.boolean(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSettingsUpdateSchema = UserSettingsSchema.partial();

export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  createdAt: z.number(),
  settings: UserSettingsSchema.optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ExportDataResponseSchema = z.object({
  exportedAt: z.number(),
  userId: z.string().optional(),
  questions: z.array(QuestionSchema),
  settings: UserSettingsSchema.optional(),
});

export type ExportDataResponse = z.infer<typeof ExportDataResponseSchema>;

// ── Telegram ─────────────────────────────────────────────────────────────────

export const TelegramLinkAccountSchema = z.object({
  telegramChatId: z.string().min(1),
  telegramUsername: z.string().optional(),
  displayName: z.string().max(100).optional(),
});

export type TelegramLinkAccount = z.infer<typeof TelegramLinkAccountSchema>;

export const TelegramSendSolutionSchema = z.object({
  telegramChatId: z.string().min(1),
  questionId: z.string().min(1),
  viaTelegram: z.boolean().default(true),
});

export type TelegramSendSolution = z.infer<typeof TelegramSendSolutionSchema>;

export const TelegramAccountStatusSchema = z.object({
  telegramChatId: z.string().optional(),
  isLinked: z.boolean(),
  telegramUsername: z.string().optional(),
  displayName: z.string().optional(),
  linkedAt: z.number().optional(),
});

export type TelegramAccountStatus = z.infer<typeof TelegramAccountStatusSchema>;

// TelegramAuditLog action types
export const TelegramAuditAction = {
  LINK_STARTED: 'TELEGRAM_LINK_STARTED',
  ACCOUNT_LINKED: 'TELEGRAM_ACCOUNT_LINKED',
  SOLUTION_SENT: 'TELEGRAM_SOLUTION_SENT',
  IMAGE_SOLVED: 'TELEGRAM_IMAGE_SOLVED',
  ACCOUNT_UNLINKED: 'TELEGRAM_ACCOUNT_UNLINKED',
} as const;

// ── Admin ─────────────────────────────────────────────────────────────────────

export const AdminOverviewSchema = z.object({
  userCount: z.number(),
  questionCount: z.number(),
  todaySolveCount: z.number(),
  errorCountLast24h: z.number(),
  questionsLast30d: z.number(),
});

export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  role: z.string(),
  createdAt: z.number(),
  questionCount: z.number(),
  lastActiveAt: z.number().nullable(),
});

export const PaginatedUsersSchema = z.object({
  data: z.array(AdminUserSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;

export const UsageDataPointSchema = z.object({
  date: z.string(),
  count: z.number(),
});

export const UsageStatsSchema = z.object({
  series: z.array(UsageDataPointSchema),
  period: z.string(),
});

export type UsageStats = z.infer<typeof UsageStatsSchema>;

export const ErrorBreakdownSchema = z.object({
  code: z.string(),
  count: z.number(),
});

export const ErrorStatsSchema = z.object({
  totalErrorsLast24h: z.number(),
  breakdown: z.array(ErrorBreakdownSchema),
});

export type ErrorStats = z.infer<typeof ErrorStatsSchema>;

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  adminId: z.string(),
  action: z.string(),
  target: z.string(),
  changes: z.unknown().optional(),
  createdAt: z.number(),
});

export const PaginatedAuditLogSchema = z.object({
  data: z.array(AuditLogEntrySchema),
  meta: z.object({ total: z.number(), limit: z.number(), offset: z.number() }),
});

export const ModelConfigSchema = z.object({
  provider: z.string(),
  modelName: z.string().nullable(),
  fallbackModel: z.string().nullable(),
  timeoutMs: z.number(),
  maxTokens: z.number(),
  enableValidation: z.boolean(),
  compactMode: z.boolean(),
  updatedAt: z.number(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

export const RateLimitEntrySchema = z.object({
  tier: z.string(),
  minute: z.number(),
  daily: z.number(),
  monthly: z.number(),
});

export const RateLimitsSchema = z.object({
  tiers: z.array(RateLimitEntrySchema),
});

export const ModelConfigUpdateSchema = z.object({
  provider: z.enum(['mock', 'openai', 'openrouter', 'anthropic', 'gemini']).optional(),
  modelName: z.string().max(100).optional(),
  fallbackModel: z.string().max(100).optional(),
  timeoutMs: z.number().min(1000).max(120000).optional(),
  maxTokens: z.number().min(256).max(256000).optional(),
  enableValidation: z.boolean().optional(),
  compactMode: z.boolean().optional(),
});

export const RateLimitUpdateSchema = z.object({
  tier: z.string(),
  minute: z.number().min(1).optional(),
  daily: z.number().min(1).optional(),
  monthly: z.number().min(1).optional(),
});

// ── Billing / Plans ────────────────────────────────────────────────────────────

export const PlanNameSchema = z.enum(['free', 'pro', 'team']);

export const PlanUsageSchema = z.object({
  plan: PlanNameSchema,
  dailyCount: z.number(),
  dailyLimit: z.number(),
  monthlyCount: z.number(),
  monthlyLimit: z.number(),
  dailyRemaining: z.number(),
  monthlyRemaining: z.number(),
  resetDailyAt: z.number(), // unix ms
  resetMonthlyAt: z.number(), // unix ms
});

export type PlanUsage = z.infer<typeof PlanUsageSchema>;

export const CheckoutRequestSchema = z.object({
  plan: PlanNameSchema,
  provider: z.enum(['stripe', 'paddle']).default('stripe'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const CheckoutResponseSchema = z.object({
  url: z.string().url(),
  sessionId: z.string(),
  provider: z.enum(['stripe', 'paddle']),
});

export const WebhookPayloadSchema = z.object({
  provider: z.enum(['stripe', 'paddle']),
  eventId: z.string(),
  eventType: z.string(),
  data: z.record(z.unknown()),
});

export const SubscriptionInfoSchema = z.object({
  plan: PlanNameSchema,
  status: z.enum(['active', 'canceled', 'past_due', 'trialing', 'none']),
  provider: z.string().nullable(),
  currentPeriodEnd: z.number().nullable(), // unix ms
  cancelAtPeriodEnd: z.boolean(),
});

export const PlanFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.object({ monthly: z.number(), currency: z.string() }),
  features: z.array(z.string()),
});

export const BillingOverviewSchema = z.object({
  subscription: SubscriptionInfoSchema,
  usage: PlanUsageSchema,
  availablePlans: z.array(PlanFeatureSchema),
});