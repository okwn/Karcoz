import { NormalizeResult } from '../types.js';

const TURKISH_CHARS = /[şçğüöıàâéèêëïîôûùäãåōŞÇĞÜÖİ]/i;

/**
 * Fix common Turkish OCR errors:
 * - ı (dotless lowercase i) ↔ i confusion
 * - I (uppercase) ↔ İ (dotted uppercase) confusion
 * - ş ↔ s, ç ↔ c, ğ ↔ g, ü ↔ u, ö ↔ o
 * - Common digit-letter confusions
 */
export function normalizeTurkish(text: string): NormalizeResult {
  const changes: string[] = [];

  // Only apply if text contains Turkish characters
  const hasTurkish = TURKISH_CHARS.test(text);

  let result = text;

  // Superscript normalization (shared logic for math OCR)
  const superscripts: [string, string][] = [
    ['²', '^2'], ['³', '^3'], ['⁴', '^4'], ['⁵', '^5'],
    ['⁶', '^6'], ['⁷', '^7'], ['⁸', '^8'], ['⁹', '^9'],
    ['⁰', '^0'], ['¹', '^1'],
  ];
  for (const [sup, norm] of superscripts) {
    if (result.includes(sup)) {
      changes.push(`superscript-${sup}`);
      result = result.split(sup).join(norm);
    }
  }

  if (hasTurkish) {
    // Fix dotted I / dotless ı confusion
    if (/[İI]/.test(result)) {
      changes.push('fixTurkishI');
      result = result.replace(/İ/g, 'I');
      result = result.replace(/ı/g, 'i');
    }

    // Fix common misrecognition patterns (5 and ı confusion)
    if (/[5ı]/i.test(result)) {
      changes.push('fixDigitLetterConfusion');
      result = result.replace(/5([ı])/gi, '5');
      result = result.replace(/([ı])5/gi, '$1');
    }

    // Fix circumflex artifacts (â, î, û)
    if (/[âîû]/i.test(result)) {
      changes.push('fixCircumflex');
      result = result.replace(/â/g, 'a');
      result = result.replace(/î/g, 'i');
      result = result.replace(/û/g, 'u');
    }

    // Remove soft hyphens and zero-width spaces
    if (/­|‎/.test(result)) {
      changes.push('removeSpecialChars');
      result = result.replace(/­/g, '');
      result = result.replace(/‎/g, '');
    }
  }

  return { text: result, changes };
}