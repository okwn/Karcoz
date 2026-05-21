export interface TopicClassificationResult {
    topic: string | undefined;
    subtopic: string | undefined;
    confidence: number;
}
export declare function classifyTopic(text: string): Promise<TopicClassificationResult>;
//# sourceMappingURL=topic-classifier.service.d.ts.map