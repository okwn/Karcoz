import { formatExplanation } from '../explain/explanation-formatter.js';
/**
 * Arithmetic solver — handles basic operations, equations.
 * Supports: +, -, *, /, ^, sqrt
 * Turkish decimal comma → period
 */
export function solveArithmetic(question) {
    const text = question.normalizedText;
    // Normalize Turkish comma to period for evaluation
    let evalText = text.replace(/,/g, '.');
    // Try to find equation pattern: "X + Y = ?" or "X = result"
    const equationMatch = evalText.match(/([\d.x\/\*\+\-\^\(\)\s]+)\s*=\s*\?/);
    if (equationMatch) {
        const expr = equationMatch[1].trim();
        try {
            // Simple evaluation for arithmetic expressions only (no unknown vars)
            if (!expr.includes('x') && !expr.includes('X')) {
                const result = Function(`"use strict"; return (${expr})`)();
                const shortAnswer = Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, '');
                return {
                    shortAnswer,
                    confidenceScore: 0.95,
                    solverUsed: 'arithmetic',
                    fullExplanation: formatExplanation('arithmetic', question.language, { expression: expr, result: shortAnswer }),
                    reasoningSummary: `${expr} = ${shortAnswer}`,
                    validationStatus: 'not_validated',
                    confidenceBreakdown: {
                        ocrConfidence: question.ocrConfidence ?? 0.8,
                        solverConfidence: 0.95,
                        validationConfidence: 0,
                        finalConfidence: 0.95,
                    },
                };
            }
        }
        catch {
            // Fall through to equation solving
        }
    }
    // Try to parse "X + Y = Z" format to find missing value
    const equalityMatch = evalText.match(/([\d.]+)\s*([\+\-\*\/\^])\s*([\d.]+)\s*=\s*([\d.]+)/);
    if (equalityMatch) {
        const [, a, op, b, result] = equalityMatch.map(Number);
        const operations = {
            '+': (a, b) => a + b,
            '-': (a, b) => a - b,
            '*': (a, b) => a * b,
            '/': (a, b) => a / b,
            '^': (a, b) => Math.pow(a, b),
        };
        if (operations[op]) {
            const computed = operations[op](a, b);
            const numericResult = result;
            if (Math.abs(computed - numericResult) < 0.001) {
                return {
                    shortAnswer: 'dogru', // Turkish for "correct"
                    selectedOption: undefined,
                    confidenceScore: 0.95,
                    solverUsed: 'arithmetic',
                    fullExplanation: formatExplanation('arithmetic', question.language, { verified: true, expression: `${a} ${op} ${b} = ${numericResult}` }),
                    reasoningSummary: `Doğrulandı: ${a} ${op} ${b} = ${numericResult}`,
                    validationStatus: 'pass',
                    confidenceBreakdown: {
                        ocrConfidence: question.ocrConfidence ?? 0.8,
                        solverConfidence: 0.95,
                        validationConfidence: 0.9,
                        finalConfidence: 0.95,
                    },
                };
            }
        }
    }
    // Pattern: "X işleminin sonucu nedir?" (Turkish)
    const sonucMatch = text.match(/([\d.,]+)\s*([\+\-\*\/\^])\s*([\d.,]+)/);
    if (sonucMatch) {
        const normalized = text.replace(/,/g, '.');
        const m = normalized.match(/([\d.]+)\s*([\+\-\*\/\^])\s*([\d.]+)/);
        if (m) {
            const [, aStr, op, bStr] = m;
            const a = parseFloat(aStr);
            const b = parseFloat(bStr);
            const ops = {
                '+': (x, y) => x + y,
                '-': (x, y) => x - y,
                '*': (x, y) => x * y,
                '/': (x, y) => x / y,
                '^': (x, y) => Math.pow(x, y),
            };
            if (ops[op]) {
                const result = ops[op](a, b);
                const shortAnswer = Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, '');
                return {
                    shortAnswer,
                    confidenceScore: 0.95,
                    solverUsed: 'arithmetic',
                    fullExplanation: formatExplanation('arithmetic', question.language, { expression: `${a} ${op} ${b}`, result: shortAnswer }),
                    reasoningSummary: `${a} ${op} ${b} = ${shortAnswer}`,
                    validationStatus: 'not_validated',
                    confidenceBreakdown: {
                        ocrConfidence: question.ocrConfidence ?? 0.8,
                        solverConfidence: 0.95,
                        validationConfidence: 0,
                        finalConfidence: 0.95,
                    },
                };
            }
        }
    }
    return {
        shortAnswer: '?',
        confidenceScore: 0.3,
        solverUsed: 'arithmetic',
        fullExplanation: 'Aritmetik ifade çözülemedi.',
        reasoningSummary: 'Aritmetik ifade çözülemedi.',
        validationStatus: 'low_confidence',
        confidenceBreakdown: {
            ocrConfidence: question.ocrConfidence ?? 0.8,
            solverConfidence: 0.3,
            validationConfidence: 0,
            finalConfidence: 0.3,
        },
    };
}
