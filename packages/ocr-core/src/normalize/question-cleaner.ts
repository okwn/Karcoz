import { NormalizeResult } from '../types.js';
import { normalizeWhitespace } from './normalize-whitespace.js';
import { normalizeTurkish } from './normalize-turkish.js';
import { normalizeMathSymbols } from './normalize-math-symbols.js';

/**
 * Full normalization pipeline: whitespace → Turkish → math symbols → punctuation.
 */
export function normalizeText(text: string, languageHint?: 'en' | 'tr'): NormalizeResult {
  const allChanges: string[] = [];

  let result = text;

  // Step 1: Whitespace
  const ws = normalizeWhitespace(result);
  result = ws.text;
  allChanges.push(...ws.changes);

  // Step 2: Turkish (only if language hint is tr or auto-detected)
  const shouldNormalizeTurkish = languageHint === 'tr' ||
    (!languageHint && /[şçğüöı]/i.test(result));
  if (shouldNormalizeTurkish) {
    const tr = normalizeTurkish(result);
    result = tr.text;
    allChanges.push(...tr.changes);
  }

  // Step 3: Math symbols (always, since math chars are language-neutral)
  const math = normalizeMathSymbols(result);
  result = math.text;
  allChanges.push(...math.changes);

  // Step 4: Fix common OCR punctuation artifacts
  result = result
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/​/g, '')  // zero-width space
    .replace(/​/g, ''); // zero-width space

  return { text: result, changes: allChanges };
}