/**
 * KARÇÖZ — Central Environment Validation
 *
 * Validates all required environment variables at startup.
 * Fails fast in production if critical vars are missing.
 * In development, logs warnings but does not block startup.
 */

import { z } from 'zod';

const envSchema = z.object({
  // ── Required in production ─────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Database ────────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // ── Redis ───────────────────────────────────────────────────────
  REDIS_URL: z.string().regex(/^redis:\/\//, 'REDIS_URL must start with redis://'),

  // ── Session ─────────────────────────────────────────────────────
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  // ── Application ────────────────────────────────────────────────
  APP_BASE_URL: z.string().url('APP_BASE_URL must be a valid URL'),
  MAGIC_LINK_BASE_URL: z.string().url('MAGIC_LINK_BASE_URL must be a valid URL'),
  ALLOWED_ORIGINS: z.string().optional(),
  PORT: z.coerce.number().min(1).max(65535).default(8100),

  // ── AI Providers ────────────────────────────────────────────────
  AI_PROVIDER: z.enum(['openai', 'openrouter', 'mock']).default('mock'),
  AI_FALLBACK_PROVIDER: z.enum(['openai', 'openrouter', 'mock']).default('openrouter'),
  AI_TIMEOUT_MS: z.coerce.number().min(1000).max(120000).default(30000),
  AI_MAX_TOKENS: z.coerce.number().min(128).max(8192).default(2048),
  MOCK_AI: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),

  // ── OpenAI ──────────────────────────────────────────────────────
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_VISION_MODEL: z.string().default('gpt-4o'),

  // ── OpenRouter ──────────────────────────────────────────────────
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-3.5-sonnet'),

  // ── Telegram Bot ───────────────────────────────────────────────────────
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // ── Stripe Billing ─────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_TEAM_MONTHLY: z.string().optional(),

  // ── Docker (optional, set by compose) ───────────────────────────
  API_PORT: z.coerce.number().optional(),
  WEB_PORT: z.coerce.number().optional(),
  DB_PORT: z.coerce.number().optional(),
  REDIS_PORT: z.coerce.number().optional(),
});

const requiredForProduction = [
  'DATABASE_URL',
  'REDIS_URL',
  'SESSION_SECRET',
  'APP_BASE_URL',
  'MAGIC_LINK_BASE_URL',
];

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
export function validateEnv(): ValidatedEnv {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten();
    const fieldErrors = Object.entries(errors.fieldErrors)
      .map(([field, msgs]) => `  ${field}: ${(msgs as string[]).join(', ')}`)
      .join('\n');

    const isProduction = process.env.NODE_ENV === 'production';

    const missingCritical = requiredForProduction.filter(
      key => !process.env[key]
    );

    if (isProduction) {
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║           KARÇÖZ — ENVIRONMENT VALIDATION FAILED            ║');
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  Production mode requires all critical environment variables. ║');
      console.error('║  Missing or invalid fields:                                   ║');
      console.error(`\n${fieldErrors}\n`);
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  Required variables:                                          ║');
      requiredForProduction.forEach(key => {
        const status = process.env[key] ? '✓ set' : '✗ MISSING';
        console.error(`║    ${key.padEnd(32)} ${status}`);
      });
      console.error('╚══════════════════════════════════════════════════════════════╝');
      process.exit(1);
    } else {
      console.warn('[ENV] Validation warnings (non-production):');
      console.warn(fieldErrors || '[ENV] No field errors');
      if (missingCritical.length > 0) {
        console.warn(`[ENV] Missing critical vars: ${missingCritical.join(', ')}`);
        console.warn('[ENV] Server will start but some features may be unavailable.');
      }
    }
  }

  return result.data as ValidatedEnv;
}

export const env = validateEnv();