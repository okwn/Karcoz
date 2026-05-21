const TURKISH_CHARS = /[şçğüöıàâéèêëïîôûùäãåōçöüşğıâîôû]/gi;
/**
 * Detect language (Turkish / English / unknown) via character frequency.
 * Threshold: >15% Turkish chars → Turkish
 * If any Turkish chars → possible Turkish
 * Otherwise → English
 */
export function detectLanguage(text) {
    const totalChars = text.replace(/\s/g, '').length;
    if (totalChars === 0)
        return 'unknown';
    const turkishChars = (text.match(TURKISH_CHARS) || []).length;
    const ratio = turkishChars / totalChars;
    if (ratio > 0.15)
        return 'tr';
    if (text.trim().length > 0)
        return 'en';
    return 'unknown';
}
//# sourceMappingURL=detect-language.js.map