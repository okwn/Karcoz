import type { ExplanationLevel } from '../types.js';
export interface ImagePromptOptions {
    language?: 'en' | 'tr' | 'auto';
    preserveMath?: boolean;
    maxOptions?: number;
}
export declare function buildImagePrompt(options?: ImagePromptOptions): {
    system: string;
    user: string;
};
export declare const SOLVE_QUESTION_PROMPT: {
    system: {
        en: string;
        tr: string;
    };
};
export declare function buildSolvePrompt(question: string, explanationLevel: ExplanationLevel, language?: 'en' | 'tr'): {
    system: string;
    user: string;
};
export declare const VALIDATE_ANSWER_PROMPT: {
    en: string;
    tr: string;
};
export declare function buildValidatePrompt(shortAnswer: string, question: string, language?: 'en' | 'tr'): {
    system: string;
    user: string;
};
export declare const CLASSIFY_TOPIC_PROMPT: {
    en: string;
    tr: string;
};
export declare function buildTopicPrompt(text: string, language?: 'en' | 'tr'): {
    system: string;
    user: string;
};
//# sourceMappingURL=image-to-question.prompt.d.ts.map