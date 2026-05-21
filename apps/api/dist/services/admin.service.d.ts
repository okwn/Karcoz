import { PrismaClient } from '@prisma/client';
import type { ProviderName } from '@karcoz/ai-core';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAdminOverview(): Promise<{
        userCount: number;
        questionCount: number;
        todaySolveCount: number;
        errorCountLast24h: number;
        questionsLast30d: number;
    }>;
    listUsers(page: number, limit: number): Promise<{
        data: {
            id: string;
            email: string | null;
            role: string;
            createdAt: number;
            questionCount: number;
            lastActiveAt: number;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getUsageStats(days?: number): Promise<{
        series: {
            date: string;
            count: number;
        }[];
        period: string;
    }>;
    getSolveLatencyStats(limit?: number): Promise<{
        sampleSize: number;
        estimatedP50Ms: null;
        estimatedP95Ms: null;
        note: string;
        avgMs?: undefined;
        p50Ms?: undefined;
        p95Ms?: undefined;
        p99Ms?: undefined;
        minMs?: undefined;
        maxMs?: undefined;
    } | {
        sampleSize: number;
        avgMs: number;
        p50Ms: number;
        p95Ms: number;
        p99Ms: number;
        minMs: number;
        maxMs: number;
        estimatedP50Ms?: undefined;
        estimatedP95Ms?: undefined;
        note?: undefined;
    }>;
    getErrorStats(): Promise<{
        totalErrorsLast24h: number;
        breakdown: {
            code: string;
            count: number;
        }[];
    }>;
    getAuditLogs(limit?: number, offset?: number): Promise<{
        data: {
            id: string;
            adminId: string;
            action: string;
            target: string;
            changes: import("@prisma/client/runtime/library").JsonValue;
            createdAt: number;
        }[];
        meta: {
            total: number;
            limit: number;
            offset: number;
        };
    }>;
    getModelConfig(): Promise<{
        provider: ProviderName;
        modelName: string | null;
        fallbackModel: string | null;
        timeoutMs: number;
        maxTokens: number;
        enableValidation: boolean;
        compactMode: boolean;
        updatedAt: number;
    }>;
    updateModelConfig(adminId: string, patch: {
        provider?: string;
        modelName?: string;
        fallbackModel?: string;
        timeoutMs?: number;
        maxTokens?: number;
        enableValidation?: boolean;
        compactMode?: boolean;
    }): Promise<{
        provider: ProviderName;
        modelName: string | null;
        fallbackModel: string | null;
        timeoutMs: number;
        maxTokens: number;
        enableValidation: boolean;
        compactMode: boolean;
        updatedAt: number;
    }>;
    getRateLimits(): Promise<{
        tiers: {
            id: string;
            minute: number;
            daily: number;
            monthly: number;
            tier: string;
            updatedAt: Date;
        }[];
    }>;
    updateRateLimit(adminId: string, tier: string, patch: {
        minute?: number;
        daily?: number;
        monthly?: number;
    }): Promise<{
        tier: string;
        minute: number;
        daily: number;
        monthly: number;
    }>;
    getAvailableProviders(): Record<ProviderName, import("@karcoz/ai-core").ProviderModel[]>;
}
//# sourceMappingURL=admin.service.d.ts.map