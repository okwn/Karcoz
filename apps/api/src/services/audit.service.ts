import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

export type AuditAction =
  | 'SOLVE_REQUEST'
  | 'SOLVE_SUCCESS'
  | 'SOLVE_ERROR'
  | 'QUESTION_SAVE'
  | 'QUESTION_VIEW'
  | 'RATE_LIMIT_EXCEEDED';

export interface AuditLogEntry {
  action: AuditAction;
  questionId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function createAuditService(prisma: PrismaClient) {
  async function log(entry: AuditLogEntry): Promise<void> {
    try {
      const details = (entry.details ?? {}) as Prisma.InputJsonObject;
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          questionId: entry.questionId,
          details,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (err) {
      console.error('[AUDIT] Failed to write audit log:', err);
    }
  }

  async function logSolveRequest(requestId: string, imageBase64?: string, imageUrl?: string): Promise<void> {
    await log({
      action: 'SOLVE_REQUEST',
      details: {
        requestId,
        hasImage: !!(imageBase64 || imageUrl),
        timestamp: Date.now(),
      },
    });
  }

  async function logSolveSuccess(questionId: string, latencyMs: number): Promise<void> {
    await log({
      action: 'SOLVE_SUCCESS',
      questionId,
      details: { latencyMs },
    });
  }

  async function logSolveError(questionId: string, errorCode: string, message: string): Promise<void> {
    await log({
      action: 'SOLVE_ERROR',
      questionId,
      details: { errorCode, message },
    });
  }

  async function logRateLimitExceeded(ip: string, endpoint: string): Promise<void> {
    await log({
      action: 'RATE_LIMIT_EXCEEDED',
      details: { ip, endpoint },
    });
  }

  return {
    log,
    logSolveRequest,
    logSolveSuccess,
    logSolveError,
    logRateLimitExceeded,
  };
}