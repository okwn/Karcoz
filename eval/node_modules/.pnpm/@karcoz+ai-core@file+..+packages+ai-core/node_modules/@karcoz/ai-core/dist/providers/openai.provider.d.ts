import type { AIProvider, ExtractionInput, QuestionExtraction, SolveInput, QuestionSolution, ValidationInput, ValidationResult, TopicClassificationInput, TopicClassification, ProviderName } from '../types.js';
interface OpenAIModels {
    vision: string;
    text: string;
}
interface OpenAIProviderConfig {
    apiKey: string;
    models?: Partial<OpenAIModels>;
    timeoutMs?: number;
    maxTokens?: number;
}
export declare class OpenAIProvider implements AIProvider {
    name: ProviderName;
    private apiKey;
    private models;
    private timeoutMs;
    private maxTokens;
    constructor(config: string | OpenAIProviderConfig);
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
    private fallbackExtraction;
    private fallbackSolve;
}
export {};
//# sourceMappingURL=openai.provider.d.ts.map