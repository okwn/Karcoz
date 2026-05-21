import type { AIProvider, ExtractionInput, QuestionExtraction, SolveInput, QuestionSolution, ValidationInput, ValidationResult, TopicClassificationInput, TopicClassification, PracticeGenerationInput, GeneratedQuestion, ProviderName } from '../types.js';
export declare class MockProvider implements AIProvider {
    name: ProviderName;
    private delay;
    setMockDelay(ms: number): void;
    extractQuestion(input: ExtractionInput): Promise<QuestionExtraction>;
    solveQuestion(input: SolveInput): Promise<QuestionSolution>;
    validateAnswer(input: ValidationInput): Promise<ValidationResult>;
    classifyTopic(input: TopicClassificationInput): Promise<TopicClassification>;
    generatePractice(input: PracticeGenerationInput): Promise<GeneratedQuestion[]>;
    private lang;
    private qType;
    private answer;
    private explain;
}
//# sourceMappingURL=mock.provider.d.ts.map