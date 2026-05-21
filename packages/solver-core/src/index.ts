// AI provider interface (inline to avoid workspace dependency)
interface AIProviderLike {
  solveQuestion(input: {
    question: string;
    questionType: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: any;
    explanationLevel?: string;
    language?: string;
  }): Promise<{
    shortAnswer: string;
    selectedOption?: number;
    fullExplanation?: string;
    reasoningSummary?: string;
    confidenceScore?: number;
    validationStatus?: string;
  }>;
}

import type {
  SolverQuestion,
  SolverResult,
  SolveInput,
  CombinedConfidence,
  QuestionTypePrediction,
} from './types.js';

import { classifyQuestionType } from './classify/question-type-classifier.js';
import { classifyTopic } from './classify/topic-classifier.js';
import { solveArithmetic } from './solvers/arithmetic.solver.js';
import { solvePercentage } from './solvers/percentage.solver.js';
import { solveRatio } from './solvers/ratio.solver.js';
import { solveSimpleAlgebra } from './solvers/simple-algebra.solver.js';
import { solveSequence } from './solvers/sequence.solver.js';
import { solveMultipleChoice } from './solvers/multiple-choice.solver.js';
import { solveWithAI } from './solvers/fallback-ai.solver.js';
import { validateAnswer } from './validate/answer-validator.js';
import { calculateConfidence } from './validate/confidence-calculator.js';

// Re-export types
export * from './types.js';

/**
 * Main solver entry point.
 * 1. Classify question type
 * 2. Route to deterministic solver if supported
 * 3. Fall back to AI if allowed and needed
 * 4. Validate and calibrate confidence
 */
export async function solve(
  input: SolveInput,
  aiProvider?: AIProviderLike
): Promise<SolverResult> {
  const { question, explanationLevel, aiFallback = true } = input;

  // Step 1: Classify question type
  const typePrediction = classifyQuestionType(question);
  const topicPrediction = classifyTopic(question);

  // Attach classification results
  const questionWithMeta: SolverQuestion = {
    ...question,
    questionType: typePrediction.type,
    topic: topicPrediction.topic,
  };

  // Step 2: Route to deterministic solver
  let result = routeToSolver(questionWithMeta);

  // Step 3: If deterministic solver failed (low confidence) and AI fallback available, use AI
  if (result.confidenceScore < 0.5 && aiFallback && aiProvider) {
    const aiResult = await solveWithAI(questionWithMeta, {
      provider: aiProvider,
      explanationLevel,
    });

    // Use AI result only if it's better
    if (aiResult.confidenceScore > result.confidenceScore) {
      result = aiResult;
    }
  }

  // Step 4: Validate answer
  const validation = validateAnswer(result);
  result.validationStatus = validation.status;

  // Step 5: Combine confidence scores
  const combined = calculateConfidence(
    question.ocrConfidence ?? 0.8,
    result.confidenceScore,
    validation.confidenceAdjustment + 0.5 // base validation score
  );

  result.confidenceScore = combined.overall;
  result.confidenceBreakdown = combined.breakdown;

  if (combined.isLowConfidence) {
    result.validationStatus = 'low_confidence';
  }

  return result;
}

/**
 * Route to the appropriate deterministic solver based on question type.
 */
function routeToSolver(question: SolverQuestion): SolverResult {
  const { questionType } = question;

  switch (questionType) {
    case 'arithmetic':
      return solveArithmetic(question);
    case 'percentage':
      return solvePercentage(question);
    case 'ratio':
      return solveRatio(question);
    case 'simple_algebra':
      return solveSimpleAlgebra(question);
    case 'sequence':
      return solveSequence(question);
    case 'multiple_choice':
      return solveMultipleChoice(question);
    default: {
      // Try to extract and solve anyway
      if (question.options && question.options.length >= 2) {
        return solveMultipleChoice(question);
      }
      return {
        shortAnswer: '?',
        confidenceScore: 0.2,
        solverUsed: 'ai_fallback',
        fullExplanation: 'Soru türü tanımlanamadı; AI gereklidir.',
        reasoningSummary: 'Tanımsız soru türü.',
        validationStatus: 'low_confidence',
        confidenceBreakdown: {
          ocrConfidence: question.ocrConfidence ?? 0.8,
          solverConfidence: 0.2,
          validationConfidence: 0,
          finalConfidence: 0.2,
        },
      };
    }
  }
}

/**
 * Classify a question's type without solving it.
 */
export function classify(input: { text: string; options?: { label: string; value: string; order: number }[] }): QuestionTypePrediction {
  const question: SolverQuestion = {
    text: input.text,
    normalizedText: input.text,
    questionType: 'unknown',
    options: input.options,
    language: 'unknown',
  };
  return classifyQuestionType(question);
}

/**
 * Check if solver confidence is low enough to warn user.
 */
export function needsBetterCrop(confidence: number): boolean {
  return confidence < 0.5;
}