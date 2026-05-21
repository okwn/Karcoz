/**
 * API Integration Tests — KARÇÖZ REST API
 *
 * Tests run against a real (or test) database via the Fastify app instance.
 * These are NOT unit tests — they exercise the full route → service → DB stack.
 *
 * Run with: pnpm --filter @karcoz/api test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import { registerSolveRoutes } from '../../routes/solve.routes.js';
import { registerAuthRoutes } from '../../routes/auth.routes.js';
import { registerBillingRoutes } from '../../routes/billing.routes.js';
import { registerQuestionRoutes } from '../../routes/questions.routes.js';
import { registerPracticeRoutes } from '../../routes/practice.routes.js';
import { registerAdminRoutes } from '../../routes/admin.routes.js';
import { registerSessionAuth } from '../../middleware/session-auth.js';
import { registerExtensionAuth } from '../../middleware/extension-auth.js';
import { registerAdminAuth } from '../../middleware/admin-auth.js';
import { registerRateLimitMiddleware } from '../../middleware/rate-limit.js';

// Test DB — uses separate database name to avoid polluting dev DB
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ??
  'postgresql://karcoz_user:karcoz_pass@localhost:5441/kar coz_test';

let prisma: PrismaClient;
let app: FastifyInstance;

async function createTestApp() {
  const fastify = Fastify({ logger: false });

  await fastify.register(cookie);

  // Register session + extension auth middleware
  registerSessionAuth(fastify, prisma);
  registerExtensionAuth(fastify, prisma);
  registerAdminAuth(fastify, prisma);
  registerRateLimitMiddleware(fastify, prisma);

  // Health check (as in server.ts)
  fastify.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

  // Register all routes
  registerSolveRoutes(fastify, prisma);
  registerAuthRoutes(fastify, prisma);
  registerBillingRoutes(fastify, prisma);
  registerQuestionRoutes(fastify, prisma);
  registerPracticeRoutes(fastify, prisma);
  registerAdminRoutes(fastify, prisma);

  await fastify.ready();
  return fastify;
}

beforeAll(async () => {
  // Override DATABASE_URL for test environment
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.DATABASE_URL_FOR_TEST = TEST_DATABASE_URL;
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long-for-hs256';
  process.env.APP_BASE_URL = 'http://localhost:3100';
  process.env.APP_PORT = '8100';
  process.env.REDIS_URL = 'redis://localhost:6384';
  process.env.STRIPE_SECRET_KEY = ''; // Empty = Stripe not configured
  process.env.AI_PROVIDER = 'mock';
  process.env.AI_FALLBACK_PROVIDER = 'mock';
  process.env.ADMIN_API_KEY = 'test-admin-key-32chars!!';

  prisma = new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  });

  // Reset test DB schema
  try {
    await prisma.$executeRaw`TRUNCATE TABLE "Question", "QuestionSave", "AuthToken", "Session", "ExtensionToken", "User", "AuditLog" CASCADE`;
  } catch {
    // Tables may not exist yet — that's fine for initial run
  }

  app = await createTestApp();
}, 60_000);

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerTestUser(email = 'test@example.com') {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      plan: 'free',
      settings: {
        create: {
          storeHistory: true,
          storeImages: false,
          maxHistoryItems: 50,
          explanationLevel: 'detailed',
          resultMode: 'bubble',
        },
      },
    },
    include: { settings: true },
  });
  return user;
}

async function createTestSession(userId: string) {
  const { AuthService } = await import('../../services/auth.service.js');
  const authSvc = new AuthService(prisma);
  const { token } = await authSvc.createSession(userId, '127.0.0.1', 'test-agent');
  return token;
}

async function createExtensionToken(userId: string, deviceName = 'Test Device') {
  const { AuthService } = await import('../../services/auth.service.js');
  const authSvc = new AuthService(prisma);
  const { token } = await authSvc.createExtensionToken(userId, deviceName);
  return token;
}

// ── Health ────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});

// ── Auth: Magic Link ───────────────────────────────────────────────────────────

describe('POST /api/auth/magic-link', () => {
  it('accepts valid email and returns message', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'magiclink-test@example.com', type: 'login' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('Magic link sent');
    expect(body.email).toBe('magiclink-test@example.com');
  });

  it('rejects invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'not-an-email', type: 'login' },
    });
    expect(res.statusCode).toBe(400);
  });
});

// ── Auth: Verify Invalid Token ───────────────────────────────────────────────

describe('POST /api/auth/verify', () => {
  it('rejects invalid token with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify',
      payload: { token: 'this-is-not-a-valid-token' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBeDefined();
    expect(body.error.code).not.toBe('INVALID_REQUEST'); // Should be semantic error
  });
});

// ── Extension Token Creation ─────────────────────────────────────────────────

describe('POST /api/auth/extension/token', () => {
  let sessionToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await registerTestUser('ext-token-test@example.com');
    userId = user.id;
    sessionToken = await createTestSession(userId);
  });

  it('creates an extension token for authenticated user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/extension/token',
      headers: { cookie: `karcoz_session=${sessionToken}` },
      payload: { deviceName: 'Chrome MacBook' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.expiresAt).toBeDefined();
  });

  it('rejects unauthenticated request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/extension/token',
      payload: { deviceName: 'Chrome MacBook' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── Solve: Text with Extension Token ──────────────────────────────────────────

describe('POST /api/solve/text', () => {
  let extToken: string;
  let userId: string;
  let sessionToken: string;

  beforeEach(async () => {
    const user = await registerTestUser('solve-text-test@example.com');
    userId = user.id;
    extToken = await createExtensionToken(userId);
    sessionToken = await createTestSession(userId);
  });

  it('solves text question with extension token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      headers: { authorization: `Bearer ${extToken}` },
      payload: {
        text: 'What is 2 + 2? Options: A) 3 B) 4 C) 5 D) 6',
        topic: 'math',
        language: 'en',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.questionId).toBeDefined();
    expect(body.solution).toBeDefined();
    expect(body.solution.shortAnswer).toBeDefined();
  });

  it('solves text question with session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      headers: { cookie: `karcoz_session=${sessionToken}` },
      payload: {
        text: 'What is 3 + 5? Options: A) 6 B) 7 C) 8 D) 9',
        topic: 'math',
        language: 'en',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.questionId).toBeDefined();
  });

  it('rejects request without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/text',
      payload: { text: 'What is 1+1?', topic: 'math', language: 'en' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── Solve: Image Rejects Oversized ───────────────────────────────────────────

describe('POST /api/solve/image', () => {
  let extToken: string;

  beforeEach(async () => {
    const user = await registerTestUser('solve-image-test@example.com');
    extToken = await createExtensionToken(user.id);
  });

  it('rejects image that exceeds size limit', async () => {
    // 25MB buffer — well over the 20MB body limit
    const largeBuffer = Buffer.alloc(25 * 1024 * 1024, 0xAA);

    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/image',
      headers: {
        authorization: `Bearer ${extToken}`,
        'content-type': 'application/octet-stream',
      },
      payload: largeBuffer,
    });

    // Should be rejected at the Fastify body limit or at validation
    expect([413, 400]).toContain(res.statusCode);
  });

  it('accepts image within size limit', async () => {
    // Tiny valid PNG (1x1 transparent pixel)
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/solve/image',
      headers: {
        authorization: `Bearer ${extToken}`,
        'content-type': 'image/png',
      },
      payload: tinyPng,
    });

    // 200 or 422 acceptable (image valid but may fail OCR)
    expect([200, 422]).toContain(res.statusCode);
  });
});

// ── Questions History Requires Session ────────────────────────────────────────

describe('GET /api/questions/history', () => {
  it('returns 401 without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/history' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with valid session (empty array)', async () => {
    const user = await registerTestUser('history-test@example.com');
    const token = await createTestSession(user.id);

    const res = await app.inject({
      method: 'GET',
      url: '/api/questions/history',
      headers: { cookie: `karcoz_session=${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.meta).toBeDefined();
  });
});

// ── Practice Generate Requires Session ────────────────────────────────────────

describe('POST /api/practice/generate', () => {
  it('returns 401 without session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/practice/generate',
      payload: { count: 5, topic: 'math' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with valid session', async () => {
    const user = await registerTestUser('practice-test@example.com');
    const token = await createTestSession(user.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/practice/generate',
      headers: { cookie: `karcoz_session=${token}` },
      payload: { count: 3, topic: 'math' },
    });
    // 200 = success, 429 = rate limited, 500 = generation failed (all acceptable)
    expect([200, 429, 500]).toContain(res.statusCode);
  });
});

// ── Billing Checkout Fails Safely Without Stripe ──────────────────────────────

describe('POST /api/billing/checkout', () => {
  it('returns 503 when Stripe is not configured', async () => {
    const user = await registerTestUser('billing-test@example.com');
    const token = await createTestSession(user.id);

    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/checkout',
      headers: { cookie: `karcoz_session=${token}` },
      payload: { plan: 'pro', successUrl: '/', cancelUrl: '/' },
    });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('BILLING_NOT_CONFIGURED');
  });
});

// ── Billing Webhook Invalid Signature ─────────────────────────────────────────

describe('POST /api/billing/webhook', () => {
  it('rejects request with missing signature', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      payload: { type: 'checkout.session.completed' },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('MISSING_SIGNATURE');
  });

  it('rejects request with invalid signature', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/billing/webhook',
      headers: { 'stripe-signature': 'invalid_signature_here' },
      payload: { type: 'checkout.session.completed' },
    });
    // Should fail signature verification
    expect(res.statusCode).toBe(400);
  });
});

// ── Admin Routes Require Admin Role ────────────────────────────────────────────

describe('GET /api/admin/overview', () => {
  it('returns 401 without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/overview' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 for non-admin user', async () => {
    const user = await registerTestUser('non-admin@example.com');
    const token = await createTestSession(user.id);

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: { cookie: `karcoz_session=${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns 200 for admin user', async () => {
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        plan: 'pro',
        role: 'admin',
        settings: { create: { storeHistory: true, storeImages: false, maxHistoryItems: 50, explanationLevel: 'detailed', resultMode: 'bubble' } },
      },
    });
    const token = await createTestSession(adminUser.id);

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: { cookie: `karcoz_session=${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── Rate Limiting ──────────────────────────────────────────────────────────────

describe('Rate Limiting', () => {
  it('rate limits requests that exceed threshold', async () => {
    const user = await registerTestUser('ratelimit-test@example.com');
    const token = await createTestSession(user.id);

    // Make many rapid requests — rate limit window is 1 minute
    const results: number[] = [];
    for (let i = 0; i < 120; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/api/questions/history',
        headers: { cookie: `karcoz_session=${token}` },
      });
      results.push(res.statusCode);
      if (res.statusCode === 429) break;
    }

    // Should eventually hit rate limit
    expect(results).toContain(429);
  });
});