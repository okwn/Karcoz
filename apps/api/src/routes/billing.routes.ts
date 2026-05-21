import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createUsageLimitService } from '../services/usage-limit.service.js';
import { createBillingService } from '../services/billing.service.js';
import { PlanNameSchema, CheckoutRequestSchema } from '@karcoz/shared';
import { requireSession } from '../middleware/session-auth.js';

export function registerBillingRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const usageLimitService = createUsageLimitService(prisma);
  const billingService = createBillingService(prisma);

  // ── GET /api/billing/plan ───────────────────────────────────────────────────

  app.get('/api/billing/plan', { preHandler: requireSession }, async (req, reply) => {
    const userId = req.userId!;

    const [subscription, usage, availablePlans, checkoutAvailable] = await Promise.all([
      billingService.getSubscription(userId),
      usageLimitService.getUsageSummary(userId),
      billingService.listAvailablePlans(),
      Promise.resolve(billingService.isCheckoutAvailable()),
    ]);

    return reply.send({
      subscription,
      usage: {
        usedDaily: usage.dailyCount,
        limitDaily: usage.dailyLimit,
        usedMonthly: usage.monthlyCount,
        limitMonthly: usage.monthlyLimit,
        resetDailyAt: usage.resetDailyAt.getTime(),
        resetMonthlyAt: usage.resetMonthlyAt.getTime(),
      },
      availablePlans,
      checkoutAvailable,
    });
  });

  // ── GET /api/billing/usage ──────────────────────────────────────────────────

  app.get('/api/billing/usage', { preHandler: requireSession }, async (req, reply) => {
    const userId = req.userId!;
    const usage = await usageLimitService.getUsageSummary(userId);

    return reply.send({
      usedDaily: usage.dailyCount,
      limitDaily: usage.dailyLimit,
      usedMonthly: usage.monthlyCount,
      limitMonthly: usage.monthlyLimit,
      resetDailyAt: usage.resetDailyAt.getTime(),
      resetMonthlyAt: usage.resetMonthlyAt.getTime(),
    });
  });

  // ── POST /api/billing/checkout ──────────────────────────────────────────────

  app.post('/api/billing/checkout', { preHandler: requireSession }, async (req, reply) => {
    const userId = req.userId!;

    if (!billingService.isCheckoutAvailable()) {
      return reply.code(503).send({
        error: {
          code: 'BILLING_NOT_CONFIGURED',
          message: 'Payment processing is not yet configured. Please try again later.',
        },
      });
    }

    const parsed = CheckoutRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      });
    }

    const { plan, successUrl, cancelUrl } = parsed.data;

    if (plan === 'free') {
      return reply.code(400).send({
        error: { code: 'INVALID_PLAN', message: 'Cannot checkout for the free plan' },
      });
    }

    try {
      const session = await billingService.createCheckoutSession(
        userId,
        plan,
        successUrl ?? '/settings?billing=success',
        cancelUrl ?? '/settings?billing=canceled'
      );

      return reply.send({ url: session.url, sessionId: session.sessionId, provider: session.provider });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(502).send({
        error: { code: 'CHECKOUT_FAILED', message: msg },
      });
    }
  });

  // ── POST /api/billing/webhook ──────────────────────────────────────────────
  // Uses addContentTypeParser for raw body access required for Stripe signature verification

  app.post('/api/billing/webhook', async (req: FastifyRequest, reply: FastifyReply) => {
    // Signature is in headers — raw body needed for verification
    const signature = req.headers['stripe-signature'] as string | undefined;

    if (!signature) {
      return reply.code(400).send({ error: { code: 'MISSING_SIGNATURE', message: 'Missing Stripe signature header' } });
    }

    try {
      const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
      const result = await billingService.handleStripeWebhook(rawBody, signature);

      if (!result.processed) {
        return reply.code(400).send({ error: { code: 'WEBHOOK_FAILED', message: result.error } });
      }

      return reply.send({ processed: true, action: result.action });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(400).send({ error: { code: 'WEBHOOK_ERROR', message: msg } });
    }
  });

  // ── POST /api/billing/cancel ────────────────────────────────────────────────

  app.post('/api/billing/cancel', { preHandler: requireSession }, async (req, reply) => {
    const userId = req.userId!;

    try {
      const result = await billingService.cancelSubscription(userId);
      if (!result.canceled) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: result.message } });
      }
      return reply.send({ message: result.message });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(502).send({ error: { code: 'CANCEL_FAILED', message: msg } });
    }
  });

  // ── POST /api/billing/change-plan ───────────────────────────────────────────
  // DISABLED: plan changes require checkout. Use POST /api/billing/checkout instead.
  // This endpoint only allows downgrading to free (no payment required).

  app.post('/api/billing/change-plan', { preHandler: requireSession }, async (req, reply) => {
    const parsed = PlanNameSchema.safeParse(req.body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Invalid plan name', details: parsed.error.flatten() },
      });
    }

    const plan = parsed.data;

    // Only free plan is allowed via direct change — no payment provider needed
    if (plan !== 'free') {
      return reply.code(403).send({
        error: {
          code: 'CHECKOUT_REQUIRED',
          message: 'Plan upgrades require a payment checkout session. Use POST /api/billing/checkout to upgrade.',
        },
      });
    }

    const userId = req.userId!;
    await prisma.user.update({ where: { id: userId }, data: { plan: 'free' } });

    return reply.send({ success: true, message: 'Plan changed to Free.' });
  });
}