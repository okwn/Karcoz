import type { PrismaClient } from '@prisma/client';
import type { SolveImageRequest, SolveTextRequest } from '@karcoz/shared';
import type { Extraction } from '@karcoz/shared';
import type { Solution } from '@karcoz/shared';
import type { PerformanceMetrics } from '@karcoz/shared';
export interface SolveContext {
    requestId: string;
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
}
export interface SolveServiceResult {
    questionId: string;
    extraction: Extraction;
    solution: Solution;
    performance: PerformanceMetrics;
}
declare const ERRORS: {
    readonly INVALID_IMAGE: {
        readonly code: "INVALID_IMAGE";
        readonly message: "Invalid or malformed image data";
        readonly httpStatus: 400;
    };
    readonly IMAGE_TOO_LARGE: {
        readonly code: "IMAGE_TOO_LARGE";
        readonly message: "Image exceeds maximum size limit";
        readonly httpStatus: 413;
    };
    readonly NO_QUESTION_DETECTED: {
        readonly code: "NO_QUESTION_DETECTED";
        readonly message: "No question text could be detected in the image";
        readonly httpStatus: 422;
    };
    readonly LOW_CONFIDENCE: {
        readonly code: "LOW_CONFIDENCE";
        readonly message: "Question extraction confidence too low";
        readonly httpStatus: 422;
    };
    readonly PROVIDER_TIMEOUT: {
        readonly code: "PROVIDER_TIMEOUT";
        readonly message: "AI provider request timed out";
        readonly httpStatus: 504;
    };
    readonly RATE_LIMITED: {
        readonly code: "RATE_LIMITED";
        readonly message: "Rate limit exceeded";
        readonly httpStatus: 429;
    };
};
export type KarcozError = (typeof ERRORS)[keyof typeof ERRORS] & {
    details?: unknown;
};
declare function isKarcozError(err: unknown): err is KarcozError;
export declare function createSolveService(prisma: PrismaClient): {
    solveFromImage: (request: SolveImageRequest, ctx: SolveContext) => Promise<SolveServiceResult>;
    solveFromText: (request: SolveTextRequest, ctx: SolveContext) => Promise<SolveServiceResult>;
    auditService: {
        log: (entry: import("./audit.service.js").AuditLogEntry) => Promise<void>;
        logSolveRequest: (requestId: string, imageBase64?: string, imageUrl?: string) => Promise<void>;
        logSolveSuccess: (questionId: string, latencyMs: number) => Promise<void>;
        logSolveError: (questionId: string, errorCode: string, message: string) => Promise<void>;
        logRateLimitExceeded: (ip: string, endpoint: string) => Promise<void>;
    };
    usageService: {
        getUsageCount: (userId: string | undefined, endpoint: string, period: import("./usage.service.js").UsagePeriod) => Promise<number>;
        incrementUsage: (userId: string | undefined, endpoint: string, period: import("./usage.service.js").UsagePeriod) => Promise<void>;
        checkLimit: (userId: string | undefined, endpoint: string, tier?: string) => Promise<import("./usage.service.js").UsageCount | {
            exceeded: true;
            retryAfter: number;
        }>;
        getRateLimitConfig: (tier: string) => Promise<import("./usage.service.js").RateLimitConfig>;
        setRateLimitConfig: (tier: string, config: import("./usage.service.js").RateLimitConfig) => Promise<void>;
        DEFAULT_LIMITS: Record<string, import("./usage.service.js").RateLimitConfig>;
    };
    isKarcozError: typeof isKarcozError;
    ERRORS: {
        readonly INVALID_IMAGE: {
            readonly code: "INVALID_IMAGE";
            readonly message: "Invalid or malformed image data";
            readonly httpStatus: 400;
        };
        readonly IMAGE_TOO_LARGE: {
            readonly code: "IMAGE_TOO_LARGE";
            readonly message: "Image exceeds maximum size limit";
            readonly httpStatus: 413;
        };
        readonly NO_QUESTION_DETECTED: {
            readonly code: "NO_QUESTION_DETECTED";
            readonly message: "No question text could be detected in the image";
            readonly httpStatus: 422;
        };
        readonly LOW_CONFIDENCE: {
            readonly code: "LOW_CONFIDENCE";
            readonly message: "Question extraction confidence too low";
            readonly httpStatus: 422;
        };
        readonly PROVIDER_TIMEOUT: {
            readonly code: "PROVIDER_TIMEOUT";
            readonly message: "AI provider request timed out";
            readonly httpStatus: 504;
        };
        readonly RATE_LIMITED: {
            readonly code: "RATE_LIMITED";
            readonly message: "Rate limit exceeded";
            readonly httpStatus: 429;
        };
    };
    recordUsage: (userId: string, endpoint: string) => Promise<void>;
};
export { ERRORS };
//# sourceMappingURL=solve.service.d.ts.map