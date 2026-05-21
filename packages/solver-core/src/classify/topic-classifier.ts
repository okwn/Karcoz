import type { SolverQuestion, TopicPrediction } from '../types.js';

const TURKISH_MATH_TOPICS: [string, string][] = [
  ['temel aritmetik', 'four_ops'],
  ['dört işlem', 'four_ops'],
  ['toplama', 'four_ops'],
  ['çıkarma', 'four_ops'],
  ['çarpma', 'multiplication'],
  ['bölme', 'division'],
  ['ondalık', 'decimal'],
  ['kesir', 'fraction'],
  ['yüzde', 'percentage'],
  ['oran', 'ratio'],
  ['oran-ant', 'ratio_proportion'],
  ['cebir', 'algebra'],
  ['denklem', 'equation'],
  ['dizi', 'sequence'],
  ['sayı dizisi', 'sequence'],
  ['mantık', 'logic'],
  ['geometri', 'geometry'],
  ['üçgen', 'geometry'],
  ['çember', 'geometry'],
  ['alan', 'geometry'],
  ['çevre', 'geometry'],
];

const ENGLISH_MATH_TOPICS: [string, string][] = [
  ['arithmetic', 'four_ops'],
  ['addition', 'four_ops'],
  ['subtraction', 'four_ops'],
  ['multiplication', 'multiplication'],
  ['division', 'division'],
  ['percentage', 'percentage'],
  ['percent', 'percentage'],
  ['ratio', 'ratio'],
  ['proportion', 'ratio_proportion'],
  ['algebra', 'algebra'],
  ['equation', 'equation'],
  ['sequence', 'sequence'],
  ['number series', 'sequence'],
  ['logic', 'logic'],
  ['geometry', 'geometry'],
];

/**
 * Classify topic from question text.
 */
export function classifyTopic(question: SolverQuestion): TopicPrediction {
  const text = question.normalizedText.toLowerCase();
  const lang = question.language;

  const topics = lang === 'tr' ? TURKISH_MATH_TOPICS : ENGLISH_MATH_TOPICS;

  for (const [keyword, topic] of topics) {
    if (text.includes(keyword)) {
      return { topic, confidence: 0.85 };
    }
  }

  // Default topic based on question type
  const typeTopics: Record<string, string> = {
    arithmetic: 'four_ops',
    percentage: 'percentage',
    ratio: 'ratio',
    simple_algebra: 'algebra',
    sequence: 'sequence',
    multiple_choice: 'general',
  };

  return {
    topic: typeTopics[question.questionType] ?? 'general',
    confidence: 0.5,
  };
}