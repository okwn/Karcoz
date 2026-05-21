import type {
  EvalDatasetEntry,
  OcrScore,
  OptionParseScore,
  TopicScore,
  AnswerScore,
  ConfidenceScoreResult,
  LatencyScore,
  ExplanationScore,
  QuestionEvalResult,
} from '../types.js';

// ── Levenshtein distance ──────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\sçöşüğıöü]/gi, ' ').split(/\s+/).filter(Boolean);
}

// ── OCR scoring ───────────────────────────────────────────────────────────────

export function scoreOcr(
  entry: EvalDatasetEntry,
  extractedText: string,
  _normalizedText: string
): OcrScore {
  const expected = entry.expectedNormalizedText ?? entry.questionText;

  // Character-level accuracy
  const maxLen = Math.max(expected.length, extractedText.length, 1);
  const editDist = levenshtein(expected.toLowerCase(), extractedText.toLowerCase());
  const characterAccuracy = Math.max(0, 1 - editDist / maxLen);

  // Token-level analysis
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(extractedText);

  const expectedSet = new Set(expectedTokens);
  const actualSet = new Set(actualTokens);

  const missingTokens = expectedTokens.filter((t) => !actualSet.has(t));
  const extraTokens = actualTokens.filter((t) => !expectedSet.has(t));

  // Normalized text similarity (cosine-like Jaccard)
  const union = new Set([...expectedTokens, ...actualTokens]);
  const intersection = new Set([...expectedTokens].filter((t) => actualSet.has(t)));
  const normalizedTextSimilarity =
    union.size > 0 ? intersection.size / union.size : 1;

  // Raw text exact match
  const rawTextMatch =
    extractedText.toLowerCase().trim() === expected.toLowerCase().trim();

  return {
    rawTextMatch,
    normalizedTextSimilarity,
    characterAccuracy,
    missingTokens,
    extraTokens,
  };
}

// ── Option parsing scoring ─────────────────────────────────────────────────────

export function scoreOptions(
  entry: EvalDatasetEntry,
  extractedOptions: { label: string; value: string; order: number }[] | undefined
): OptionParseScore {
  const expected = entry.options ?? [];
  const optionsExtracted = extractedOptions?.length ?? 0;
  const optionsExpected = expected.length;

  const matchedOptions: OptionParseScore['matchedOptions'] = [];
  let optionsMatched = 0;

  for (const exp of expected) {
    // Extract the text value — dataset entries may be "A. Paris" or just "Paris"
    // or "x = 3" (no prefix). Normalize for comparison.
    const expPrefix = /^[A-Da-d][\.\)\:\s]/.test(exp) ? exp[0].toUpperCase() : null;
    const expValue = expPrefix ? exp.substring(2).trimStart() : exp;

    // Try to find a matching extracted option
    const found = extractedOptions?.find((opt) => {
      // Direct label match (A/B/C/D) and value similarity
      const labelMatch = opt.label === expPrefix;
      const valueSim =
        levenshtein(opt.value.toLowerCase(), expValue.toLowerCase()) /
        Math.max(expValue.length, 1);
      return labelMatch && valueSim < 0.4;
    });

    // Fallback: match by value similarity alone (no label required)
    const foundByValue = !found
      ? extractedOptions?.find((opt) => {
          const valueSim =
            levenshtein(opt.value.toLowerCase(), expValue.toLowerCase()) /
            Math.max(expValue.length, 1);
          return valueSim < 0.3;
        })
      : undefined;

    const match = found ?? foundByValue;

    if (match) {
      optionsMatched++;
      matchedOptions.push({
        expected: exp,
        actual: `${match.label}. ${match.value}`,
        labelCorrect: match.label === expPrefix,
      });
    } else {
      matchedOptions.push({
        expected: exp,
        actual: 'MISSING',
        labelCorrect: false,
      });
    }
  }

  const optionAccuracy = optionsExpected > 0 ? optionsMatched / optionsExpected : 1;

  return {
    optionsExtracted,
    optionsExpected,
    optionsMatched,
    optionAccuracy,
    matchedOptions,
  };
}

// ── Topic scoring ──────────────────────────────────────────────────────────────

export function scoreTopic(entry: EvalDatasetEntry, actualTopic: string | null): TopicScore {
  const expected = entry.topic.toLowerCase();
  const actual = (actualTopic ?? '').toLowerCase();

  // Allow partial match (topic is a substring or vice versa)
  const topicMatch =
    actual.length > 0 && (actual.includes(expected) || expected.includes(actual));

  return {
    topicMatch,
    expectedTopic: entry.topic,
    actualTopic,
  };
}

// ── Answer scoring ─────────────────────────────────────────────────────────────

