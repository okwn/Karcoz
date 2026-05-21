# Auth & Privacy Controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full auth system (magic link + extension tokens + session cookies) and user privacy controls across API, web dashboard, and extension.

**Architecture:**
- Magic link email auth for web dashboard (token in URL, HttpOnly session cookie on verify)
- Extension uses token-based auth (random token stored in chrome.storage, sent as Bearer)
- All sensitive endpoints protected by auth middleware
- User settings (privacy, explanation level, result mode, Telegram status) stored per-user in DB
- Extension reads/writes settings via API; web dashboard reads/writes directly via API

**Tech Stack:** Fastify, Prisma/PostgreSQL, chrome.storage (extension), HttpOnly cookies (web)

---

## File Inventory

### New API Files
- `apps/api/src/routes/auth.routes.ts` — all auth endpoints
- `apps/api/src/services/auth.service.ts` — auth business logic
- `apps/api/src/middleware/session-auth.ts` — cookie session middleware
- `apps/api/src/middleware/extension-auth.ts` — Bearer token middleware
- `apps/api/src/middleware/csrf.ts` — CSRF protection middleware

### Modify API Files
- `apps/api/src/server.ts` — register auth routes + auth middleware
- `apps/api/prisma/schema.prisma` — add UserSettings, Session, ExtensionToken, AuthToken models
- `apps/api/src/routes/telegram.routes.ts` — protect with auth
- `apps/api/src/routes/questions.routes.ts` — protect with auth

### Web Dashboard Files
- Create `apps/web-dashboard/public/login.html` — magic link login page
- Modify `apps/web-dashboard/public/settings.html` — full privacy + explanation + result mode + Telegram UI
- Modify `apps/web-dashboard/public/dashboard.html` — add login gate
- Modify `apps/web-dashboard/public/styles.css` — login styles

### Extension Files
- `apps/extension/src/lib/api-client.ts` — add auth token to all requests
- `apps/extension/src/background/service-worker.ts` — auth state + login flow
- `apps/extension/src/lib/extension-storage.ts` — extension token storage

### Shared
- `packages/shared/src/schemas.ts` — add auth-related schemas

### Docs
- `docs/architecture/16-auth-and-privacy.md`
- `docs/api/auth.md`
- `docs/product/11-privacy-controls.md`
- `docs/report_phase_14_auth_privacy.md`

---

## Task 1: Extend Prisma Schema

**File:** `apps/api/prisma/schema.prisma`

Add new models for auth and user settings.

- [ ] **Step 1: Add UserSettings model**

```prisma
model UserSettings {
  id                      String   @id @default(cuid())
  userId                  String   @unique
  user                    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Privacy
  storeHistory            Boolean  @default(true)
  storeImages             Boolean  @default(true)
  maxHistoryItems         Int      @default(50)

  // Explanation
  explanationLevel        String   @default("standard") // "brief" | "standard" | "detailed"

  // Result mode
  resultMode              String   @default("full") // "short" | "full" | "detailed"

  // Telegram
  telegramEnabled         Boolean  @default(false)

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

- [ ] **Step 2: Add Session model (web dashboard HttpOnly cookie auth)**

```prisma
model Session {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token       String   @unique // random opaque token stored in HttpOnly cookie
  expiresAt   DateTime
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([token])
}
```

- [ ] **Step 3: Add AuthToken model (magic link tokens)**

```prisma
model AuthToken {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique // random 32-char token
  type      String   // "magic_link" | "register"
  expiresAt DateTime
  usedAt    DateTime?
  email     String
  createdAt DateTime @default(now())

  @@index([token])
  @@index([email])
}
```

- [ ] **Step 4: Add ExtensionToken model (extension auth)**

```prisma
model ExtensionToken {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token       String   @unique // random 48-char token
  deviceName  String?
  lastUsedAt  DateTime?
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([token])
}
```

- [ ] **Step 5: Update User model**

```prisma
model User {
  id              String   @id @default(cuid())
  email           String?  @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  questions       Question[]
  usage           UsageRecord[]
  telegramAccounts TelegramAccount[]
  settings        UserSettings?
  sessions        Session[]
  authTokens      AuthToken[]
  extensionTokens ExtensionToken[]
}
```

- [ ] **Step 6: Generate Prisma client**

Run: `cd apps/api && npx prisma generate`
Expected: `Prisma client generated.`

- [ ] **Step 7: Commit**

```bash
cd apps/api
git add prisma/schema.prisma
git commit -m "feat(auth): add UserSettings, Session, AuthToken, ExtensionToken models"
```

---

## Task 2: Add Auth Schemas to Shared Package

**File:** `packages/shared/src/schemas.ts`

Add all auth-related Zod schemas at the end of the file (before Telegram section).

- [ ] **Step 1: Add auth schemas**

```typescript
// ── Auth ────────────────────────────────────────────────────────────────────

export const MagicLinkRequestSchema = z.object({
  email: z.string().email(),
  type: z.enum(['login', 'register']).default('login'),
});

export type MagicLinkRequest = z.infer<typeof MagicLinkRequestSchema>;

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(32).max(64),
});

export type MagicLinkVerify = z.infer<typeof MagicLinkVerifySchema>;

export const SessionResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email().nullable(),
  expiresAt: z.number(),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const ExtensionTokenCreateSchema = z.object({
  deviceName: z.string().max(100).optional(),
});

export type ExtensionTokenCreate = z.infer<typeof ExtensionTokenCreateSchema>;

export const ExtensionTokenResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.number(),
});

export type ExtensionTokenResponse = z.infer<typeof ExtensionTokenResponseSchema>;

