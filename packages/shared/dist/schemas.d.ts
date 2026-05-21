import { z } from 'zod';
export declare const ImageSourceTypeSchema: z.ZodEnum<["upload", "url", "clipboard", "screen"]>;
export type ImageSourceType = z.infer<typeof ImageSourceTypeSchema>;
export declare const ExplanationLevelSchema: z.ZodEnum<["brief", "standard", "detailed"]>;
export type ExplanationLevel = z.infer<typeof ExplanationLevelSchema>;
export declare const ResultModeSchema: z.ZodEnum<["short", "full", "detailed"]>;
export type ResultMode = z.infer<typeof ResultModeSchema>;
export declare const QuestionTypeSchema: z.ZodEnum<["multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"]>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export declare const SolveImageRequestSchema: z.ZodObject<{
    imageBase64: z.ZodOptional<z.ZodString>;
    imageUrl: z.ZodOptional<z.ZodString>;
    sourceType: z.ZodEnum<["upload", "url", "clipboard", "screen"]>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    pageTitle: z.ZodOptional<z.ZodString>;
    explanationLevel: z.ZodDefault<z.ZodEnum<["brief", "standard", "detailed"]>>;
    resultMode: z.ZodDefault<z.ZodEnum<["short", "full", "detailed"]>>;
    mode: z.ZodOptional<z.ZodDefault<z.ZodEnum<["compact", "full"]>>>;
}, "strip", z.ZodTypeAny, {
    sourceType: "upload" | "url" | "clipboard" | "screen";
    explanationLevel: "brief" | "standard" | "detailed";
    resultMode: "detailed" | "short" | "full";
    imageBase64?: string | undefined;
    imageUrl?: string | undefined;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    mode?: "full" | "compact" | undefined;
}, {
    sourceType: "upload" | "url" | "clipboard" | "screen";
    imageBase64?: string | undefined;
    imageUrl?: string | undefined;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    explanationLevel?: "brief" | "standard" | "detailed" | undefined;
    resultMode?: "detailed" | "short" | "full" | undefined;
    mode?: "full" | "compact" | undefined;
}>;
export type SolveImageRequest = z.infer<typeof SolveImageRequestSchema>;
export declare const SolveTextRequestSchema: z.ZodObject<{
    text: z.ZodString;
    sourceUrl: z.ZodOptional<z.ZodString>;
    pageTitle: z.ZodOptional<z.ZodString>;
    explanationLevel: z.ZodDefault<z.ZodEnum<["brief", "standard", "detailed"]>>;
    resultMode: z.ZodDefault<z.ZodEnum<["short", "full", "detailed"]>>;
    mode: z.ZodOptional<z.ZodDefault<z.ZodEnum<["compact", "full"]>>>;
}, "strip", z.ZodTypeAny, {
    explanationLevel: "brief" | "standard" | "detailed";
    resultMode: "detailed" | "short" | "full";
    text: string;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    mode?: "full" | "compact" | undefined;
}, {
    text: string;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    explanationLevel?: "brief" | "standard" | "detailed" | undefined;
    resultMode?: "detailed" | "short" | "full" | undefined;
    mode?: "full" | "compact" | undefined;
}>;
export type SolveTextRequest = z.infer<typeof SolveTextRequestSchema>;
export declare const ExtractedOptionSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
    order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    value: string;
    label: string;
    order: number;
}, {
    value: string;
    label: string;
    order: number;
}>;
export declare const ExtractionSchema: z.ZodObject<{
    extractedText: z.ZodString;
    normalizedText: z.ZodString;
    detectedLanguage: z.ZodOptional<z.ZodString>;
    questionType: z.ZodEnum<["multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"]>;
    topic: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
        order: number;
    }, {
        value: string;
        label: string;
        order: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    extractedText: string;
    normalizedText: string;
    questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
    options?: {
        value: string;
        label: string;
        order: number;
    }[] | undefined;
    detectedLanguage?: string | undefined;
    topic?: string | undefined;
}, {
    extractedText: string;
    normalizedText: string;
    questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
    options?: {
        value: string;
        label: string;
        order: number;
    }[] | undefined;
    detectedLanguage?: string | undefined;
    topic?: string | undefined;
}>;
export type Extraction = z.infer<typeof ExtractionSchema>;
export declare const SolutionSchema: z.ZodObject<{
    shortAnswer: z.ZodString;
    selectedOption: z.ZodOptional<z.ZodNumber>;
    fullExplanation: z.ZodString;
    reasoningSummary: z.ZodString;
    confidenceScore: z.ZodNumber;
    validationStatus: z.ZodEnum<["pass", "fail", "low_confidence", "not_validated"]>;
}, "strip", z.ZodTypeAny, {
    shortAnswer: string;
    fullExplanation: string;
    reasoningSummary: string;
    confidenceScore: number;
    validationStatus: "pass" | "fail" | "low_confidence" | "not_validated";
    selectedOption?: number | undefined;
}, {
    shortAnswer: string;
    fullExplanation: string;
    reasoningSummary: string;
    confidenceScore: number;
    validationStatus: "pass" | "fail" | "low_confidence" | "not_validated";
    selectedOption?: number | undefined;
}>;
export type Solution = z.infer<typeof SolutionSchema>;
export declare const PerformanceMetricsSchema: z.ZodObject<{
    captureLatencyMs: z.ZodNumber;
    uploadLatencyMs: z.ZodNumber;
    extractionLatencyMs: z.ZodNumber;
    solvingLatencyMs: z.ZodNumber;
    validationLatencyMs: z.ZodNumber;
    totalLatencyMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    captureLatencyMs: number;
    uploadLatencyMs: number;
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    validationLatencyMs: number;
    totalLatencyMs: number;
}, {
    captureLatencyMs: number;
    uploadLatencyMs: number;
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    validationLatencyMs: number;
    totalLatencyMs: number;
}>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export declare const SolveResponseSchema: z.ZodObject<{
    questionId: z.ZodString;
    extraction: z.ZodObject<{
        extractedText: z.ZodString;
        normalizedText: z.ZodString;
        detectedLanguage: z.ZodOptional<z.ZodString>;
        questionType: z.ZodEnum<["multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"]>;
        topic: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            order: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label: string;
            order: number;
        }, {
            value: string;
            label: string;
            order: number;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        detectedLanguage?: string | undefined;
        topic?: string | undefined;
    }, {
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        detectedLanguage?: string | undefined;
        topic?: string | undefined;
    }>;
    solution: z.ZodObject<{
        shortAnswer: z.ZodString;
        selectedOption: z.ZodOptional<z.ZodNumber>;
        fullExplanation: z.ZodString;
        reasoningSummary: z.ZodString;
        confidenceScore: z.ZodNumber;
        validationStatus: z.ZodEnum<["pass", "fail", "low_confidence", "not_validated"]>;
    }, "strip", z.ZodTypeAny, {
        shortAnswer: string;
        fullExplanation: string;
        reasoningSummary: string;
        confidenceScore: number;
        validationStatus: "pass" | "fail" | "low_confidence" | "not_validated";
        selectedOption?: number | undefined;
    }, {
        shortAnswer: string;
        fullExplanation: string;
        reasoningSummary: string;
        confidenceScore: number;
        validationStatus: "pass" | "fail" | "low_confidence" | "not_validated";
        selectedOption?: number | undefined;
    }>;
    performance: z.ZodObject<{
        captureLatencyMs: z.ZodNumber;
        uploadLatencyMs: z.ZodNumber;
        extractionLatencyMs: z.ZodNumber;
        solvingLatencyMs: z.ZodNumber;
        validationLatencyMs: z.ZodNumber;
        totalLatencyMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        captureLatencyMs: number;
        uploadLatencyMs: number;
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        validationLatencyMs: number;
        totalLatencyMs: number;
    }, {
        captureLatencyMs: number;
        uploadLatencyMs: number;
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        validationLatencyMs: number;
        totalLatencyMs: number;
    }>;
}, "strip", z.ZodTypeAny, {
    questionId: string;
    extraction: {
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        detectedLanguage?: string | undefined;
        topic?: string | undefined;
    };
    solution: {
        shortAnswer: string;
        fullExplanation: string;
        reasoningSummary: string;
        confidenceScore: number;
        validationStatus: "pass" | "fail" | "low_confidence" | "not_validated";
        selectedOption?: number | undefined;
    };
    performance: {
        captureLatencyMs: number;
        uploadLatencyMs: number;
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        validationLatencyMs: number;
        totalLatencyMs: number;
    };
}, {
    questionId: string;
    extraction: {
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        detectedLanguage?: string | undefined;
        topic?: string | undefined;
    };
    solution: {
        shortAnswer: string;
        fullExplanation: string;
        reasoningSummary: string;
        confidenceScore: number;
        validationStatus: "pass" | "fail" | "low_confidence" | "not_validated";
        selectedOption?: number | undefined;
    };
    performance: {
        captureLatencyMs: number;
        uploadLatencyMs: number;
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        validationLatencyMs: number;
        totalLatencyMs: number;
    };
}>;
export type SolveResponse = z.infer<typeof SolveResponseSchema>;
export declare const ApiErrorSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
        requestId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export declare const QuestionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    sourceUrl: z.ZodOptional<z.ZodString>;
    pageTitle: z.ZodOptional<z.ZodString>;
    sourceType: z.ZodEnum<["upload", "url", "clipboard", "screen"]>;
    extractedText: z.ZodString;
    normalizedText: z.ZodString;
    questionType: z.ZodEnum<["multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"]>;
    topic: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
        order: number;
    }, {
        value: string;
        label: string;
        order: number;
    }>, "many">>;
    shortAnswer: z.ZodOptional<z.ZodString>;
    selectedOption: z.ZodOptional<z.ZodNumber>;
    fullExplanation: z.ZodOptional<z.ZodString>;
    confidenceScore: z.ZodOptional<z.ZodNumber>;
    status: z.ZodEnum<["pending", "solved", "saved", "error"]>;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "error" | "pending" | "solved" | "saved";
    sourceType: "upload" | "url" | "clipboard" | "screen";
    extractedText: string;
    normalizedText: string;
    questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
    id: string;
    createdAt: number;
    updatedAt: number;
    options?: {
        value: string;
        label: string;
        order: number;
    }[] | undefined;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    topic?: string | undefined;
    shortAnswer?: string | undefined;
    selectedOption?: number | undefined;
    fullExplanation?: string | undefined;
    confidenceScore?: number | undefined;
    userId?: string | undefined;
}, {
    status: "error" | "pending" | "solved" | "saved";
    sourceType: "upload" | "url" | "clipboard" | "screen";
    extractedText: string;
    normalizedText: string;
    questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
    id: string;
    createdAt: number;
    updatedAt: number;
    options?: {
        value: string;
        label: string;
        order: number;
    }[] | undefined;
    sourceUrl?: string | undefined;
    pageTitle?: string | undefined;
    topic?: string | undefined;
    shortAnswer?: string | undefined;
    selectedOption?: number | undefined;
    fullExplanation?: string | undefined;
    confidenceScore?: number | undefined;
    userId?: string | undefined;
}>;
export type Question = z.infer<typeof QuestionSchema>;
export declare const QuestionSaveSchema: z.ZodObject<{
    selectedOption: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    selectedOption?: number | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
}, {
    selectedOption?: number | undefined;
    notes?: string | undefined;
    tags?: string[] | undefined;
}>;
export type QuestionSave = z.infer<typeof QuestionSaveSchema>;
export declare const DifficultySchema: z.ZodEnum<["easy", "medium", "hard"]>;
export declare const PracticeGenerationRequestSchema: z.ZodObject<{
    topic: z.ZodString;
    subtopic: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodDefault<z.ZodEnum<["easy", "medium", "hard"]>>;
    count: z.ZodDefault<z.ZodNumber>;
    basedOnQuestionId: z.ZodOptional<z.ZodString>;
    language: z.ZodDefault<z.ZodEnum<["en", "tr"]>>;
    includeExplanations: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    count: number;
    language: "en" | "tr";
    includeExplanations: boolean;
    subtopic?: string | undefined;
    basedOnQuestionId?: string | undefined;
}, {
    topic: string;
    subtopic?: string | undefined;
    difficulty?: "easy" | "medium" | "hard" | undefined;
    count?: number | undefined;
    basedOnQuestionId?: string | undefined;
    language?: "en" | "tr" | undefined;
    includeExplanations?: boolean | undefined;
}>;
export type PracticeGenerationRequest = z.infer<typeof PracticeGenerationRequestSchema>;
export declare const PracticeQuestionSchema: z.ZodObject<{
    questionText: z.ZodString;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        order: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        value: string;
        label: string;
        order: number;
    }, {
        value: string;
        label: string;
        order: number;
    }>, "many">>;
    correctAnswer: z.ZodString;
    explanation: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    difficulty: "easy" | "medium" | "hard";
    questionText: string;
    correctAnswer: string;
    options?: {
        value: string;
        label: string;
        order: number;
    }[] | undefined;
    topic?: string | undefined;
    explanation?: string | undefined;
}, {
    difficulty: "easy" | "medium" | "hard";
    questionText: string;
    correctAnswer: string;
    options?: {
        value: string;
        label: string;
        order: number;
    }[] | undefined;
    topic?: string | undefined;
    explanation?: string | undefined;
}>;
export type PracticeQuestion = z.infer<typeof PracticeQuestionSchema>;
export declare const PracticeGenerationResponseSchema: z.ZodObject<{
    practiceSetId: z.ZodString;
    questions: z.ZodArray<z.ZodObject<{
        questionText: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            order: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label: string;
            order: number;
        }, {
            value: string;
            label: string;
            order: number;
        }>, "many">>;
        correctAnswer: z.ZodString;
        explanation: z.ZodOptional<z.ZodString>;
        difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
        topic: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        difficulty: "easy" | "medium" | "hard";
        questionText: string;
        correctAnswer: string;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        topic?: string | undefined;
        explanation?: string | undefined;
    }, {
        difficulty: "easy" | "medium" | "hard";
        questionText: string;
        correctAnswer: string;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        topic?: string | undefined;
        explanation?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    practiceSetId: string;
    questions: {
        difficulty: "easy" | "medium" | "hard";
        questionText: string;
        correctAnswer: string;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        topic?: string | undefined;
        explanation?: string | undefined;
    }[];
}, {
    practiceSetId: string;
    questions: {
        difficulty: "easy" | "medium" | "hard";
        questionText: string;
        correctAnswer: string;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        topic?: string | undefined;
        explanation?: string | undefined;
    }[];
}>;
export type PracticeGenerationResponse = z.infer<typeof PracticeGenerationResponseSchema>;
export declare const PracticeSetSchema: z.ZodObject<{
    id: z.ZodString;
    topic: z.ZodString;
    subtopic: z.ZodOptional<z.ZodString>;
    difficulty: z.ZodString;
    language: z.ZodString;
    basedOnQuestionId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodNumber;
    questionCount: z.ZodOptional<z.ZodNumber>;
    attemptCount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    id: string;
    createdAt: number;
    difficulty: string;
    language: string;
    subtopic?: string | undefined;
    basedOnQuestionId?: string | undefined;
    questionCount?: number | undefined;
    attemptCount?: number | undefined;
}, {
    topic: string;
    id: string;
    createdAt: number;
    difficulty: string;
    language: string;
    subtopic?: string | undefined;
    basedOnQuestionId?: string | undefined;
    questionCount?: number | undefined;
    attemptCount?: number | undefined;
}>;
export type PracticeSet = z.infer<typeof PracticeSetSchema>;
export declare const PracticeAttemptAnswerSchema: z.ZodObject<{
    questionId: z.ZodString;
    answer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    questionId: string;
    answer: string;
}, {
    questionId: string;
    answer: string;
}>;
export declare const PracticeAttemptRequestSchema: z.ZodObject<{
    answers: z.ZodArray<z.ZodObject<{
        questionId: z.ZodString;
        answer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        questionId: string;
        answer: string;
    }, {
        questionId: string;
        answer: string;
    }>, "many">;
    timeSpentMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    answers: {
        questionId: string;
        answer: string;
    }[];
    timeSpentMs?: number | undefined;
}, {
    answers: {
        questionId: string;
        answer: string;
    }[];
    timeSpentMs?: number | undefined;
}>;
export type PracticeAttemptRequest = z.infer<typeof PracticeAttemptRequestSchema>;
export declare const PracticeAttemptResponseSchema: z.ZodObject<{
    attemptId: z.ZodString;
    score: z.ZodNumber;
    totalQuestions: z.ZodNumber;
    correctCount: z.ZodNumber;
    results: z.ZodArray<z.ZodObject<{
        questionId: z.ZodString;
        correctAnswer: z.ZodString;
        userAnswer: z.ZodString;
        isCorrect: z.ZodBoolean;
        explanation: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        questionId: string;
        correctAnswer: string;
        userAnswer: string;
        isCorrect: boolean;
        explanation?: string | undefined;
    }, {
        questionId: string;
        correctAnswer: string;
        userAnswer: string;
        isCorrect: boolean;
        explanation?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    attemptId: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    results: {
        questionId: string;
        correctAnswer: string;
        userAnswer: string;
        isCorrect: boolean;
        explanation?: string | undefined;
    }[];
}, {
    attemptId: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    results: {
        questionId: string;
        correctAnswer: string;
        userAnswer: string;
        isCorrect: boolean;
        explanation?: string | undefined;
    }[];
}>;
export type PracticeAttemptResponse = z.infer<typeof PracticeAttemptResponseSchema>;
export declare const RecommendedPracticeSchema: z.ZodObject<{
    topic: z.ZodString;
    reason: z.ZodString;
    questionCount: z.ZodNumber;
    difficulty: z.ZodDefault<z.ZodEnum<["easy", "medium", "hard"]>>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    difficulty: "easy" | "medium" | "hard";
    questionCount: number;
    reason: string;
}, {
    topic: string;
    questionCount: number;
    reason: string;
    difficulty?: "easy" | "medium" | "hard" | undefined;
}>;
export type RecommendedPractice = z.infer<typeof RecommendedPracticeSchema>;
export declare const MagicLinkRequestSchema: z.ZodObject<{
    email: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["login", "register"]>>;
}, "strip", z.ZodTypeAny, {
    type: "login" | "register";
    email: string;
}, {
    email: string;
    type?: "login" | "register" | undefined;
}>;
export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;
export declare const MagicLinkVerifySchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type MagicLinkVerify = z.infer<typeof MagicLinkVerifySchema>;
export declare const SessionResponseSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    expiresAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    userId: string;
    email: string | null;
    expiresAt: number;
}, {
    userId: string;
    email: string | null;
    expiresAt: number;
}>;
export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export declare const ExtensionTokenCreateSchema: z.ZodObject<{
    deviceName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deviceName?: string | undefined;
}, {
    deviceName?: string | undefined;
}>;
export type ExtensionTokenCreate = z.infer<typeof ExtensionTokenCreateSchema>;
export declare const ExtensionTokenResponseSchema: z.ZodObject<{
    token: z.ZodString;
    expiresAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    token: string;
    expiresAt: number;
}, {
    token: string;
    expiresAt: number;
}>;
export type ExtensionTokenResponse = z.infer<typeof ExtensionTokenResponseSchema>;
export declare const UserSettingsSchema: z.ZodObject<{
    storeHistory: z.ZodBoolean;
    storeImages: z.ZodBoolean;
    maxHistoryItems: z.ZodNumber;
    explanationLevel: z.ZodEnum<["brief", "standard", "detailed"]>;
    resultMode: z.ZodEnum<["short", "full", "detailed"]>;
    telegramEnabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    explanationLevel: "brief" | "standard" | "detailed";
    resultMode: "detailed" | "short" | "full";
    storeHistory: boolean;
    storeImages: boolean;
    maxHistoryItems: number;
    telegramEnabled: boolean;
}, {
    explanationLevel: "brief" | "standard" | "detailed";
    resultMode: "detailed" | "short" | "full";
    storeHistory: boolean;
    storeImages: boolean;
    maxHistoryItems: number;
    telegramEnabled: boolean;
}>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export declare const UserSettingsUpdateSchema: z.ZodObject<{
    storeHistory: z.ZodOptional<z.ZodBoolean>;
    storeImages: z.ZodOptional<z.ZodBoolean>;
    maxHistoryItems: z.ZodOptional<z.ZodNumber>;
    explanationLevel: z.ZodOptional<z.ZodEnum<["brief", "standard", "detailed"]>>;
    resultMode: z.ZodOptional<z.ZodEnum<["short", "full", "detailed"]>>;
    telegramEnabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    explanationLevel?: "brief" | "standard" | "detailed" | undefined;
    resultMode?: "detailed" | "short" | "full" | undefined;
    storeHistory?: boolean | undefined;
    storeImages?: boolean | undefined;
    maxHistoryItems?: number | undefined;
    telegramEnabled?: boolean | undefined;
}, {
    explanationLevel?: "brief" | "standard" | "detailed" | undefined;
    resultMode?: "detailed" | "short" | "full" | undefined;
    storeHistory?: boolean | undefined;
    storeImages?: boolean | undefined;
    maxHistoryItems?: number | undefined;
    telegramEnabled?: boolean | undefined;
}>;
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;
export declare const UserProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodNumber;
    settings: z.ZodOptional<z.ZodObject<{
        storeHistory: z.ZodBoolean;
        storeImages: z.ZodBoolean;
        maxHistoryItems: z.ZodNumber;
        explanationLevel: z.ZodEnum<["brief", "standard", "detailed"]>;
        resultMode: z.ZodEnum<["short", "full", "detailed"]>;
        telegramEnabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    }, {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: number;
    email: string | null;
    settings?: {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    } | undefined;
}, {
    id: string;
    createdAt: number;
    email: string | null;
    settings?: {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    } | undefined;
}>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export declare const ExportDataResponseSchema: z.ZodObject<{
    exportedAt: z.ZodNumber;
    userId: z.ZodOptional<z.ZodString>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        sourceUrl: z.ZodOptional<z.ZodString>;
        pageTitle: z.ZodOptional<z.ZodString>;
        sourceType: z.ZodEnum<["upload", "url", "clipboard", "screen"]>;
        extractedText: z.ZodString;
        normalizedText: z.ZodString;
        questionType: z.ZodEnum<["multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"]>;
        topic: z.ZodOptional<z.ZodString>;
        options: z.ZodOptional<z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            value: z.ZodString;
            order: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            value: string;
            label: string;
            order: number;
        }, {
            value: string;
            label: string;
            order: number;
        }>, "many">>;
        shortAnswer: z.ZodOptional<z.ZodString>;
        selectedOption: z.ZodOptional<z.ZodNumber>;
        fullExplanation: z.ZodOptional<z.ZodString>;
        confidenceScore: z.ZodOptional<z.ZodNumber>;
        status: z.ZodEnum<["pending", "solved", "saved", "error"]>;
        createdAt: z.ZodNumber;
        updatedAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        status: "error" | "pending" | "solved" | "saved";
        sourceType: "upload" | "url" | "clipboard" | "screen";
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        id: string;
        createdAt: number;
        updatedAt: number;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        sourceUrl?: string | undefined;
        pageTitle?: string | undefined;
        topic?: string | undefined;
        shortAnswer?: string | undefined;
        selectedOption?: number | undefined;
        fullExplanation?: string | undefined;
        confidenceScore?: number | undefined;
        userId?: string | undefined;
    }, {
        status: "error" | "pending" | "solved" | "saved";
        sourceType: "upload" | "url" | "clipboard" | "screen";
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        id: string;
        createdAt: number;
        updatedAt: number;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        sourceUrl?: string | undefined;
        pageTitle?: string | undefined;
        topic?: string | undefined;
        shortAnswer?: string | undefined;
        selectedOption?: number | undefined;
        fullExplanation?: string | undefined;
        confidenceScore?: number | undefined;
        userId?: string | undefined;
    }>, "many">;
    settings: z.ZodOptional<z.ZodObject<{
        storeHistory: z.ZodBoolean;
        storeImages: z.ZodBoolean;
        maxHistoryItems: z.ZodNumber;
        explanationLevel: z.ZodEnum<["brief", "standard", "detailed"]>;
        resultMode: z.ZodEnum<["short", "full", "detailed"]>;
        telegramEnabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    }, {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    questions: {
        status: "error" | "pending" | "solved" | "saved";
        sourceType: "upload" | "url" | "clipboard" | "screen";
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        id: string;
        createdAt: number;
        updatedAt: number;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        sourceUrl?: string | undefined;
        pageTitle?: string | undefined;
        topic?: string | undefined;
        shortAnswer?: string | undefined;
        selectedOption?: number | undefined;
        fullExplanation?: string | undefined;
        confidenceScore?: number | undefined;
        userId?: string | undefined;
    }[];
    exportedAt: number;
    userId?: string | undefined;
    settings?: {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    } | undefined;
}, {
    questions: {
        status: "error" | "pending" | "solved" | "saved";
        sourceType: "upload" | "url" | "clipboard" | "screen";
        extractedText: string;
        normalizedText: string;
        questionType: "multiple_choice" | "true_false" | "short_answer" | "essay" | "fill_blank" | "matching" | "ordering" | "unknown";
        id: string;
        createdAt: number;
        updatedAt: number;
        options?: {
            value: string;
            label: string;
            order: number;
        }[] | undefined;
        sourceUrl?: string | undefined;
        pageTitle?: string | undefined;
        topic?: string | undefined;
        shortAnswer?: string | undefined;
        selectedOption?: number | undefined;
        fullExplanation?: string | undefined;
        confidenceScore?: number | undefined;
        userId?: string | undefined;
    }[];
    exportedAt: number;
    userId?: string | undefined;
    settings?: {
        explanationLevel: "brief" | "standard" | "detailed";
        resultMode: "detailed" | "short" | "full";
        storeHistory: boolean;
        storeImages: boolean;
        maxHistoryItems: number;
        telegramEnabled: boolean;
    } | undefined;
}>;
export type ExportDataResponse = z.infer<typeof ExportDataResponseSchema>;
export declare const TelegramLinkAccountSchema: z.ZodObject<{
    telegramChatId: z.ZodString;
    telegramUsername: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    telegramChatId: string;
    telegramUsername?: string | undefined;
    displayName?: string | undefined;
}, {
    telegramChatId: string;
    telegramUsername?: string | undefined;
    displayName?: string | undefined;
}>;
export type TelegramLinkAccount = z.infer<typeof TelegramLinkAccountSchema>;
export declare const TelegramSendSolutionSchema: z.ZodObject<{
    telegramChatId: z.ZodString;
    questionId: z.ZodString;
    viaTelegram: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    questionId: string;
    telegramChatId: string;
    viaTelegram: boolean;
}, {
    questionId: string;
    telegramChatId: string;
    viaTelegram?: boolean | undefined;
}>;
export type TelegramSendSolution = z.infer<typeof TelegramSendSolutionSchema>;
export declare const TelegramAccountStatusSchema: z.ZodObject<{
    telegramChatId: z.ZodOptional<z.ZodString>;
    isLinked: z.ZodBoolean;
    telegramUsername: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    linkedAt: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    isLinked: boolean;
    telegramChatId?: string | undefined;
    telegramUsername?: string | undefined;
    displayName?: string | undefined;
    linkedAt?: number | undefined;
}, {
    isLinked: boolean;
    telegramChatId?: string | undefined;
    telegramUsername?: string | undefined;
    displayName?: string | undefined;
    linkedAt?: number | undefined;
}>;
export type TelegramAccountStatus = z.infer<typeof TelegramAccountStatusSchema>;
export declare const TelegramAuditAction: {
    readonly LINK_STARTED: "TELEGRAM_LINK_STARTED";
    readonly ACCOUNT_LINKED: "TELEGRAM_ACCOUNT_LINKED";
    readonly SOLUTION_SENT: "TELEGRAM_SOLUTION_SENT";
    readonly IMAGE_SOLVED: "TELEGRAM_IMAGE_SOLVED";
    readonly ACCOUNT_UNLINKED: "TELEGRAM_ACCOUNT_UNLINKED";
};
export declare const AdminOverviewSchema: z.ZodObject<{
    userCount: z.ZodNumber;
    questionCount: z.ZodNumber;
    todaySolveCount: z.ZodNumber;
    errorCountLast24h: z.ZodNumber;
    questionsLast30d: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    questionCount: number;
    userCount: number;
    todaySolveCount: number;
    errorCountLast24h: number;
    questionsLast30d: number;
}, {
    questionCount: number;
    userCount: number;
    todaySolveCount: number;
    errorCountLast24h: number;
    questionsLast30d: number;
}>;
export type AdminOverview = z.infer<typeof AdminOverviewSchema>;
export declare const AdminUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    role: z.ZodString;
    createdAt: z.ZodNumber;
    questionCount: z.ZodNumber;
    lastActiveAt: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: number;
    questionCount: number;
    email: string | null;
    role: string;
    lastActiveAt: number | null;
}, {
    id: string;
    createdAt: number;
    questionCount: number;
    email: string | null;
    role: string;
    lastActiveAt: number | null;
}>;
export declare const PaginatedUsersSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        role: z.ZodString;
        createdAt: z.ZodNumber;
        questionCount: z.ZodNumber;
        lastActiveAt: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: number;
        questionCount: number;
        email: string | null;
        role: string;
        lastActiveAt: number | null;
    }, {
        id: string;
        createdAt: number;
        questionCount: number;
        email: string | null;
        role: string;
        lastActiveAt: number | null;
    }>, "many">;
    meta: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }, {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
}, "strip", z.ZodTypeAny, {
    data: {
        id: string;
        createdAt: number;
        questionCount: number;
        email: string | null;
        role: string;
        lastActiveAt: number | null;
    }[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}, {
    data: {
        id: string;
        createdAt: number;
        questionCount: number;
        email: string | null;
        role: string;
        lastActiveAt: number | null;
    }[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;
export declare const UsageDataPointSchema: z.ZodObject<{
    date: z.ZodString;
    count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    date: string;
    count: number;
}, {
    date: string;
    count: number;
}>;
export declare const UsageStatsSchema: z.ZodObject<{
    series: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        date: string;
        count: number;
    }, {
        date: string;
        count: number;
    }>, "many">;
    period: z.ZodString;
}, "strip", z.ZodTypeAny, {
    series: {
        date: string;
        count: number;
    }[];
    period: string;
}, {
    series: {
        date: string;
        count: number;
    }[];
    period: string;
}>;
export type UsageStats = z.infer<typeof UsageStatsSchema>;
export declare const ErrorBreakdownSchema: z.ZodObject<{
    code: z.ZodString;
    count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    code: string;
    count: number;
}, {
    code: string;
    count: number;
}>;
export declare const ErrorStatsSchema: z.ZodObject<{
    totalErrorsLast24h: z.ZodNumber;
    breakdown: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        code: string;
        count: number;
    }, {
        code: string;
        count: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalErrorsLast24h: number;
    breakdown: {
        code: string;
        count: number;
    }[];
}, {
    totalErrorsLast24h: number;
    breakdown: {
        code: string;
        count: number;
    }[];
}>;
export type ErrorStats = z.infer<typeof ErrorStatsSchema>;
export declare const AuditLogEntrySchema: z.ZodObject<{
    id: z.ZodString;
    adminId: z.ZodString;
    action: z.ZodString;
    target: z.ZodString;
    changes: z.ZodOptional<z.ZodUnknown>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: number;
    adminId: string;
    action: string;
    target: string;
    changes?: unknown;
}, {
    id: string;
    createdAt: number;
    adminId: string;
    action: string;
    target: string;
    changes?: unknown;
}>;
export declare const PaginatedAuditLogSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        adminId: z.ZodString;
        action: z.ZodString;
        target: z.ZodString;
        changes: z.ZodOptional<z.ZodUnknown>;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: number;
        adminId: string;
        action: string;
        target: string;
        changes?: unknown;
    }, {
        id: string;
        createdAt: number;
        adminId: string;
        action: string;
        target: string;
        changes?: unknown;
    }>, "many">;
    meta: z.ZodObject<{
        total: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        total: number;
        offset: number;
    }, {
        limit: number;
        total: number;
        offset: number;
    }>;
}, "strip", z.ZodTypeAny, {
    data: {
        id: string;
        createdAt: number;
        adminId: string;
        action: string;
        target: string;
        changes?: unknown;
    }[];
    meta: {
        limit: number;
        total: number;
        offset: number;
    };
}, {
    data: {
        id: string;
        createdAt: number;
        adminId: string;
        action: string;
        target: string;
        changes?: unknown;
    }[];
    meta: {
        limit: number;
        total: number;
        offset: number;
    };
}>;
export declare const ModelConfigSchema: z.ZodObject<{
    provider: z.ZodString;
    modelName: z.ZodNullable<z.ZodString>;
    fallbackModel: z.ZodNullable<z.ZodString>;
    timeoutMs: z.ZodNumber;
    maxTokens: z.ZodNumber;
    enableValidation: z.ZodBoolean;
    compactMode: z.ZodBoolean;
    updatedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    updatedAt: number;
    provider: string;
    modelName: string | null;
    fallbackModel: string | null;
    timeoutMs: number;
    maxTokens: number;
    enableValidation: boolean;
    compactMode: boolean;
}, {
    updatedAt: number;
    provider: string;
    modelName: string | null;
    fallbackModel: string | null;
    timeoutMs: number;
    maxTokens: number;
    enableValidation: boolean;
    compactMode: boolean;
}>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export declare const RateLimitEntrySchema: z.ZodObject<{
    tier: z.ZodString;
    minute: z.ZodNumber;
    daily: z.ZodNumber;
    monthly: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tier: string;
    minute: number;
    daily: number;
    monthly: number;
}, {
    tier: string;
    minute: number;
    daily: number;
    monthly: number;
}>;
export declare const RateLimitsSchema: z.ZodObject<{
    tiers: z.ZodArray<z.ZodObject<{
        tier: z.ZodString;
        minute: z.ZodNumber;
        daily: z.ZodNumber;
        monthly: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tier: string;
        minute: number;
        daily: number;
        monthly: number;
    }, {
        tier: string;
        minute: number;
        daily: number;
        monthly: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    tiers: {
        tier: string;
        minute: number;
        daily: number;
        monthly: number;
    }[];
}, {
    tiers: {
        tier: string;
        minute: number;
        daily: number;
        monthly: number;
    }[];
}>;
export declare const ModelConfigUpdateSchema: z.ZodObject<{
    provider: z.ZodOptional<z.ZodEnum<["mock", "openai", "openrouter", "anthropic", "gemini"]>>;
    modelName: z.ZodOptional<z.ZodString>;
    fallbackModel: z.ZodOptional<z.ZodString>;
    timeoutMs: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    enableValidation: z.ZodOptional<z.ZodBoolean>;
    compactMode: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    provider?: "mock" | "openai" | "openrouter" | "anthropic" | "gemini" | undefined;
    modelName?: string | undefined;
    fallbackModel?: string | undefined;
    timeoutMs?: number | undefined;
    maxTokens?: number | undefined;
    enableValidation?: boolean | undefined;
    compactMode?: boolean | undefined;
}, {
    provider?: "mock" | "openai" | "openrouter" | "anthropic" | "gemini" | undefined;
    modelName?: string | undefined;
    fallbackModel?: string | undefined;
    timeoutMs?: number | undefined;
    maxTokens?: number | undefined;
    enableValidation?: boolean | undefined;
    compactMode?: boolean | undefined;
}>;
export declare const RateLimitUpdateSchema: z.ZodObject<{
    tier: z.ZodString;
    minute: z.ZodOptional<z.ZodNumber>;
    daily: z.ZodOptional<z.ZodNumber>;
    monthly: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    tier: string;
    minute?: number | undefined;
    daily?: number | undefined;
    monthly?: number | undefined;
}, {
    tier: string;
    minute?: number | undefined;
    daily?: number | undefined;
    monthly?: number | undefined;
}>;
export declare const PlanNameSchema: z.ZodEnum<["free", "pro", "team"]>;
export declare const PlanUsageSchema: z.ZodObject<{
    plan: z.ZodEnum<["free", "pro", "team"]>;
    dailyCount: z.ZodNumber;
    dailyLimit: z.ZodNumber;
    monthlyCount: z.ZodNumber;
    monthlyLimit: z.ZodNumber;
    dailyRemaining: z.ZodNumber;
    monthlyRemaining: z.ZodNumber;
    resetDailyAt: z.ZodNumber;
    resetMonthlyAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    plan: "free" | "pro" | "team";
    dailyCount: number;
    dailyLimit: number;
    monthlyCount: number;
    monthlyLimit: number;
    dailyRemaining: number;
    monthlyRemaining: number;
    resetDailyAt: number;
    resetMonthlyAt: number;
}, {
    plan: "free" | "pro" | "team";
    dailyCount: number;
    dailyLimit: number;
    monthlyCount: number;
    monthlyLimit: number;
    dailyRemaining: number;
    monthlyRemaining: number;
    resetDailyAt: number;
    resetMonthlyAt: number;
}>;
export type PlanUsage = z.infer<typeof PlanUsageSchema>;
export declare const CheckoutRequestSchema: z.ZodObject<{
    plan: z.ZodEnum<["free", "pro", "team"]>;
    provider: z.ZodDefault<z.ZodEnum<["stripe", "paddle"]>>;
    successUrl: z.ZodOptional<z.ZodString>;
    cancelUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "stripe" | "paddle";
    plan: "free" | "pro" | "team";
    successUrl?: string | undefined;
    cancelUrl?: string | undefined;
}, {
    plan: "free" | "pro" | "team";
    provider?: "stripe" | "paddle" | undefined;
    successUrl?: string | undefined;
    cancelUrl?: string | undefined;
}>;
export declare const CheckoutResponseSchema: z.ZodObject<{
    url: z.ZodString;
    sessionId: z.ZodString;
    provider: z.ZodEnum<["stripe", "paddle"]>;
}, "strip", z.ZodTypeAny, {
    url: string;
    provider: "stripe" | "paddle";
    sessionId: string;
}, {
    url: string;
    provider: "stripe" | "paddle";
    sessionId: string;
}>;
export declare const WebhookPayloadSchema: z.ZodObject<{
    provider: z.ZodEnum<["stripe", "paddle"]>;
    eventId: z.ZodString;
    eventType: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    data: Record<string, unknown>;
    provider: "stripe" | "paddle";
    eventId: string;
    eventType: string;
}, {
    data: Record<string, unknown>;
    provider: "stripe" | "paddle";
    eventId: string;
    eventType: string;
}>;
export declare const SubscriptionInfoSchema: z.ZodObject<{
    plan: z.ZodEnum<["free", "pro", "team"]>;
    status: z.ZodEnum<["active", "canceled", "past_due", "trialing", "none"]>;
    provider: z.ZodNullable<z.ZodString>;
    currentPeriodEnd: z.ZodNullable<z.ZodNumber>;
    cancelAtPeriodEnd: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    status: "active" | "canceled" | "past_due" | "trialing" | "none";
    provider: string | null;
    plan: "free" | "pro" | "team";
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
}, {
    status: "active" | "canceled" | "past_due" | "trialing" | "none";
    provider: string | null;
    plan: "free" | "pro" | "team";
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
}>;
export declare const PlanFeatureSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    price: z.ZodObject<{
        monthly: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        monthly: number;
        currency: string;
    }, {
        monthly: number;
        currency: string;
    }>;
    features: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    price: {
        monthly: number;
        currency: string;
    };
    features: string[];
}, {
    id: string;
    name: string;
    price: {
        monthly: number;
        currency: string;
    };
    features: string[];
}>;
export declare const BillingOverviewSchema: z.ZodObject<{
    subscription: z.ZodObject<{
        plan: z.ZodEnum<["free", "pro", "team"]>;
        status: z.ZodEnum<["active", "canceled", "past_due", "trialing", "none"]>;
        provider: z.ZodNullable<z.ZodString>;
        currentPeriodEnd: z.ZodNullable<z.ZodNumber>;
        cancelAtPeriodEnd: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        status: "active" | "canceled" | "past_due" | "trialing" | "none";
        provider: string | null;
        plan: "free" | "pro" | "team";
        currentPeriodEnd: number | null;
        cancelAtPeriodEnd: boolean;
    }, {
        status: "active" | "canceled" | "past_due" | "trialing" | "none";
        provider: string | null;
        plan: "free" | "pro" | "team";
        currentPeriodEnd: number | null;
        cancelAtPeriodEnd: boolean;
    }>;
    usage: z.ZodObject<{
        plan: z.ZodEnum<["free", "pro", "team"]>;
        dailyCount: z.ZodNumber;
        dailyLimit: z.ZodNumber;
        monthlyCount: z.ZodNumber;
        monthlyLimit: z.ZodNumber;
        dailyRemaining: z.ZodNumber;
        monthlyRemaining: z.ZodNumber;
        resetDailyAt: z.ZodNumber;
        resetMonthlyAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        plan: "free" | "pro" | "team";
        dailyCount: number;
        dailyLimit: number;
        monthlyCount: number;
        monthlyLimit: number;
        dailyRemaining: number;
        monthlyRemaining: number;
        resetDailyAt: number;
        resetMonthlyAt: number;
    }, {
        plan: "free" | "pro" | "team";
        dailyCount: number;
        dailyLimit: number;
        monthlyCount: number;
        monthlyLimit: number;
        dailyRemaining: number;
        monthlyRemaining: number;
        resetDailyAt: number;
        resetMonthlyAt: number;
    }>;
    availablePlans: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        price: z.ZodObject<{
            monthly: z.ZodNumber;
            currency: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            monthly: number;
            currency: string;
        }, {
            monthly: number;
            currency: string;
        }>;
        features: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    }, {
        id: string;
        name: string;
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    subscription: {
        status: "active" | "canceled" | "past_due" | "trialing" | "none";
        provider: string | null;
        plan: "free" | "pro" | "team";
        currentPeriodEnd: number | null;
        cancelAtPeriodEnd: boolean;
    };
    usage: {
        plan: "free" | "pro" | "team";
        dailyCount: number;
        dailyLimit: number;
        monthlyCount: number;
        monthlyLimit: number;
        dailyRemaining: number;
        monthlyRemaining: number;
        resetDailyAt: number;
        resetMonthlyAt: number;
    };
    availablePlans: {
        id: string;
        name: string;
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    }[];
}, {
    subscription: {
        status: "active" | "canceled" | "past_due" | "trialing" | "none";
        provider: string | null;
        plan: "free" | "pro" | "team";
        currentPeriodEnd: number | null;
        cancelAtPeriodEnd: boolean;
    };
    usage: {
        plan: "free" | "pro" | "team";
        dailyCount: number;
        dailyLimit: number;
        monthlyCount: number;
        monthlyLimit: number;
        dailyRemaining: number;
        monthlyRemaining: number;
        resetDailyAt: number;
        resetMonthlyAt: number;
    };
    availablePlans: {
        id: string;
        name: string;
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    }[];
}>;
//# sourceMappingURL=schemas.d.ts.map