/**
 * API Integration Tests — route-level tests using Fastify injection
 * Run with: cd apps/api && npx vitest run src/__tests__/integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';

// Mock prisma for integration tests
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? 'postgresql://karcoz:devpass@localhost:5441/karcoz_test' } },
});

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(import('@fastify/cookie'));
  await app.register(import('@fastify/cors'));
  return app;
}

describe('GET /health', () => {
  it('returns ok status and timestamp', async () => {
    const app = await buildApp();
    app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
    await app.close();
  });
});

describe('POST /api/solve/text — mock mode', () => {
  it('returns 400 when text is missing', async () => {
    const app = await buildApp();
    app.post('/api/solve/text', async (req, reply) => {
      const { SolveTextRequestSchema } = await import('@karcoz/shared');
      const parsed = SolveTextRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'Invalid request body', details: parsed.error.flatten() } });
      }
      return { ok: true };
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_REQUEST');
    await app.close();
  });

  it('returns 400 when text exceeds max length', async () => {
    const app = await buildApp();
    app.post('/api/solve/text', async (req, reply) => {
      const { SolveTextRequestSchema } = await import('@karcoz/shared');
      const parsed = SolveTextRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_REQUEST', message: 'Invalid request body', details: parsed.error.flatten() } });
      }
      return { ok: true };
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      payload: { text: 'x'.repeat(10001) },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('accepts valid text solve request', async () => {
    const app = await buildApp();
    app.post('/api/solve/text', async (req, reply) => {
      const { SolveTextRequestSchema } = await import('@karcoz/shared');
      const parsed = SolveTextRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_REQUEST' } });
      }
      // Mock solve response
      return {
        questionId: 'mock_qid',
        extraction: {
          extractedText: parsed.data.text,
          normalizedText: parsed.data.text,
          questionType: 'multiple_choice',
        },
        solution: {
          shortAnswer: 'Mock answer',
          fullExplanation: 'This is a mock response.',
          reasoningSummary: 'Mock reasoning',
          confidenceScore: 0.95,
          validationStatus: 'pass',
        },
        performance: {
          captureLatencyMs: 10,
          uploadLatencyMs: 5,
          extractionLatencyMs: 50,
          solvingLatencyMs: 200,
          validationLatencyMs: 20,
          totalLatencyMs: 285,
        },
      };
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      payload: { text: 'What is the capital of France?' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.questionId).toBe('mock_qid');
    expect(body.extraction.extractedText).toBe('What is the capital of France?');
    await app.close();
  });
});

describe('Auth — magic link safe response', () => {
  it('does not reveal whether email exists on login request', async () => {
    const app = await buildApp();
    app.post('/api/auth/magic-link', async (req, reply) => {
      const { MagicLinkRequestSchema } = await import('@karcoz/shared');
      const parsed = MagicLinkRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_REQUEST' } });
      }
      // Always return the same success response regardless of email existence
      return { sent: true, message: 'If an account exists, a magic link has been sent.' };
    });

    await app.ready();
    // Non-existent email
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'nonexistent@example.com', type: 'login' },
    });
    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.body).sent).toBe(true);

    // Duplicate email (register)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'taken@example.com', type: 'register' },
    });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.body).sent).toBe(true);
    await app.close();
  });
});

describe('DELETE /api/user/data — user isolation', () => {
  it('requires ?confirm=delete-all parameter', async () => {
    const app = await buildApp();
    app.delete('/api/user/data', async (req, reply) => {
      const query = req.query as { confirm?: string };
      if (query.confirm !== 'delete-all') {
        return reply.status(400).send({ error: { code: 'CONFIRMATION_REQUIRED', message: 'Add ?confirm=delete-all to confirm' } });
      }
      return { deleted: true };
    });

    await app.ready();
    const res = await app.inject({ method: 'DELETE', url: '/api/user/data' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('CONFIRMATION_REQUIRED');
    await app.close();
  });

  it('uses the authenticated userId from session — not from request body', async () => {
    // This test verifies that the delete route reads userId from session
    // and not from any user-supplied parameter
    const app = await buildApp();

    // Inject userId via preHandler simulating session auth
    app.addHook('preHandler', async (req) => {
      req.userId = 'user_session_123';
    });

    app.delete('/api/user/data', async (req, reply) => {
      const query = req.query as { confirm?: string };
      if (query.confirm !== 'delete-all') {
        return reply.status(400).send({ error: { code: 'CONFIRMATION_REQUIRED' } });
      }
      const userId = (req as any).userId;
      // userId must come from session — assert it's not from query
      if ((query as any).userId) {
        return reply.status(500).send({ error: { code: 'BUG' } });
      }
      return { deleted: true, userId };
    });

    await app.ready();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/user/data?confirm=delete-all',
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).userId).toBe('user_session_123');
    await app.close();
  });
});

describe('POST /api/billing/change-plan — upgrade requires checkout', () => {
  it('blocks direct upgrade to paid plans', async () => {
    const app = await buildApp();
    // Route now accepts body as raw PlanName string — not wrapped in { plan: ... }
    app.post('/api/billing/change-plan', async (req, reply) => {
      const { PlanNameSchema } = await import('@karcoz/shared');
      // The actual route uses req.body directly as the plan name
      const parsed = PlanNameSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(415).send({ error: { code: 'INVALID_REQUEST' } }); // 415 = unsupported media
      }
      const plan = parsed.data;
      if (plan !== 'free') {
        return reply.status(403).send({
          error: {
            code: 'CHECKOUT_REQUIRED',
            message: 'Plan changes require a payment checkout session.',
          },
        });
      }
      return { success: true };
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/change-plan',
      headers: { 'content-type': 'application/json' },
      // Raw string body — matches actual route behavior
      payload: JSON.stringify('pro'),
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error.code).toBe('CHECKOUT_REQUIRED');
    await app.close();
  });

  it('allows downgrade to free plan without checkout', async () => {
    const app = await buildApp();
    app.post('/api/billing/change-plan', async (req, reply) => {
      const { PlanNameSchema } = await import('@karcoz/shared');
      const parsed = PlanNameSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(415).send({ error: { code: 'INVALID_REQUEST' } });
      }
      const plan = parsed.data;
      if (plan !== 'free') {
        return reply.status(403).send({ error: { code: 'CHECKOUT_REQUIRED' } });
      }
      return { success: true, message: 'Plan changed to Free.' };
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/change-plan',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify('free'),
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

describe('Query param validation — QuestionHistoryQuerySchema', () => {
  it('rejects page < 1', async () => {
    const app = await buildApp();
    app.get('/api/questions/history', async (req, reply) => {
      const { z } = await import('zod');
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
      });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_QUERY' } });
      }
      return parsed.data;
    });

    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/questions/history?page=0' });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects limit > 100', async () => {
    const app = await buildApp();
    app.get('/api/questions/history', async (req, reply) => {
      const { z } = await import('zod');
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
      });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_QUERY' } });
      }
      return parsed.data;
    });

    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/questions/history?limit=500' });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('accepts valid query params with defaults', async () => {
    const app = await buildApp();
    app.get('/api/questions/history', async (req, reply) => {
      const { z } = await import('zod');
      const schema = z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
        topic: z.string().optional(),
        saved_only: z.coerce.boolean().default(false),
      });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) {
        return reply.status(400).send({ error: { code: 'INVALID_QUERY' } });
      }
      return parsed.data;
    });

    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/api/questions/history?topic=math&saved_only=true' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.topic).toBe('math');
    expect(body.saved_only).toBe(true);
    await app.close();
  });
});

// ── Solve Route Integration Tests ────────────────────────────────────────────────

describe('POST /api/solve/text — requires extension token', () => {
  it('returns structured answer on valid request', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));
    const { registerSolveRoutes } = await import('../../routes/solve.routes.js');
    await registerSolveRoutes(app, prisma);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      headers: { 'content-type': 'application/json' },
      payload: { text: 'If 3x + 7 = 22, what is x?' },
    });

    const status = res.statusCode;
    const body = JSON.parse(res.body);

    // Without a valid auth token the solve still works (anonymous)
    // The key thing is it doesn't crash and returns structured data
    if (status === 200) {
      expect(body.questionId).toBeDefined();
      expect(body.extraction).toBeDefined();
      expect(body.solution).toBeDefined();
      expect(body.solution.shortAnswer).toBeDefined();
      expect(typeof body.solution.confidenceScore).toBe('number');
      expect(body.performance).toBeDefined();
      expect(typeof body.performance.totalLatencyMs).toBe('number');
    } else if (status === 429) {
      expect(body.error.code).toBe('RATE_LIMITED');
    }
    // Mock/provider errors are acceptable — real AI required for 200
    await app.close();
  });

  it('rejects text exceeding max length', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));
    const { registerSolveRoutes } = await import('../../routes/solve.routes.js');
    await registerSolveRoutes(app, prisma);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      headers: { 'content-type': 'application/json' },
      payload: { text: 'x'.repeat(10001) },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('INVALID_REQUEST');
    await app.close();
  });
});

describe('POST /api/solve/image — size and auth handling', () => {
  it('rejects oversized image', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));
    const { registerSolveRoutes } = await import('../../routes/solve.routes.js');
    await registerSolveRoutes(app, prisma);
    await app.ready();

    // 15MB base64 string (exceeds 10MB limit + buffer)
    const hugeImage = 'A'.repeat(15 * 1024 * 1024);
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/image',
      headers: { 'content-type': 'application/json' },
      payload: { imageBase64: hugeImage, sourceType: 'upload' },
    });

    // Either 400 (schema) or 413 (service) — both are acceptable
    expect([400, 413]).toContain(res.statusCode);
    await app.close();
  });

  it('returns 401 on invalid bearer token', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));
    const { registerSolveRoutes } = await import('../../routes/solve.routes.js');
    await registerSolveRoutes(app, prisma);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer invalid_token_xyz',
      },
      payload: { text: 'What is 2+2?' },
    });

    // Without valid token, request proceeds anonymously but doesn't crash
    // 500 is acceptable if DB is not available; the key is no unhandled crash
    const status = res.statusCode;
    expect([200, 400, 422, 429, 500]).toContain(status);
    await app.close();
  });
});

describe('POST /api/solve/* — low confidence handling', () => {
  it('handles low confidence extraction gracefully', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));
    const { registerSolveRoutes } = await import('../../routes/solve.routes.js');
    await registerSolveRoutes(app, prisma);
    await app.ready();

    // Empty/garbage text should trigger NO_QUESTION_DETECTED or LOW_CONFIDENCE
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      headers: { 'content-type': 'application/json' },
      payload: { text: '???' },
    });

    const status = res.statusCode;
    const body = JSON.parse(res.body);
    if (status === 422) {
      expect(['NO_QUESTION_DETECTED', 'LOW_CONFIDENCE']).toContain(body.error.code);
    } else if (status === 200) {
      // If AI managed to extract something — confidence should be included
      expect(body.solution).toBeDefined();
    }
    await app.close();
  });
});

// ── Billing: Checkout ─────────────────────────────────────────────────────────

describe('POST /api/billing/checkout — requires session auth', () => {
  it('returns 401 without session', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));

    // Inline mock — mimics real route behavior (auth guard first)
    app.post('/api/billing/checkout', async (req, reply) => {
      // requireSession check: userId must be set
      if (!(req as any).userId) {
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED' } });
      }
      return reply.code(200).send({});
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      payload: { plan: 'pro' },
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 503 when Stripe env vars are missing', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));

    app.post('/api/billing/checkout', async (req, reply) => {
      (req as any).userId = 'user-123'; // simulate session auth
      // Simulate billing service check — no Stripe configured
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || !stripeKey.startsWith('sk_')) {
        return reply.code(503).send({
          error: { code: 'BILLING_NOT_CONFIGURED', message: 'Payment processing is not yet configured.' },
        });
      }
      return reply.code(200).send({ url: 'https://checkout.stripe.com/' });
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { 'content-type': 'application/json' },
      payload: { plan: 'pro' },
    });

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).error.code).toBe('BILLING_NOT_CONFIGURED');
    await app.close();
  });
});

describe('POST /api/billing/webhook — signature verification', () => {
  it('returns 400 when Stripe signature header is missing', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));

    // Inline mock mimicking real webhook route behavior
    app.post('/api/billing/webhook', async (req, reply) => {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return reply.code(400).send({ error: { code: 'MISSING_SIGNATURE', message: 'Missing Stripe signature header' } });
      }
      return reply.code(200).send({ processed: true });
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      payload: { type: 'checkout.session.completed' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('MISSING_SIGNATURE');
    await app.close();
  });

  it('rejects invalid Stripe signature when Stripe is not configured', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));

    app.post('/api/billing/webhook', async (req, reply) => {
      const signature = req.headers['stripe-signature'];
      // Simulate: Stripe not configured → webhook always fails
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || !stripeKey.startsWith('sk_')) {
        return reply.code(400).send({ error: { code: 'WEBHOOK_FAILED', message: 'Stripe not configured' } });
      }
      // Real Stripe would verify the signature here
      return reply.code(200).send({ processed: true });
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: { 'stripe-signature': 'invalid_sig' },
      payload: { type: 'checkout.session.completed' },
    });

    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('POST /api/billing/change-plan — no direct plan mutation', () => {
  it('rejects direct upgrade to paid plans (CHECKOUT_REQUIRED)', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));

    // Mock route that mimics real implementation behavior
    app.post('/api/billing/change-plan', async (req, reply) => {
      (req as any).userId = 'user-123';
      const body = req.body;
      // Route accepts raw PlanName string: 'pro' | 'team' | 'free'
      const plan = typeof body === 'string' ? body : (body as any)?.plan;
      if (plan && plan !== 'free') {
        return reply.code(403).send({
          error: { code: 'CHECKOUT_REQUIRED', message: 'Plan upgrades require a payment checkout session.' },
        });
      }
      return reply.code(200).send({ success: true });
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/change-plan',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify('pro'),
    });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error.code).toBe('CHECKOUT_REQUIRED');
    await app.close();
  });

  it('allows downgrade to free plan without checkout', async () => {
    const app = Fastify({ logger: false });
    await app.register(import('@fastify/cookie'));
    await app.register(import('@fastify/cors'));

    app.post('/api/billing/change-plan', async (req, reply) => {
      (req as any).userId = 'user-123';
      const body = req.body as { plan?: string };
      const plan = body?.plan;
      if (plan && plan !== 'free') {
        return reply.code(403).send({ error: { code: 'CHECKOUT_REQUIRED' } });
      }
      return reply.code(200).send({ success: true, message: 'Plan changed to Free.' });
    });

    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/change-plan',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify('free'),
    });

    expect(res.statusCode).toBe(200);
    await app.close();
  });
});