export const UserSettingsSchema = z.object({
  storeHistory: z.boolean(),
  storeImages: z.boolean(),
  maxHistoryItems: z.number().int().min(10).max(200),
  explanationLevel: ExplanationLevelSchema,
  resultMode: ResultModeSchema,
  telegramEnabled: z.boolean(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSettingsUpdateSchema = UserSettingsSchema.partial();

export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  createdAt: z.number(),
  settings: UserSettingsSchema.optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ExportDataResponseSchema = z.object({
  exportedAt: z.number(),
  userId: z.string().optional(),
  questions: z.array(QuestionSchema),
  settings: UserSettingsSchema.optional(),
});

export type ExportDataResponse = z.infer<typeof ExportDataResponseSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd packages/shared
git add src/schemas.ts
git commit -m "feat(auth): add auth schemas to shared package"
```

---

## Task 3: Create Auth Service

**File:** `apps/api/src/services/auth.service.ts`

All auth business logic in one service.

- [ ] **Step 1: Write auth service**

```typescript
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const EXTENSION_TOKEN_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

function generateToken(length: number): string {
  return crypto.randomBytes(length).toString('base64url');
}

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  // ── Magic Link ────────────────────────────────────────────────────────────

  async createMagicLink(email: string, type: 'login' | 'register'): Promise<string> {
    // Clean up expired tokens for this email
    await this.prisma.authToken.deleteMany({
      where: { email, expiresAt: { lt: new Date() } },
    });

    // Check if user exists for login type
    if (type === 'login') {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Don't reveal whether email exists — send same flow
      }
    } else {
      // Register: check email not already taken
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Silently allow login instead of revealing conflict
        type = 'login';
      }
    }

    const token = generateToken(32);
    await this.prisma.authToken.create({
      data: {
        token,
        email,
        type,
        expiresAt: new Date(Date.now() + MAGIC_LINK_DURATION_MS),
      },
    });

    // Return the full URL
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3100';
    return `${baseUrl}/login?token=${token}`;
  }

  async verifyMagicLink(token: string): Promise<{ userId: string; email: string }> {
    const authToken = await this.prisma.authToken.findUnique({ where: { token } });

    if (!authToken) throw new Error('INVALID_TOKEN');
    if (authToken.usedAt) throw new Error('TOKEN_ALREADY_USED');
    if (authToken.expiresAt < new Date()) throw new Error('TOKEN_EXPIRED');

    // Mark as used
    await this.prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: new Date() },
    });

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { email: authToken.email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: authToken.email,
          settings: { create: {} }, // creates default settings
        },
      });
    }

    return { userId: user.id, email: authToken.email };
  }

  // ── Session (Web Dashboard) ─────────────────────────────────────────────────

  async createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<{ token: string; expiresAt: Date }> {
    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await this.prisma.session.create({
      data: { userId, token, expiresAt, ipAddress, userAgent },
    });

    return { token, expiresAt };
  }

  async validateSession(token: string): Promise<{ userId: string; sessionId: string } | null> {
    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    return { userId: session.userId, sessionId: session.id };
  }

  async deleteSession(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  // ── Extension Token ────────────────────────────────────────────────────────

  async createExtensionToken(userId: string, deviceName?: string): Promise<{ token: string; expiresAt: Date }> {
    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_DURATION_MS);

    await this.prisma.extensionToken.create({
      data: { userId, token, deviceName, expiresAt },
    });

    return { token, expiresAt };
  }

  async validateExtensionToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
    const extToken = await this.prisma.extensionToken.findUnique({ where: { token } });
    if (!extToken) return null;
    if (extToken.expiresAt < new Date()) return null;

    // Update last used
    await this.prisma.extensionToken.update({
      where: { id: extToken.id },
      data: { lastUsedAt: new Date() },
    });

    return { userId: extToken.userId, tokenId: extToken.id };
  }

  async revokeExtensionToken(token: string): Promise<void> {
    await this.prisma.extensionToken.deleteMany({ where: { token } });
  }

  async listExtensionTokens(userId: string) {
    return this.prisma.extensionToken.findMany({
      where: { userId },
      select: { id: true, deviceName: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── User Settings ──────────────────────────────────────────────────────────

  async getUserSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId },
      });
    }
    return settings;
  }

  async updateUserSettings(userId: string, data: {
    storeHistory?: boolean;
    storeImages?: boolean;
    maxHistoryItems?: number;
    explanationLevel?: string;
    resultMode?: string;
    telegramEnabled?: boolean;
  }) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  // ── Data Export / Delete ──────────────────────────────────────────────────

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true, questions: { take: 1000, orderBy: { createdAt: 'desc' } } },
    });
    if (!user) throw new Error('USER_NOT_FOUND');

    return {
      exportedAt: Date.now(),
      userId: user.id,
      email: user.email,
      questions: user.questions.map(q => ({
        id: q.id,
        sourceUrl: q.sourceUrl,
        pageTitle: q.pageTitle,
        sourceType: q.sourceType,
        extractedText: q.extractedText,
        normalizedText: q.normalizedText,
        questionType: q.questionType,
        topic: q.topic,
        shortAnswer: q.shortAnswer,
        fullExplanation: q.fullExplanation,
        confidenceScore: q.confidenceScore,
        status: q.status,
        createdAt: q.createdAt.getTime(),
        updatedAt: q.updatedAt.getTime(),
      })),
      settings: user.settings,
    };
  }

  async deleteAllUserHistory(userId: string): Promise<{ deleted: number }> {
    const result = await this.prisma.question.deleteMany({ where: { userId } });
    return { deleted: result.count };
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Delete in transaction
    await this.prisma.$transaction([
      this.prisma.question.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.extensionToken.deleteMany({ where: { userId } }),
      this.prisma.authToken.deleteMany({ where: { userId } }),
      this.prisma.userSettings.deleteMany({ where: { userId } }),
      this.prisma.telegramAccount.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd apps/api
git add src/services/auth.service.ts
git commit -m "feat(auth): add auth service with magic link, session, extension token, settings"
```

---

## Task 4: Create Auth Middleware

**Files:**
- `apps/api/src/middleware/session-auth.ts`
- `apps/api/src/middleware/extension-auth.ts`
- `apps/api/src/middleware/csrf.ts`

- [ ] **Step 1: Write session-auth middleware**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    sessionId?: string;
  }
}

export function registerSessionAuth(app: ReturnType<typeof import('fastify')>, prisma: PrismaClient) {
  const authService = new AuthService(prisma);

  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    // Extract token from HttpOnly cookie
    const token = req.cookies['karcoz_session'];
    if (!token) return; // allow unauthenticated for now on public routes

    try {
      const session = await authService.validateSession(token);
      if (session) {
        req.userId = session.userId;
        req.sessionId = session.sessionId;
      }
    } catch {
      // Invalid token — clear cookie
      reply.clearCookie('karcoz_session');
    }
  });
}

export function requireSession(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
}

export function optionalSession(req: FastifyRequest, _reply: FastifyReply) {
  // Just ensures req.userId is set if valid session exists
}
```

- [ ] **Step 2: Write extension-auth middleware**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service.js';

export function registerExtensionAuth(app: ReturnType<typeof import('fastify')>, prisma: PrismaClient) {
  const authService = new AuthService(prisma);

  app.addHook('preHandler', async (req: FastifyRequest, _reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return;

    const token = authHeader.slice(7);
    try {
      const result = await authService.validateExtensionToken(token);
      if (result) {
        req.userId = result.userId;
      }
    } catch {
      // Invalid token — just no user attached
    }
  });
}

export function requireExtensionAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) {
    reply.code(401).send({ error: { code: 'EXTENSION_AUTH_REQUIRED', message: 'Extension token required' } });
  }
}
```

- [ ] **Step 3: Write CSRF middleware (for state-changing public endpoints)**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

export function csrfProtection(req: FastifyRequest, reply: FastifyReply) {
  // Same-site cookie check for non-API origins
  const origin = req.headers.origin;
  if (req.method !== 'GET' && origin) {
    const allowedOrigins = [
      'http://localhost:3100',
      'http://localhost:3000',
      process.env.APP_BASE_URL,
    ].filter(Boolean);

    if (!allowedOrigins.includes(origin)) {
      reply.code(403).send({ error: { code: 'CSRF', message: 'Invalid origin' } });
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd apps/api
git add src/middleware/session-auth.ts src/middleware/extension-auth.ts src/middleware/csrf.ts
git commit -m "feat(auth): add session and extension auth middleware"
```

---

## Task 5: Create Auth Routes

**File:** `apps/api/src/routes/auth.routes.ts`

All auth endpoints: register, login, verify, logout, session, extension token, user settings.

- [ ] **Step 1: Write auth routes**

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service.js';
import {
  MagicLinkRequestSchema,
  MagicLinkVerifySchema,
  ExtensionTokenCreateSchema,
  UserSettingsUpdateSchema,
} from '@karcoz/shared';
import { requireSession } from '../middleware/session-auth.js';
import { requireExtensionAuth } from '../middleware/extension-auth.js';

export function registerAuthRoutes(app: FastifyInstance, prisma: PrismaClient) {
  const authService = new AuthService(prisma);

  // ── Magic Link Request ─────────────────────────────────────────────────────

  app.post('/api/auth/magic-link', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = MagicLinkRequestSchema.parse(req.body);

    // Rate limit: 5 per email per hour
    // (handled by global rate limiter, 100/min)

    const loginUrl = await authService.createMagicLink(body.email, body.type);

    // In production: send email. Development: log URL.
    console.log(`[AUTH] Magic link for ${body.email}: ${loginUrl}`);

    // TODO: In production, send via email service (Resend/SendGrid)
    // await sendEmail({ to: body.email, subject: 'KARÇÖZ Login Link', html: `<a href="${loginUrl}">Login</a>` });

    return reply.send({ message: 'Magic link sent', email: body.email });
  });

  // ── Verify Magic Link ──────────────────────────────────────────────────────

  app.post('/api/auth/verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const { token } = MagicLinkVerifySchema.parse(req.body);

    let userId: string;
    let email: string;
    try {
      const result = await authService.verifyMagicLink(token);
      userId = result.userId;
      email = result.email;
    } catch (err: any) {
      return reply.code(400).send({
        error: { code: err.message, message: 'Invalid or expired token' },
      });
    }

    // Create session
    const { token: sessionToken, expiresAt } = await authService.createSession(
      userId,
      req.ip,
      req.headers['user-agent'] ?? undefined
    );

    // Set HttpOnly cookie
    reply.setCookie('karcoz_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    return reply.send({
      userId,
      email,
      expiresAt: expiresAt.getTime(),
    });
  });

  // ── Get Session ────────────────────────────────────────────────────────────

  app.get('/api/auth/session', async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies['karcoz_session'];
    if (!token) {
      return reply.code(401).send({ error: { code: 'NO_SESSION', message: 'Not authenticated' } });
    }

    const session = await authService.validateSession(token);
    if (!session) {
      reply.clearCookie('karcoz_session');
      return reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Session expired' } });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { settings: true },
    });
    if (!user) {
      reply.clearCookie('karcoz_session');
      return reply.code(401).send({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    return reply.send({
      userId: user.id,
      email: user.email,
      settings: user.settings ? {
        storeHistory: user.settings.storeHistory,
        storeImages: user.settings.storeImages,
        maxHistoryItems: user.settings.maxHistoryItems,
        explanationLevel: user.settings.explanationLevel,
        resultMode: user.settings.resultMode,
        telegramEnabled: user.settings.telegramEnabled,
      } : null,
    });
  });

  // ── Logout ─────────────────────────────────────────────────────────────────

  app.post('/api/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies['karcoz_session'];
    if (token) {
      await authService.deleteSession(token);
      reply.clearCookie('karcoz_session', { path: '/' });
    }
    return reply.send({ message: 'Logged out' });
  });

  // ── Extension Token: Create ─────────────────────────────────────────────────

  app.post('/api/auth/extension/token', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.userId!;
    const body = ExtensionTokenCreateSchema.parse(req.body ?? {});

    const { token, expiresAt } = await authService.createExtensionToken(userId, body.deviceName);

    return reply.send({ token, expiresAt: expiresAt.getTime() });
  });

  // ── Extension Token: Revoke ─────────────────────────────────────────────────

  app.delete('/api/auth/extension/token', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: { code: 'TOKEN_REQUIRED', message: 'Token required' } });
    }
    const token = authHeader.slice(7);
    await authService.revokeExtensionToken(token);
    return reply.send({ message: 'Token revoked' });
  });

  // ── Extension Token: List ──────────────────────────────────────────────────

  app.get('/api/auth/extension/tokens', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const tokens = await authService.listExtensionTokens(req.userId!);
    return reply.send({ tokens });
  });

  // ── User Profile ────────────────────────────────────────────────────────────

  app.get('/api/users/me', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { settings: true },
    });
    if (!user) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });

    return reply.send({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.getTime(),
      settings: user.settings,
    });
  });

  // ── User Settings: Get ──────────────────────────────────────────────────────

  app.get('/api/users/me/settings', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const settings = await authService.getUserSettings(req.userId!);
    return reply.send(settings);
  });

  // ── User Settings: Update ───────────────────────────────────────────────────

  app.patch('/api/users/me/settings', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const update = UserSettingsUpdateSchema.parse(req.body);
    const settings = await authService.updateUserSettings(req.userId!, update);
    return reply.send(settings);
  });

  // ── Delete All History ──────────────────────────────────────────────────────

  app.delete('/api/users/me/history', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await authService.deleteAllUserHistory(req.userId!);
    return reply.send({ deleted: result.deleted });
  });

  // ── Export Data ─────────────────────────────────────────────────────────────

  app.get('/api/users/me/export', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await authService.exportUserData(req.userId!);
    return reply.send(data);
  });

  // ── Delete Account ──────────────────────────────────────────────────────────

  app.delete('/api/users/me', { preHandler: requireSession }, async (req: FastifyRequest, reply: FastifyReply) => {
    await authService.deleteUserAccount(req.userId!);
    reply.clearCookie('karcoz_session', { path: '/' });
    return reply.send({ message: 'Account deleted' });
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd apps/api
git add src/routes/auth.routes.ts
git commit -m "feat(auth): add auth routes (magic link, session, extension token, settings)"
```

---

## Task 6: Register Auth in Server

**File:** `apps/api/src/server.ts`

Register auth routes, session middleware, and extension auth middleware.

- [ ] **Step 1: Update server.ts**

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { registerSolveRoutes } from './routes/solve.routes.js';
import { registerScanRoutes } from './routes/scan.routes.js';
import { registerQuestionRoutes } from './routes/questions.routes.js';
import { registerPracticeRoutes } from './routes/practice.routes.js';
import { registerTelegramRoutes } from './routes/telegram.routes.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerRateLimitMiddleware } from './middleware/rate-limit.js';
import { registerSessionAuth } from './middleware/session-auth.js';
import { registerExtensionAuth } from './middleware/extension-auth.js';

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
});

await app.register(cors, {
  origin: ['http://localhost:3100', 'http://localhost:3000', process.env.APP_BASE_URL].filter(Boolean),
  credentials: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

// Register auth middleware first (runs on all routes)
registerSessionAuth(app, prisma);
registerExtensionAuth(app, prisma);

// Register routes
registerRateLimitMiddleware(app, prisma);
registerAuthRoutes(app, prisma);
registerSolveRoutes(app, prisma);
registerScanRoutes(app);
registerQuestionRoutes(app, prisma);
registerPracticeRoutes(app, prisma);
registerTelegramRoutes(app, prisma);

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
```

- [ ] **Step 2: Commit**

```bash
cd apps/api
git add src/server.ts
git commit -m "feat(auth): register auth routes and middleware in server"
```

---

## Task 7: Update API Routes to Use Auth Middleware

**File:** `apps/api/src/routes/questions.routes.ts`, `apps/api/src/routes/telegram.routes.ts`

Update `requireSession` usage for protected routes.

- [ ] **Step 1: Review questions.routes.ts — add requireSession to POST/PATCH/DELETE**

```typescript
// Add to imports
import { requireSession } from '../middleware/session-auth.js';

// Add { preHandler: requireSession } to routes that need auth
```

- [ ] **Step 2: Review telegram.routes.ts — ensure routes use auth**

Same pattern — add `requireSession` to user-specific Telegram routes.

- [ ] **Step 3: Commit**

```bash
cd apps/api
git add src/routes/questions.routes.ts src/routes/telegram.routes.ts
git commit -m "feat(auth): protect question and telegram routes with session auth"
```

---

## Task 8: Build Login Page for Web Dashboard

**File:** `apps/web-dashboard/public/login.html`

Magic link login — enter email, receive link, show "check your email" state.

- [ ] **Step 1: Write login.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login — KARÇÖZ</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .login-card { width: 100%; max-width: 400px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 40px; }
    .login-card__logo { font-size: 18px; font-weight: 700; letter-spacing: 3px; color: var(--accent); text-align: center; margin-bottom: 32px; text-transform: uppercase; }
    .login-card__title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 8px; }
    .login-card__desc { font-size: 12px; color: var(--dim); text-align: center; margin-bottom: 32px; line-height: 1.6; }
    .login-form { display: flex; flex-direction: column; gap: 16px; }
    .login-form .input { width: 100%; padding: 12px 16px; font-size: 13px; }
    .login-form .btn--primary { width: 100%; padding: 12px; font-size: 13px; font-weight: 600; }
    .login-success { display: none; text-align: center; }
    .login-success__icon { font-size: 48px; margin-bottom: 16px; }
    .login-success__title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .login-success__desc { font-size: 12px; color: var(--dim); line-height: 1.6; }
    .login-error { display: none; padding: 12px; background: #ff475711; border: 1px solid var(--danger); border-radius: var(--radius); color: var(--danger); font-size: 12px; margin-bottom: 16px; text-align: center; }
    .login-type-toggle { display: flex; gap: 0; margin-bottom: 24px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .login-type-toggle button { flex: 1; padding: 10px; font-size: 11px; font-weight: 600; background: var(--surface); border: none; color: var(--dim); cursor: pointer; transition: all 0.15s; }
    .login-type-toggle button.active { background: var(--accent); color: #000; }
    .login-type-toggle button:hover:not(.active) { background: var(--surface2); }
    .login-footer { margin-top: 24px; text-align: center; font-size: 10px; color: var(--dim); }
  </style>
</head>
<body>
  <div class="login-wrap">
    <div class="login-card">
      <div class="login-card__logo">KARÇÖZ</div>

      <div id="login-form-view">
        <h1 class="login-card__title">Welcome back</h1>
        <p class="login-card__desc">Enter your email to receive a magic link.<br>No password needed — just click the link.</p>

        <div id="login-error" class="login-error"></div>

        <div class="login-type-toggle">
          <button id="btn-login" class="active" onclick="setType('login')">Sign In</button>
          <button id="btn-register" onclick="setType('register')">Create Account</button>
        </div>

        <form class="login-form" onsubmit="handleSubmit(event)">
          <input type="email" class="input" id="email-input" placeholder="your@email.com" required autocomplete="email">
          <button type="submit" class="btn btn--primary" id="submit-btn">Send Magic Link</button>
        </form>
      </div>

      <div id="login-success-view" class="login-success">
        <div class="login-success__icon">✉️</div>
        <div class="login-success__title">Check your email</div>
        <div class="login-success__desc" id="success-desc">We sent a login link to your email. Click the link to sign in.</div>
      </div>
    </div>

    <div class="login-footer">KARÇÖZ — Study smarter</div>
  </div>

  <script>
    const API = 'http://localhost:8100/api';
    let authType = 'login';

    function setType(type) {
      authType = type;
      document.getElementById('btn-login').classList.toggle('active', type === 'login');
      document.getElementById('btn-register').classList.toggle('active', type === 'register');
      document.getElementById('submit-btn').textContent = type === 'register' ? 'Create Account' : 'Send Magic Link';
      document.getElementById('login-error').style.display = 'none';
    }

    async function handleSubmit(e) {
      e.preventDefault();
      const email = document.getElementById('email-input').value.trim();
      const btn = document.getElementById('submit-btn');
      const errorEl = document.getElementById('login-error');

      btn.disabled = true;
      btn.textContent = 'Sending...';
      errorEl.style.display = 'none';

      try {
        const res = await fetch(`${API}/auth/magic-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, type: authType }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message || 'Failed to send');
        }

        // Show success
        document.getElementById('login-form-view').style.display = 'none';
        document.getElementById('success-desc').textContent = `We sent a ${authType === 'register' ? 'confirmation' : 'login'} link to ${email}. Check your inbox and click the link.`;
        document.getElementById('login-success-view').style.display = 'block';
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = authType === 'register' ? 'Create Account' : 'Send Magic Link';
      }
    }

    // Check for token in URL (after clicking magic link)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // Auto-verify token
      (async () => {
        try {
          const res = await fetch(`${API}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token }),
          });
          if (res.ok) {
            window.location.href = '/dashboard';
          } else {
            const data = await res.json();
            alert('Invalid or expired link: ' + data.error?.message);
          }
        } catch {
          alert('Failed to verify link');
        }
      })();
    }
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd apps/web-dashboard
git add public/login.html
git commit -m "feat(auth): add magic link login page"
```

---

## Task 9: Build Full Settings Page

**File:** `apps/web-dashboard/public/settings.html`

All privacy controls, explanation level, result mode, Telegram status.

- [ ] **Step 1: Write full settings.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings — KARÇÖZ</title>
  <link rel="stylesheet" href="/styles.css">
  <style>
    .setting-row { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; }
    .setting-row__info { display: flex; flex-direction: column; gap: 4px; }
    .setting-row__label { font-size: 13px; font-weight: 600; }
    .setting-row__desc { font-size: 11px; color: var(--dim); }
    .toggle { position: relative; width: 40px; height: 22px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle__slider { position: absolute; inset: 0; background: var(--border); border-radius: 11px; cursor: pointer; transition: background 0.2s; }
    .toggle__slider::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; background: var(--text); border-radius: 50%; transition: transform 0.2s; }
    .toggle input:checked + .toggle__slider { background: var(--accent); }
    .toggle input:checked + .toggle__slider::after { transform: translateX(18px); }
    .setting-select { padding: 8px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-size: 11px; cursor: pointer; min-width: 160px; }
    .setting-select:focus { outline: none; border-color: var(--accent); }
    .setting-section { margin-bottom: 32px; }
    .setting-section__title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--dim); margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .danger-zone { background: #ff475711; border: 1px solid var(--danger); border-radius: var(--radius); padding: 24px; }
    .danger-zone__title { font-size: 13px; font-weight: 600; color: var(--danger); margin-bottom: 16px; }
    .telegram-status { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; }
    .telegram-status__icon { font-size: 24px; }
    .telegram-status__info { flex: 1; }
    .telegram-status__label { font-size: 13px; font-weight: 600; }
    .telegram-status__desc { font-size: 11px; color: var(--dim); }
    .telegram-connected { color: var(--accent); }
    .telegram-disconnected { color: var(--dim); }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav__logo">KARÇÖZ</div>
    <div class="nav__links">
      <a href="/dashboard" class="nav__link">Dashboard</a>
      <a href="/history" class="nav__link">History</a>
      <a href="/weak-topics" class="nav__link">Weak Topics</a>
      <a href="/settings" class="nav__link nav__link--active">Settings</a>
    </div>
  </nav>

  <main class="main" style="max-width:700px">
    <header class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Privacy, preferences, and account</p>
    </header>

    <div id="login-gate" style="display:none;padding:60px;text-align:center">
      <p style="color:var(--dim);margin-bottom:24px">Sign in to access settings</p>
      <a href="/login" class="btn btn--primary">Sign In</a>
    </div>

    <div id="loading" class="loading"><div class="loading__spinner"></div></div>
    <div id="content" style="display:none">

      <!-- Privacy -->
      <div class="setting-section">
        <div class="setting-section__title">Privacy</div>
        <div class="setting-row">
          <div class="setting-row__info">
            <span class="setting-row__label">Store History</span>
            <span class="setting-row__desc">Keep a record of solved questions in your account</span>
          </div>
          <label class="toggle"><input type="checkbox" id="storeHistory"><span class="toggle__slider"></span></label>
        </div>
        <div class="setting-row">
          <div class="setting-row__info">
            <span class="setting-row__label">Store Images</span>
            <span class="setting-row__desc">Save captured screenshots (uses more storage)</span>
          </div>
          <label class="toggle"><input type="checkbox" id="storeImages"><span class="toggle__slider"></span></label>
        </div>
      </div>

      <!-- Explanation -->
      <div class="setting-section">
        <div class="setting-section__title">Explanation Level</div>
        <div class="setting-row">
          <div class="setting-row__info">
            <span class="setting-row__label">Default Explanation</span>
            <span class="setting-row__desc">How much detail in explanations by default</span>
          </div>
          <select class="setting-select" id="explanationLevel">
            <option value="brief">Short — one line answer</option>
            <option value="standard">Standard — concise explanation</option>
            <option value="detailed">Detailed — full reasoning</option>
          </select>
        </div>
      </div>

      <!-- Result Mode -->
      <div class="setting-section">
        <div class="setting-section__title">Result Mode</div>
        <div class="setting-row">
          <div class="setting-row__info">
            <span class="setting-row__label">Answer Display</span>
            <span class="setting-row__desc">How solutions are shown after solving</span>
          </div>
          <select class="setting-select" id="resultMode">
            <option value="short">Compact — answer only</option>
            <option value="full">With Brief Explanation — answer + short reason</option>
            <option value="detailed">Detailed on Demand — tap for full explanation</option>
          </select>
        </div>
      </div>

      <!-- Telegram -->
      <div class="setting-section">
        <div class="setting-section__title">Telegram Integration</div>
        <div class="telegram-status" id="telegram-status">
          <span class="telegram-status__icon" id="tg-icon">🔗</span>
          <div class="telegram-status__info">
            <span class="telegram-status__label" id="tg-label">Not connected</span>
            <span class="telegram-status__desc" id="tg-desc">Link your Telegram account to receive solutions</span>
          </div>
          <div id="tg-toggle-wrap">
            <label class="toggle" id="tg-toggle-label" style="display:none">
              <input type="checkbox" id="telegramEnabled" onchange="handleTelegramToggle()">
              <span class="toggle__slider"></span>
            </label>
          </div>
        </div>
        <div id="telegram-actions" style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn--sm" id="btn-link-tg" onclick="linkTelegram()">Link Telegram</button>
          <button class="btn btn--sm btn--danger" id="btn-unlink-tg" onclick="unlinkTelegram()" style="display:none">Unlink</button>
        </div>
      </div>

      <!-- Account -->
      <div class="setting-section">
        <div class="setting-section__title">Account</div>
        <div class="setting-row">
          <div class="setting-row__info">
            <span class="setting-row__label">Email</span>
            <span class="setting-row__desc" id="user-email">—</span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-row__info">
            <span class="setting-row__label">Extension Tokens</span>
            <span class="setting-row__desc" id="ext-tokens-count">—</span>
          </div>
          <button class="btn btn--sm" onclick="showExtensionTokens()">Manage</button>
        </div>
      </div>

      <!-- Data -->
      <div class="setting-section">
        <div class="setting-section__title">Data Management</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <button class="btn" onclick="exportData()">Export My Data (JSON)</button>
          <button class="btn btn--danger" onclick="deleteAllHistory()">Delete All History</button>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="setting-section">
        <div class="danger-zone">
          <div class="danger-zone__title">Danger Zone</div>
          <p style="font-size:12px;color:var(--dim);margin-bottom:16px">Permanently delete your account and all data. This cannot be undone.</p>
          <button class="btn btn--danger" onclick="deleteAccount()">Delete My Account</button>
        </div>
      </div>

      <div style="margin-top:24px">
        <button class="btn btn--primary" onclick="saveSettings()" style="width:100%">Save Settings</button>
      </div>

    </div>
  </main>

  <!-- Extension tokens modal -->
  <div id="ext-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:200;align-items:center;justify-content:center">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:32px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto">
      <h2 style="font-size:16px;font-weight:700;margin-bottom:24px">Extension Tokens</h2>
      <div id="ext-tokens-list"></div>
      <div style="margin-top:16px;display:flex;gap:8px">
        <button class="btn btn--primary" onclick="createExtensionToken()" style="flex:1">Generate New Token</button>
        <button class="btn" onclick="closeExtModal()">Close</button>
      </div>
    </div>
  </div>

  <script>
    const API = 'http://localhost:8100/api';
    let settings = {};
    let telegramLinked = false;
    let telegramChatId = null;

    async function requireAuth() {
      const res = await fetch(`${API}/auth/session`, { credentials: 'include' });
      if (!res.ok) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('login-gate').style.display = 'block';
        return null;
      }
      return res.json();
    }

    async function load() {
      document.getElementById('loading').style.display = 'flex';
      const session = await requireAuth();
      if (!session) return;

      document.getElementById('user-email').textContent = session.email ?? '—';
      settings = session.settings ?? {
        storeHistory: true, storeImages: true, maxHistoryItems: 50,
        explanationLevel: 'standard', resultMode: 'full', telegramEnabled: false
      };

      document.getElementById('storeHistory').checked = settings.storeHistory;
      document.getElementById('storeImages').checked = settings.storeImages;
      document.getElementById('explanationLevel').value = settings.explanationLevel ?? 'standard';
      document.getElementById('resultMode').value = settings.resultMode ?? 'full';
      document.getElementById('telegramEnabled').checked = settings.telegramEnabled ?? false;

      // Load Telegram status
      await loadTelegramStatus();

      // Load extension tokens count
      await loadExtTokensCount();

      document.getElementById('loading').style.display = 'none';
      document.getElementById('content').style.display = 'block';
    }

    async function loadTelegramStatus() {
      try {
        const res = await fetch(`${API}/telegram/status`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.isLinked) {
            telegramLinked = true;
            telegramChatId = data.telegramChatId;
            document.getElementById('tg-icon').textContent = '✅';
            document.getElementById('tg-label').textContent = data.telegramUsername ? `@${data.telegramUsername}` : 'Connected';
            document.getElementById('tg-label').className = 'telegram-status__label telegram-connected';
            document.getElementById('tg-desc').textContent = `Linked ${data.linkedAt ? new Date(data.linkedAt).toLocaleDateString() : ''}`;
            document.getElementById('btn-link-tg').style.display = 'none';
            document.getElementById('btn-unlink-tg').style.display = 'block';
            document.getElementById('tg-toggle-label').style.display = 'block';
          }
        }
      } catch {}
    }

    async function loadExtTokensCount() {
      try {
        const res = await fetch(`${API}/auth/extension/tokens`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          document.getElementById('ext-tokens-count').textContent = `${data.tokens?.length ?? 0} device(s)`;
        }
      } catch {}
    }

    async function saveSettings() {
      const update = {
        storeHistory: document.getElementById('storeHistory').checked,
        storeImages: document.getElementById('storeImages').checked,
        explanationLevel: document.getElementById('explanationLevel').value,
        resultMode: document.getElementById('resultMode').value,
        telegramEnabled: document.getElementById('telegramEnabled').checked,
      };

      const res = await fetch(`${API}/users/me/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(update),
      });

      if (res.ok) {
        alert('Settings saved');
      } else {
        alert('Failed to save settings');
      }
    }

    async function deleteAllHistory() {
      if (!confirm('Delete ALL your question history? This cannot be undone.')) return;
      const res = await fetch(`${API}/users/me/history`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      alert(`Deleted ${data.deleted ?? 0} questions`);
    }

    async function exportData() {
      const res = await fetch(`${API}/users/me/export`, { credentials: 'include' });
      if (!res.ok) { alert('Export failed'); return; }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `karcoz-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    async function deleteAccount() {
      if (!confirm('Delete your account and ALL data permanently? This CANNOT be undone.')) return;
      if (!confirm('Are you absolutely sure? Type "delete" to confirm.')) return;
      const res = await fetch(`${API}/users/me`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        alert('Failed to delete account');
      }
    }

    async function linkTelegram() {
      const res = await fetch(`${API}/telegram/link-account`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Use /link command in the KARÇÖZ Telegram bot');
      }
    }

    async function unlinkTelegram() {
      if (!confirm('Unlink your Telegram account?')) return;
      await fetch(`${API}/telegram/unlink-account`, {
        method: 'POST',
        credentials: 'include',
      });
      window.location.reload();
    }

    async function handleTelegramToggle() {
      const enabled = document.getElementById('telegramEnabled').checked;
      await fetch(`${API}/users/me/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ telegramEnabled: enabled }),
      });
    }

    async function showExtensionTokens() {
      const res = await fetch(`${API}/auth/extension/tokens`, { credentials: 'include' });
      const data = await res.json();
      const list = document.getElementById('ext-tokens-list');
      if (!data.tokens?.length) {
        list.innerHTML = '<p style="color:var(--dim);font-size:12px">No extension tokens yet</p>';
      } else {
        list.innerHTML = data.tokens.map(t => `
          <div style="padding:12px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px">
            <div style="font-size:11px;font-weight:600">${t.deviceName ?? 'Unknown device'}</div>
            <div style="font-size:10px;color:var(--dim)">Last used: ${t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : 'Never'}</div>
            <div style="font-size:10px;color:var(--dim)">Created: ${new Date(t.createdAt).toLocaleString()}</div>
          </div>
        `).join('');
      }
      document.getElementById('ext-modal').style.display = 'flex';
    }

    async function createExtensionToken() {
      const name = prompt('Device name (e.g. "Chrome on Mac"):');
      if (!name) return;
      const res = await fetch(`${API}/auth/extension/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deviceName: name }),
      });
      const data = await res.json();
      if (data.token) {
        await navigator.clipboard.writeText(data.token);
        alert('Token copied to clipboard! Save it — it won\'t be shown again.');
        closeExtModal();
        await loadExtTokensCount();
      }
    }

    function closeExtModal() {
      document.getElementById('ext-modal').style.display = 'none';
    }

    load();
  </script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd apps/web-dashboard
git add public/settings.html
git commit -m "feat(auth): full settings page with privacy, explanation, result mode, Telegram controls"
```

---

## Task 10: Gate Dashboard Behind Auth

**File:** `apps/web-dashboard/public/dashboard.html`

Redirect to login if no session.

- [ ] **Step 1: Add auth check to dashboard.html**

In the `<script>` section, add at the start of `loadOverview()`:

```javascript
const API = 'http://localhost:8100/api';
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth/session`, { credentials: 'include' });
    if (!res.ok) { window.location.href = '/login'; return false; }
    return true;
  } catch {
    window.location.href = '/login';
    return false;
  }
}

