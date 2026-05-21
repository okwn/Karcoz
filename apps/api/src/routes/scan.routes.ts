/**
 * POST /api/scan/page-candidates
 *
 * Input:
 *   pageText: string
 *   pageTitle: string
 *   sourceUrl: string
 *   candidates?: QuestionCandidate[]  // client-detected candidates
 *
 * Output:
 *   candidates: QuestionCandidate[]  // enriched/verified candidates
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const PageCandidatesRequestSchema = z.object({
  pageText: z.string().min(1),
  pageTitle: z.string().default(''),
  sourceUrl: z.string().default(''),
  candidates: z.array(z.object({
    id: z.string(),
    text: z.string(),
    options: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1).default(0.5),
    boundingHint: z.object({
      top: z.number(),
      left: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
    source: z.enum(['dom', 'inferred']).default('dom'),
  })).optional(),
});

export type PageCandidatesRequest = z.infer<typeof PageCandidatesRequestSchema>;

export interface QuestionCandidate {
  id: string;
  text: string;
  options: string[];
  confidence: number;
  boundingHint?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  source: 'dom' | 'inferred';
}

export function registerScanRoutes(app: FastifyInstance) {
  // ── POST /api/scan/page-candidates ──────────────────────────────────────────

  app.post('/api/scan/page-candidates', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = PageCandidatesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid page candidates request',
          details: parsed.error.flatten(),
        },
      });
    }

    const { pageText, pageTitle, candidates: clientCandidates } = parsed.data;

    // Use client-provided candidates if available
    if (clientCandidates && clientCandidates.length > 0) {
      return reply.status(200).send({
        candidates: enrichCandidates(clientCandidates),
      });
    }

    // Server-side candidate detection using text analysis
    const serverCandidates = detectCandidatesFromText(pageText, pageTitle);

    return reply.status(200).send({
      candidates: serverCandidates,
    });
  });
}

// ── Server-side candidate detection ───────────────────────────────────────────

function detectCandidatesFromText(pageText: string, pageTitle: string): QuestionCandidate[] {
  const candidates: QuestionCandidate[] = [];

  // Split into paragraphs/lines
  const lines = pageText.split(/\n{2,}/).filter(l => l.trim().length > 10);

  for (const line of lines) {
    const score = calculateQuestionScore(line);
    if (score < 0.2) continue;

    const { mainText, options } = parseOptionsFromText(line);

    candidates.push({
      id: generateId(mainText),
      text: mainText.slice(0, 500),
      options,
      confidence: score,
      source: 'inferred',
    });
  }

  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

function enrichCandidates(candidates: QuestionCandidate[]): QuestionCandidate[] {
  return candidates.map(c => ({
    ...c,
    confidence: Math.min(c.confidence * 1.05, 1.0), // Slight boost for server-confirmed
  }));
}

function parseOptionsFromText(text: string): { mainText: string; options: string[] } {
  const options: string[] = [];

  // A. B. C. D. pattern
  const letterPattern = /(?:^|\n)\s*([A-D])\.\s*([^\n]+)/gi;
  const letterMatches = [...text.matchAll(letterPattern)];
  if (letterMatches.length >= 2) {
    for (const m of letterMatches) options.push(m[2]?.trim() ?? '');
    const mainText = text.replace(/(?:^|\n)\s*[A-D]\.\s*[^\n]+/gi, '').trim();
    return { mainText, options };
  }

  // (a) (b) (c) (d) pattern
  const parenPattern = /\(\s*([a-d])\s*\)\s*([^\(\)]+)/gi;
  const parenMatches = [...text.matchAll(parenPattern)];
  if (parenMatches.length >= 2) {
    for (const m of parenMatches) options.push(m[2]?.trim() ?? '');
    const mainText = text.replace(/\(\s*[a-d]\s*\)\s*[^\(\)]+/gi, '').trim();
    return { mainText, options };
  }

  // 1. 2. 3. 4. pattern
  const numPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+)/g;
  const numMatches = [...text.matchAll(numPattern)];
  if (numMatches.length >= 2) {
    for (const m of numMatches) options.push(m[2]?.trim() ?? '');
    const mainText = text.replace(/(?:^|\n)\s*\d+[\.\)]\s*[^\n]+/g, '').trim();
    return { mainText, options };
  }

  return { mainText: text, options: [] };
}

function calculateQuestionScore(text: string): number {
  let score = 0;
  const lower = text.toLowerCase();

  if (/\b(what|how|why|when|where|who|which|whose|whom)\b/i.test(text)) score += 0.3;
  if (/\b(solve|find|calculate|determine|explain|describe|compare|contrast|evaluate|identify)\b/i.test(text)) score += 0.2;
  if (/\?\s*$/.test(text)) score += 0.25;
  if (/\n\s*[A-Z]\.\s+/m.test(text) || /\n\s*\d+\.\s+/m.test(text)) score += 0.2;
  if (/\(\s*[a-z]\s*\)/.test(text)) score += 0.15;
  if (/[=<>+\-*/^]/.test(text) && /\d/.test(text)) score += 0.1;
  if (text.trim().length >= 20 && text.trim().length <= 600) score += 0.1;

  return Math.min(score, 1.0);
}

function generateId(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `q_${Math.abs(hash).toString(36).slice(0, 8)}`;
}