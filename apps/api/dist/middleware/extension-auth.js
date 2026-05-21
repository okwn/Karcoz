import { AuthService } from '../services/auth.service.js';
export function registerExtensionAuth(app, prisma) {
    const authService = new AuthService(prisma);
    app.addHook('preHandler', async (req, _reply) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer '))
            return;
        const token = authHeader.slice(7);
        try {
            const result = await authService.validateExtensionToken(token);
            if (result) {
                req.userId = result.userId;
            }
        }
        catch {
            // Invalid token — just no user attached
        }
    });
}
export function requireExtensionAuth(req, reply) {
    if (!req.userId) {
        reply.code(401).send({ error: { code: 'EXTENSION_AUTH_REQUIRED', message: 'Extension token required' } });
    }
}
//# sourceMappingURL=extension-auth.js.map