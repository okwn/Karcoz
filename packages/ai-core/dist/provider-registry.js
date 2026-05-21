import { AIProviderError } from './errors.js';
import { MockProvider } from './providers/mock.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';
export function createProviderRegistry() {
    const providers = new Map();
    return {
        register(name, provider) { providers.set(name, provider); },
        get(name) { return providers.get(name); },
        list() { return Array.from(providers.keys()); },
        getPrimary(config) {
            const p = providers.get(config.provider);
            if (!p)
                throw new AIProviderError(`Provider ${config.provider} not found`, 'PROVIDER_NOT_FOUND', config.provider);
            return p;
        },
        getFallback(config) {
            if (!config.enableFallback || !config.fallbackProvider)
                return undefined;
            return providers.get(config.fallbackProvider);
        },
        getConfiguredProvider(name, config) {
            const provider = providers.get(name);
            if (provider)
                return provider;
            // Dynamically create provider if env vars are available
            return createProviderFromEnv(name, config);
        },
    };
}
function createProviderFromEnv(name, config) {
    switch (name) {
        case 'openai': {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new AIProviderError('OPENAI_API_KEY is not set. Cannot use openai provider.', 'MISSING_API_KEY', 'openai');
            }
            return new OpenAIProvider({
                apiKey,
                models: {
                    vision: process.env.OPENAI_VISION_MODEL ?? 'gpt-4o',
                    text: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
                },
                timeoutMs: config?.timeoutMs ?? parseInt(process.env.AI_TIMEOUT_MS ?? '30000', 10),
                maxTokens: config?.maxTokens ?? parseInt(process.env.AI_MAX_TOKENS ?? '2048', 10),
            });
        }
        case 'openrouter': {
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                throw new AIProviderError('OPENROUTER_API_KEY is not set. Cannot use openrouter provider.', 'MISSING_API_KEY', 'openrouter');
            }
            return new OpenRouterProvider({
                apiKey,
                model: process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-sonnet',
                timeoutMs: config?.timeoutMs ?? parseInt(process.env.AI_TIMEOUT_MS ?? '30000', 10),
                maxTokens: config?.maxTokens ?? parseInt(process.env.AI_MAX_TOKENS ?? '2048', 10),
            });
        }
        case 'anthropic':
            throw new AIProviderError('Anthropic provider not configured. Set ANTHROPIC_API_KEY to enable.', 'PROVIDER_NOT_CONFIGURED', 'anthropic');
        case 'gemini':
            throw new AIProviderError('Gemini provider not configured. Set GEMINI_API_KEY to enable.', 'PROVIDER_NOT_CONFIGURED', 'gemini');
        case 'mock':
            return new MockProvider();
        default:
            throw new AIProviderError(`Unknown provider: ${name}`, 'UNKNOWN_PROVIDER', name);
    }
}
export function getDefaultProviderName() {
    if (process.env.NODE_ENV === 'test' || process.env.MOCK_AI === 'true' || process.env.MOCK_AI === '1') {
        return 'mock';
    }
    const configured = process.env.AI_PROVIDER;
    if (configured && isValidProviderName(configured)) {
        return configured;
    }
    return 'mock';
}
function isValidProviderName(name) {
    return ['mock', 'openai', 'openrouter', 'anthropic', 'gemini'].includes(name);
}
export function getConfiguredProviderName() {
    const configured = process.env.AI_PROVIDER ?? process.env.AI_FALLBACK_PROVIDER;
    if (configured && isValidProviderName(configured)) {
        return configured;
    }
    return getDefaultProviderName();
}
export const globalRegistry = createProviderRegistry();
// Pre-register mock provider (always available without API key)
globalRegistry.register('mock', new MockProvider());
//# sourceMappingURL=provider-registry.js.map