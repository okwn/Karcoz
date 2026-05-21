import { createUsageService } from '../services/usage.service.js';
import { createUsageLimitService } from '../services/usage-limit.service.js';
/**
 * Maps Fastify routes → usage event types for plan limit enforcement.
 * Routes not listed here are not subject to plan solve limits.
 */
const ENDPOINT_TO_EVENT = {
    '/api/solve/image': 'solve_image',
    '/api/solve/text': 'solve',
    '/api/practice/generate': 'practice_generate',
};
function mapEndpointToEvent(url) {
    for (const [pattern, eventType] of Object.entries(ENDPOINT_TO_EVENT)) {
        if (url.startsWith(pattern))
            return eventType;
    }
    return null;
}
export function registerRateLimitMiddleware(app, prisma) {
    const usageService = createUsageService(prisma);
    const usageLimitService = createUsageLimitService(prisma);
    app.addHook('preHandler', async (request, reply) => {
        const endpoint = request.url;
        const userId = request.userId;
        // Tier from plan limits (only for authenticated users)
        const tier = userId
            ? await usageLimitService.getUserPlan(userId)
            : 'free';
        // Standard endpoint rate-limit check
        const limitResult = await usageService.checkLimit(userId, endpoint, tier);
        if ('exceeded' in limitResult) {
            reply.header('Retry-After', String(limitResult.retryAfter));
            reply.header('X-RateLimit-Remaining', '0');
            return reply.status(429).send({
                error: {
                    code: 'RATE_LIMITED',
                    message: `Rate limit exceeded. Try again in ${limitResult.retryAfter} seconds.`,
                    retryAfter: limitResult.retryAfter,
                },
            });
        }
        reply.header('X-RateLimit-Limit', String(limitResult.limit));
        reply.header('X-RateLimit-Remaining', String(limitResult.remaining));
        // Plan solve limit check (only for solve/practice endpoints)
        if (userId) {
            const eventType = mapEndpointToEvent(endpoint);
            if (eventType === 'solve' || eventType === 'solve_image') {
                const limitCheck = await usageLimitService.checkSolveLimit(userId);
                if (!limitCheck.allowed) {
                    reply.header('X-Plan-Limit-Reached', 'true');
                    return reply.status(429).send({
                        error: {
                            code: 'PLAN_LIMIT_EXCEEDED',
                            message: limitCheck.reason,
                            usage: {
                                ...limitCheck.usage,
                                resetDailyAt: limitCheck.usage.resetDailyAt.getTime(),
                                resetMonthlyAt: limitCheck.usage.resetMonthlyAt.getTime(),
                            },
                        },
                    });
                }
            }
        }
    });
    app.addHook('onResponse', async (request, reply) => {
        const endpoint = request.url;
        const userId = request.userId;
        await usageService.incrementUsage(userId, endpoint, 'minute');
        await usageService.incrementUsage(userId, endpoint, 'daily');
        // Record plan usage event
        if (userId) {
            const eventType = mapEndpointToEvent(endpoint);
            if (eventType) {
                await usageLimitService.recordUsage(userId, eventType);
            }
        }
    });
}
//# sourceMappingURL=rate-limit.js.map