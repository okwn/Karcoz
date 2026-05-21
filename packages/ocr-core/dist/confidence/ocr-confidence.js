/**
 * Compute aggregate OCR confidence from all pipeline stages.
 * Weights: ocrEngine (0.4), textQuality (0.25), languageConsistency (0.15), optionStructure (0.2)
 */
export function computeConfidence(input) {
    const weights = {
        ocrEngine: 0.4,
        textQuality: 0.25,
        languageConsistency: 0.15,
        optionStructure: 0.2,
    };
    const raw = Object.entries(input).reduce((sum, [key, val]) => {
        return sum + (val * weights[key]);
    }, 0);
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, raw));
}
/**
 * Rate extraction quality based on text characteristics.
 */
export function assessTextQuality(text) {
    if (!text || text.length < 5)
        return 0;
    const clean = text.replace(/[ -ÿ]/g, '');
    const ratio = clean.length / text.length;
    const hasGarbled = /[▓░▒╬╫╔]/.test(text); // common OCR artifacts
    if (hasGarbled)
        return 0.3;
    if (ratio < 0.9)
        return 0.5;
    return 0.9;
}
//# sourceMappingURL=ocr-confidence.js.map