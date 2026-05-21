/**
 * Billing service — Stripe implementation.
 *
 * All plan changes go through Stripe checkout. The user's plan is only updated
 * AFTER a verified Stripe webhook confirms payment. No direct plan mutation
 * is allowed outside of webhook events.
 */

import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS, type PlanName } from '../config/plan-limits.js';

function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'));
}

function getStripe(): Stripe {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function priceIdForPlan(plan: PlanName): string {
  switch (plan) {
    case 'pro': return process.env.STRIPE_PRICE_PRO_MONTHLY ?? '';
    case 'team': return process.env.STRIPE_PRICE_TEAM_MONTHLY ?? '';
    default: return '';
  }
}

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

export function createBillingService(prisma: PrismaClient) {
  // ── Checkout ────────────────────────────────────────────────────────────────

  async function createCheckoutSession(
    userId: string,
    plan: PlanName,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) throw new Error('User has no email');

    const priceId = priceIdForPlan(plan);
    if (!priceId) throw new Error(`No Stripe price ID configured for plan: ${plan}`);

    const stripe = getStripe();
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3100';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelUrl}`,
      metadata: { userId, plan },
      subscription_data: {
        metadata: { userId, plan },
      },
    });

    if (!session.url) throw new Error('Stripe returned no checkout URL');

    return { url: session.url, sessionId: session.id, provider: 'stripe' };
  }

  // ── Subscription lookup ─────────────────────────────────────────────────────

  async function getSubscription(userId: string): Promise<SubscriptionInfo> {
    const sub = await prisma.subscription.findUnique({ where: { userId } });

    if (!sub) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return {
        plan: (user?.plan as PlanName) ?? 'free',
        status: 'none',
        provider: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      plan: sub.plan as PlanName,
      status: sub.status as SubscriptionInfo['status'],
      provider: sub.provider,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: !!sub.canceledAt,
    };
  }

  // ── Cancel subscription ────────────────────────────────────────────────────

  async function cancelSubscription(userId: string): Promise<{ canceled: boolean; message: string }> {
    const sub = await prisma.subscription.findUnique({ where: { userId } });

    if (!sub) {
      return { canceled: false, message: 'No active subscription found.' };
    }

    if (!sub.providerSubId || sub.provider !== 'stripe') {
      // No Stripe subscription — just update local record
      if (sub) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });
      }
      await prisma.user.update({ where: { id: userId }, data: { plan: 'free' } });
      return { canceled: true, message: 'Subscription canceled.' };
    }

    if (!isStripeConfigured()) {
      throw new Error('Stripe is not configured — cannot cancel Stripe subscription');
    }

    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(sub.providerSubId, {
      cancel_at_period_end: true,
    }) as Stripe.Subscription;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { canceledAt: new Date(), status: updated.status === 'canceled' ? 'canceled' : 'active' },
    });

    return {
      canceled: true,
      message: 'Subscription canceled. You retain access until the end of the billing period.',
    };
  }

  // ── Webhook handler ─────────────────────────────────────────────────────────

  async function handleStripeWebhook(
    rawBody: string,
    signature: string
  ): Promise<WebhookProcessingResult> {
    if (!isStripeConfigured()) {
      return { processed: false, error: 'Stripe not configured' };
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { processed: false, error: 'Stripe webhook secret not configured' };
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      return { processed: false, error: `Webhook signature verification failed: ${err}` };
    }

    return processStripeEvent(event);
  }

  async function handleWebhookEvent(
    payload: { eventId: string; eventType: string; data: Record<string, unknown> }
  ): Promise<WebhookProcessingResult> {
    return processStripeEvent(payload as unknown as Stripe.Event);
  }

  async function processStripeEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanName | undefined;

        if (!userId || !plan) {
          return { processed: false, action: 'ignored', error: 'Missing userId or plan in session metadata' };
        }

        const existing = await prisma.subscription.findUnique({ where: { userId } });
        const subId = session.subscription as string | null;
        if (!subId) return { processed: false, action: 'ignored', error: 'No subscription ID in checkout session' };

        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(subId) as Stripe.Subscription;
        const periodEnd = new Date((stripeSub as any).current_period_end * 1000);
        const periodStart = new Date((stripeSub as any).current_period_start * 1000);

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan,
              status: 'active',
              providerSubId: subId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              canceledAt: null,
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId,
              plan,
              status: 'active',
              provider: 'stripe',
              providerSubId: subId,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          });
        }

        await prisma.user.update({ where: { id: userId }, data: { plan } });

        return { processed: true, action: 'checkout.session.completed' };
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const userId = stripeSub.metadata?.userId;
        const providerSubId = (stripeSub as any).id as string;

        if (!userId) {
          const existing = await prisma.subscription.findFirst({ where: { providerSubId } });
          if (!existing) return { processed: false, action: 'ignored' };
        }

        const status = stripeSub.status === 'active' ? 'active'
          : stripeSub.cancel_at_period_end ? 'canceled'
          : stripeSub.status === 'past_due' ? 'past_due'
          : stripeSub.status === 'trialing' ? 'trialing'
          : stripeSub.status;

        const periodEnd = new Date((stripeSub as any).current_period_end * 1000);

        await prisma.subscription.updateMany({
          where: userId ? { userId } : { providerSubId },
          data: {
            status,
            currentPeriodEnd: periodEnd,
            canceledAt: stripeSub.cancel_at_period_end ? new Date() : null,
          },
        });

        return { processed: true, action: 'customer.subscription.updated' };
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const providerSubId = (stripeSub as any).id as string;

        const sub = await prisma.subscription.findFirst({ where: { providerSubId } });
        if (!sub) return { processed: false, action: 'ignored' };

        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });

        await prisma.user.update({ where: { id: sub.userId }, data: { plan: 'free' } });

        return { processed: true, action: 'customer.subscription.deleted' };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string | null;

        if (!subscriptionId) return { processed: false, action: 'ignored' };

        await prisma.subscription.updateMany({
          where: { providerSubId: subscriptionId },
          data: { status: 'past_due' },
        });

        // Find user and downgrade gracefully
        const sub = await prisma.subscription.findFirst({ where: { providerSubId: subscriptionId } });
        if (sub) {
          await prisma.user.update({ where: { id: sub.userId }, data: { plan: 'free' } });
        }

        return { processed: true, action: 'invoice.payment_failed' };
      }

      default:
        return { processed: true, action: 'ignored' };
    }
  }

  // ── Plan listing ─────────────────────────────────────────────────────────────

  async function listAvailablePlans() {
    return [
      {
        id: 'free' as PlanName,
        name: PLAN_LIMITS.free.name,
        price: { monthly: 0, currency: 'USD' },
        features: [
          `${PLAN_LIMITS.free.solve.daily} solves/day, ${PLAN_LIMITS.free.solve.monthly}/month`,
          'Basic history (20 items)',
          'Standard speed',
        ],
      },
      {
        id: 'pro' as PlanName,
        name: PLAN_LIMITS.pro.name,
        price: { monthly: 9, currency: 'USD' },
        features: [
          `${PLAN_LIMITS.pro.solve.daily} solves/day, ${PLAN_LIMITS.pro.solve.monthly}/month`,
          'Full history',
          'Practice question generator',
          'Telegram summaries',
          'Advanced analytics',
        ],
      },
      {
        id: 'team' as PlanName,
        name: PLAN_LIMITS.team.name,
        price: { monthly: 29, currency: 'USD' },
        features: [
          `${PLAN_LIMITS.team.solve.daily} solves/day, ${PLAN_LIMITS.team.solve.monthly}/month`,
          'Everything in Pro',
          'Priority support',
          'API access',
          '5 team members (coming soon)',
        ],
      },
    ];
  }

  // ── Checkout availability check ─────────────────────────────────────────────

  function isCheckoutAvailable(): boolean {
    return isStripeConfigured() && !!(process.env.STRIPE_PRICE_PRO_MONTHLY && process.env.STRIPE_PRICE_TEAM_MONTHLY);
  }

  return {
    createCheckoutSession,
    getSubscription,
    cancelSubscription,
    handleStripeWebhook,
    handleWebhookEvent,
    listAvailablePlans,
    isCheckoutAvailable,
  };
}