async function loadOverview() {
  if (!(await checkAuth())) return;
  // ... rest of existing code
}
window.loadOverview = loadOverview;
```

Also update the nav to include Settings link and show logged-in state:

```html
<a href="/settings" class="nav__link">Settings</a>
```

- [ ] **Step 2: Commit**

```bash
cd apps/web-dashboard
git add public/dashboard.html
git commit -m "feat(auth): gate dashboard behind session auth"
```

---

## Task 11: Extend Extension API Client with Auth

**Files:**
- `apps/extension/src/lib/api-client.ts`
- `apps/extension/src/lib/extension-storage.ts`
- `apps/extension/src/background/service-worker.ts`

- [ ] **Step 1: Add extension token flow to api-client.ts**

Add to all API calls:

```typescript
async getExtensionToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(['karcoz_extension_token', 'karcoz_token_expiry']);
  if (result.karcoz_extension_token && result.karcoz_token_expiry > Date.now()) {
    return result.karcoz_extension_token;
  }
  return null;
}

async callApi(endpoint: string, options?: RequestInit) {
  const token = await this.getExtensionToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options?.headers,
  };
  const baseUrl = 'http://localhost:8100';
  const res = await fetch(`${baseUrl}${endpoint}`, { ...options, headers });
  return res;
}
```

- [ ] **Step 2: Add extension login UI to service-worker.ts**

Add `showExtensionLogin()` function that:
1. Creates a modal overlay with email input
2. Calls `POST /api/auth/magic-link` with type=login
3. Shows "check email" state

Also add `onExtensionAuthRequired` handler that:
- Shows login modal if no token stored
- On successful token, stores it in chrome.storage.local with 1-year expiry

- [ ] **Step 3: Commit**

```bash
cd apps/extension
git add src/lib/api-client.ts src/lib/extension-storage.ts src/background/service-worker.ts
git commit -m "feat(auth): add extension token auth flow to API client"
```

---

## Task 12: Protect API Endpoints with Auth

Update all existing routes to use appropriate auth middleware:

- `solve.routes.ts` — optional auth (userId if session exists), extension auth
- `questions.routes.ts` — require session for user-specific operations
- `practice.routes.ts` — require session

- [ ] **Step 1: Review and update each route file**

Ensure `requireSession` or `requireExtensionAuth` is applied to the correct routes.

- [ ] **Step 2: Commit**

```bash
cd apps/api
git add src/routes/solve.routes.ts src/routes/questions.routes.ts src/routes/practice.routes.ts
git commit -m "feat(auth): protect all API routes with appropriate auth middleware"
```

---

## Task 13: Create Architecture and API Docs

**Files:**
- `docs/architecture/16-auth-and-privacy.md`
- `docs/api/auth.md`
- `docs/product/11-privacy-controls.md`

- [ ] **Step 1: Write architecture doc**

```markdown
# Auth & Privacy — Architecture

