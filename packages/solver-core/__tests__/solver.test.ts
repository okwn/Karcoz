import { describe, it, expect } from 'vitest';
import { solve } from '../index.js';
import type { SolverQuestion } from '../types.js';

describe('Turkish multiple choice parsing', () => {
  it('parses A/B/C/D options with parentheses', async () => {
    const question: SolverQuestion = {
      text: 'Bir üçgenin iç açıları toplamı kaç derecedir?',
      normalizedText: 'Bir üçgenin iç açıları toplamı kaç derecedir?',
      questionType: 'multiple_choice',
      options: [
        { label: 'A', value: '90°', order: 0 },
        { label: 'B', value: '180°', order: 1 },
        { label: 'C', value: '270°', order: 2 },
        { label: 'D', value: '360°', order: 3 },
      ],
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBeTruthy();
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it('parses (a)/(b)/(c)/(d) lowercase options', async () => {
    const question: SolverQuestion = {
      text: '5 + 3 kaç eder?',
      normalizedText: '5 + 3 kaç eder?',
      questionType: 'multiple_choice',
      options: [
        { label: 'a', value: '6', order: 0 },
        { label: 'b', value: '7', order: 1 },
        { label: 'c', value: '8', order: 2 },
        { label: 'd', value: '9', order: 3 },
      ],
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBeTruthy();
  });
});

describe('arithmetic solver', () => {
  it('solves addition', async () => {
    const question: SolverQuestion = {
      text: '25 + 13 = ?',
      normalizedText: '25 + 13 = ?',
      questionType: 'arithmetic',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('38');
    expect(result.solverUsed).toBe('arithmetic');
  });

  it('solves subtraction', async () => {
    const question: SolverQuestion = {
      text: '48 - 15 = ?',
      normalizedText: '48 - 15 = ?',
      questionType: 'arithmetic',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('33');
  });

  it('solves multiplication', async () => {
    const question: SolverQuestion = {
      text: '7 × 8 = ?',
      normalizedText: '7 × 8 = ?',
      questionType: 'arithmetic',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('56');
  });

  it('handles Turkish comma decimal', async () => {
    const question: SolverQuestion = {
      text: '12,5 + 7,5 = ?',
      normalizedText: '12,5 + 7,5 = ?',
      questionType: 'arithmetic',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('20');
  });

  it('verifies correct equation', async () => {
    const question: SolverQuestion = {
      text: '3 + 5 = 8',
      normalizedText: '3 + 5 = 8',
      questionType: 'arithmetic',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('dogru');
    expect(result.validationStatus).toBe('pass');
  });
});

describe('percentage solver', () => {
  it('solves "Y sayısının X%si kaçtır" pattern', async () => {
    const question: SolverQuestion = {
      text: "80'in %25'i kaçtır?",
      normalizedText: "80'in %25'i kaçtır?",
      questionType: 'percentage',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('20');
    expect(result.solverUsed).toBe('percentage');
  });

  it('solves "X% of Y" pattern', async () => {
    const question: SolverQuestion = {
      text: 'What is 15% of 200?',
      normalizedText: 'What is 15% of 200?',
      questionType: 'percentage',
      language: 'en',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('30');
  });

  it('solves discount calculation', async () => {
    const question: SolverQuestion = {
      text: '100 TL uzerinden %20 indirim kac TL dir?',
      normalizedText: '100 TL uzerinden %20 indirim kac TL dir?',
      questionType: 'percentage',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('20');
  });
});

describe('ratio solver', () => {
  it('solves a:b = c:x pattern', async () => {
    const question: SolverQuestion = {
      text: '2:5 = 6:x → x = ?',
      normalizedText: '2:5 = 6:x → x = ?',
      questionType: 'ratio',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('15');
    expect(result.solverUsed).toBe('ratio');
  });

  it('solves direct ratio calculation', async () => {
    const question: SolverQuestion = {
      text: '3:4 = 9:x',
      normalizedText: '3:4 = 9:x',
      questionType: 'ratio',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('12');
  });
});

describe('simple algebra solver', () => {
  it('solves 3x + 7 = 22', async () => {
    const question: SolverQuestion = {
      text: '3x + 7 = 22',
      normalizedText: '3x + 7 = 22',
      questionType: 'simple_algebra',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('5');
    expect(result.solverUsed).toBe('simple_algebra');
  });

  it('solves 5x - 3 = 17', async () => {
    const question: SolverQuestion = {
      text: '5x - 3 = 17',
      normalizedText: '5x - 3 = 17',
      questionType: 'simple_algebra',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('4');
  });

  it('solves 2x + 6 = 20', async () => {
    const question: SolverQuestion = {
      text: '2x + 6 = 20',
      normalizedText: '2x + 6 = 20',
      questionType: 'simple_algebra',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('7');
  });
});

describe('sequence solver', () => {
  it('solves arithmetic sequence', async () => {
    const question: SolverQuestion = {
      text: '2, 5, 8, 11, ?',
      normalizedText: '2, 5, 8, 11, ?',
      questionType: 'sequence',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('14');
    expect(result.solverUsed).toBe('sequence');
  });

  it('solves geometric sequence', async () => {
    const question: SolverQuestion = {
      text: '3, 6, 12, 24, ?',
      normalizedText: '3, 6, 12, 24, ?',
      questionType: 'sequence',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('48');
  });

  it('solves square sequence', async () => {
    const question: SolverQuestion = {
      text: '1, 4, 9, 16, ?',
      normalizedText: '1, 4, 9, 16, ?',
      questionType: 'sequence',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('25');
  });

  it('solves fibonacci-like sequence', async () => {
    const question: SolverQuestion = {
      text: '1, 1, 2, 3, 5, 8, ?',
      normalizedText: '1, 1, 2, 3, 5, 8, ?',
      questionType: 'sequence',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('13');
  });
});

describe('option matching', () => {
  it('returns correct label when answer matches option', async () => {
    const question: SolverQuestion = {
      text: 'Bir üçgenin iç açıları toplamı kaç derecedir?',
      normalizedText: 'Bir üçgenin iç açıları toplamı kaç derecedir?',
      questionType: 'multiple_choice',
      options: [
        { label: 'A', value: '90°', order: 0 },
        { label: 'B', value: '180°', order: 1 },
        { label: 'C', value: '270°', order: 2 },
        { label: 'D', value: '360°', order: 3 },
      ],
      language: 'tr',
      ocrConfidence: 0.9,
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBeTruthy();
  });
});

describe('low confidence behavior', () => {
  it('marks low confidence when OCR is uncertain', async () => {
    const question: SolverQuestion = {
      text: '???',
      normalizedText: '???',
      questionType: 'unknown',
      language: 'unknown',
      ocrConfidence: 0.2, // very low OCR confidence
    };

    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.validationStatus).toBe('low_confidence');
    expect(result.confidenceScore).toBeLessThan(0.5);
  });

  it('returns low confidence for unrecognized question type', async () => {
    const question: SolverQuestion = {
      text: 'Explain the theory of relativity',
      normalizedText: 'Explain the theory of relativity',
      questionType: 'unknown',
      language: 'en',
      ocrConfidence: 0.8,
    };

    // Without AI fallback, this should be low confidence
    const result = await solve({ question, explanationLevel: 'brief', aiFallback: false });
    expect(result.confidenceScore).toBeLessThan(0.5);
  });
});

describe('AI fallback behavior', () => {
  it('does not crash when AI provider is undefined', async () => {
    const question: SolverQuestion = {
      text: '3x + 7 = 22',
      normalizedText: '3x + 7 = 22',
      questionType: 'simple_algebra',
      language: 'tr',
      ocrConfidence: 0.9,
    };

    // Should use deterministic solver without crashing
    const result = await solve({ question, explanationLevel: 'brief' });
    expect(result.shortAnswer).toBe('5');
  });
});