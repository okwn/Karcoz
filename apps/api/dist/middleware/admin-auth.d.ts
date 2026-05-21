import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
declare module 'fastify' {
    interface FastifyRequest {
        isAdmin?: boolean;
    }
}
export declare function registerAdminAuth(app: ReturnType<typeof import('fastify')>, prisma: PrismaClient): void;
export declare function requireAdmin(req: FastifyRequest, reply: FastifyReply): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown> | undefined;
//# sourceMappingURL=admin-auth.d.ts.map