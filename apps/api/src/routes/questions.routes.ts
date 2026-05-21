/**
 * GET  /api/questions/history     — paginated, filterable history
 * GET  /api/questions/:id         — single question with saves
 * POST /api/questions/:id/save     — save/user notes on a question
 * DELETE /api/questions/:id         — delete a question
 * DELETE /api/user/data            — delete all user data
 * GET  /api/analytics/weak-topics — weak areas by topic
 * GET  /api/analytics/overview     — dashboard overview stats
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { requireSession } from '../middleware/session-auth.js';

const QuestionHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  topic: z.string().optional(),
  difficulty: z.string().optional(),
  question_type: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  min_confidence: z.coerce.number().min(0).max(1).optional(),
  saved_only: z.coerce.boolean().default(false),
  sort: z.enum(['createdAt', 'confidenceScore', 'topic']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const SaveQuestionBodySchema = z.object({
  selectedOption: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export function registerQuestionRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // ── GET /api/questions/history ─────────────────────────────────────────────

  app.get('/api/questions/history', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, unknown>;
    const parsed = QuestionHistoryQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'INVALID_QUERY', message: 'Invalid query params', details: parsed.error.flatten() },
      });
    }

    const userId = request.userId!;
    const { page, limit, topic, difficulty, question_type, date_from, date_to, min_confidence, saved_only, sort, order } = parsed.data;
    const skip = (page - 1) * limit;

    // Build where clause — always scoped to this user
    const where: Record<string, unknown> = { userId };
    if (topic) where.topic = { contains: topic, mode: 'insensitive' };
    if (question_type) where.questionType = question_type;
    if (min_confidence !== undefined) where.confidenceScore = { gte: min_confidence };
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) (where.createdAt as Record<string, unknown>).gte = new Date(date_from);
      if (date_to) (where.createdAt as Record<string, unknown>).lte = new Date(date_to);
    }
    if (saved_only) where.saves = { some: {} };

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        include: {
          saves: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.question.count({ where }),
    ]);

    return reply.status(200).send({
      data: questions.map(q => formatQuestion(q)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ── GET /api/questions/:id ──────────────────────────────────────────────────

  app.get('/api/questions/:id', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId!;

    const question = await prisma.question.findFirst({
      where: { id, userId },
      include: {
        saves: { orderBy: { createdAt: 'desc' } },
        auditLogs: { take: 20, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!question) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }

    return reply.status(200).send(formatQuestion(question));
  });

  // ── POST /api/questions/:id/save ───────────────────────────────────────────

  app.post('/api/questions/:id/save', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = SaveQuestionBodySchema.parse(request.body);
    const userId = request.userId!;

    const question = await prisma.question.findFirst({ where: { id, userId } });
    if (!question) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }

    const [save] = await Promise.all([
      prisma.questionSave.create({
        data: {
          questionId: id,
          selectedOption: body.selectedOption,
          notes: body.notes,
          tags: body.tags,
        },
      }),
      prisma.question.update({
        where: { id },
        data: { status: 'saved' },
      }),
    ]);

    return reply.status(201).send({ saved: true, save });
  });

  // ── DELETE /api/questions/:id ───────────────────────────────────────────────

  app.delete('/api/questions/:id', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId!;

    const question = await prisma.question.findFirst({ where: { id, userId } });
    if (!question) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }

    await prisma.question.delete({ where: { id } });

    return reply.status(200).send({ deleted: true, id });
  });

  // ── GET /api/analytics/weak-topics ─────────────────────────────────────────

  app.get('/api/analytics/weak-topics', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;
    // Group questions by topic, compute avg confidence and count
    type TopicAgg = { topic: string; avgConfidence: number; count: number; lowConfidenceCount: number; savedCount: number };

    const raw: TopicAgg[] = await prisma.$queryRaw`
      SELECT
        COALESCE(NULLIF(topic, ''), 'uncategorized') as topic,
        AVG(COALESCE(confidence_score, 0))::float as "avgConfidence",
        COUNT(*)::int as count,
        COUNT(*) FILTER (WHERE confidence_score < 0.7)::int as "lowConfidenceCount",
        COUNT(*) FILTER (WHERE status = 'saved')::int as "savedCount"
      FROM "Question"
      WHERE "userId" = ${userId}
      GROUP BY topic
      HAVING COUNT(*) >= 1
      ORDER BY "avgConfidence" ASC, count DESC
      LIMIT 20
    `;

    const weakTopics = raw.map(r => ({
      topic: r.topic,
      avgConfidence: Math.round(r.avgConfidence * 100) / 100,
      totalQuestions: r.count,
      lowConfidenceCount: r.lowConfidenceCount,
      savedCount: r.savedCount,
      weaknessScore: Math.round((1 - r.avgConfidence) * 100) / 100,
      recommendation: r.avgConfidence < 0.6 ? 'review' : r.avgConfidence < 0.75 ? 'practice' : 'monitor',
    }));

    // Also get subtopic breakdown for top weak topics
    const topWeak = weakTopics.filter(t => t.weaknessScore > 0.2).slice(0, 5);

    return reply.status(200).send({ weakTopics, topWeak });
  });

  // ── GET /api/analytics/overview ─────────────────────────────────────────────

  app.get('/api/analytics/overview', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.userId!;
    const userFilter = { userId };
    const [total, saved, byTopic, byType, recentHistory] = await Promise.all([
      prisma.question.count({ where: userFilter }),
      prisma.question.count({ where: { ...userFilter, status: 'saved' } }),
      prisma.$queryRaw<Array<{ topic: string; count: bigint }>>`
        SELECT COALESCE(NULLIF(topic, ''), 'uncategorized') as topic, COUNT(*)::bigint as count
        FROM "Question" WHERE "userId" = ${userId} GROUP BY topic ORDER BY count DESC LIMIT 10
      `,
      prisma.$queryRaw<Array<{ questionType: string; count: bigint }>>`
        SELECT questionType as "questionType", COUNT(*)::bigint as count
        FROM "Question" WHERE "userId" = ${userId} GROUP BY questionType ORDER BY count DESC LIMIT 10
      `,
      prisma.question.findMany({
        where: userFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, topic: true, confidenceScore: true, questionType: true, createdAt: true },
      }),
    ]);

    // Avg confidence over all
    const avgConfResult = await prisma.$queryRaw<Array<{ avg: number }>>`
      SELECT AVG(COALESCE(confidence_score, 0))::float as avg FROM "Question" WHERE "userId" = ${userId}
    `;
    const avgConfidence = avgConfResult[0]?.avg ?? 0;

    // Questions this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeek = await prisma.question.count({
      where: { ...userFilter, createdAt: { gte: weekAgo } },
    });

    return reply.status(200).send({
      total,
      saved,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      thisWeek,
      byTopic: byTopic.map(t => ({ topic: t.topic, count: Number(t.count) })),
      byType: byType.map(t => ({ type: t.questionType, count: Number(t.count) })),
      recentHistory: recentHistory.map(q => ({
        id: q.id,
        topic: q.topic,
        confidence: q.confidenceScore,
        type: q.questionType,
        time: q.createdAt,
      })),
    });
  });

  // ── DELETE /api/user/data ───────────────────────────────────────────────────

  app.delete('/api/user/data', { preHandler: requireSession }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { confirm?: string };
    if (query.confirm !== 'delete-all') {
      return reply.status(400).send({
        error: { code: 'CONFIRMATION_REQUIRED', message: 'Add ?confirm=delete-all to confirm' },
      });
    }

    // Delete all questions for THIS user only — never cross-user data
    const userId = request.userId!;
    await prisma.question.deleteMany({ where: { userId } });

    return reply.status(200).send({ deleted: true, timestamp: Date.now() });
  });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatQuestion(q: { id: string; topic: string | null; questionType: string; extractedText: string; shortAnswer: string | null; confidenceScore: number | null; status: string; sourceUrl: string | null; pageTitle: string | null; createdAt: Date; saves?: Array<{ id: string; selectedOption: number | null; notes: string | null; tags: string[]; createdAt: Date }> }) {
  return {
    id: q.id,
    topic: q.topic,
    questionType: q.questionType,
    extractedText: q.extractedText?.slice(0, 500),
    shortAnswer: q.shortAnswer,
    confidenceScore: q.confidenceScore,
    status: q.status,
    sourceUrl: q.sourceUrl,
    pageTitle: q.pageTitle,
    createdAt: q.createdAt,
    saves: q.saves?.map(s => ({
      id: s.id,
      selectedOption: s.selectedOption,
      notes: s.notes,
      tags: s.tags,
      createdAt: s.createdAt,
    })),
  };
}