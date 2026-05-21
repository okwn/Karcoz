import type { PrismaClient } from '@prisma/client';
import type {
  SolveImageRequest,
  SolveTextRequest,
} from '@karcoz/shared';
import type { Extraction } from '@karcoz/shared';
import type { Solution } from '@karcoz/shared';
import type { PerformanceMetrics } from '@karcoz/shared';
import { extractFromImage, extractFromText } from './extraction.service.js';
import { classifyTopic } from './topic-classifier.service.js';
import { solveQuestion } from './solution.service.js';
import { validateSolution } from './validation.service.js';
import { createAuditService } from './audit.service.js';
import { createUsageService } from './usage.service.js';
import { computeQuestionHash, getCachedAnswer, setCachedAnswer } from './cache.service.js';

export interface SolveContext {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

export interface SolveServiceResult {
  questionId: string;
  extraction: Extraction;
  solution: Solution;
  performance: PerformanceMetrics;
}

const ERRORS = {
  INVALID_IMAGE: { code: 'INVALID_IMAGE', message: 'Invalid or malformed image data', httpStatus: 400 },
  IMAGE_TOO_LARGE: { code: 'IMAGE_TOO_LARGE', message: 'Image exceeds maximum size limit', httpStatus: 413 },
  NO_QUESTION_DETECTED: { code: 'NO_QUESTION_DETECTED', message: 'No question text could be detected in the image', httpStatus: 422 },
  LOW_CONFIDENCE: { code: 'LOW_CONFIDENCE', message: 'Question extraction confidence too low', httpStatus: 422 },
  PROVIDER_TIMEOUT: { code: 'PROVIDER_TIMEOUT', message: 'AI provider request timed out', httpStatus: 504 },
  RATE_LIMITED: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', httpStatus: 429 },
} as const;

export type KarcozError = (typeof ERRORS)[keyof typeof ERRORS] & { details?: unknown };

function isKarcozError(err: unknown): err is KarcozError {
  return typeof err === 'object' && err !== null && 'code' in err && 'message' in err;
}

export function createSolveService(prisma: PrismaClient) {
  const auditService = createAuditService(prisma);
  const usageService = createUsageService(prisma);

  async function solveFromImage(
    request: SolveImageRequest,
    ctx: SolveContext
  ): Promise<SolveServiceResult> {
    const startTime = Date.now();
    const captureStart = startTime;

    const hasImage = !!(request.imageBase64 || request.imageUrl);
    if (!hasImage) {
      throw ERRORS.INVALID_IMAGE;
    }

    if (request.imageBase64 && request.imageBase64.length > 15 * 1024 * 1024) {
      throw ERRORS.IMAGE_TOO_LARGE;
    }

    await auditService.logSolveRequest(ctx.requestId, request.imageBase64, request.imageUrl);

    const extractionStart = Date.now();
    const extraction = await extractFromImage(request.imageBase64 ?? '');
    const extractionEnd = Date.now();
    const extractionLatency = extractionEnd - extractionStart;

    if (!extraction.extractedText || extraction.extractedText.length < 5) {
      await auditService.logSolveError(ctx.requestId, ERRORS.NO_QUESTION_DETECTED.code, 'Empty extraction');
      throw ERRORS.NO_QUESTION_DETECTED;
    }

    if (extraction.confidence < 0.3) {
      await auditService.logSolveError(ctx.requestId, ERRORS.LOW_CONFIDENCE.code, `Low confidence: ${extraction.confidence}`);
      throw ERRORS.LOW_CONFIDENCE;
    }

    // Topic classification
    const topicResult = await classifyTopic(extraction.extractedText);
    if (topicResult.topic) {
      extraction.topic = topicResult.topic;
    }

    // Check cache before solving
    const questionHash = computeQuestionHash(extraction.normalizedText);
    const cached = await getCachedAnswer(questionHash);
    if (cached) {
      const validationStart = Date.now();
      const validationResult = await validateSolution(
        cached.answer,
        extraction.extractedText,
        extraction.confidence
      );
      const validationEnd = Date.now();
      const validationLatency = validationEnd - validationStart;

      const solution: Solution = {
        shortAnswer: cached.answer,
        confidenceScore: Math.max(0, Math.min(1, cached.confidence + validationResult.confidenceAdjustment)),
        fullExplanation: cached.explanation,
        reasoningSummary: '',
        validationStatus: validationResult.status,
        selectedOption: undefined,
      };

      const totalLatencyMs = Date.now() - startTime;

      const question = await prisma.question.create({
        data: {
          id: ctx.requestId,
          sourceType: request.sourceType,
          sourceUrl: request.sourceUrl,
          pageTitle: request.pageTitle,
          extractedText: extraction.extractedText,
          normalizedText: extraction.normalizedText,
          questionType: extraction.questionType,
          topic: extraction.topic,
          options: extraction.options ?? [],
          shortAnswer: solution.shortAnswer,
          selectedOption: solution.selectedOption,
          fullExplanation: solution.fullExplanation,
          confidenceScore: solution.confidenceScore,
          status: 'solved',
          questionHash,
          userId: ctx.userId,
        },
      });

      await auditService.logSolveSuccess(question.id, totalLatencyMs);

      return {
        questionId: question.id,
        extraction: extraction as unknown as Extraction,
        solution,
        performance: {
          captureLatencyMs: extractionStart - captureStart,
          uploadLatencyMs: 0,
          extractionLatencyMs: extractionLatency,
          solvingLatencyMs: 0,
          validationLatencyMs: validationLatency,
          totalLatencyMs,
        },
      };
    }

    const solvingStart = Date.now();
    const solution = await solveQuestion(
      extraction.extractedText,
      extraction.options,
      request.explanationLevel ?? 'standard',
      request.mode ?? 'full'
    );
    const solvingEnd = Date.now();
    const solvingLatency = solvingEnd - solvingStart;

    const validationStart = Date.now();
    const validationResult = await validateSolution(
      solution.shortAnswer,
      extraction.extractedText,
      extraction.confidence
    );
    const validationEnd = Date.now();
    const validationLatency = validationEnd - validationStart;

    solution.confidenceScore = Math.max(
      0,
      Math.min(1, solution.confidenceScore + validationResult.confidenceAdjustment)
    );
    solution.validationStatus = validationResult.status;

    const totalLatencyMs = Date.now() - startTime;

    // Persist to database
    const question = await prisma.question.create({
      data: {
        id: ctx.requestId,
        sourceType: request.sourceType,
        sourceUrl: request.sourceUrl,
        pageTitle: request.pageTitle,
        extractedText: extraction.extractedText,
        normalizedText: extraction.normalizedText,
        questionType: extraction.questionType,
        topic: extraction.topic,
        options: extraction.options ?? [],
        shortAnswer: solution.shortAnswer,
        selectedOption: solution.selectedOption,
        fullExplanation: solution.fullExplanation,
        confidenceScore: solution.confidenceScore,
        status: 'solved',
        questionHash,
      },
    });

    await setCachedAnswer(questionHash, {
      answer: solution.shortAnswer,
      confidence: solution.confidenceScore,
      explanation: solution.fullExplanation ?? '',
      questionId: question.id,
    });

    await auditService.logSolveSuccess(question.id, totalLatencyMs);

    return {
      questionId: question.id,
      extraction: extraction as unknown as Extraction,
      solution: solution as unknown as Solution,
      performance: {
        captureLatencyMs: extractionStart - captureStart,
        uploadLatencyMs: solvingStart - extractionEnd,
        extractionLatencyMs: extractionLatency,
        solvingLatencyMs: solvingLatency,
        validationLatencyMs: validationLatency,
        totalLatencyMs,
      },
    };
  }

  async function solveFromText(
    request: SolveTextRequest,
    ctx: SolveContext
  ): Promise<SolveServiceResult> {
    const startTime = Date.now();
    const captureStart = startTime;

    const extractionStart = Date.now();
    const extraction = await extractFromText(request.text);
    const extractionEnd = Date.now();
    const extractionLatency = extractionEnd - extractionStart;

    if (!extraction.extractedText || extraction.extractedText.length < 5) {
      throw ERRORS.NO_QUESTION_DETECTED;
    }

    const topicResult = await classifyTopic(extraction.extractedText);
    if (topicResult.topic) {
      extraction.topic = topicResult.topic;
    }

    // Check cache before solving
    const questionHash = computeQuestionHash(extraction.normalizedText);
    const cached = await getCachedAnswer(questionHash);
    if (cached) {
      const validationStart = Date.now();
      const validationResult = await validateSolution(
        cached.answer,
        extraction.extractedText,
        extraction.confidence
      );
      const validationEnd = Date.now();
      const validationLatency = validationEnd - validationStart;

      const solution: Solution = {
        shortAnswer: cached.answer,
        confidenceScore: Math.max(0, Math.min(1, cached.confidence + validationResult.confidenceAdjustment)),
        fullExplanation: cached.explanation,
        reasoningSummary: '',
        validationStatus: validationResult.status,
        selectedOption: undefined,
      };

      const totalLatencyMs = Date.now() - startTime;

      const question = await prisma.question.create({
        data: {
          id: ctx.requestId,
          sourceType: 'upload',
          sourceUrl: request.sourceUrl,
          pageTitle: request.pageTitle,
          extractedText: extraction.extractedText,
          normalizedText: extraction.normalizedText,
          questionType: extraction.questionType,
          topic: extraction.topic,
          options: extraction.options ?? [],
          shortAnswer: solution.shortAnswer,
          selectedOption: solution.selectedOption,
          fullExplanation: solution.fullExplanation,
          confidenceScore: solution.confidenceScore,
          status: 'solved',
          questionHash,
          userId: ctx.userId,
        },
      });

      await auditService.logSolveSuccess(question.id, totalLatencyMs);

      return {
        questionId: question.id,
        extraction: extraction as unknown as Extraction,
        solution,
        performance: {
          captureLatencyMs: extractionStart - captureStart,
          uploadLatencyMs: 0,
          extractionLatencyMs: extractionLatency,
          solvingLatencyMs: 0,
          validationLatencyMs: validationLatency,
          totalLatencyMs,
        },
      };
    }

    const solvingStart = Date.now();
    const solution = await solveQuestion(
      extraction.extractedText,
      extraction.options,
      request.explanationLevel ?? 'standard',
      request.mode ?? 'full'
    );
    const solvingEnd = Date.now();
    const solvingLatency = solvingEnd - solvingStart;

    const validationStart = Date.now();
    const validationResult = await validateSolution(
      solution.shortAnswer,
      extraction.extractedText,
      extraction.confidence
    );
    const validationEnd = Date.now();
    const validationLatency = validationEnd - validationStart;

    solution.confidenceScore = Math.max(
      0,
      Math.min(1, solution.confidenceScore + validationResult.confidenceAdjustment)
    );
    solution.validationStatus = validationResult.status;

    const totalLatencyMs = Date.now() - startTime;

    const question = await prisma.question.create({
      data: {
        id: ctx.requestId,
        sourceType: 'upload',
        sourceUrl: request.sourceUrl,
        pageTitle: request.pageTitle,
        extractedText: extraction.extractedText,
        normalizedText: extraction.normalizedText,
        questionType: extraction.questionType,
        topic: extraction.topic,
        options: extraction.options ?? [],
        shortAnswer: solution.shortAnswer,
        selectedOption: solution.selectedOption,
        fullExplanation: solution.fullExplanation,
        confidenceScore: solution.confidenceScore,
        status: 'solved',
        questionHash,
      },
    });

    await setCachedAnswer(questionHash, {
      answer: solution.shortAnswer,
      confidence: solution.confidenceScore,
      explanation: solution.fullExplanation ?? '',
      questionId: question.id,
    });

    await auditService.logSolveSuccess(question.id, totalLatencyMs);

    return {
      questionId: question.id,
      extraction: extraction as unknown as Extraction,
      solution: solution as unknown as Solution,
      performance: {
        captureLatencyMs: extractionStart - captureStart,
        uploadLatencyMs: solvingStart - extractionEnd,
        extractionLatencyMs: extractionLatency,
        solvingLatencyMs: solvingLatency,
        validationLatencyMs: validationLatency,
        totalLatencyMs,
      },
    };
  }

  async function recordUsage(userId: string, endpoint: string): Promise<void> {
    await usageService.incrementUsage(userId, endpoint, 'daily');
    await usageService.incrementUsage(userId, endpoint, 'monthly');
    await usageService.incrementUsage(userId, endpoint, 'minute');
  }

  return {
    solveFromImage,
    solveFromText,
    auditService,
    usageService,
    isKarcozError,
    ERRORS,
    recordUsage,
  };
}

export { ERRORS };