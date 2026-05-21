/**
 * Detect language (Turkish / English / unknown) via character frequency.
 * Threshold: >15% Turkish chars → Turkish
 * If any Turkish chars → possible Turkish
 * Otherwise → English
 */
export declare function detectLanguage(text: string): 'en' | 'tr' | 'unknown';
//# sourceMappingURL=detect-language.d.ts.map