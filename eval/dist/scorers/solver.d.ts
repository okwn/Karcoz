import type { EvalDatasetEntry, OcrScore, OptionParseScore, TopicScore, AnswerScore, ConfidenceScoreResult, LatencyScore, ExplanationScore, QuestionEvalResult } from '../types.js';
export declare function scoreOcr(entry: EvalDatasetEntry, extractedText: string, _normalizedText: string): OcrScore;
export declare function scoreOptions(entry: EvalDatasetEntry, extractedOptions: {
    label: string;
    value: string;
    order: number;
}[] | undefined): OptionParseScore;
export declare function scoreTopic(entry: EvalDatasetEntry, actualTopic: string | null): TopicScore;
export declare function scoreAnswer(entry: EvalDatasetEntry, shortAnswer: string, selectedOption: number | undefined): AnswerScore;
export declare function scoreConfidence(confidenceScore: number, isCorrect: boolean): ConfidenceScoreResult;
export declare function scoreLatency(perf: {
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    totalLatencyMs: number;
}, hasImage: boolean): LatencyScore;
export declare function scoreExplanation(fullExplanation: string | undefined): ExplanationScore;
export declare function assembleQuestionResult(entry: EvalDatasetEntry, opts: {
    ocrScore?: OcrScore;
    optionParseScore?: OptionParseScore;
    topicScore?: TopicScore;
    answerScore: AnswerScore;
    confidenceScore?: ConfidenceScoreResult;
    latencyScore: LatencyScore;
    explanationScore?: ExplanationScore;
    notes?: string;
}): QuestionEvalResult;
//# sourceMappingURL=solver.d.ts.map