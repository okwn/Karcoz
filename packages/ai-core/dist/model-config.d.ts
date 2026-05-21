import type { ModelConfig, ProviderName } from './types.js';
export declare const DEFAULT_MODEL_CONFIG: ModelConfig;
export interface ProviderModel {
    name: string;
    provider: ProviderName;
    model: string;
    maxTokens: number;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    costPer1kInput: number;
    costPer1kOutput: number;
}
export declare const PROVIDER_MODELS: Record<ProviderName, ProviderModel[]>;
export declare function getProviderModels(provider: ProviderName): ProviderModel[];
export declare function getDefaultModel(provider: ProviderName): ProviderModel | undefined;
export declare function mergeConfig(partial?: Partial<ModelConfig>): ModelConfig;
//# sourceMappingURL=model-config.d.ts.map