import type { AIProvider, ProviderName, ModelConfig } from './types.js';
export interface ProviderRegistry {
    get(name: ProviderName): AIProvider | undefined;
    register(name: ProviderName, provider: AIProvider): void;
    list(): ProviderName[];
    getPrimary(config: ModelConfig): AIProvider;
    getFallback(config: ModelConfig): AIProvider | undefined;
    getConfiguredProvider(name: ProviderName, config?: {
        timeoutMs?: number;
        maxTokens?: number;
    }): AIProvider;
}
export declare function createProviderRegistry(): ProviderRegistry;
export declare function getDefaultProviderName(): ProviderName;
export declare function getConfiguredProviderName(): ProviderName;
export declare const globalRegistry: ProviderRegistry;
//# sourceMappingURL=provider-registry.d.ts.map