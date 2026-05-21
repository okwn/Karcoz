import { ChainError, LowConfidenceError } from '../errors.js';
import { mergeConfig } from '../model-config.js';
export async function runExtractChain(provider, input, config) {
    const merged = mergeConfig(config);
    const start = Date.now();
    const steps = [];
    try {
        const data = await provider.extractQuestion(input);
        steps.push({ step: 'extract', provider: provider.name, latencyMs: Date.now() - start });
        if (data.confidence < 0.3)
            throw new LowConfidenceError(data.confidence, 0.3);
        return { data, ctx: { requestId: randomId(), modelConfig: merged, trace: steps } };
    }
    catch (err) {
        steps.push({ step: 'extract', provider: provider.name, latencyMs: Date.now() - start, error: String(err) });
        throw new ChainError('Extract chain failed', 'EXTRACTION_FAILED', steps.map(s => ({ step: s.step, error: s.error ?? 'unknown' })));
    }
}
export async function runSolveChain(provider, question, questionType, options, explanationLevel, config) {
    const merged = mergeConfig(config);
    const start = Date.now();
    const steps = [];
    try {
        const data = await provider.solveQuestion({ question, questionType: questionType, options, explanationLevel: explanationLevel });
        steps.push({ step: 'solve', provider: provider.name, latencyMs: Date.now() - start });
        return { data, ctx: { requestId: randomId(), modelConfig: merged, trace: steps } };
    }
    catch (err) {
        steps.push({ step: 'solve', provider: provider.name, latencyMs: Date.now() - start, error: String(err) });
        throw new ChainError('Solve chain failed', 'SOLVE_FAILED', steps.map(s => ({ step: s.step, error: s.error ?? 'unknown' })));
    }
}
export async function runValidateChain(provider, shortAnswer, question, config) {
    const merged = mergeConfig(config);
    const start = Date.now();
    const steps = [];
    try {
        const data = await provider.validateAnswer({ shortAnswer, question, confidenceScore: 0.9 });
        steps.push({ step: 'validate', provider: provider.name, latencyMs: Date.now() - start });
        return { data, ctx: { requestId: randomId(), modelConfig: merged, trace: steps } };
    }
    catch (err) {
        steps.push({ step: 'validate', provider: provider.name, latencyMs: Date.now() - start, error: String(err) });
        throw new ChainError('Validate chain failed', 'VALIDATION_FAILED', steps.map(s => ({ step: s.step, error: s.error ?? 'unknown' })));
    }
}
function randomId() {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
//# sourceMappingURL=image-to-question.chain.js.map