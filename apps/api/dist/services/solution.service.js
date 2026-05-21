import { getConfiguredProviderName, globalRegistry } from '@karcoz/ai-core';
import { AIProviderError } from '@karcoz/ai-core';
function isValidProviderName(name) {
    return ['mock', 'openai', 'openrouter', 'anthropic', 'gemini'].includes(name);
}
function getProviderWithFallback() {
    const primaryName = getConfiguredProviderName();
    const fallbackName = process.env.AI_FALLBACK_PROVIDER;
    const primary = (() => {
        if (primaryName === 'mock')
            return globalRegistry.get('mock');
        const p = globalRegistry.get(primaryName);
        if (p)
            return p;
        try {
            return globalRegistry.getConfiguredProvider(primaryName);
        }
        catch {
            throw new AIProviderError(`AI_PROVIDER="${primaryName}" is not configured. Set ${primaryName.toUpperCase()}_API_KEY.`, 'PROVIDER_NOT_CONFIGURED', primaryName);
        }
    })();
    let fallback;
    if (fallbackName && fallbackName !== primaryName && isValidProviderName(fallbackName)) {
        try {
            fallback = globalRegistry.get(fallbackName) ?? globalRegistry.getConfiguredProvider(fallbackName);
        }
        catch {
            // Fallback not available
        }
    }
    return { primary, fallback };
}
export async function solveQuestion(extractedText, options, explanationLevel = 'standard', mode = 'full') {
    const { primary, fallback } = getProviderWithFallback();
    let result;
    let lastError;
    try {
        result = await primary.solveQuestion({
            question: extractedText,
            questionType: options ? 'multiple_choice' : 'short_answer',
            options,
            explanationLevel,
            language: 'en',
        });
    }
    catch (err) {
        lastError = err;
        if (fallback) {
            try {
                result = await fallback.solveQuestion({
                    question: extractedText,
                    questionType: options ? 'multiple_choice' : 'short_answer',
                    options,
                    explanationLevel,
                    language: 'en',
                });
                // Discount confidence slightly for fallback
                if (result) {
                    result.confidenceScore = Math.min(result.confidenceScore * 0.9, 0.85);
                }
            }
            catch {
                // Both failed
            }
        }
    }
    if (!result && lastError)
        throw lastError;
    if (!result) {
        return {
            shortAnswer: '?',
            selectedOption: undefined,
            fullExplanation: mode === 'compact' ? '' : 'AI provider failed to produce a result.',
            reasoningSummary: mode === 'compact' ? '' : 'No result from AI provider.',
            confidenceScore: 0.1,
            validationStatus: 'low_confidence',
        };
    }
    return {
        shortAnswer: result.shortAnswer,
        selectedOption: result.selectedOption,
        fullExplanation: mode === 'compact' ? '' : result.fullExplanation,
        reasoningSummary: mode === 'compact' ? '' : result.reasoningSummary,
        confidenceScore: result.confidenceScore,
        validationStatus: result.validationStatus ?? 'not_validated',
    };
}
//# sourceMappingURL=solution.service.js.map