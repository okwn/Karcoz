import type { PrismaClient } from '@prisma/client';
export type AuditAction = 'SOLVE_REQUEST' | 'SOLVE_SUCCESS' | 'SOLVE_ERROR' | 'QUESTION_SAVE' | 'QUESTION_VIEW' | 'RATE_LIMIT_EXCEEDED';
export interface AuditLogEntry {
    action: AuditAction;
    questionId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}
export declare function createAuditService(prisma: PrismaClient): {
    log: (entry: AuditLogEntry) => Promise<void>;
    logSolveRequest: (requestId: string, imageBase64?: string, imageUrl?: string) => Promise<void>;
    logSolveSuccess: (questionId: string, latencyMs: number) => Promise<void>;
    logSolveError: (questionId: string, errorCode: string, message: string) => Promise<void>;
    logRateLimitExceeded: (ip: string, endpoint: string) => Promise<void>;
};
//# sourceMappingURL=audit.service.d.ts.map