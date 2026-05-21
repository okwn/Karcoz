export function createAuditService(prisma) {
    async function log(entry) {
        try {
            const details = (entry.details ?? {});
            await prisma.auditLog.create({
                data: {
                    action: entry.action,
                    questionId: entry.questionId,
                    details,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                },
            });
        }
        catch (err) {
            console.error('[AUDIT] Failed to write audit log:', err);
        }
    }
    async function logSolveRequest(requestId, imageBase64, imageUrl) {
        await log({
            action: 'SOLVE_REQUEST',
            details: {
                requestId,
                hasImage: !!(imageBase64 || imageUrl),
                timestamp: Date.now(),
            },
        });
    }
    async function logSolveSuccess(questionId, latencyMs) {
        await log({
            action: 'SOLVE_SUCCESS',
            questionId,
            details: { latencyMs },
        });
    }
    async function logSolveError(questionId, errorCode, message) {
        await log({
            action: 'SOLVE_ERROR',
            questionId,
            details: { errorCode, message },
        });
    }
    async function logRateLimitExceeded(ip, endpoint) {
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
//# sourceMappingURL=audit.service.js.map