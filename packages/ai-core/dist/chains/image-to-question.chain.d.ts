import type { AIProvider, ChainResult, ModelConfig, ExtractionInput, QuestionExtraction, QuestionSolution, ValidationResult } from '../types.js';
export declare function runExtractChain(provider: AIProvider, input: ExtractionInput, config?: Partial<ModelConfig>): Promise<ChainResult<QuestionExtraction>>;
export declare function runSolveChain(provider: AIProvider, question: string, questionType: string, options: {
    label: string;
    value: string;
    order: number;
}[] | undefined, explanationLevel: string, config?: Partial<ModelConfig>): Promise<ChainResult<QuestionSolution>>;
export declare function runValidateChain(provider: AIProvider, shortAnswer: string, question: string, config?: Partial<ModelConfig>): Promise<ChainResult<ValidationResult>>;
//# sourceMappingURL=image-to-question.chain.d.ts.map