/**
 * Format a detailed explanation based on solver type.
 */
export declare function formatExplanation(solverType: string, language: 'en' | 'tr' | 'unknown', data: Record<string, unknown>): string;
/**
 * Generate brief reasoning summary (1-2 lines).
 */
export declare function briefSummary(solverType: string, result: string, language: 'en' | 'tr' | 'unknown'): string;
