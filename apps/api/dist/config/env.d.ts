/**
 * KARÇÖZ — Central Environment Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast in production if critical vars are missing.
 * In development, logs warnings but does not block startup.
 */
export interface ValidatedEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    DATABASE_URL: string;
    REDIS_URL: string;
    SESSION_SECRET: string;
    APP_BASE_URL: string;
    MAGIC_LINK_BASE_URL: string;
    ALLOWED_ORIGINS?: string;
    PORT: number;
    AI_PROVIDER: 'openai' | 'openrouter' | 'mock';
    AI_FALLBACK_PROVIDER: 'openai' | 'openrouter' | 'mock';
    AI_TIMEOUT_MS: number;
    AI_MAX_TOKENS: number;
    MOCK_AI: boolean;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL: string;
    OPENAI_VISION_MODEL: string;
    OPENROUTER_API_KEY?: string;
    OPENROUTER_MODEL: string;
    TELEGRAM_BOT_TOKEN?: string;
    API_PORT?: number;
    WEB_PORT?: number;
    DB_PORT?: number;
    REDIS_PORT?: number;
}
/**
 * Validate environment and return parsed values.
 * In production: throws if required vars are missing.
 * In development: logs warnings but continues.
 */
export declare function validateEnv(): ValidatedEnv;
export declare const env: ValidatedEnv;
//# sourceMappingURL=env.d.ts.map