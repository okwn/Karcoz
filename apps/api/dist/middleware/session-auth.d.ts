import '@fastify/cookie';
import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
declare module 'fastify' {
    interface FastifyRequest {
        userId?: string;
        sessionId?: string;
    }
}
export declare function registerSessionAuth(app: ReturnType<typeof import('fastify')>, prisma: PrismaClient): void;
export declare function requireSession(req: FastifyRequest, reply: FastifyReply): void;
export declare function optionalSession(req: FastifyRequest, _reply: FastifyReply): void;
//# sourceMappingURL=session-auth.d.ts.map