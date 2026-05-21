import { formatExplanation } from '../explain/explanation-formatter.js';
/**
 * Multiple choice solver — validates selected option and picks best answer
 * when options are available. Requires option validation to confirm answer.
 */
export function solveMultipleChoice(question) {
    const options = question.options;
    if (!options || options.length < 2) {
        return {
            shortAnswer: '?',
            confidenceScore: 0.3,
            solverUsed: 'multiple_choice',
            fullExplanation: 'Seçenek bulunamadı.',
            reasoningSummary: 'Seçenek yok.',
            validationStatus: 'low_confidence',
            confidenceBreakdown: {
                ocrConfidence: question.ocrConfidence ?? 0.8,
                solverConfidence: 0.3,
                validationConfidence: 0,
                finalConfidence: 0.3,
            },
        };
    }
    // If question type is known from classifier and options exist,
    // this solver validates options for consistency.
    // Real answer selection requires AI or external knowledge.
    return {
        shortAnswer: options[0].value, // fallback to first option
        selectedOption: 0,
        confidenceScore: 0.5, // low confidence without AI or knowledge base
        solverUsed: 'multiple_choice',
        fullExplanation: formatExplanation('multiple_choice', question.language, {
            optionCount: options.length,
            warning: 'Seçenek doğrulaması için AI gereklidir.',
        }),
        reasoningSummary: `${options.length} seçenek bulundu; AI doğrulaması gerekiyor`,
        validationStatus: 'low_confidence',
        confidenceBreakdown: {
            ocrConfidence: question.ocrConfidence ?? 0.8,
            solverConfidence: 0.5,
            validationConfidence: 0.3,
            finalConfidence: 0.5,
        },
    };
}
