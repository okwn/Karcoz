export declare function computeQuestionHash(normalizedText: string): string;
export declare function getCachedAnswer(hash: string): Promise<{
    answer: string;
    confidence: number;
    explanation: string;
    questionId: string;
} | null>;
export declare function setCachedAnswer(hash: string, data: {
    answer: string;
    confidence: number;
    explanation: string;
    questionId: string;
}): Promise<void>;
//# sourceMappingURL=cache.service.d.ts.map