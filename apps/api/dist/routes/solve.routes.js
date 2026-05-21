import { SolveImageRequestSchema, SolveTextRequestSchema } from '@karcoz/shared';
import { createSolveService } from '../services/solve.service.js';
import { createUsageLimitService } from '../services/usage-limit.service.js';
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
export function registerSolveRoutes(app, prisma) {
    const solveService = createSolveService(prisma);
    const usageLimitService = createUsageLimitService(prisma);
    app.post('/api/solve/image', { preHandler: async (req, reply) => {
            // Extension auth sets req.userId if valid bearer token provided
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const { AuthService } = await import('../services/auth.service.js');
                const authSvc = new AuthService(prisma);
                try {
                    const result = await authSvc.validateExtensionToken(authHeader.slice(7));
                    if (result)
                        req.userId = result.userId;
                }
                catch { }
            }
        } }, async (request, reply) => {
        const requestId = generateRequestId();
        const parsed = SolveImageRequestSchema.safeParse(request.body);
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
        const ctx = {
            requestId,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            userId: request.userId,
        };
        // Check plan quota before solving (authenticated users only)
        if (ctx.userId) {
            const limitCheck = await usageLimitService.checkSolveLimit(ctx.userId);
            if (!limitCheck.allowed) {
                return reply.status(429).send({
                    error: {
                        code: 'QUOTA_EXCEEDED',
                        message: limitCheck.reason,
                        details: {
                            plan: limitCheck.usage.plan,
                            dailyLimit: limitCheck.usage.dailyLimit,
                            monthlyLimit: limitCheck.usage.monthlyLimit,
                            resetDailyAt: limitCheck.usage.resetDailyAt.getTime(),
                            resetMonthlyAt: limitCheck.usage.resetMonthlyAt.getTime(),
                        },
                        requestId,
                    },
                });
            }
        }
        try {
            const result = await solveService.solveFromImage(parsed.data, ctx);
            // Record usage for authenticated users (maps to 'solve' for quota enforcement)
            if (ctx.userId) {
                await solveService.recordUsage(ctx.userId, 'solve');
            }
            return reply.status(200).send(result);
        }
        catch (err) {
            if (solveService.isKarcozError(err)) {
                const karcozErr = err;
                return reply.status(karcozErr.httpStatus).send({
                    error: {
                        code: karcozErr.code,
                        message: karcozErr.message,
                        details: karcozErr.details,
                        requestId,
                    },
                });
            }
            console.error('[SOLVE/IMAGE] Unexpected error:', err);
            return reply.status(500).send({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred',
                    requestId,
                },
            });
        }
    });
    app.post('/api/solve/text', { preHandler: async (req, reply) => {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const { AuthService } = await import('../services/auth.service.js');
                const authSvc = new AuthService(prisma);
                try {
                    const result = await authSvc.validateExtensionToken(authHeader.slice(7));
                    if (result)
                        req.userId = result.userId;
                }
                catch { }
            }
        } }, async (request, reply) => {
        const requestId = generateRequestId();
        const parsed = SolveTextRequestSchema.safeParse(request.body);
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
        const ctx = {
            requestId,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            userId: request.userId,
        };
        // Check plan quota before solving (authenticated users only)
        if (ctx.userId) {
            const limitCheck = await usageLimitService.checkSolveLimit(ctx.userId);
            if (!limitCheck.allowed) {
                return reply.status(429).send({
                    error: {
                        code: 'QUOTA_EXCEEDED',
                        message: limitCheck.reason,
                        details: {
                            plan: limitCheck.usage.plan,
                            dailyLimit: limitCheck.usage.dailyLimit,
                            monthlyLimit: limitCheck.usage.monthlyLimit,
                            resetDailyAt: limitCheck.usage.resetDailyAt.getTime(),
                            resetMonthlyAt: limitCheck.usage.resetMonthlyAt.getTime(),
                        },
                        requestId,
                    },
                });
            }
        }
        try {
            const result = await solveService.solveFromText(parsed.data, ctx);
            if (ctx.userId) {
                await solveService.recordUsage(ctx.userId, 'solve');
            }
            return reply.status(200).send(result);
        }
        catch (err) {
            if (solveService.isKarcozError(err)) {
                const karcozErr = err;
                return reply.status(karcozErr.httpStatus).send({
                    error: {
                        code: karcozErr.code,
                        message: karcozErr.message,
                        details: karcozErr.details,
                        requestId,
                    },
                });
            }
            console.error('[SOLVE/TEXT] Unexpected error:', err);
            return reply.status(500).send({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred',
                    requestId,
                },
            });
        }
    });
    app.get('/api/questions/:id', async (request, reply) => {
        const { id } = request.params;
        const question = await prisma.question.findUnique({ where: { id } });
        if (!question) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'Question not found' },
            });
        }
        return reply.status(200).send(question);
    });
    app.get('/api/questions/history', async (request, reply) => {
        const query = request.query;
        const page = Math.max(1, parseInt(query.page ?? '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
        const skip = (page - 1) * limit;
        const [questions, total] = await Promise.all([
            prisma.question.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.question.count(),
        ]);
        return reply.status(200).send({
            data: questions,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    });
    app.post('/api/questions/:id/save', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        const question = await prisma.question.findUnique({ where: { id } });
        if (!question) {
            return reply.status(404).send({
                error: { code: 'NOT_FOUND', message: 'Question not found' },
            });
        }
        const save = await prisma.questionSave.create({
            data: {
                questionId: id,
                selectedOption: body.selectedOption,
                notes: body.notes,
                tags: body.tags ?? [],
            },
        });
        await prisma.question.update({
            where: { id },
            data: { status: 'saved' },
        });
        return reply.status(201).send(save);
    });
}
//# sourceMappingURL=solve.routes.js.map