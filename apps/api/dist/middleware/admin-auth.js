export function registerAdminAuth(app, prisma) {
    // Admin check runs after session auth — adds isAdmin flag to request
    app.addHook('preHandler', async (req, _reply) => {
        if (!req.userId)
            return; // requireSession must be applied per-route
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.userId },
                select: { role: true },
            });
            req.isAdmin = user?.role === 'admin';
        }
        catch {
            req.isAdmin = false;
        }
    });
}
export function requireAdmin(req, reply) {
    if (!req.userId) {
        return reply.code(401).send({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
    }
    if (!req.isAdmin) {
        return reply.code(403).send({
            error: { code: 'FORBIDDEN', message: 'Admin access required' },
        });
    }
}
//# sourceMappingURL=admin-auth.js.map