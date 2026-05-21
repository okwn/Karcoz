/**
 * Billing service — Stripe implementation.
 *
 * All plan changes go through Stripe checkout. The user's plan is only updated
 * AFTER a verified Stripe webhook confirms payment. No direct plan mutation
 * is allowed outside of webhook events.
 */
import { PrismaClient } from '@prisma/client';
import { type PlanName } from '../config/plan-limits.js';
export interface CheckoutSession {
    url: string;
    sessionId: string;
    provider: 'stripe';
}
export interface WebhookProcessingResult {
    processed: boolean;
    action?: string;
    error?: string;
}
export interface SubscriptionInfo {
    plan: PlanName;
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
    provider: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
}
export declare function createBillingService(prisma: PrismaClient): {
    createCheckoutSession: (userId: string, plan: PlanName, successUrl: string, cancelUrl: string) => Promise<CheckoutSession>;
    getSubscription: (userId: string) => Promise<SubscriptionInfo>;
    cancelSubscription: (userId: string) => Promise<{
        canceled: boolean;
        message: string;
    }>;
    handleStripeWebhook: (rawBody: string, signature: string) => Promise<WebhookProcessingResult>;
    handleWebhookEvent: (payload: {
        eventId: string;
        eventType: string;
        data: Record<string, unknown>;
    }) => Promise<WebhookProcessingResult>;
    listAvailablePlans: () => Promise<({
        id: PlanName;
        name: "Free";
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    } | {
        id: PlanName;
        name: "Pro";
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    } | {
        id: PlanName;
        name: "Team";
        price: {
            monthly: number;
            currency: string;
        };
        features: string[];
    })[]>;
    isCheckoutAvailable: () => boolean;
};
//# sourceMappingURL=billing.service.d.ts.map