## Auth Flows

### Web Dashboard (Magic Link + Session Cookie)
1. User enters email → POST /api/auth/magic-link
2. Server creates AuthToken (15min expiry), logs URL to console (prod: sends email)
3. User clicks link → GET /login?token=xxx
4. Page auto-calls POST /api/auth/verify
5. Server creates Session, returns HttpOnly cookie
6. All subsequent requests include cookie automatically

### Extension (Token-Based)
1. User opens extension popup → clicks "Sign In"
2. Extension shows email input → POST /api/auth/magic-link (as register)
3. User clicks link in email → /login?token=xxx → extension stores token
4. Extension includes `Authorization: Bearer <token>` on all API calls
5. Token validated via ExtensionToken model (1 year expiry)

## User Settings

Stored in UserSettings model, accessed via:
- GET/PATCH /api/users/me/settings — dashboard and extension both use

## Privacy Controls

| Setting | Effect |
|---------|--------|
| storeHistory | If false, questions are not saved to user account |
| storeImages | If false, captured screenshots are not stored |
| maxHistoryItems | Local storage limit for extension |
| explanationLevel | Default for solve requests |
| resultMode | Controls UI display of solutions |
| telegramEnabled | Enable/disable Telegram integration |

## Security

- HttpOnly cookies (session) — never accessible via JS
- Bearer tokens (extension) — stored in chrome.storage.local, never HttpOnly
- CSRF: origin header check on all state-changing requests
- Rate limit: 100 req/min global, stricter on auth endpoints
- No provider API keys exposed to extension
```

- [ ] **Step 2: Write API reference doc**

Document all auth endpoints with request/response examples.

- [ ] **Step 3: Write privacy controls product doc**

Document user-facing privacy features and data handling.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/16-auth-and-privacy.md docs/api/auth.md docs/product/11-privacy-controls.md
git commit -m "docs: add auth and privacy architecture, API reference, and product docs"
```

