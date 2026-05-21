import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
export declare function registerExtensionAuth(app: ReturnType<typeof import('fastify')>, prisma: PrismaClient): void;
export declare function requireExtensionAuth(req: FastifyRequest, reply: FastifyReply): void;
//# sourceMappingURL=extension-auth.d.ts.map