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
    let user = await this.prisma.user.findUnique({
      where: { email: authToken.email },
    });
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