import { createPracticeService } from '../services/practice.service.js';
import { requireSession } from '../middleware/session-auth.js';
import { PracticeGenerationRequestSchema, PracticeAttemptRequestSchema, } from '@karcoz/shared';
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
export function registerPracticeRoutes(app, prisma) {
    const practiceService = createPracticeService(prisma);
    // POST /api/practice/generate
    app.post('/api/practice/generate', { preHandler: requireSession }, async (request, reply) => {
        const userId = request.userId;
        const requestId = generateRequestId();
        const parsed = PracticeGenerationRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request body',
                    details: parsed.error.flatten(),
                    requestId,
                },
            });
        }
        try {
            const result = await practiceService.generatePracticeSet(userId, parsed.data);
            return reply.status(200).send(result);
        }
        catch (err) {
            if (err?.code === 'GENERATION_FAILED') {
                return reply.status(500).send({
                    error: { code: err.code, message: err.message },
                });
            }
            console.error('[PRACTICE/GENERATE] Unexpected error:', err);
            return reply.status(500).send({
                error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId },
            });
        }
    });
    // GET /api/practice/sets
    app.get('/api/practice/sets', { preHandler: requireSession }, async (request, reply) => {
        const userId = request.userId;
        try {
            const sets = await practiceService.getPracticeSets(userId);
            return reply.status(200).send({ data: sets });
        }
        catch (err) {
            console.error('[PRACTICE/SETS] Error:', err);
            return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch practice sets' } });
        }
    });
    // GET /api/practice/sets/:id
    app.get('/api/practice/sets/:id', { preHandler: requireSession }, async (request, reply) => {
        const { id } = request.params;
        const userId = request.userId;
        try {
            const set = await practiceService.getPracticeSet(id, userId);
            if (!set) {
                return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Practice set not found' } });
            }
            return reply.status(200).send(set);
        }
        catch (err) {
            console.error('[PRACTICE/SETS/:id] Error:', err);
            return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch practice set' } });
        }
    });
    // POST /api/practice/sets/:id/attempt
    app.post('/api/practice/sets/:id/attempt', { preHandler: requireSession }, async (request, reply) => {
        const { id } = request.params;
        const userId = request.userId;
        const parsed = PracticeAttemptRequestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'INVALID_REQUEST', message: 'Invalid request body', details: parsed.error.flatten() },
            });
        }
        try {
            const result = await practiceService.submitAttempt(id, userId, parsed.data.answers, parsed.data.timeSpentMs);
            return reply.status(200).send(result);
        }
        catch (err) {
            if (err?.code === 'NOT_FOUND') {
                return reply.status(404).send({ error: { code: 'NOT_FOUND', message: err.message } });
            }
            console.error('[PRACTICE/ATTEMPT] Error:', err);
            return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to submit attempt' } });
        }
    });
    // GET /api/practice/recommended
    app.get('/api/practice/recommended', { preHandler: requireSession }, async (request, reply) => {
        const userId = request.userId;
        const query = request.query;
        const count = Math.min(10, Math.max(1, parseInt(query.count ?? '3', 10)));
        try {
            const recommended = await practiceService.getRecommended(count, userId);
            return reply.status(200).send({ data: recommended });
        }
        catch (err) {
            console.error('[PRACTICE/RECOMMENDED] Error:', err);
            return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recommendations' } });
        }
    });
}
//# sourceMappingURL=practice.routes.js.map