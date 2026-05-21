import '@fastify/cookie';
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
