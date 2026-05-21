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
export declare function createUsageService(prisma: PrismaClient): {
    getUsageCount: (userId: string | undefined, endpoint: string, period: UsagePeriod) => Promise<number>;
    incrementUsage: (userId: string | undefined, endpoint: string, period: UsagePeriod) => Promise<void>;
    checkLimit: (userId: string | undefined, endpoint: string, tier?: string) => Promise<UsageCount | {
        exceeded: true;
        retryAfter: number;
    }>;
    getRateLimitConfig: (tier: string) => Promise<RateLimitConfig>;
    setRateLimitConfig: (tier: string, config: RateLimitConfig) => Promise<void>;
    DEFAULT_LIMITS: Record<string, RateLimitConfig>;
};
//# sourceMappingURL=usage.service.d.ts.map