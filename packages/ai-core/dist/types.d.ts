export type ProviderName = 'mock' | 'openai' | 'openrouter' | 'anthropic' | 'gemini';
export type ExplanationLevel = 'brief' | 'standard' | 'detailed';
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank' | 'matching' | 'ordering' | 'unknown';
export interface ExtractedOption {
    label: string;
    value: string;
    order: number;
}
export interface ModelConfig {
    provider: ProviderName;
    fallbackProvider?: ProviderName;
    timeoutMs: number;
    maxTokens: number;
    temperature: number;
    maxImageSizeBytes: number;
    explanationLevel: ExplanationLevel;
    enableValidation: boolean;
    enableFallback: boolean;
}
export interface ProviderLatency {
    provider: ProviderName;
    latencyMs: number;
}
export interface ExtractionInput {
    imageBase64?: string;
    imageUrl?: string;
    sourceUrl?: string;
    pageTitle?: string;
    language?: 'en' | 'tr' | 'auto';
}
export interface QuestionExtraction {
    extractedText: string;
    normalizedText: string;
    detectedLanguage: 'en' | 'tr' | 'unknown';
    questionType: QuestionType;
    topic?: string;
    options?: ExtractedOption[];
    confidence: number;
    rawPrediction?: string;
}
export interface SolveInput {
    question: string;
    questionType: QuestionType;
    options?: ExtractedOption[];
    explanationLevel: ExplanationLevel;
    language?: 'en' | 'tr';
}
export interface QuestionSolution {
    shortAnswer: string;
    selectedOption?: number;
    fullExplanation: string;
    reasoningSummary: string;
    confidenceScore: number;
    validationStatus?: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
}
export interface ValidationInput {
    shortAnswer: string;
    question: string;
    options?: ExtractedOption[];
    confidenceScore?: number;
    language?: 'en' | 'tr';
}
export interface ValidationResult {
    status: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
    issues: string[];
    confidenceAdjustment: number;
}
export interface TopicClassificationInput {
    text: string;
    language?: 'en' | 'tr';
}
export interface TopicClassification {
    topic?: string;
    subtopic?: string;
    confidence: number;
}
export interface PracticeGenerationInput {
    topic: string;
    count: number;
    questionType?: QuestionType;
    language?: 'en' | 'tr';
    difficulty?: 'easy' | 'medium' | 'hard';
}
export interface GeneratedQuestion {
    question: string;
    questionType: QuestionType;
    options?: ExtractedOption[];
    answer: string;
    explanation: string;
    difficulty?: 'easy' | 'medium' | 'hard';
}
export interface AIProvider {
    name: ProviderName;
    extractQuestion(input: ExtractionInput): Promise<QuestionExtraction>;
    solveQuestion(input: SolveInput): Promise<QuestionSolution>;
    validateAnswer(input: ValidationInput): Promise<ValidationResult>;
    classifyTopic(input: TopicClassificationInput): Promise<TopicClassification>;
    generatePractice?(input: PracticeGenerationInput): Promise<GeneratedQuestion[]>;
}
export interface ChainContext {
    requestId: string;
    modelConfig: ModelConfig;
    trace: ChainStep[];
}
export interface ChainStep {
    step: string;
    provider: ProviderName;
    latencyMs: number;
    error?: string;
}
export interface ChainResult<T> {
    data: T;
    ctx: ChainContext;
}
export type ChainStepType = 'extract' | 'solve' | 'validate' | 'classify' | 'fallback' | 'final';
export interface FallbackOptions {
    maxAttempts: number;
    onFallback?: (error: unknown, provider: ProviderName) => void;
    shouldFallback?: (error: unknown) => boolean;
}
//# sourceMappingURL=types.d.ts.map