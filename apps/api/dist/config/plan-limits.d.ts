/**
 * Plan limits configuration for KARÇÖZ.
 *
 * This file defines the feature matrix for each plan tier.
 * These limits are the source of truth for the usage limit service.
 * Per-user overrides can be stored in the Subscription or User table.
 */
export declare const PLAN_LIMITS: {
    readonly free: {
        readonly name: "Free";
        readonly solve: {
            readonly daily: 10;
            readonly monthly: 100;
        };
        readonly image: {
            readonly maxSizeBytes: number;
        };
        readonly features: {
            readonly history: "basic";
            readonly practiceGeneration: false;
            readonly telegramSummaries: false;
            readonly advancedAnalytics: false;
            readonly prioritySupport: false;
            readonly apiAccess: false;
        };
    };
    readonly pro: {
        readonly name: "Pro";
        readonly solve: {
            readonly daily: 100;
            readonly monthly: 2000;
        };
        readonly image: {
            readonly maxSizeBytes: number;
        };
        readonly features: {
            readonly history: "full";
            readonly practiceGeneration: true;
            readonly telegramSummaries: true;
            readonly advancedAnalytics: true;
            readonly prioritySupport: false;
            readonly apiAccess: false;
        };
    };
    readonly team: {
        readonly name: "Team";
        readonly solve: {
            readonly daily: 500;
            readonly monthly: 10000;
        };
        readonly image: {
            readonly maxSizeBytes: number;
        };
        readonly features: {
            readonly history: "full";
            readonly practiceGeneration: true;
            readonly telegramSummaries: true;
            readonly advancedAnalytics: true;
            readonly prioritySupport: true;
            readonly apiAccess: true;
        };
    };
};
export type PlanName = keyof typeof PLAN_LIMITS;
export type FeatureName = keyof (typeof PLAN_LIMITS)['free']['features'];
export interface PlanLimits {
    name: string;
    solve: {
        daily: number;
        monthly: number;
    };
    image: {
        maxSizeBytes: number;
    };
    features: {
        history: 'basic' | 'full';
        practiceGeneration: boolean;
        telegramSummaries: boolean;
        advancedAnalytics: boolean;
        prioritySupport: boolean;
        apiAccess: boolean;
    };
}
export declare function getPlanLimits(plan: PlanName): PlanLimits;
export declare function hasFeature(plan: PlanName, feature: FeatureName): boolean;
export declare function getSolveLimit(plan: PlanName, period: 'daily' | 'monthly'): number;
export declare function getImageMaxBytes(plan: PlanName): number;
//# sourceMappingURL=plan-limits.d.ts.map