import '@fastify/cookie';
import { AuthService } from '../services/auth.service.js';
export function registerSessionAuth(app, prisma) {
    const authService = new AuthService(prisma);
    app.addHook('preHandler', async (req, reply) => {
        // Extract token from HttpOnly cookie
        const token = req.cookies['karcoz_session'];
        if (!token)
            return; // allow unauthenticated for now on public routes
        try {
            const session = await authService.validateSession(token);
            if (session) {
                req.userId = session.userId;
                req.sessionId = session.sessionId;
            }
        }
        catch {
            // Invalid token — clear cookie
            reply.clearCookie('karcoz_session');
        }
    });
}
export function requireSession(req, reply) {
    if (!req.userId) {
        reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
}
export function optionalSession(req, _reply) {
    // Just ensures req.userId is set if valid session exists
}
//# sourceMappingURL=session-auth.js.map