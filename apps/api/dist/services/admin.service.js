import { PROVIDER_MODELS } from '@karcoz/ai-core';
export class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ── Overview ───────────────────────────────────────────────────────────────
    async getAdminOverview() {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [userCount, questionCount, todaySolveCount, errorCount, recentQuestions] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.question.count(),
            this.prisma.question.count({
                where: { createdAt: { gte: twentyFourHoursAgo } },
            }),
            this.prisma.question.count({
                where: { status: 'error', createdAt: { gte: twentyFourHoursAgo } },
            }),
            this.prisma.question.count({
                where: { createdAt: { gte: thirtyDaysAgo } },
            }),
        ]);
        return {
            userCount,
            questionCount,
            todaySolveCount,
            errorCountLast24h: errorCount,
            questionsLast30d: recentQuestions,
        };
    }
    // ── Users ──────────────────────────────────────────────────────────────────
    async listUsers(page, limit) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    _count: { select: { questions: true, sessions: true } },
                    sessions: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: { createdAt: true },
                    },
                },
            }),
            this.prisma.user.count(),
        ]);
        return {
            data: users.map((u) => ({
                id: u.id,
                email: u.email,
                role: u.role,
                createdAt: u.createdAt.getTime(),
                questionCount: u._count.questions,
                lastActiveAt: u.sessions[0]?.createdAt.getTime() ?? null,
            })),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    // ── Usage ───────────────────────────────────────────────────────────────────
    async getUsageStats(days = 30) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const records = await this.prisma.question.findMany({
            where: { createdAt: { gte: since } },
            select: { createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        // Group by day
        const byDay = new Map();
        for (const r of records) {
            const key = r.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
            byDay.set(key, (byDay.get(key) ?? 0) + 1);
        }
        const series = Array.from(byDay.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({ date, count }));
        return { series, period: `last_${days}_days` };
    }
    // ── Latency ─────────────────────────────────────────────────────────────────
    async getSolveLatencyStats(limit = 1000) {
        // Retrieve actual latency measurements from audit logs
        const recentLogs = await this.prisma.auditLog.findMany({
            where: { action: 'SOLVE_SUCCESS' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: { details: true, createdAt: true },
        });
        const latencies = recentLogs
            .map(log => {
            const d = log.details;
            return typeof d?.latencyMs === 'number' ? d.latencyMs : null;
        })
            .filter((v) => v !== null)
            .sort((a, b) => a - b);
        if (latencies.length === 0) {
            return {
                sampleSize: 0,
                estimatedP50Ms: null,
                estimatedP95Ms: null,
                note: 'No latency data yet — solve some questions to collect metrics',
            };
        }
        const p50Idx = Math.floor(latencies.length * 0.5);
        const p95Idx = Math.floor(latencies.length * 0.95);
        const p99Idx = Math.floor(latencies.length * 0.99);
        const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
        return {
            sampleSize: latencies.length,
            avgMs: Math.round(avg),
            p50Ms: latencies[p50Idx] ?? null,
            p95Ms: latencies[p95Idx] ?? null,
            p99Ms: latencies[p99Idx] ?? null,
            minMs: latencies[0] ?? null,
            maxMs: latencies[latencies.length - 1] ?? null,
        };
    }
    // ── Errors ─────────────────────────────────────────────────────────────────
    async getErrorStats() {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        // Use structured error codes from audit logs
        const recentErrors = await this.prisma.auditLog.findMany({
            where: {
                action: 'SOLVE_ERROR',
                createdAt: { gte: since },
            },
            select: { details: true },
        });
        // Group by structured error code
        const grouped = {};
        for (const log of recentErrors) {
            const d = log.details;
            const code = d?.errorCode ?? 'UNKNOWN';
            grouped[code] = (grouped[code] ?? 0) + 1;
        }
        const breakdown = Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([code, count]) => ({ code, count }));
        return {
            totalErrorsLast24h: recentErrors.length,
            breakdown,
        };
    }
    // ── Audit ──────────────────────────────────────────────────────────────────
    async getAuditLogs(limit = 50, offset = 0) {
        const [logs, total] = await Promise.all([
            this.prisma.adminAuditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.adminAuditLog.count(),
        ]);
        return {
            data: logs.map((l) => ({
                id: l.id,
                adminId: l.adminId,
                action: l.action,
                target: l.target,
                changes: l.changes,
                createdAt: l.createdAt.getTime(),
            })),
            meta: {
                total,
                limit,
                offset,
            },
        };
    }
    // ── Model Config ────────────────────────────────────────────────────────────
    async getModelConfig() {
        let config = await this.prisma.modelConfig.findUnique({
            where: { id: 'default' },
        });
        if (!config) {
            // Seed default
            config = await this.prisma.modelConfig.create({
                data: { id: 'default' },
            });
        }
        return {
            provider: config.provider,
            modelName: config.modelName,
            fallbackModel: config.fallbackModel,
            timeoutMs: config.timeoutMs,
            maxTokens: config.maxTokens,
            enableValidation: config.enableValidation,
            compactMode: config.compactMode,
            updatedAt: config.updatedAt.getTime(),
        };
    }
    async updateModelConfig(adminId, patch) {
        const before = await this.prisma.modelConfig.upsert({
            where: { id: 'default' },
            create: { id: 'default' },
            update: {},
        });
        const updated = await this.prisma.modelConfig.update({
            where: { id: 'default' },
            data: patch,
        });
        await this.prisma.adminAuditLog.create({
            data: {
                adminId,
                action: 'UPDATE_MODEL_CONFIG',
                target: 'ModelConfig',
                changes: {
                    before: {
                        provider: before.provider,
                        modelName: before.modelName,
                        timeoutMs: before.timeoutMs,
                    },
                    after: {
                        provider: updated.provider,
                        modelName: updated.modelName,
                        timeoutMs: updated.timeoutMs,
                    },
                },
            },
        });
        return {
            provider: updated.provider,
            modelName: updated.modelName,
            fallbackModel: updated.fallbackModel,
            timeoutMs: updated.timeoutMs,
            maxTokens: updated.maxTokens,
            enableValidation: updated.enableValidation,
            compactMode: updated.compactMode,
            updatedAt: updated.updatedAt.getTime(),
        };
    }
    // ── Rate Limits ────────────────────────────────────────────────────────────
    async getRateLimits() {
        const tiers = await this.prisma.rateLimitConfig.findMany({
            orderBy: { tier: 'asc' },
        });
        return { tiers };
    }
    async updateRateLimit(adminId, tier, patch) {
        const existing = await this.prisma.rateLimitConfig.findUnique({
            where: { tier },
        });
        if (!existing) {
            throw new Error('TIER_NOT_FOUND');
        }
        const updated = await this.prisma.rateLimitConfig.update({
            where: { tier },
            data: patch,
        });
        await this.prisma.adminAuditLog.create({
            data: {
                adminId,
                action: 'UPDATE_RATE_LIMIT',
                target: 'RateLimitConfig',
                changes: {
                    tier,
                    before: { minute: existing.minute, daily: existing.daily, monthly: existing.monthly },
                    after: { minute: updated.minute, daily: updated.daily, monthly: updated.monthly },
                },
            },
        });
        return {
            tier: updated.tier,
            minute: updated.minute,
            daily: updated.daily,
            monthly: updated.monthly,
        };
    }
    // ── Available Providers (read-only from ai-core) ────────────────────────────
    getAvailableProviders() {
        return PROVIDER_MODELS;
    }
}
//# sourceMappingURL=admin.service.js.map