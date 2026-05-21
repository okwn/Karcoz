import { getConfiguredProviderName, globalRegistry } from '@karcoz/ai-core';
import { AIProviderError } from '@karcoz/ai-core';
function getProviderWithFallback() {
    const primaryName = getConfiguredProviderName();
    const fallbackName = process.env.AI_FALLBACK_PROVIDER;
    const primary = (() => {
        if (primaryName === 'mock')
            return globalRegistry.get('mock');
        const p = globalRegistry.get(primaryName);
        if (p)
            return p;
        // Try to create from env
        const created = globalRegistry.getConfiguredProvider(primaryName);
        if (created)
            return created;
        throw new AIProviderError(`AI_PROVIDER="${primaryName}" is not configured. Set ${primaryName.toUpperCase()}_API_KEY.`, 'PROVIDER_NOT_CONFIGURED', primaryName);
    })();
    let fallback;
    if (fallbackName && fallbackName !== primaryName && isValidProviderName(fallbackName)) {
        try {
            fallback = globalRegistry.get(fallbackName) ?? globalRegistry.getConfiguredProvider(fallbackName);
        }
        catch {
            // Fallback not available — silently skip
        }
    }
    return { primary, fallback };
}
function isValidProviderName(name) {
    return ['mock', 'openai', 'openrouter', 'anthropic', 'gemini'].includes(name);
}
export async function extractFromImage(imageBase64) {
    const { primary, fallback } = getProviderWithFallback();
    try {
        const result = await primary.extractQuestion({ imageBase64 });
        return {
            extractedText: result.extractedText,
            normalizedText: result.normalizedText,
            detectedLanguage: result.detectedLanguage,
            questionType: result.questionType,
            topic: result.topic,
            options: result.options,
            confidence: result.confidence,
        };
    }
    catch (primaryErr) {
        if (fallback) {
            try {
                const result = await fallback.extractQuestion({ imageBase64 });
                return {
                    extractedText: result.extractedText,
                    normalizedText: result.normalizedText,
                    detectedLanguage: result.detectedLanguage,
                    questionType: result.questionType,
                    topic: result.topic,
                    options: result.options,
                    confidence: result.confidence * 0.9, // slight discount for fallback
                };
            }
            catch {
                // Both failed — log and rethrow primary error
            }
        }
        throw primaryErr;
    }
}
export async function extractFromText(text) {
    const { primary, fallback } = getProviderWithFallback();
    const mcPattern1 = /[A-D]\.\s/;
    const mcPattern2 = /[①②③④]\s/;
    const mcPattern3 = /\([a-d]\)\s/;
    const isMultipleChoice = mcPattern1.test(text) || mcPattern2.test(text) || mcPattern3.test(text);
    const questionType = isMultipleChoice ? 'multiple_choice' : 'short_answer';
    const topicMatch = text.match(/(?:topic|subject)[:\s]*([\w\s]+)/i);
    const topic = topicMatch ? topicMatch[1].trim() : undefined;
    const options = isMultipleChoice ? extractOptions(text) : undefined;
    const lang = detectLanguage(text);
    let result;
    let lastError;
    // Try primary
    try {
        result = await primary.extractQuestion({
            imageBase64: undefined,
            sourceUrl: undefined,
            pageTitle: undefined,
            language: lang === 'tr' ? 'tr' : 'en',
        });
    }
    catch (err) {
        lastError = err;
        if (fallback) {
            try {
                result = await fallback.extractQuestion({
                    imageBase64: undefined,
                    sourceUrl: undefined,
                    pageTitle: undefined,
                    language: lang === 'tr' ? 'tr' : 'en',
                });
            }
            catch {
                // Both failed
            }
        }
    }
    if (result?.extractedText && result.extractedText.length > 5) {
        return {
            extractedText: result.extractedText,
            normalizedText: result.normalizedText,
            detectedLanguage: result.detectedLanguage,
            questionType: result.questionType,
            topic: result.topic ?? topic,
            options: result.options ?? options,
            confidence: result.confidence,
        };
    }
    if (lastError && !result)
        throw lastError;
    return {
        extractedText: text.trim(),
        normalizedText: text.trim(),
        detectedLanguage: detectLanguage(text),
        questionType,
        topic,
        options,
        confidence: 0.88,
    };
}
function extractOptions(text) {
    const options = [];
    const pattern = /[A-D]\.\s+(.+)/gi;
    let match;
    let order = 0;
    while ((match = pattern.exec(text)) !== null) {
        options.push({ label: match[0][0].toUpperCase(), value: match[1].trim(), order: order++ });
    }
    return options;
}
function detectLanguage(text) {
    return /\b(ne|nedir|hangisi|sik|asagidaki|midir|mi|dir)\b/i.test(text) ? 'tr' : 'en';
}
//# sourceMappingURL=extraction.service.js.map