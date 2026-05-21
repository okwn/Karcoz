import { NoQuestionDetectedError } from '../errors.js';
export class MockProvider {
    constructor() {
        this.name = 'mock';
        this.delay = 200;
    }
    setMockDelay(ms) { this.delay = ms; }
    async extractQuestion(input) {
        await new Promise((r) => setTimeout(r, this.delay));
        const text = input.imageBase64
            ? 'What is the capital of France?\nA) Paris\nB) London\nC) Berlin\nD) Madrid'
            : 'Explain photosynthesis.';
        if (!text || text.length < 5)
            throw new NoQuestionDetectedError(this.name);
        const confidence = 0.7 + Math.random() * 0.25;
        return {
            extractedText: text, normalizedText: text, detectedLanguage: this.lang(text),
            questionType: this.qType(text), topic: 'Geography', confidence,
            options: /\n[A-D]\.\s/.test(text)
                ? [{ label: 'A', value: 'Paris', order: 0 }, { label: 'B', value: 'London', order: 1 }, { label: 'C', value: 'Berlin', order: 2 }, { label: 'D', value: 'Madrid', order: 3 }]
                : undefined,
        };
    }
    async solveQuestion(input) {
        await new Promise((r) => setTimeout(r, this.delay * 2));
        const confidence = 0.8 + Math.random() * 0.15;
        return {
            shortAnswer: this.answer(input.question), selectedOption: 0,
            fullExplanation: this.explain(input.question, input.explanationLevel),
            reasoningSummary: 'Paris is the capital and largest city of France.',
            confidenceScore: confidence, validationStatus: 'not_validated',
        };
    }
    async validateAnswer(input) {
        await new Promise((r) => setTimeout(r, this.delay));
        const issues = [];
        let adj = 0;
        if (!input.shortAnswer?.trim()) {
            issues.push('Empty answer');
            adj = -0.3;
        }
        const status = adj <= -0.2 ? 'fail' : issues.length > 0 ? 'low_confidence' : 'pass';
        return { status, issues, confidenceAdjustment: adj };
    }
    async classifyTopic(input) {
        await new Promise((r) => setTimeout(r, this.delay));
        const topics = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography'];
        return { topic: topics[Math.floor(Math.random() * topics.length)], confidence: 0.75 + Math.random() * 0.2 };
    }
    async generatePractice(input) {
        await new Promise((r) => setTimeout(r, this.delay * 3));
        return Array.from({ length: input.count }, (_, i) => ({
            question: `Practice Q${i + 1} on ${input.topic}`,
            questionType: input.questionType ?? 'multiple_choice',
            options: [{ label: 'A', value: 'Option A', order: 0 }, { label: 'B', value: 'Option B', order: 1 }],
            answer: 'A', explanation: 'Explanation', difficulty: input.difficulty ?? 'medium',
        }));
    }
    lang(text) {
        return /[şçğüöı]/i.test(text) ? 'tr' : 'en';
    }
    qType(text) {
        if (/\n[A-D]\.\s/.test(text))
            return 'multiple_choice';
        if (/true|false/i.test(text))
            return 'true_false';
        return 'short_answer';
    }
    answer(q) {
        if (q.includes('capital') || q.includes('France'))
            return 'Paris';
        if (q.includes('derivative'))
            return '2x + 3';
        return 'See explanation';
    }
    explain(q, level) {
        const base = 'Based on analysis of the question: ';
        if (level === 'brief')
            return base + 'Answer determined.';
        if (level === 'detailed')
            return base + 'Detailed step-by-step reasoning. Tests core concept understanding.';
        return base + 'Answer follows from fundamental principles.';
    }
}
//# sourceMappingURL=mock.provider.js.map