export function scoreAnswer(
  entry: EvalDatasetEntry,
  shortAnswer: string,
  selectedOption: number | undefined
): AnswerScore {
  const correct = entry.correctAnswer.trim().toUpperCase();
  const given = shortAnswer.trim();

  // Determine if given answer matches correct answer
  // Support both label ('A','B','C','D') and text match
  const labelOptions = ['A', 'B', 'C', 'D'];

  if (labelOptions.includes(correct)) {
    // Multiple choice: match by option index or label character
    const correctIdx = labelOptions.indexOf(correct);

    // Try to extract label from shortAnswer
    const labelInAnswer = given.match(/^[A-D][\.\)\:]?\s*/i)?.[0]?.[0]?.toUpperCase();
    const labelMatch = labelInAnswer === correct;

    // Match by selectedOption index
    const indexMatch = selectedOption !== undefined && selectedOption === correctIdx;

    // Text contains correct option value
    const correctOptionText = entry.options?.[correctIdx] ?? '';
    const textMatch =
      correctOptionText.length > 0 &&
      given.toLowerCase().includes(correctOptionText.substring(2).toLowerCase());

    return {
      exactMatch: labelMatch || indexMatch || textMatch,
      labelMatch: labelMatch,
      correctAnswer: entry.correctAnswer,
      givenAnswer: shortAnswer,
    };
  } else {
    // Short answer: fuzzy match
    const similarity =
      1 - levenshtein(given.toLowerCase(), correct.toLowerCase()) / Math.max(given.length, correct.length, 1);

    return {
      exactMatch: given.toLowerCase() === correct.toLowerCase(),
      labelMatch: similarity > 0.8,
      correctAnswer: entry.correctAnswer,
      givenAnswer: shortAnswer,
    };
  }
}

// ── Confidence scoring ─────────────────────────────────────────────────────────

export function scoreConfidence(
  confidenceScore: number,
  isCorrect: boolean
): ConfidenceScoreResult {
  // Well calibrated: if correct, confidence should be > 0.5; if incorrect, < 0.5
  const expectedConfidenceIfCorrect = 0.7;
  const expectedConfidenceIfIncorrect = 0.3;

  const expectedConfidence = isCorrect ? expectedConfidenceIfCorrect : expectedConfidenceIfIncorrect;
  const calibrationError = Math.abs(confidenceScore - expectedConfidence);

  // Within 0.15 is considered well calibrated
  const isWellCalibrated = calibrationError < 0.15;

  return {
    confidenceScore,
    isWellCalibrated,
    calibrationError,
  };
}

// ── Latency scoring ─────────────────────────────────────────────────────────────

const TEXT_SLA_MS = 5000;
const IMAGE_SLA_MS = 8000;

export function scoreLatency(
  perf: {
    extractionLatencyMs: number;
    solvingLatencyMs: number;
    totalLatencyMs: number;
  },
  hasImage: boolean
): LatencyScore {
  const sla = hasImage ? IMAGE_SLA_MS : TEXT_SLA_MS;
  return {
    extractionLatencyMs: perf.extractionLatencyMs,
    solvingLatencyMs: perf.solvingLatencyMs,
    totalLatencyMs: perf.totalLatencyMs,
    withinSla: perf.totalLatencyMs < sla,
  };
}

// ── Explanation scoring ─────────────────────────────────────────────────────────

export function scoreExplanation(
  fullExplanation: string | undefined
): ExplanationScore {
  const text = fullExplanation ?? '';
  const explanationLength = text.split(/\s+/).filter(Boolean).length;

  return {
    hasExplanation: explanationLength > 0,
    explanationLength,
    explanationQualityHint: explanationLength > 20 ? 'satisfactory' : explanationLength > 5 ? 'minimal' : 'missing',
  };
}

// ── Assemble per-question result ────────────────────────────────────────────────

export function assembleQuestionResult(
  entry: EvalDatasetEntry,
  opts: {
    ocrScore?: OcrScore;
    optionParseScore?: OptionParseScore;
    topicScore?: TopicScore;
    answerScore: AnswerScore;
    confidenceScore?: ConfidenceScoreResult;
    latencyScore: LatencyScore;
    explanationScore?: ExplanationScore;
    notes?: string;
  }
): QuestionEvalResult {
  const passedDimensions: string[] = [];
  const failedDimensions: string[] = [];

  if (opts.ocrScore) {
    const dim = 'ocr';
    if (opts.ocrScore.normalizedTextSimilarity > 0.7) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  if (opts.optionParseScore) {
    const dim = 'options';
    if (opts.optionParseScore.optionAccuracy >= 0.75) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  if (opts.topicScore) {
    const dim = 'topic';
    if (opts.topicScore.topicMatch) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  {
    const dim = 'answer';
    if (opts.answerScore.exactMatch) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  if (opts.confidenceScore) {
    const dim = 'confidence';
    if (opts.confidenceScore.isWellCalibrated) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  {
    const dim = 'latency';
    if (opts.latencyScore.withinSla) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  if (opts.explanationScore) {
    const dim = 'explanation';
    if (opts.explanationScore.hasExplanation) passedDimensions.push(dim);
    else failedDimensions.push(dim);
  }

  const passed = passedDimensions.length >= Math.max(1, 6 - (failedDimensions.length > 3 ? 3 : failedDimensions.length));

  return {
    datasetEntryId: entry.id,
    timestamp: new Date().toISOString(),
    ocrScore: opts.ocrScore,
    optionParseScore: opts.optionParseScore,
    topicScore: opts.topicScore,
    answerScore: opts.answerScore,
    confidenceScore: opts.confidenceScore,
    latencyScore: opts.latencyScore,
    explanationScore: opts.explanationScore,
    passed,
    passedDimensions,
    failedDimensions,
    notes: opts.notes,
  };
}