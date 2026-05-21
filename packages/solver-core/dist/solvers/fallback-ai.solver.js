// AI fallback solver — delegates to an AI provider when deterministic solvers fail.
/**
 * AI fallback solver — delegates to an AI provider when deterministic solvers fail.
 * This is the last resort before returning low-confidence.
 */
export async function solveWithAI(question, options) {
    const provider = options?.provider;
    const timeoutMs = options?.timeoutMs ?? 30_000;
    if (!provider) {
        return {
            shortAnswer: '?',
            confidenceScore: 0.2,
            solverUsed: 'ai_fallback',
            fullExplanation: 'AI sağlayıcı mevcut değil.',
            reasoningSummary: 'AI sağlayıcı yok.',
            validationStatus: 'low_confidence',
            confidenceBreakdown: {
                ocrConfidence: question.ocrConfidence ?? 0.8,
                solverConfidence: 0.2,
                validationConfidence: 0,
                finalConfidence: 0.2,
            },
        };
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const result = await provider.solveQuestion({
            question: question.normalizedText,
            questionType: 'multiple_choice',
            options: question.options,
            explanationLevel: options?.explanationLevel ?? 'standard',
            language: question.language === 'unknown' ? 'en' : question.language,
        });
        clearTimeout(timeout);
        return {
            shortAnswer: result.shortAnswer ?? '?',
            selectedOption: result.selectedOption,
            fullExplanation: result.fullExplanation ?? '',
            reasoningSummary: result.reasoningSummary ?? '',
            confidenceScore: Math.min((result.confidenceScore ?? 0.5), 0.85),
            validationStatus: (result.validationStatus ?? 'not_validated'),
            solverUsed: 'ai_fallback',
            confidenceBreakdown: {
                ocrConfidence: question.ocrConfidence ?? 0.8,
                solverConfidence: Math.min((result.confidenceScore ?? 0.5), 0.85),
                validationConfidence: 0.5,
                finalConfidence: Math.min((result.confidenceScore ?? 0.5), 0.85),
            },
        };
    }
    catch (err) {
        clearTimeout(timeout);
        const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return {
            shortAnswer: '?',
            confidenceScore: 0.15,
            solverUsed: 'ai_fallback',
            fullExplanation: `AI hatası: ${message}`,
            reasoningSummary: `AI hatası: ${message}`,
            validationStatus: 'low_confidence',
            confidenceBreakdown: {
                ocrConfidence: question.ocrConfidence ?? 0.8,
                solverConfidence: 0.15,
                validationConfidence: 0,
                finalConfidence: 0.15,
            },
        };
    }
}
