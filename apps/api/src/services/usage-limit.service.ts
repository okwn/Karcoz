import { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS, type PlanName } from '../config/plan-limits.js';

export type UsageEventType = 'solve' | 'solve_image' | 'practice_generate' | 'telegram_message';

export interface PlanUsage {
  plan: PlanName;
  dailyCount: number;
  dailyLimit: number;
  monthlyCount: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  resetDailyAt: Date;
  resetMonthlyAt: Date;
}

export interface FeatureAccess {
  allowed: boolean;
  reason?: string;
}

export function createUsageLimitService(prisma: PrismaClient) {
  // ── Period boundaries ──────────────────────────────────────────────────────

  function startOfDay(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function startOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function resetOfDay(): Date {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d;
  }

  function resetOfMonth(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ── Usage counts ────────────────────────────────────────────────────────────

  async function getUsageCount(
    userId: string,
    eventType: UsageEventType,
    period: 'daily' | 'monthly'
  ): Promise<number> {
    const start = period === 'daily' ? startOfDay() : startOfMonth();

    const result = await prisma.usageEvent.aggregate({
      where: { userId, eventType, period, createdAt: { gte: start } },
      _sum: { count: true },
    });

    return result._sum.count ?? 0;
  }

  // ── Plan resolution ────────────────────────────────────────────────────────

  async function getUserPlan(userId: string): Promise<PlanName> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return (user?.plan as PlanName) ?? 'free';
  }

  // ── Usage check (before solve/practice) ────────────────────────────────────

  async function checkSolveLimit(userId: string): Promise<
    | { allowed: true; usage: PlanUsage }
    | { allowed: false; reason: string; usage: PlanUsage }
  > {
    const plan = await getUserPlan(userId);
    const limits = PLAN_LIMITS[plan].solve;

    const [dailyCount, monthlyCount] = await Promise.all([
      getUsageCount(userId, 'solve', 'daily'),
      getUsageCount(userId, 'solve', 'monthly'),
    ]);

    const usage: PlanUsage = {
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

  async function recordUsage(
    userId: string,
    eventType: UsageEventType
  ): Promise<void> {
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

  async function checkFeatureAccess(
    userId: string,
    feature: 'practiceGeneration' | 'telegramSummaries' | 'advancedAnalytics' | 'apiAccess'
  ): Promise<FeatureAccess> {
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

  async function checkImageSize(
    userId: string,
    sizeBytes: number
  ): Promise<{ allowed: boolean; maxBytes: number }> {
    const plan = await getUserPlan(userId);
    const maxBytes = PLAN_LIMITS[plan].image.maxSizeBytes;

    return {
      allowed: sizeBytes <= maxBytes,
      maxBytes,
    };
  }

  // ── Full usage summary ────────────────────────────────────────────────────

  async function getUsageSummary(userId: string): Promise<PlanUsage> {
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