import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import compress from '@fastify/compress';
import { PrismaClient } from '@prisma/client';
import { validateEnv } from './config/env.js';
import { registerSolveRoutes } from './routes/solve.routes.js';
import { registerScanRoutes } from './routes/scan.routes.js';
import { registerQuestionRoutes } from './routes/questions.routes.js';
import { registerPracticeRoutes } from './routes/practice.routes.js';
import { registerTelegramRoutes } from './routes/telegram.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerRateLimitMiddleware } from './middleware/rate-limit.js';
import { registerSessionAuth } from './middleware/session-auth.js';
import { registerExtensionAuth } from './middleware/extension-auth.js';
import { registerAdminAuth } from './middleware/admin-auth.js';
import { registerAdminRoutes } from './routes/admin.routes.js';
import { registerBillingRoutes } from './routes/billing.routes.js';

// Validate environment before anything else — fail fast in production
validateEnv();

const PORT = parseInt(process.env.PORT ?? '8100', 10);

const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
  bodyLimit: 20 * 1024 * 1024, // 20MB
});

await app.register(compress, { encodings: ['gzip', 'deflate'] });

// CORS: in production, restrict to configured origins. In development, allow localhost dev origins.
const corsOrigins = (() => {
  if (process.env.NODE_ENV === 'production') {
    const allowed = (process.env.ALLOWED_ORIGINS ?? process.env.APP_BASE_URL ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    if (allowed.length === 0) {
      console.warn('[CORS] ALLOWED_ORIGINS not set in production — no origins allowed');
      return false; // no origin allowed in strict mode
    }
    return allowed;
  }
  // Development: allow localhost dev origins
  return [
    'http://localhost:3100',
    'http://localhost:3000',
    'http://127.0.0.1:3100',
    'http://127.0.0.1:3000',
  ];
})();

await app.register(cors, { origin: corsOrigins, credentials: true });
await app.register(cookie);

// Raw body parser for Stripe webhook signature verification
// The webhook handler needs the raw (unparsed) body to verify the Stripe signature
app.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (req, body, done) => {
    try {
      // Store raw body on the request object for webhook signature verification
      (req as FastifyRequest & { rawBody?: string }).rawBody = body as string;
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  }
);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

registerRateLimitMiddleware(app, prisma);
registerSessionAuth(app, prisma);
registerExtensionAuth(app, prisma);
registerAdminAuth(app, prisma);
registerAuthRoutes(app, prisma);
registerSolveRoutes(app, prisma);
registerScanRoutes(app);
registerQuestionRoutes(app, prisma);
registerPracticeRoutes(app, prisma);
registerTelegramRoutes(app, prisma);
registerAdminRoutes(app, prisma);
registerBillingRoutes(app, prisma);

async function start() {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[KARÇÖZ API] Listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();