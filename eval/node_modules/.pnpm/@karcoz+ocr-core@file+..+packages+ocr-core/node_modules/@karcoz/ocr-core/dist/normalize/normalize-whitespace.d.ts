import { NormalizeResult } from '../types.js';
/**
 * Normalize whitespace:
 * - Collapse multiple spaces/tabs to single space
 * - Remove leading/trailing whitespace per line
 * - Preserve double-newline paragraph breaks
 * - Handle line-broken words (join words broken across lines)
 */
export declare function normalizeWhitespace(text: string): NormalizeResult;
//# sourceMappingURL=normalize-whitespace.d.ts.map