---

## Task 14: Prisma Migration

- [ ] **Step 1: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name auth_and_privacy
```

Expected: Migration applied, tables created.

- [ ] **Step 2: Commit migration**

```bash
git add apps/api/prisma/migrations
git commit -m "feat(auth): apply database migration for auth models"
```

---

## Validation Plan

After each task, run:

```bash
# Type check
cd apps/api && npx tsc --noEmit
cd packages/shared && npx tsc

# Lint
cd apps/api && npx eslint src --ext .ts

# Prisma
cd apps/api && npx prisma generate

# Build
npm run build 2>/dev/null || echo "no build step"
```

Final end-to-end test:
1. Start API: `cd apps/api && npm run dev`
2. Open `http://localhost:3100/login`
3. Enter email → receive magic link URL in console
4. Visit magic link URL → should redirect to dashboard
5. Open settings page → verify all controls render
6. Create extension token → use it in extension API calls

---

## Rollback Plan

If migration fails: `cd apps/api && npx prisma migrate rollback`
If auth breaks existing routes: add `optionalAuth` and make auth non-breaking

If extension auth breaks extension: add feature flag `KARCOZ_REQUIRE_AUTH=false` to skip auth check.

---

## Done Criteria

- [ ] Magic link login works end-to-end
- [ ] Dashboard redirects to login when unauthenticated
- [ ] Settings page shows all controls and saves to DB
- [ ] Extension can authenticate via token
- [ ] All API routes properly protected with appropriate auth
- [ ] Data export downloads valid JSON
- [ ] Delete history removes all user questions
- [ ] Delete account removes all user data
- [ ] TypeCheck and Prisma generate pass with no errors
- [ ] All docs written

**Plan saved to:** `docs/superpowers/plans/2026-05-16-auth-and-privacy.md`