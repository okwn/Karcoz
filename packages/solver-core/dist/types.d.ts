export type ExplanationLevel = 'brief' | 'standard' | 'detailed';
export type AIProviderName = 'mock' | 'openai' | 'openrouter' | 'anthropic' | 'gemini';
export interface AIProvider {
    name: AIProviderName;
    extractQuestion(input: unknown): Promise<unknown>;
    solveQuestion(input: unknown): Promise<unknown>;
    validateAnswer(input: unknown): Promise<unknown>;
    classifyTopic(input: unknown): Promise<unknown>;
}
export type SolverQuestionType = 'arithmetic' | 'percentage' | 'ratio' | 'simple_algebra' | 'sequence' | 'multiple_choice' | 'unknown';
export interface SolverOption {
    label: string;
    value: string;
    order: number;
}
export interface SolverQuestion {
    text: string;
    normalizedText: string;
    questionType: SolverQuestionType;
    options?: SolverOption[];
    topic?: string;
    language: 'en' | 'tr' | 'unknown';
    ocrConfidence?: number;
}
export interface SolverResult {
    shortAnswer: string;
    selectedOption?: number;
    fullExplanation: string;
    reasoningSummary: string;
    confidenceScore: number;
    validationStatus: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
    solverUsed: 'arithmetic' | 'percentage' | 'ratio' | 'simple_algebra' | 'sequence' | 'multiple_choice' | 'ai_fallback';
    confidenceBreakdown?: ConfidenceBreakdown;
}
export interface ConfidenceBreakdown {
    ocrConfidence: number;
    solverConfidence: number;
    validationConfidence: number;
    finalConfidence: number;
}
export interface SolveInput {
    question: SolverQuestion;
    explanationLevel: ExplanationLevel;
    aiFallback?: boolean;
}
export interface ValidationInput {
    shortAnswer: string;
    selectedOption?: number;
    question: SolverQuestion;
    solverConfidence: number;
}
export interface CombinedConfidence {
    overall: number;
    breakdown: ConfidenceBreakdown;
    isLowConfidence: boolean;
}
export interface QuestionTypePrediction {
    type: SolverQuestionType;
    confidence: number;
}
export interface TopicPrediction {
    topic: string;
    subtopic?: string;
    confidence: number;
}
export interface CompactAnswer {
    label: string;
    value: string;
    order: number;
    confidence: number;
}
