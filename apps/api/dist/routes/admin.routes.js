import { AdminService } from '../services/admin.service.js';
import { ModelConfigUpdateSchema, RateLimitUpdateSchema, } from '@karcoz/shared';
import { requireSession } from '../middleware/session-auth.js';
import { requireAdmin } from '../middleware/admin-auth.js';
export function registerAdminRoutes(app, prisma) {
    const adminService = new AdminService(prisma);
    // All admin routes require session + admin role
    const adminPreHandler = [requireSession, requireAdmin];
    // ── GET /api/admin/overview ───────────────────────────────────────────────
    app.get('/api/admin/overview', { preHandler: adminPreHandler }, async (_req, reply) => {
        const overview = await adminService.getAdminOverview();
        return reply.send(overview);
    });
    // ── GET /api/admin/users ──────────────────────────────────────────────────
    app.get('/api/admin/users', { preHandler: adminPreHandler }, async (req, reply) => {
        const query = req.query;
        const page = Math.max(1, parseInt(query.page ?? '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
        const result = await adminService.listUsers(page, limit);
        return reply.send(result);
    });
    // ── GET /api/admin/usage ───────────────────────────────────────────────────
    app.get('/api/admin/usage', { preHandler: adminPreHandler }, async (req, reply) => {
        const query = req.query;
        const days = Math.min(365, Math.max(1, parseInt(query.days ?? '30', 10)));
        const stats = await adminService.getUsageStats(days);
        return reply.send(stats);
    });
    // ── GET /api/admin/audit ───────────────────────────────────────────────────
    app.get('/api/admin/audit', { preHandler: adminPreHandler }, async (req, reply) => {
        const query = req.query;
        const limit = Math.min(200, Math.max(1, parseInt(query.limit ?? '50', 10)));
        const offset = Math.max(0, parseInt(query.offset ?? '0', 10));
        const logs = await adminService.getAuditLogs(limit, offset);
        return reply.send(logs);
    });
    // ── GET /api/admin/errors ──────────────────────────────────────────────────
    app.get('/api/admin/errors', { preHandler: adminPreHandler }, async (_req, reply) => {
        const stats = await adminService.getErrorStats();
        return reply.send(stats);
    });
    // ── GET /api/admin/latency ────────────────────────────────────────────────
    app.get('/api/admin/latency', { preHandler: adminPreHandler }, async (req, reply) => {
        const query = req.query;
        const limit = Math.min(5000, Math.max(10, parseInt(query.limit ?? '1000', 10)));
        const stats = await adminService.getSolveLatencyStats(limit);
        return reply.send(stats);
    });
    // ── GET /api/admin/models ──────────────────────────────────────────────────
    app.get('/api/admin/models', { preHandler: adminPreHandler }, async (_req, reply) => {
        const [config, providers] = await Promise.all([
            adminService.getModelConfig(),
            Promise.resolve(adminService.getAvailableProviders()),
        ]);
        return reply.send({ config, providers });
    });
    // ── PATCH /api/admin/models ────────────────────────────────────────────────
    app.patch('/api/admin/models', { preHandler: adminPreHandler }, async (req, reply) => {
        const parsed = ModelConfigUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.code(400).send({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request body',
                    details: parsed.error.flatten(),
                },
            });
        }
        const adminId = req.userId;
        const updated = await adminService.updateModelConfig(adminId, parsed.data);
        return reply.send(updated);
    });
    // ── GET /api/admin/rate-limits ────────────────────────────────────────────
    app.get('/api/admin/rate-limits', { preHandler: adminPreHandler }, async (_req, reply) => {
        const tiers = await adminService.getRateLimits();
        return reply.send(tiers);
    });
    // ── PATCH /api/admin/rate-limits ───────────────────────────────────────────
    app.patch('/api/admin/rate-limits', { preHandler: adminPreHandler }, async (req, reply) => {
        const parsed = RateLimitUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return reply.code(400).send({
                error: {
                    code: 'INVALID_REQUEST',
                    message: 'Invalid request body',
                    details: parsed.error.flatten(),
                },
            });
        }
        const adminId = req.userId;
        const { tier, ...patch } = parsed.data;
        try {
            const updated = await adminService.updateRateLimit(adminId, tier, patch);
            return reply.send(updated);
        }
        catch (err) {
            if (err instanceof Error && err.message === 'TIER_NOT_FOUND') {
                return reply.code(404).send({
                    error: { code: 'NOT_FOUND', message: `Rate limit tier '${tier}' not found` },
                });
            }
            throw err;
        }
    });
}
//# sourceMappingURL=admin.routes.js.map