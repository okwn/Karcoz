/**
 * GET  /api/questions/history     — paginated, filterable history
 * GET  /api/questions/:id         — single question with saves
 * POST /api/questions/:id/save     — save/user notes on a question
 * DELETE /api/questions/:id         — delete a question
 * DELETE /api/user/data            — delete all user data
 * GET  /api/analytics/weak-topics — weak areas by topic
 * GET  /api/analytics/overview     — dashboard overview stats
 */
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
export declare function registerQuestionRoutes(app: FastifyInstance, prisma: PrismaClient): void;
//# sourceMappingURL=questions.routes.d.ts.map