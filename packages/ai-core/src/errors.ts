export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class ProviderTimeoutError extends AIProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(
      `Provider ${provider} timed out after ${timeoutMs}ms`,
      'PROVIDER_TIMEOUT',
      provider
    );
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderRateLimitError extends AIProviderError {
  constructor(provider: string, retryAfterMs?: number) {
    super(
      `Provider ${provider} rate limit exceeded${retryAfterMs ? `, retry after ${retryAfterMs}ms` : ''}`,
      'RATE_LIMITED',
      provider
    );
    this.name = 'ProviderRateLimitError';
  }
}

export class InvalidImageError extends AIProviderError {
  constructor(reason: string) {
    super(`Invalid image: ${reason}`, 'INVALID_IMAGE', 'unknown', 400);
    this.name = 'InvalidImageError';
  }
}

export class ImageTooLargeError extends AIProviderError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `Image too large: ${sizeBytes} bytes (max ${maxBytes})`,
      'IMAGE_TOO_LARGE',
      'unknown',
      413
    );
    this.name = 'ImageTooLargeError';
  }
}

export class ExtractionFailedError extends AIProviderError {
  constructor(provider: string, reason: string) {
    super(
      `Extraction failed via ${provider}: ${reason}`,
      'EXTRACTION_FAILED',
      provider,
      422
    );
    this.name = 'ExtractionFailedError';
  }
}

export class LowConfidenceError extends AIProviderError {
  constructor(confidence: number, threshold: number) {
    super(
      `Low confidence: ${confidence} (threshold ${threshold})`,
      'LOW_CONFIDENCE',
      'validation'
    );
    this.name = 'LowConfidenceError';
  }
}

export class NoQuestionDetectedError extends AIProviderError {
  constructor(provider: string) {
    super(
      `No question detected in image via ${provider}`,
      'NO_QUESTION_DETECTED',
      provider,
      422
    );
    this.name = 'NoQuestionDetectedError';
  }
}

export class FallbackExhaustedError extends AIProviderError {
  constructor(providers: string[]) {
    super(
      `All providers failed: ${providers.join(', ')}`,
      'FALLBACK_EXHAUSTED',
      providers[providers.length - 1]
    );
    this.name = 'FallbackExhaustedError';
  }
}

export class ChainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly chainSteps: { step: string; error: string }[]
  ) {
    super(message);
    this.name = 'ChainError';
  }
}

export function isAIProviderError(err: unknown): err is AIProviderError {
  return err instanceof AIProviderError;
}

export function isRetryableError(err: unknown): boolean {
  if (!isAIProviderError(err)) return false;
  return (
    err.code === 'PROVIDER_TIMEOUT' ||
    err.code === 'RATE_LIMITED' ||
    err.code === 'RATE_LIMIT_EXCEEDED'
  );
}