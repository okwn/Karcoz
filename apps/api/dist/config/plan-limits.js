/**
 * Plan limits configuration for KARÇÖZ.
 *
 * This file defines the feature matrix for each plan tier.
 * These limits are the source of truth for the usage limit service.
 * Per-user overrides can be stored in the Subscription or User table.
 */
export const PLAN_LIMITS = {
    free: {
        name: 'Free',
        solve: {
            daily: 10,
            monthly: 100,
        },
        image: {
            maxSizeBytes: 2 * 1024 * 1024, // 2 MB
        },
        features: {
            history: 'basic', // last 20 items
            practiceGeneration: false,
            telegramSummaries: false,
            advancedAnalytics: false,
            prioritySupport: false,
            apiAccess: false,
        },
    },
    pro: {
        name: 'Pro',
        solve: {
            daily: 100,
            monthly: 2000,
        },
        image: {
            maxSizeBytes: 10 * 1024 * 1024, // 10 MB
        },
        features: {
            history: 'full',
            practiceGeneration: true,
            telegramSummaries: true,
            advancedAnalytics: true,
            prioritySupport: false,
            apiAccess: false,
        },
    },
    team: {
        name: 'Team',
        solve: {
            daily: 500,
            monthly: 10000,
        },
        image: {
            maxSizeBytes: 20 * 1024 * 1024, // 20 MB
        },
        features: {
            history: 'full',
            practiceGeneration: true,
            telegramSummaries: true,
            advancedAnalytics: true,
            prioritySupport: true,
            apiAccess: true,
            // sharedWorkspace: true, // future
        },
    },
};
export function getPlanLimits(plan) {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
export function hasFeature(plan, feature) {
    const limits = getPlanLimits(plan);
    const value = limits.features[feature];
    return typeof value === 'boolean' ? value : true;
}
export function getSolveLimit(plan, period) {
    return PLAN_LIMITS[plan]?.solve[period] ?? PLAN_LIMITS.free.solve[period];
}
export function getImageMaxBytes(plan) {
    return PLAN_LIMITS[plan]?.image.maxSizeBytes ?? PLAN_LIMITS.free.image.maxSizeBytes;
}
//# sourceMappingURL=plan-limits.js.map