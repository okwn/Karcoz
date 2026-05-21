import { AuthService } from '../services/auth.service.js';
import { MagicLinkRequestSchema, MagicLinkVerifySchema, ExtensionTokenCreateSchema, UserSettingsUpdateSchema, } from '@karcoz/shared';
import { requireSession } from '../middleware/session-auth.js';
export function registerAuthRoutes(app, prisma) {
    const authService = new AuthService(prisma);
    // ── Magic Link Request ─────────────────────────────────────────────────────
    app.post('/api/auth/magic-link', async (req, reply) => {
        const body = MagicLinkRequestSchema.parse(req.body);
        const loginUrl = await authService.createMagicLink(body.email, body.type);
        // In production: send email. Development: log URL.
        console.log(`[AUTH] Magic link for ${body.email}: ${loginUrl}`);
        return reply.send({ message: 'Magic link sent', email: body.email });
    });
    // ── Verify Magic Link ──────────────────────────────────────────────────────
    app.post('/api/auth/verify', async (req, reply) => {
        const { token } = MagicLinkVerifySchema.parse(req.body);
        let userId;
        let email;
        try {
            const result = await authService.verifyMagicLink(token);
            userId = result.userId;
            email = result.email;
        }
        catch (err) {
            return reply.code(400).send({
                error: { code: err.message, message: 'Invalid or expired token' },
            });
        }
        // Create session
        const { token: sessionToken, expiresAt } = await authService.createSession(userId, req.ip, req.headers['user-agent'] ?? undefined);
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
    app.get('/api/auth/session', async (req, reply) => {
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
    app.post('/api/auth/logout', async (req, reply) => {
        const token = req.cookies['karcoz_session'];
        if (token) {
            await authService.deleteSession(token);
            reply.clearCookie('karcoz_session', { path: '/' });
        }
        return reply.send({ message: 'Logged out' });
    });
    // ── Extension Token: Create ─────────────────────────────────────────────────
    app.post('/api/auth/extension/token', { preHandler: requireSession }, async (req, reply) => {
        const userId = req.userId;
        const body = ExtensionTokenCreateSchema.parse(req.body ?? {});
        const { token, expiresAt } = await authService.createExtensionToken(userId, body.deviceName);
        return reply.send({ token, expiresAt: expiresAt.getTime() });
    });
    // ── Extension Token: Revoke ─────────────────────────────────────────────────
    app.delete('/api/auth/extension/token', { preHandler: requireSession }, async (req, reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.code(401).send({ error: { code: 'TOKEN_REQUIRED', message: 'Token required' } });
        }
        const token = authHeader.slice(7);
        await authService.revokeExtensionToken(token);
        return reply.send({ message: 'Token revoked' });
    });
    // ── Extension Token: List ──────────────────────────────────────────────────
    app.get('/api/auth/extension/tokens', { preHandler: requireSession }, async (req, reply) => {
        const tokens = await authService.listExtensionTokens(req.userId);
        return reply.send({ tokens });
    });
    // ── User Profile ────────────────────────────────────────────────────────────
    app.get('/api/users/me', { preHandler: requireSession }, async (req, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { settings: true },
        });
        if (!user)
            return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        return reply.send({
            id: user.id,
            email: user.email,
            createdAt: user.createdAt.getTime(),
            settings: user.settings,
        });
    });
    // ── User Settings: Get ──────────────────────────────────────────────────────
    app.get('/api/users/me/settings', { preHandler: requireSession }, async (req, reply) => {
        const settings = await authService.getUserSettings(req.userId);
        return reply.send(settings);
    });
    // ── User Settings: Update ───────────────────────────────────────────────────
    app.patch('/api/users/me/settings', { preHandler: requireSession }, async (req, reply) => {
        const update = UserSettingsUpdateSchema.parse(req.body);
        const settings = await authService.updateUserSettings(req.userId, update);
        return reply.send(settings);
    });
    // ── Delete All History ──────────────────────────────────────────────────────
    app.delete('/api/users/me/history', { preHandler: requireSession }, async (req, reply) => {
        const result = await authService.deleteAllUserHistory(req.userId);
        return reply.send({ deleted: result.deleted });
    });
    // ── Export Data ─────────────────────────────────────────────────────────────
    app.get('/api/users/me/export', { preHandler: requireSession }, async (req, reply) => {
        const data = await authService.exportUserData(req.userId);
        return reply.send(data);
    });
    // ── Delete Account ──────────────────────────────────────────────────────────
    app.delete('/api/users/me', { preHandler: requireSession }, async (req, reply) => {
        await authService.deleteUserAccount(req.userId);
        reply.clearCookie('karcoz_session', { path: '/' });
        return reply.send({ message: 'Account deleted' });
    });
}
//# sourceMappingURL=auth.routes.js.map