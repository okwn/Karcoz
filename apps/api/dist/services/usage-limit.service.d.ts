import { PrismaClient } from '@prisma/client';
import { type PlanName } from '../config/plan-limits.js';
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
export declare function createUsageLimitService(prisma: PrismaClient): {
    getUserPlan: (userId: string) => Promise<PlanName>;
    checkSolveLimit: (userId: string) => Promise<{
        allowed: true;
        usage: PlanUsage;
    } | {
        allowed: false;
        reason: string;
        usage: PlanUsage;
    }>;
    recordUsage: (userId: string, eventType: UsageEventType) => Promise<void>;
    checkFeatureAccess: (userId: string, feature: "practiceGeneration" | "telegramSummaries" | "advancedAnalytics" | "apiAccess") => Promise<FeatureAccess>;
    checkImageSize: (userId: string, sizeBytes: number) => Promise<{
        allowed: boolean;
        maxBytes: number;
    }>;
    getUsageSummary: (userId: string) => Promise<PlanUsage>;
};
//# sourceMappingURL=usage-limit.service.d.ts.map