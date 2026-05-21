import type { PrismaClient } from '@prisma/client';

export type UsagePeriod = 'minute' | 'hourly' | 'daily' | 'monthly';

export interface UsageCount {
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitConfig {
  minute: number;
  daily: number;
  monthly: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  free: { minute: 10, daily: 100, monthly: 1000 },
  premium: { minute: 60, daily: 1000, monthly: 20000 },
};

export function createUsageService(prisma: PrismaClient) {
  async function getUsageCount(userId: string | undefined, endpoint: string, period: UsagePeriod): Promise<number> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'minute':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
        break;
      case 'hourly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
        break;
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
    }

    const records = await prisma.usageRecord.aggregate({
      where: {
        userId: userId ?? 'anonymous',
        endpoint,
        period,
        createdAt: { gte: startDate },
      },
      _sum: { count: true },
    });

    return records._sum.count ?? 0;
  }

  async function incrementUsage(userId: string | undefined, endpoint: string, period: UsagePeriod): Promise<void> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'minute':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
        break;
      case 'hourly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
        break;
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
    }

    await prisma.usageRecord.create({
      data: {
        userId: userId ?? 'anonymous',
        endpoint,
        period,
        count: 1,
        createdAt: now,
      },
    });
  }

  async function checkLimit(
    userId: string | undefined,
    endpoint: string,
    tier: string = 'free'
  ): Promise<UsageCount | { exceeded: true; retryAfter: number }> {
    const config = DEFAULT_LIMITS[tier] ?? DEFAULT_LIMITS.free;

    const minuteCount = await getUsageCount(userId, endpoint, 'minute');
    if (minuteCount >= config.minute) {
      return { exceeded: true, retryAfter: 60 };
    }

    const dailyCount = await getUsageCount(userId, endpoint, 'daily');
    if (dailyCount >= config.daily) {
      const resetAt = new Date();
      resetAt.setHours(24, 0, 0, 0);
      return { exceeded: true, retryAfter: Math.floor((resetAt.getTime() - Date.now()) / 1000) };
    }

    return {
      current: minuteCount,
      limit: config.minute,
      remaining: config.minute - minuteCount,
      resetAt: new Date(Date.now() + 60000),
    };
  }

  async function getRateLimitConfig(tier: string): Promise<RateLimitConfig> {
    const record = await prisma.rateLimitConfig.findUnique({ where: { tier } });
    if (record) {
      return {
        minute: record.minute,
        daily: record.daily,
        monthly: record.monthly,
      };
    }
    return DEFAULT_LIMITS[tier] ?? DEFAULT_LIMITS.free;
  }

  async function setRateLimitConfig(tier: string, config: RateLimitConfig): Promise<void> {
    await prisma.rateLimitConfig.upsert({
      where: { tier },
      create: {
        tier,
        minute: config.minute,
        daily: config.daily,
        monthly: config.monthly,
      },
      update: {
        minute: config.minute,
        daily: config.daily,
        monthly: config.monthly,
      },
    });
  }

  return {
    getUsageCount,
    incrementUsage,
    checkLimit,
    getRateLimitConfig,
    setRateLimitConfig,
    DEFAULT_LIMITS,
  };
}