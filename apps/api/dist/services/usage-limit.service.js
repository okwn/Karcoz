import { PLAN_LIMITS } from '../config/plan-limits.js';
export function createUsageLimitService(prisma) {
    // ── Period boundaries ──────────────────────────────────────────────────────
    function startOfDay() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }
    function startOfMonth() {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    function resetOfDay() {
        const d = new Date();
        d.setHours(24, 0, 0, 0);
        return d;
    }
    function resetOfMonth() {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    // ── Usage counts ────────────────────────────────────────────────────────────
    async function getUsageCount(userId, eventType, period) {
        const start = period === 'daily' ? startOfDay() : startOfMonth();
        const result = await prisma.usageEvent.aggregate({
            where: { userId, eventType, period, createdAt: { gte: start } },
            _sum: { count: true },
        });
        return result._sum.count ?? 0;
    }
    // ── Plan resolution ────────────────────────────────────────────────────────
    async function getUserPlan(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { plan: true },
        });
        return user?.plan ?? 'free';
    }
    // ── Usage check (before solve/practice) ────────────────────────────────────
    async function checkSolveLimit(userId) {
        const plan = await getUserPlan(userId);
        const limits = PLAN_LIMITS[plan].solve;
        const [dailyCount, monthlyCount] = await Promise.all([
            getUsageCount(userId, 'solve', 'daily'),
            getUsageCount(userId, 'solve', 'monthly'),
        ]);
        const usage = {
            plan,
            dailyCount,
            dailyLimit: limits.daily,
            monthlyCount,
            monthlyLimit: limits.monthly,
            dailyRemaining: Math.max(0, limits.daily - dailyCount),
            monthlyRemaining: Math.max(0, limits.monthly - monthlyCount),
            resetDailyAt: resetOfDay(),
            resetMonthlyAt: resetOfMonth(),
        };
        if (dailyCount >= limits.daily) {
            return {
                allowed: false,
                reason: `Daily solve limit reached (${limits.daily}/day). Resets at midnight.`,
                usage,
            };
        }
        if (monthlyCount >= limits.monthly) {
            return {
                allowed: false,
                reason: `Monthly solve limit reached (${limits.monthly}/month). Resets on the 1st.`,
                usage,
            };
        }
        return { allowed: true, usage };
    }
    // ── Record usage event ────────────────────────────────────────────────────
    async function recordUsage(userId, eventType) {
        await prisma.usageEvent.create({
            data: {
                userId,
                eventType,
                count: 1,
                period: 'daily',
            },
        });
        await prisma.usageEvent.create({
            data: {
                userId,
                eventType,
                count: 1,
                period: 'monthly',
            },
        });
    }
    // ── Feature access check ──────────────────────────────────────────────────
    async function checkFeatureAccess(userId, feature) {
        const plan = await getUserPlan(userId);
        const allowed = PLAN_LIMITS[plan]?.features[feature] ?? false;
        return {
            allowed,
            reason: allowed
                ? undefined
                : `This feature is not available on your ${PLAN_LIMITS[plan].name} plan.`,
        };
    }
    // ── Image size check ──────────────────────────────────────────────────────
    async function checkImageSize(userId, sizeBytes) {
        const plan = await getUserPlan(userId);
        const maxBytes = PLAN_LIMITS[plan].image.maxSizeBytes;
        return {
            allowed: sizeBytes <= maxBytes,
            maxBytes,
        };
    }
    // ── Full usage summary ────────────────────────────────────────────────────
    async function getUsageSummary(userId) {
        const plan = await getUserPlan(userId);
        const limits = PLAN_LIMITS[plan].solve;
        const [dailyCount, monthlyCount] = await Promise.all([
            getUsageCount(userId, 'solve', 'daily'),
            getUsageCount(userId, 'solve', 'monthly'),
        ]);
        return {
            plan,
            dailyCount,
            dailyLimit: limits.daily,
            monthlyCount,
            monthlyLimit: limits.monthly,
            dailyRemaining: Math.max(0, limits.daily - dailyCount),
            monthlyRemaining: Math.max(0, limits.monthly - monthlyCount),
            resetDailyAt: resetOfDay(),
            resetMonthlyAt: resetOfMonth(),
        };
    }
    return {
        getUserPlan,
        checkSolveLimit,
        recordUsage,
        checkFeatureAccess,
        checkImageSize,
        getUsageSummary,
    };
}
//# sourceMappingURL=usage-limit.service.js.map