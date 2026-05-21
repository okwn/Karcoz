export declare class AIProviderError extends Error {
    readonly code: string;
    readonly provider: string;
    readonly statusCode?: number | undefined;
    readonly details?: unknown | undefined;
    constructor(message: string, code: string, provider: string, statusCode?: number | undefined, details?: unknown | undefined);
}
export declare class ProviderTimeoutError extends AIProviderError {
    constructor(provider: string, timeoutMs: number);
}
export declare class ProviderRateLimitError extends AIProviderError {
    constructor(provider: string, retryAfterMs?: number);
}
export declare class InvalidImageError extends AIProviderError {
    constructor(reason: string);
}
export declare class ImageTooLargeError extends AIProviderError {
    constructor(sizeBytes: number, maxBytes: number);
}
export declare class ExtractionFailedError extends AIProviderError {
    constructor(provider: string, reason: string);
}
export declare class LowConfidenceError extends AIProviderError {
    constructor(confidence: number, threshold: number);
}
export declare class NoQuestionDetectedError extends AIProviderError {
    constructor(provider: string);
}
export declare class FallbackExhaustedError extends AIProviderError {
    constructor(providers: string[]);
}
export declare class ChainError extends Error {
    readonly code: string;
    readonly chainSteps: {
        step: string;
        error: string;
    }[];
    constructor(message: string, code: string, chainSteps: {
        step: string;
        error: string;
    }[]);
}
export declare function isAIProviderError(err: unknown): err is AIProviderError;
export declare function isRetryableError(err: unknown): boolean;
//# sourceMappingURL=errors.d.ts.map