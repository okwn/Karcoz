#!/usr/bin/env tsx
/**
 * run-eval.ts — Evaluation runner
 *
 * Usage:
 *   pnpm eval              # full evaluation (OCR extraction + solver + validation)
 *   pnpm eval:solver       # solver only (no OCR simulation)
 *   pnpm eval:ocr          # OCR extraction only
 *
 * Loads datasets from eval/datasets/, runs the pipeline, and scores results.
 * Outputs a JSON report and prints a summary table.
 *
 * The pipeline uses:
 *   - @karcoz/ocr-core for text normalization, language detection, option parsing
 *   - @karcoz/solver-core for deterministic solving (arithmetic, percentage, etc.)
 *   - AI provider (mock by default, set AI_PROVIDER=openai/openrouter for real)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Package imports (typed interfaces) ─────────────────────────────────────────

import {
  normalizeText,
  detectLanguage,
  parseOptions,
} from '../../packages/ocr-core/src/normalize/index.js';

import { computeConfidence } from '../../packages/ocr-core/src/confidence/ocr-confidence.js';

import {
  solve,
  type SolverQuestion,
  type SolverResult,
  type SolveInput,
} from '../../packages/solver-core/src/index.js';
import { classifyQuestionType } from '../../packages/solver-core/src/classify/question-type-classifier.js';
import { classifyTopic } from '../../packages/solver-core/src/classify/topic-classifier.js';

import type { EvalDatasetEntry, QuestionEvalResult, EvalReport, EvalDimensionSummary } from '../src/types.js';
import {
  scoreOcr,
  scoreOptions,
  scoreTopic,
  scoreAnswer,
  scoreConfidence,
  scoreLatency,
  scoreExplanation,
  assembleQuestionResult,
} from '../src/scorers/solver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = join(__dirname, '../datasets');
const OUTPUT_DIR = join(__dirname, '../reports');

// ── Argument parsing ──────────────────────────────────────────────────────────

const scopeArg = (process.argv[2] ?? '--scope=full') as string;
const scopeFlag = scopeArg.replace('--scope=', '').trim();
const runOcr = scopeFlag === 'full' || scopeFlag === 'ocr';
const runSolver = scopeFlag === 'full' || scopeFlag === 'solver';
const providerMode = (process.env.AI_EVAL_PROVIDER ?? 'mock') as 'mock' | 'openai' | 'openrouter';

// ── Preprocessing config ──────────────────────────────────────────────────────

const PREPROCESS_ENABLED = process.env.OCR_PREPROCESSING_ENABLED === 'true';
const PREPROCESS_CONFIG = {
  enhanceContrast: PREPROCESS_ENABLED,
  denoise: PREPROCESS_ENABLED,
  binarize: PREPROCESS_ENABLED,
  resize: PREPROCESS_ENABLED,
};

// ── Dataset loading ────────────────────────────────────────────────────────────

function loadDatasets(): EvalDatasetEntry[] {
  const files = [
    'tr_math_basic.json',
    'tr_logic_basic.json',
    'percentage_ratio.json',
    'sequences.json',
    'algebra_basic.json',
    'multiple_choice_mixed.json',
  ];

  const entries: EvalDatasetEntry[] = [];
  for (const file of files) {
    const filePath = join(DATASETS_DIR, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      entries.push(...items);
      console.log(`[run-eval] Loaded ${file}: ${items.length} entries`);
    } catch (err) {
      console.warn(`[run-eval] Could not load ${file}:`, err instanceof Error ? err.message : err);
    }
  }
  return entries;
}

// ── Mock AI provider for eval (mirrors solver-core fallback interface) ─────────

interface MockAIProvider {
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

// ── Mock provider (returns "best guess" using dataset metadata) ─────────────────

function createMockEvalProvider(): MockAIProvider {
  return {
    async solveQuestion(input) {
      // Simulate realistic latency
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      // For eval: we return a placeholder; the real evaluation checks against expected answer
      return {
        shortAnswer: '(AI disabled in eval — using deterministic solver)',
        selectedOption: undefined,
        fullExplanation: 'Bu soru deterministik çözücü ile çözüldü.',
        reasoningSummary: 'Deterministic solve used.',
        confidenceScore: 0.85,
        validationStatus: 'not_validated',
      };
    },
  };
}

// ── Deterministic solving using solver-core ────────────────────────────────────

async function runSolverPipeline(
  entry: EvalDatasetEntry,
  ocrConfidence: number,
  aiProvider: MockAIProvider | undefined
): Promise<{
  shortAnswer: string;
  selectedOption: number | undefined;
  fullExplanation: string;
  reasoningSummary: string;
  solutionConfidence: number;
  solverUsed: string;
  validationStatus: 'pass' | 'fail' | 'low_confidence' | 'not_validated';
  confidenceBreakdown: {
    ocrConfidence: number;
    solverConfidence: number;
    validationConfidence: number;
    finalConfidence: number;
  };
}> {
  // Build solver question from dataset entry
  const lang = entry.language === 'tr' ? 'tr' : entry.language === 'en' ? 'en' : 'unknown';

  const options = entry.options?.map((opt, i) => {
    const label = String.fromCharCode(65 + i); // 'A', 'B', 'C', 'D'
    return { label, value: opt, order: i };
  });

  const solverQuestion: SolverQuestion = {
    text: entry.questionText,
    normalizedText: entry.expectedNormalizedText ?? entry.questionText,
    questionType: 'unknown',
    options,
    language: lang,
    ocrConfidence,
    topic: entry.topic,
  };

  const solveInput: SolveInput = {
    question: solverQuestion,
    explanationLevel: 'standard',
    aiFallback: true,
  };

  let result: SolverResult;

  if (aiProvider) {
    result = await solve(solveInput, aiProvider as Parameters<typeof solve>[1]);
  } else {
    result = await solve(solveInput);
  }

  return {
    shortAnswer: result.shortAnswer,
    selectedOption: result.selectedOption,
    fullExplanation: result.fullExplanation,
    reasoningSummary: result.reasoningSummary,
    solutionConfidence: result.confidenceScore,
    solverUsed: result.solverUsed,
    validationStatus: result.validationStatus,
    confidenceBreakdown: result.confidenceBreakdown ?? {
      ocrConfidence,
      solverConfidence: result.confidenceScore,
      validationConfidence: 0.5,
      finalConfidence: result.confidenceScore,
    },
  };
}

// ── Full evaluation pipeline ───────────────────────────────────────────────────

interface PipelineResult {
  extractedText: string;
  normalizedText: string;
  detectedLanguage: string;
  questionType: string;
  topic: string | undefined;
  options: { label: string; value: string; order: number }[] | undefined;
  confidence: number;
  shortAnswer: string;
  selectedOption: number | undefined;
  fullExplanation: string;
  reasoningSummary: string;
  solutionConfidence: number;
  solverUsed: string;
  validationStatus: string;
  confidenceBreakdown: {
    ocrConfidence: number;
    solverConfidence: number;
    validationConfidence: number;
    finalConfidence: number;
  };
  perf: {
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    totalLatencyMs: number;
  };
  preprocessingSteps: string[];
}

function applyPreprocessing(imageBuffer: Buffer, config: typeof PREPROCESS_CONFIG): { buffer: Buffer; steps: string[] } {
  const ocrPreprocess = require('../../packages/ocr-core/src/preprocess/index.js');
  const { enhanceContrast, denoise, binarize, resizeForOCR } = ocrPreprocess;
  const steps: string[] = [];
  let buf = imageBuffer;

  if (config.resize) {
    buf = resizeForOCR(buf, 300);
    steps.push('resize-300dpi');
  }
  if (config.enhanceContrast) {
    buf = enhanceContrast(buf);
    steps.push('enhance-contrast');
  }
  if (config.denoise) {
    buf = denoise(buf);
    steps.push('denoise');
  }
  if (config.binarize) {
    buf = binarize(buf);
    steps.push('binarize');
  }
  return { buffer: buf, steps };
}

async function runPipeline(
  entry: EvalDatasetEntry,
  aiProvider: MockAIProvider | undefined
): Promise<PipelineResult> {
  const startTime = Date.now();
  const preprocessingSteps: string[] = [];

  // ── Step 1: Simulate OCR extraction (text is already extracted in eval)
  const extractionStart = Date.now();
  let extractedText = entry.questionText;
  let imageProcessed = false;

  // Simulate image preprocessing if it were an image
  // In production, image bytes would be preprocessed here
  if (entry.imagePath && PREPROCESS_ENABLED) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { readFileSync } = require('node:fs');
      const imgBuffer = readFileSync(entry.imagePath);
      const { buffer, steps } = applyPreprocessing(imgBuffer, PREPROCESS_CONFIG);
      preprocessingSteps.push(...steps);
      imageProcessed = true;
    } catch {
      // image not found, continue without it
    }
  }

  // For text entries, simulate OCR extraction by normalizing
  // In real eval with images: would call hybridOCR(imageBuffer)
  const extractionLatency = runOcr ? 100 + Math.random() * 200 : 0;
  await new Promise((r) => setTimeout(r, extractionLatency));

  // Normalize the extracted text (this is what OCR → normalization produces)
  const normalizedText = runOcr
    ? normalizeText(extractedText).text
    : extractedText;

  // Detect language
  const detectedLanguage = runOcr
    ? (detectLanguage(normalizedText) ?? entry.language)
    : entry.language;

  // Parse options
  const options = runOcr
    ? parseOptions(normalizedText)
    : entry.options?.map((opt, i) => ({
        label: String.fromCharCode(65 + i),
        value: opt,
        order: i,
      }));

  // Classify question type (deterministic)
  const questionTypePrediction = runOcr
    ? classifyQuestionType({
        text: normalizedText,
        normalizedText,
        questionType: 'unknown',
        options,
        language: detectedLanguage as 'en' | 'tr' | 'unknown',
      } as SolverQuestion)
    : { type: 'unknown' as const, confidence: 0.5 };

  // Classify topic (deterministic)
  const topicPrediction = runOcr
    ? classifyTopic({
        text: normalizedText,
        normalizedText,
        questionType: 'unknown',
        options,
        language: detectedLanguage as 'en' | 'tr' | 'unknown',
      } as SolverQuestion)
    : { topic: entry.topic ?? 'General', confidence: 0.5 };

  const extractionLatencyMs = Date.now() - extractionStart;
  const extractionEnd = Date.now();

  // ── Step 2: Solve (deterministic or AI fallback)
  const solvingStart = Date.now();
  let solvingLatencyMs = 0;

  // Calculate OCR confidence
  const ocrConfidence = computeConfidence({
    ocrEngine: runOcr ? 0.85 : 1.0,
    textQuality: normalizedText.length > 20 ? 0.8 : 0.4,
    languageConsistency: detectedLanguage !== 'unknown' ? 0.9 : 0.5,
    optionStructure: (options?.length ?? 0) >= 2 ? 0.85 : 0.6,
  });

  let shortAnswer = '';
  let selectedOption: number | undefined;
  let fullExplanation = '';
  let reasoningSummary = '';
  let solutionConfidence = 0;
  let solverUsed = 'none';
  let validationStatus: 'pass' | 'fail' | 'low_confidence' | 'not_validated' = 'not_validated';
  let confidenceBreakdown = { ocrConfidence, solverConfidence: 0, validationConfidence: 0, finalConfidence: 0 };

  if (runSolver) {
    const solverResult = await runSolverPipeline(entry, ocrConfidence, aiProvider);
    shortAnswer = solverResult.shortAnswer;
    selectedOption = solverResult.selectedOption;
    fullExplanation = solverResult.fullExplanation;
    reasoningSummary = solverResult.reasoningSummary;
    solutionConfidence = solverResult.solutionConfidence;
    solverUsed = solverResult.solverUsed;
    validationStatus = solverResult.validationStatus;
    confidenceBreakdown = solverResult.confidenceBreakdown;
    solvingLatencyMs = Date.now() - solvingStart;
  }

  const totalLatencyMs = Date.now() - startTime;

  return {
    extractedText,
    normalizedText,
    detectedLanguage,
    questionType: questionTypePrediction.type,
    topic: topicPrediction.topic,
    options,
    confidence: ocrConfidence,
    shortAnswer,
    selectedOption,
    fullExplanation,
    reasoningSummary,
    solutionConfidence,
    solverUsed,
    validationStatus,
    confidenceBreakdown,
    perf: {
      extractionLatencyMs,
      solvingLatencyMs,
      totalLatencyMs,
    },
    preprocessingSteps,
  };
}

// ── Score aggregation ─────────────────────────────────────────────────────────

function aggregateReport(results: QuestionEvalResult[], datasetName: string, providerUsed: string): EvalReport {
  const evalId = `eval_${Date.now()}`;
  const totalPassed = results.filter((r) => r.passed).length;
  const overallPassRate = results.length > 0 ? totalPassed / results.length : 0;

  const dimensions = ['ocr', 'options', 'topic', 'answer', 'confidence', 'latency', 'explanation'] as const;
  const dimensionSummaries: EvalDimensionSummary[] = [];

  for (const dim of dimensions) {
    const hasDim = results.some((r) => {
      if (dim === 'ocr') return r.ocrScore !== undefined;
      if (dim === 'options') return r.optionParseScore !== undefined;
      if (dim === 'topic') return r.topicScore !== undefined;
      if (dim === 'answer') return true;
      if (dim === 'confidence') return r.confidenceScore !== undefined;
      if (dim === 'latency') return true;
      if (dim === 'explanation') return r.explanationScore !== undefined;
      return false;
    });

    if (!hasDim) continue;

    const passed = results.filter((r) => {
      if (dim === 'ocr') return r.ocrScore !== undefined && r.ocrScore.normalizedTextSimilarity > 0.7;
      if (dim === 'options') return r.optionParseScore !== undefined && r.optionParseScore.optionAccuracy >= 0.75;
      if (dim === 'topic') return r.topicScore !== undefined && r.topicScore.topicMatch;
      if (dim === 'answer') return r.answerScore.exactMatch;
      if (dim === 'confidence') return r.confidenceScore !== undefined && r.confidenceScore.isWellCalibrated;
      if (dim === 'latency') return r.latencyScore.withinSla;
      if (dim === 'explanation') return r.explanationScore !== undefined && r.explanationScore.hasExplanation;
      return false;
    }).length;

    const total = results.filter((r) => {
      if (dim === 'ocr') return r.ocrScore !== undefined;
      if (dim === 'options') return r.optionParseScore !== undefined;
      if (dim === 'topic') return r.topicScore !== undefined;
      if (dim === 'answer') return true;
      if (dim === 'confidence') return r.confidenceScore !== undefined;
      if (dim === 'latency') return true;
      if (dim === 'explanation') return r.explanationScore !== undefined;
      return false;
    }).length;

    const latencies = results
      .filter((r) => r.latencyScore)
      .map((r) => r.latencyScore.totalLatencyMs);

    dimensionSummaries.push({
      dimension: dim,
      total,
      passed,
      rate: total > 0 ? passed / total : 0,
      avgLatencyMs: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : undefined,
    });
  }

  const allLatencies = results.map((r) => r.latencyScore.totalLatencyMs).sort((a, b) => a - b);
  const meanMs = allLatencies.length > 0 ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length : 0;
  const p50Idx = Math.floor(allLatencies.length * 0.5);
  const p95Idx = Math.floor(allLatencies.length * 0.95);
  const p99Idx = Math.floor(allLatencies.length * 0.99);

  const confidences = results
    .filter((r) => r.confidenceScore !== undefined)
    .map((r) => r.confidenceScore!.confidenceScore);
  const wellCalibrated = results.filter((r) => r.confidenceScore?.isWellCalibrated).length;

  return {
    evalId,
    runAt: new Date().toISOString(),
    scope: scopeFlag as 'full' | 'solver' | 'ocr',
    datasetName,
    providerUsed,
    datasetSize: results.length,
    totalPassed,
    overallPassRate,
    dimensionSummaries,
    latencyStats: {
      meanMs,
      p50Ms: allLatencies[p50Idx] ?? 0,
      p95Ms: allLatencies[p95Idx] ?? 0,
      p99Ms: allLatencies[p99Idx] ?? 0,
      maxMs: allLatencies[allLatencies.length - 1] ?? 0,
    },
    confidenceStats: {
      mean: confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
      wellCalibrated,
      totalWithConfidence: confidences.length,
    },
    results,
  };
}

// ── Per-topic pass rates ──────────────────────────────────────────────────────

function computeTopicStats(results: QuestionEvalResult[]): { topic: string; rate: number; total: number }[] {
  const map = new Map<string, { passed: number; total: number }>();

  for (const r of results) {
    // Get topic from dataset entry
    const topic = r.datasetEntryId.split('_')[0] ?? 'unknown';
    const existing = map.get(topic) ?? { passed: 0, total: 0 };
    existing.total++;
    if (r.passed) existing.passed++;
    map.set(topic, existing);
  }

  return Array.from(map.entries()).map(([topic, v]) => ({
    topic,
    rate: v.total > 0 ? v.passed / v.total : 0,
    total: v.total,
  }));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[run-eval] KARÇÖZ Evaluation System`);
  console.log(`[run-eval] Scope: ${scopeFlag} | Provider: ${providerMode} | Preprocessing: ${PREPROCESS_ENABLED ? 'ON' : 'OFF'}`);
  console.log(`[run-eval] AI_PROVIDER=${process.env.AI_PROVIDER ?? '(not set, using mock)'}\n`);

  const entries = loadDatasets();

  if (entries.length === 0) {
    console.error('[run-eval] No dataset entries found. Exiting.');
    process.exit(1);
  }

  console.log(`[run-eval] Total dataset entries: ${entries.length}\n`);

  // Create AI provider
  const aiProvider: MockAIProvider | undefined = (providerMode !== 'mock')
    ? undefined // Real provider would need API key; fall back to deterministic
    : createMockEvalProvider();

  const results: QuestionEvalResult[] = [];

  for (const entry of entries) {
    process.stdout.write(`[run-eval] ${entry.id} (${entry.topic}/${entry.difficulty})... `);

    const pipelineResult = await runPipeline(entry, aiProvider);

    // Score each dimension
    const ocrScore = runOcr
      ? scoreOcr(entry, pipelineResult.extractedText, pipelineResult.normalizedText)
      : undefined;

    const optionParseScore = runOcr
      ? scoreOptions(entry, pipelineResult.options)
      : undefined;

    const topicScore = runOcr
      ? scoreTopic(entry, pipelineResult.topic ?? null)
      : undefined;

    const answerScore = scoreAnswer(entry, pipelineResult.shortAnswer, pipelineResult.selectedOption);

    // Score confidence: compare solver's reported confidence with actual correctness
    const confidenceScore = runSolver && answerScore
      ? scoreConfidence(pipelineResult.confidenceBreakdown.finalConfidence, answerScore.exactMatch)
      : undefined;

    const latencyScore = scoreLatency(pipelineResult.perf, !!entry.imagePath);

    const explanationScore = runSolver
      ? scoreExplanation(pipelineResult.fullExplanation)
      : undefined;

    const questionResult = assembleQuestionResult(entry, {
      ocrScore,
      optionParseScore,
      topicScore,
      answerScore,
      confidenceScore,
      latencyScore,
      explanationScore,
    });

    results.push(questionResult);

    const status = questionResult.passed ? '✅' : '❌';
    const answerMark = answerScore.exactMatch ? '✅' : '❌';
    const latencyMark = latencyScore.withinSla ? '✅' : '⚠️';
    const solverName = pipelineResult.solverUsed ?? 'none';
    console.log(`${status} answer=${answerMark} lat=${latencyMark}${pipelineResult.perf.totalLatencyMs}ms solver=${solverName}`);
  }

  // Build report
  const topicStats = computeTopicStats(results);
  const report = aggregateReport(results, 'combined', providerMode);

  // Add topic stats to report for markdown generation
  const reportJson = JSON.stringify(report, null, 2);

  // Save JSON report
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const reportPath = join(OUTPUT_DIR, `${report.evalId}.json`);
  writeFileSync(reportPath, reportJson);
  console.log(`\n[run-eval] Report saved → ${reportPath}`);

  // Print summary table
  const barWidth = 18;
  console.log('\n┌──────────────────────────────────────────────────────────────┐');
  console.log('│                  EVALUATION SUMMARY                           │');
  console.log('├──────────────────────┬────────┬────────┬──────────────────────┤');
  console.log('│ Dimension            │ Passed │ Total  │ Rate                 │');
  console.log('├──────────────────────┼────────┼────────┼──────────────────────┤');
  for (const dim of report.dimensionSummaries) {
    const filled = Math.round(dim.rate * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    const rateStr = `${(dim.rate * 100).toFixed(1)}%`;
    console.log(
      `│ ${dim.dimension.padEnd(19)} │ ${String(dim.passed).padStart(6)} │ ${String(dim.total).padStart(6)} │ ${rateStr.padStart(6)}% ${bar} │`
    );
  }
  console.log('├──────────────────────┴────────┴────────┴──────────────────────┤');
  console.log(
    `│ Overall pass rate: ${(report.overallPassRate * 100).toFixed(1)}% (${report.totalPassed}/${report.datasetSize})`.padEnd(65) + '│'
  );
  console.log(
    `│ Latency (mean/p50/p95): ${report.latencyStats.meanMs.toFixed(0)}ms / ${report.latencyStats.p50Ms}ms / ${report.latencyStats.p95Ms}ms`.padEnd(65) + '│'
  );
  console.log(
    `│ Confidence (mean): ${report.confidenceStats.mean.toFixed(3)} | well-calibrated: ${report.confidenceStats.wellCalibrated}/${report.confidenceStats.totalWithConfidence}`.padEnd(65) + '│'
  );
  console.log('└──────────────────────────────────────────────────────────────┘\n');

  // Per-topic summary
  console.log('Per-topic pass rates:');
  for (const ts of topicStats) {
    const bar = '█'.repeat(Math.round(ts.rate * 20)) + '░'.repeat(20 - Math.round(ts.rate * 20));
    console.log(`  ${ts.topic.padEnd(20)} ${(ts.rate * 100).toFixed(1).padStart(5)}% ${bar} (${ts.total})`);
  }

  // Per-question detail
  console.log('\nPer-question results:');
  const failedResults = results.filter((r) => !r.passed);
  const passedResults = results.filter((r) => r.passed);

  for (const r of [...passedResults, ...failedResults].slice(0, 50)) {
    const dims = [...r.passedDimensions, ...r.failedDimensions].join(',');
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.datasetEntryId} — [${dims}]`);
  }
  if (failedResults.length > 50) {
    console.log(`  ... and ${failedResults.length - 50} more failures`);
  }

  // Notes on biggest failure patterns
  if (failedResults.length > 0) {
    const failurePatterns = new Map<string, number>();
    for (const r of failedResults) {
      for (const dim of r.failedDimensions) {
        failurePatterns.set(dim, (failurePatterns.get(dim) ?? 0) + 1);
      }
    }
    console.log('\nFailure pattern analysis:');
    for (const [dim, count] of [...failurePatterns.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${dim}: ${count} failures`);
    }
  }

  console.log(`\n[run-eval] Done. Provider: ${providerMode}, Scope: ${scopeFlag}, Preprocessing: ${PREPROCESS_ENABLED ? 'enabled' : 'disabled'}`);

  // Exit with error if too many failures
  if (report.overallPassRate < 0.5) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('[run-eval] Fatal error:', err);
  process.exit(1);
});