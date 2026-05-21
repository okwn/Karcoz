import { z } from 'zod';
export declare const EvalDatasetEntrySchema: z.ZodObject<{
    id: z.ZodString;
    language: z.ZodEnum<["tr", "en"]>;
    topic: z.ZodString;
    difficulty: z.ZodEnum<["kolay", "orta", "zor", "easy", "medium", "hard"]>;
    questionText: z.ZodString;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    correctAnswer: z.ZodString;
    imagePath: z.ZodOptional<z.ZodString>;
    expectedNormalizedText: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    language: "tr" | "en";
    topic: string;
    difficulty: "kolay" | "orta" | "zor" | "easy" | "medium" | "hard";
    questionText: string;
    correctAnswer: string;
    options?: string[] | undefined;
    imagePath?: string | undefined;
    expectedNormalizedText?: string | undefined;
}, {
    id: string;
    language: "tr" | "en";
    topic: string;
    difficulty: "kolay" | "orta" | "zor" | "easy" | "medium" | "hard";
    questionText: string;
    correctAnswer: string;
    options?: string[] | undefined;
    imagePath?: string | undefined;
    expectedNormalizedText?: string | undefined;
}>;
export type EvalDatasetEntry = z.infer<typeof EvalDatasetEntrySchema>;
export declare const OcrScoreSchema: z.ZodObject<{
    rawTextMatch: z.ZodBoolean;
    normalizedTextSimilarity: z.ZodNumber;
    characterAccuracy: z.ZodNumber;
    missingTokens: z.ZodArray<z.ZodString, "many">;
    extraTokens: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    rawTextMatch: boolean;
    normalizedTextSimilarity: number;
    characterAccuracy: number;
    missingTokens: string[];
    extraTokens: string[];
}, {
    rawTextMatch: boolean;
    normalizedTextSimilarity: number;
    characterAccuracy: number;
    missingTokens: string[];
    extraTokens: string[];
}>;
export type OcrScore = z.infer<typeof OcrScoreSchema>;
export declare const OptionParseScoreSchema: z.ZodObject<{
    optionsExtracted: z.ZodNumber;
    optionsExpected: z.ZodNumber;
    optionsMatched: z.ZodNumber;
    optionAccuracy: z.ZodNumber;
    matchedOptions: z.ZodArray<z.ZodObject<{
        expected: z.ZodString;
        actual: z.ZodString;
        labelCorrect: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        expected: string;
        actual: string;
        labelCorrect: boolean;
    }, {
        expected: string;
        actual: string;
        labelCorrect: boolean;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    optionsExtracted: number;
    optionsExpected: number;
    optionsMatched: number;
    optionAccuracy: number;
    matchedOptions: {
        expected: string;
        actual: string;
        labelCorrect: boolean;
    }[];
}, {
    optionsExtracted: number;
    optionsExpected: number;
    optionsMatched: number;
    optionAccuracy: number;
    matchedOptions: {
        expected: string;
        actual: string;
        labelCorrect: boolean;
    }[];
}>;
export type OptionParseScore = z.infer<typeof OptionParseScoreSchema>;
export declare const TopicScoreSchema: z.ZodObject<{
    topicMatch: z.ZodBoolean;
    expectedTopic: z.ZodString;
    actualTopic: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    topicMatch: boolean;
    expectedTopic: string;
    actualTopic: string | null;
}, {
    topicMatch: boolean;
    expectedTopic: string;
    actualTopic: string | null;
}>;
export type TopicScore = z.infer<typeof TopicScoreSchema>;
export declare const AnswerScoreSchema: z.ZodObject<{
    exactMatch: z.ZodBoolean;
    labelMatch: z.ZodBoolean;
    correctAnswer: z.ZodString;
    givenAnswer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    correctAnswer: string;
    exactMatch: boolean;
    labelMatch: boolean;
    givenAnswer: string;
}, {
    correctAnswer: string;
    exactMatch: boolean;
    labelMatch: boolean;
    givenAnswer: string;
}>;
export type AnswerScore = z.infer<typeof AnswerScoreSchema>;
export declare const ConfidenceScoreSchema: z.ZodObject<{
    confidenceScore: z.ZodNumber;
    isWellCalibrated: z.ZodBoolean;
    calibrationError: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    confidenceScore: number;
    isWellCalibrated: boolean;
    calibrationError: number;
}, {
    confidenceScore: number;
    isWellCalibrated: boolean;
    calibrationError: number;
}>;
export type ConfidenceScoreResult = z.infer<typeof ConfidenceScoreSchema>;
export declare const LatencyScoreSchema: z.ZodObject<{
    extractionLatencyMs: z.ZodNumber;
    solvingLatencyMs: z.ZodNumber;
    totalLatencyMs: z.ZodNumber;
    withinSla: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    totalLatencyMs: number;
    withinSla: boolean;
}, {
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    totalLatencyMs: number;
    withinSla: boolean;
}>;
export type LatencyScore = z.infer<typeof LatencyScoreSchema>;
export declare const ExplanationScoreSchema: z.ZodObject<{
    hasExplanation: z.ZodBoolean;
    explanationLength: z.ZodNumber;
    explanationQualityHint: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    hasExplanation: boolean;
    explanationLength: number;
    explanationQualityHint?: string | undefined;
}, {
    hasExplanation: boolean;
    explanationLength: number;
    explanationQualityHint?: string | undefined;
}>;
export type ExplanationScore = z.infer<typeof ExplanationScoreSchema>;
export declare const QuestionEvalResultSchema: z.ZodObject<{
    datasetEntryId: z.ZodString;
    timestamp: z.ZodString;
    ocrScore: z.ZodOptional<z.ZodObject<{
        rawTextMatch: z.ZodBoolean;
        normalizedTextSimilarity: z.ZodNumber;
        characterAccuracy: z.ZodNumber;
        missingTokens: z.ZodArray<z.ZodString, "many">;
        extraTokens: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        rawTextMatch: boolean;
        normalizedTextSimilarity: number;
        characterAccuracy: number;
        missingTokens: string[];
        extraTokens: string[];
    }, {
        rawTextMatch: boolean;
        normalizedTextSimilarity: number;
        characterAccuracy: number;
        missingTokens: string[];
        extraTokens: string[];
    }>>;
    optionParseScore: z.ZodOptional<z.ZodObject<{
        optionsExtracted: z.ZodNumber;
        optionsExpected: z.ZodNumber;
        optionsMatched: z.ZodNumber;
        optionAccuracy: z.ZodNumber;
        matchedOptions: z.ZodArray<z.ZodObject<{
            expected: z.ZodString;
            actual: z.ZodString;
            labelCorrect: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            expected: string;
            actual: string;
            labelCorrect: boolean;
        }, {
            expected: string;
            actual: string;
            labelCorrect: boolean;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        optionsExtracted: number;
        optionsExpected: number;
        optionsMatched: number;
        optionAccuracy: number;
        matchedOptions: {
            expected: string;
            actual: string;
            labelCorrect: boolean;
        }[];
    }, {
        optionsExtracted: number;
        optionsExpected: number;
        optionsMatched: number;
        optionAccuracy: number;
        matchedOptions: {
            expected: string;
            actual: string;
            labelCorrect: boolean;
        }[];
    }>>;
    topicScore: z.ZodOptional<z.ZodObject<{
        topicMatch: z.ZodBoolean;
        expectedTopic: z.ZodString;
        actualTopic: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        topicMatch: boolean;
        expectedTopic: string;
        actualTopic: string | null;
    }, {
        topicMatch: boolean;
        expectedTopic: string;
        actualTopic: string | null;
    }>>;
    answerScore: z.ZodObject<{
        exactMatch: z.ZodBoolean;
        labelMatch: z.ZodBoolean;
        correctAnswer: z.ZodString;
        givenAnswer: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        correctAnswer: string;
        exactMatch: boolean;
        labelMatch: boolean;
        givenAnswer: string;
    }, {
        correctAnswer: string;
        exactMatch: boolean;
        labelMatch: boolean;
        givenAnswer: string;
    }>;
    confidenceScore: z.ZodOptional<z.ZodObject<{
        confidenceScore: z.ZodNumber;
        isWellCalibrated: z.ZodBoolean;
        calibrationError: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        confidenceScore: number;
        isWellCalibrated: boolean;
        calibrationError: number;
    }, {
        confidenceScore: number;
        isWellCalibrated: boolean;
        calibrationError: number;
    }>>;
    latencyScore: z.ZodObject<{
        extractionLatencyMs: z.ZodNumber;
        solvingLatencyMs: z.ZodNumber;
        totalLatencyMs: z.ZodNumber;
        withinSla: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        totalLatencyMs: number;
        withinSla: boolean;
    }, {
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        totalLatencyMs: number;
        withinSla: boolean;
    }>;
    explanationScore: z.ZodOptional<z.ZodObject<{
        hasExplanation: z.ZodBoolean;
        explanationLength: z.ZodNumber;
        explanationQualityHint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        hasExplanation: boolean;
        explanationLength: number;
        explanationQualityHint?: string | undefined;
    }, {
        hasExplanation: boolean;
        explanationLength: number;
        explanationQualityHint?: string | undefined;
    }>>;
    passed: z.ZodBoolean;
    passedDimensions: z.ZodArray<z.ZodString, "many">;
    failedDimensions: z.ZodArray<z.ZodString, "many">;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    datasetEntryId: string;
    timestamp: string;
    answerScore: {
        correctAnswer: string;
        exactMatch: boolean;
        labelMatch: boolean;
        givenAnswer: string;
    };
    latencyScore: {
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        totalLatencyMs: number;
        withinSla: boolean;
    };
    passed: boolean;
    passedDimensions: string[];
    failedDimensions: string[];
    confidenceScore?: {
        confidenceScore: number;
        isWellCalibrated: boolean;
        calibrationError: number;
    } | undefined;
    ocrScore?: {
        rawTextMatch: boolean;
        normalizedTextSimilarity: number;
        characterAccuracy: number;
        missingTokens: string[];
        extraTokens: string[];
    } | undefined;
    optionParseScore?: {
        optionsExtracted: number;
        optionsExpected: number;
        optionsMatched: number;
        optionAccuracy: number;
        matchedOptions: {
            expected: string;
            actual: string;
            labelCorrect: boolean;
        }[];
    } | undefined;
    topicScore?: {
        topicMatch: boolean;
        expectedTopic: string;
        actualTopic: string | null;
    } | undefined;
    explanationScore?: {
        hasExplanation: boolean;
        explanationLength: number;
        explanationQualityHint?: string | undefined;
    } | undefined;
    notes?: string | undefined;
}, {
    datasetEntryId: string;
    timestamp: string;
    answerScore: {
        correctAnswer: string;
        exactMatch: boolean;
        labelMatch: boolean;
        givenAnswer: string;
    };
    latencyScore: {
        extractionLatencyMs: number;
        solvingLatencyMs: number;
        totalLatencyMs: number;
        withinSla: boolean;
    };
    passed: boolean;
    passedDimensions: string[];
    failedDimensions: string[];
    confidenceScore?: {
        confidenceScore: number;
        isWellCalibrated: boolean;
        calibrationError: number;
    } | undefined;
    ocrScore?: {
        rawTextMatch: boolean;
        normalizedTextSimilarity: number;
        characterAccuracy: number;
        missingTokens: string[];
        extraTokens: string[];
    } | undefined;
    optionParseScore?: {
        optionsExtracted: number;
        optionsExpected: number;
        optionsMatched: number;
        optionAccuracy: number;
        matchedOptions: {
            expected: string;
            actual: string;
            labelCorrect: boolean;
        }[];
    } | undefined;
    topicScore?: {
        topicMatch: boolean;
        expectedTopic: string;
        actualTopic: string | null;
    } | undefined;
    explanationScore?: {
        hasExplanation: boolean;
        explanationLength: number;
        explanationQualityHint?: string | undefined;
    } | undefined;
    notes?: string | undefined;
}>;
export type QuestionEvalResult = z.infer<typeof QuestionEvalResultSchema>;
export declare const EvalDimensionSummarySchema: z.ZodObject<{
    dimension: z.ZodString;
    total: z.ZodNumber;
    passed: z.ZodNumber;
    rate: z.ZodNumber;
    avgLatencyMs: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    passed: number;
    dimension: string;
    total: number;
    rate: number;
    avgLatencyMs?: number | undefined;
}, {
    passed: number;
    dimension: string;
    total: number;
    rate: number;
    avgLatencyMs?: number | undefined;
}>;
export type EvalDimensionSummary = z.infer<typeof EvalDimensionSummarySchema>;
export declare const EvalReportSchema: z.ZodObject<{
    evalId: z.ZodString;
    runAt: z.ZodString;
    scope: z.ZodEnum<["full", "solver", "ocr"]>;
    datasetName: z.ZodString;
    providerUsed: z.ZodOptional<z.ZodString>;
    datasetSize: z.ZodNumber;
    totalPassed: z.ZodNumber;
    overallPassRate: z.ZodNumber;
    dimensionSummaries: z.ZodArray<z.ZodObject<{
        dimension: z.ZodString;
        total: z.ZodNumber;
        passed: z.ZodNumber;
        rate: z.ZodNumber;
        avgLatencyMs: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        passed: number;
        dimension: string;
        total: number;
        rate: number;
        avgLatencyMs?: number | undefined;
    }, {
        passed: number;
        dimension: string;
        total: number;
        rate: number;
        avgLatencyMs?: number | undefined;
    }>, "many">;
    latencyStats: z.ZodObject<{
        meanMs: z.ZodNumber;
        p50Ms: z.ZodNumber;
        p95Ms: z.ZodNumber;
        p99Ms: z.ZodNumber;
        maxMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        meanMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        maxMs: number;
    }, {
        meanMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        maxMs: number;
    }>;
    confidenceStats: z.ZodObject<{
        mean: z.ZodNumber;
        wellCalibrated: z.ZodNumber;
        totalWithConfidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        mean: number;
        wellCalibrated: number;
        totalWithConfidence: number;
    }, {
        mean: number;
        wellCalibrated: number;
        totalWithConfidence: number;
    }>;
    results: z.ZodArray<z.ZodObject<{
        datasetEntryId: z.ZodString;
        timestamp: z.ZodString;
        ocrScore: z.ZodOptional<z.ZodObject<{
            rawTextMatch: z.ZodBoolean;
            normalizedTextSimilarity: z.ZodNumber;
            characterAccuracy: z.ZodNumber;
            missingTokens: z.ZodArray<z.ZodString, "many">;
            extraTokens: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            rawTextMatch: boolean;
            normalizedTextSimilarity: number;
            characterAccuracy: number;
            missingTokens: string[];
            extraTokens: string[];
        }, {
            rawTextMatch: boolean;
            normalizedTextSimilarity: number;
            characterAccuracy: number;
            missingTokens: string[];
            extraTokens: string[];
        }>>;
        optionParseScore: z.ZodOptional<z.ZodObject<{
            optionsExtracted: z.ZodNumber;
            optionsExpected: z.ZodNumber;
            optionsMatched: z.ZodNumber;
            optionAccuracy: z.ZodNumber;
            matchedOptions: z.ZodArray<z.ZodObject<{
                expected: z.ZodString;
                actual: z.ZodString;
                labelCorrect: z.ZodBoolean;
            }, "strip", z.ZodTypeAny, {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }, {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            optionsExtracted: number;
            optionsExpected: number;
            optionsMatched: number;
            optionAccuracy: number;
            matchedOptions: {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }[];
        }, {
            optionsExtracted: number;
            optionsExpected: number;
            optionsMatched: number;
            optionAccuracy: number;
            matchedOptions: {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }[];
        }>>;
        topicScore: z.ZodOptional<z.ZodObject<{
            topicMatch: z.ZodBoolean;
            expectedTopic: z.ZodString;
            actualTopic: z.ZodNullable<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            topicMatch: boolean;
            expectedTopic: string;
            actualTopic: string | null;
        }, {
            topicMatch: boolean;
            expectedTopic: string;
            actualTopic: string | null;
        }>>;
        answerScore: z.ZodObject<{
            exactMatch: z.ZodBoolean;
            labelMatch: z.ZodBoolean;
            correctAnswer: z.ZodString;
            givenAnswer: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            correctAnswer: string;
            exactMatch: boolean;
            labelMatch: boolean;
            givenAnswer: string;
        }, {
            correctAnswer: string;
            exactMatch: boolean;
            labelMatch: boolean;
            givenAnswer: string;
        }>;
        confidenceScore: z.ZodOptional<z.ZodObject<{
            confidenceScore: z.ZodNumber;
            isWellCalibrated: z.ZodBoolean;
            calibrationError: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            confidenceScore: number;
            isWellCalibrated: boolean;
            calibrationError: number;
        }, {
            confidenceScore: number;
            isWellCalibrated: boolean;
            calibrationError: number;
        }>>;
        latencyScore: z.ZodObject<{
            extractionLatencyMs: z.ZodNumber;
            solvingLatencyMs: z.ZodNumber;
            totalLatencyMs: z.ZodNumber;
            withinSla: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            extractionLatencyMs: number;
            solvingLatencyMs: number;
            totalLatencyMs: number;
            withinSla: boolean;
        }, {
            extractionLatencyMs: number;
            solvingLatencyMs: number;
            totalLatencyMs: number;
            withinSla: boolean;
        }>;
        explanationScore: z.ZodOptional<z.ZodObject<{
            hasExplanation: z.ZodBoolean;
            explanationLength: z.ZodNumber;
            explanationQualityHint: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            hasExplanation: boolean;
            explanationLength: number;
            explanationQualityHint?: string | undefined;
        }, {
            hasExplanation: boolean;
            explanationLength: number;
            explanationQualityHint?: string | undefined;
        }>>;
        passed: z.ZodBoolean;
        passedDimensions: z.ZodArray<z.ZodString, "many">;
        failedDimensions: z.ZodArray<z.ZodString, "many">;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        datasetEntryId: string;
        timestamp: string;
        answerScore: {
            correctAnswer: string;
            exactMatch: boolean;
            labelMatch: boolean;
            givenAnswer: string;
        };
        latencyScore: {
            extractionLatencyMs: number;
            solvingLatencyMs: number;
            totalLatencyMs: number;
            withinSla: boolean;
        };
        passed: boolean;
        passedDimensions: string[];
        failedDimensions: string[];
        confidenceScore?: {
            confidenceScore: number;
            isWellCalibrated: boolean;
            calibrationError: number;
        } | undefined;
        ocrScore?: {
            rawTextMatch: boolean;
            normalizedTextSimilarity: number;
            characterAccuracy: number;
            missingTokens: string[];
            extraTokens: string[];
        } | undefined;
        optionParseScore?: {
            optionsExtracted: number;
            optionsExpected: number;
            optionsMatched: number;
            optionAccuracy: number;
            matchedOptions: {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }[];
        } | undefined;
        topicScore?: {
            topicMatch: boolean;
            expectedTopic: string;
            actualTopic: string | null;
        } | undefined;
        explanationScore?: {
            hasExplanation: boolean;
            explanationLength: number;
            explanationQualityHint?: string | undefined;
        } | undefined;
        notes?: string | undefined;
    }, {
        datasetEntryId: string;
        timestamp: string;
        answerScore: {
            correctAnswer: string;
            exactMatch: boolean;
            labelMatch: boolean;
            givenAnswer: string;
        };
        latencyScore: {
            extractionLatencyMs: number;
            solvingLatencyMs: number;
            totalLatencyMs: number;
            withinSla: boolean;
        };
        passed: boolean;
        passedDimensions: string[];
        failedDimensions: string[];
        confidenceScore?: {
            confidenceScore: number;
            isWellCalibrated: boolean;
            calibrationError: number;
        } | undefined;
        ocrScore?: {
            rawTextMatch: boolean;
            normalizedTextSimilarity: number;
            characterAccuracy: number;
            missingTokens: string[];
            extraTokens: string[];
        } | undefined;
        optionParseScore?: {
            optionsExtracted: number;
            optionsExpected: number;
            optionsMatched: number;
            optionAccuracy: number;
            matchedOptions: {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }[];
        } | undefined;
        topicScore?: {
            topicMatch: boolean;
            expectedTopic: string;
            actualTopic: string | null;
        } | undefined;
        explanationScore?: {
            hasExplanation: boolean;
            explanationLength: number;
            explanationQualityHint?: string | undefined;
        } | undefined;
        notes?: string | undefined;
    }>, "many">;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    evalId: string;
    runAt: string;
    scope: "full" | "solver" | "ocr";
    datasetName: string;
    datasetSize: number;
    totalPassed: number;
    overallPassRate: number;
    dimensionSummaries: {
        passed: number;
        dimension: string;
        total: number;
        rate: number;
        avgLatencyMs?: number | undefined;
    }[];
    latencyStats: {
        meanMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        maxMs: number;
    };
    confidenceStats: {
        mean: number;
        wellCalibrated: number;
        totalWithConfidence: number;
    };
    results: {
        datasetEntryId: string;
        timestamp: string;
        answerScore: {
            correctAnswer: string;
            exactMatch: boolean;
            labelMatch: boolean;
            givenAnswer: string;
        };
        latencyScore: {
            extractionLatencyMs: number;
            solvingLatencyMs: number;
            totalLatencyMs: number;
            withinSla: boolean;
        };
        passed: boolean;
        passedDimensions: string[];
        failedDimensions: string[];
        confidenceScore?: {
            confidenceScore: number;
            isWellCalibrated: boolean;
            calibrationError: number;
        } | undefined;
        ocrScore?: {
            rawTextMatch: boolean;
            normalizedTextSimilarity: number;
            characterAccuracy: number;
            missingTokens: string[];
            extraTokens: string[];
        } | undefined;
        optionParseScore?: {
            optionsExtracted: number;
            optionsExpected: number;
            optionsMatched: number;
            optionAccuracy: number;
            matchedOptions: {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }[];
        } | undefined;
        topicScore?: {
            topicMatch: boolean;
            expectedTopic: string;
            actualTopic: string | null;
        } | undefined;
        explanationScore?: {
            hasExplanation: boolean;
            explanationLength: number;
            explanationQualityHint?: string | undefined;
        } | undefined;
        notes?: string | undefined;
    }[];
    notes?: string | undefined;
    providerUsed?: string | undefined;
}, {
    evalId: string;
    runAt: string;
    scope: "full" | "solver" | "ocr";
    datasetName: string;
    datasetSize: number;
    totalPassed: number;
    overallPassRate: number;
    dimensionSummaries: {
        passed: number;
        dimension: string;
        total: number;
        rate: number;
        avgLatencyMs?: number | undefined;
    }[];
    latencyStats: {
        meanMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        maxMs: number;
    };
    confidenceStats: {
        mean: number;
        wellCalibrated: number;
        totalWithConfidence: number;
    };
    results: {
        datasetEntryId: string;
        timestamp: string;
        answerScore: {
            correctAnswer: string;
            exactMatch: boolean;
            labelMatch: boolean;
            givenAnswer: string;
        };
        latencyScore: {
            extractionLatencyMs: number;
            solvingLatencyMs: number;
            totalLatencyMs: number;
            withinSla: boolean;
        };
        passed: boolean;
        passedDimensions: string[];
        failedDimensions: string[];
        confidenceScore?: {
            confidenceScore: number;
            isWellCalibrated: boolean;
            calibrationError: number;
        } | undefined;
        ocrScore?: {
            rawTextMatch: boolean;
            normalizedTextSimilarity: number;
            characterAccuracy: number;
            missingTokens: string[];
            extraTokens: string[];
        } | undefined;
        optionParseScore?: {
            optionsExtracted: number;
            optionsExpected: number;
            optionsMatched: number;
            optionAccuracy: number;
            matchedOptions: {
                expected: string;
                actual: string;
                labelCorrect: boolean;
            }[];
        } | undefined;
        topicScore?: {
            topicMatch: boolean;
            expectedTopic: string;
            actualTopic: string | null;
        } | undefined;
        explanationScore?: {
            hasExplanation: boolean;
            explanationLength: number;
            explanationQualityHint?: string | undefined;
        } | undefined;
        notes?: string | undefined;
    }[];
    notes?: string | undefined;
    providerUsed?: string | undefined;
}>;
export type EvalReport = z.infer<typeof EvalReportSchema>;
//# sourceMappingURL=types.d.ts.map