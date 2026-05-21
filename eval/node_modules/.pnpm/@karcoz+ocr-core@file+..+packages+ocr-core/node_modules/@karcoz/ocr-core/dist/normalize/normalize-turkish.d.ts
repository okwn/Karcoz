import { NormalizeResult } from '../types.js';
/**
 * Fix common Turkish OCR errors:
 * - ı (dotless lowercase i) ↔ i confusion
 * - I (uppercase) ↔ İ (dotted uppercase) confusion
 * - ş ↔ s, ç ↔ c, ğ ↔ g, ü ↔ u, ö ↔ o
 * - Common digit-letter confusions
 */
export declare function normalizeTurkish(text: string): NormalizeResult;
//# sourceMappingURL=normalize-turkish.d.ts.map