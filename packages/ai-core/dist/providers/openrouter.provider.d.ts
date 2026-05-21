import type { AIProvider, ExtractionInput, QuestionExtraction, SolveInput, QuestionSolution, ValidationInput, ValidationResult, TopicClassificationInput, TopicClassification, ProviderName } from '../types.js';
interface OpenRouterConfig {
    apiKey: string;
    model?: string;
    timeoutMs?: number;
    maxTokens?: number;
}
export declare class OpenRouterProvider implements AIProvider {
    name: ProviderName;
    private apiKey;
    private model;
    private timeoutMs;
    private maxTokens;
    constructor(config: string | OpenRouterConfig);
    extractQuestion(input: ExtractionInput): Promise<QuestionExtraction>;
    solveQuestion(input: SolveInput): Promise<QuestionSolution>;
    validateAnswer(input: ValidationInput): Promise<ValidationResult>;
    classifyTopic(input: TopicClassificationInput): Promise<TopicClassification>;
    private makeRequest;
    private parseExtractionResponse;
    private parseSolveResponse;
    private parseValidationResponse;
    private parseTopicResponse;
    private extractJSON;
    private parseLanguage;
    private parseQuestionType;
    private parseValidationStatus;
    private parseOptions;
    private clampConfidence;
    private clampAdjustment;
}
export {};
//# sourceMappingURL=openrouter.provider.d.ts.map