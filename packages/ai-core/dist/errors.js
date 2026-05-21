export class AIProviderError extends Error {
    constructor(message, code, provider, statusCode, details) {
        super(message);
        this.code = code;
        this.provider = provider;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AIProviderError';
    }
}
export class ProviderTimeoutError extends AIProviderError {
    constructor(provider, timeoutMs) {
        super(`Provider ${provider} timed out after ${timeoutMs}ms`, 'PROVIDER_TIMEOUT', provider);
        this.name = 'ProviderTimeoutError';
    }
}
export class ProviderRateLimitError extends AIProviderError {
    constructor(provider, retryAfterMs) {
        super(`Provider ${provider} rate limit exceeded${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`, 'RATE_LIMITED', provider);
        this.name = 'ProviderRateLimitError';
    }
}
export class InvalidImageError extends AIProviderError {
    constructor(reason) {
        super(`Invalid image: ${reason}`, 'INVALID_IMAGE', 'unknown', 400);
        this.name = 'InvalidImageError';
    }
}
export class ImageTooLargeError extends AIProviderError {
    constructor(sizeBytes, maxBytes) {
        super(`Image too large: ${sizeBytes} bytes (max ${maxBytes})`, 'IMAGE_TOO_LARGE', 'unknown', 413);
        this.name = 'ImageTooLargeError';
    }
}
export class ExtractionFailedError extends AIProviderError {
    constructor(provider, reason) {
        super(`Extraction failed via ${provider}: ${reason}`, 'EXTRACTION_FAILED', provider, 422);
        this.name = 'ExtractionFailedError';
    }
}
export class LowConfidenceError extends AIProviderError {
    constructor(confidence, threshold) {
        super(`Low confidence: ${confidence} (threshold ${threshold})`, 'LOW_CONFIDENCE', 'validation');
        this.name = 'LowConfidenceError';
    }
}
export class NoQuestionDetectedError extends AIProviderError {
    constructor(provider) {
        super(`No question detected in image via ${provider}`, 'NO_QUESTION_DETECTED', provider, 422);
        this.name = 'NoQuestionDetectedError';
    }
}
export class FallbackExhaustedError extends AIProviderError {
    constructor(providers) {
        super(`All providers failed: ${providers.join(', ')}`, 'FALLBACK_EXHAUSTED', providers[providers.length - 1]);
        this.name = 'FallbackExhaustedError';
    }
}
export class ChainError extends Error {
    constructor(message, code, chainSteps) {
        super(message);
        this.code = code;
        this.chainSteps = chainSteps;
        this.name = 'ChainError';
    }
}
export function isAIProviderError(err) {
    return err instanceof AIProviderError;
}
export function isRetryableError(err) {
    if (!isAIProviderError(err))
        return false;
    return (err.code === 'PROVIDER_TIMEOUT' ||
        err.code === 'RATE_LIMITED' ||
        err.code === 'RATE_LIMIT_EXCEEDED');
}
//# sourceMappingURL=errors.js.map