/**
 * KARÇÖZ Page Text Extractor
 *
 * Extracts visible text content from a web page.
 * Only reads DOM — no screenshots, no network requests.
 *
 * Prioritizes: visible text, question-like blocks, form elements.
 * Skips: navigation, ads, hidden elements.
 */

export interface TextBlock {
  text: string;
  tag: string;
  rect?: DOMRect;
  confidence: number; // how likely this is a "question" block
}

export interface ExtractionResult {
  title: string;
  pageText: string;
  blocks: TextBlock[];
  url: string;
  timestamp: number;
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  return true;
}

function isMeaningfulText(text: string): boolean {
  if (!text || text.trim().length < 10) return false;
  // Skip very long texts (likely boilerplate)
  if (text.trim().length > 5000) return false;
  // Skip lines with mostly special chars
  const alphaRatio = text.replace(/[^a-zA-Z0-9\s]/g, '').length / text.length;
  if (alphaRatio < 0.3) return false;
  return true;
}

function extractQuestionScore(text: string): number {
  const qPatterns = [
    /\b(what|how|why|when|where|who|which|whose|whom)\b/i,
    /\b(solve|find|calculate|determine|explain|describe|compare|contrast|evaluate)\b/i,
    /\?\s*$/,
    /^\s*[A-Z]\.\s+/m,          // A. B. C. D. option pattern
    /^\s*\d+[\.\)]\s+/m,        // 1. 2. 3. numbered items
    /\b(option|choice|answer)\b/i,
    /\bcorrect\b/i,
    /\bincorrect\b/i,
    /\b(mcqs?|multiple.?choice)\b/i,
    /\[.*?\]/g,                  // bracketed fills
    /\(\s*[a-zA-Z]\s*\)/,        // (a) (b) (c) inline options
  ];

  let score = 0;
  const lower = text.toLowerCase();

  // Question word presence
  if (/\b(what|how|why|when|where|who|which)\b/i.test(text)) score += 0.4;

  // Verb presence (instruction/action)
  if (/\b(solve|find|calculate|determine|explain|describe|compare|contrast|evaluate|identify|show|prove)\b/i.test(text)) score += 0.25;

  // Ends with question mark
  if (/\?\s*$/.test(text)) score += 0.2;

  // Multiple choice pattern
  if (/\n\s*[A-Z]\.\s+/m.test(text) || /\n\s*\d+\.\s+/m.test(text)) score += 0.25;

  // Has option keywords
  if (/\b(option|choice|answer)\b/i.test(text)) score += 0.15;

  // Single letter options (a), (b), etc
  if (/\(\s*[a-zA-Z]\s*\)/.test(text)) score += 0.2;

  // Contains math-like expressions (formulas, equations)
  if (/[=<>+\-*/^]/.test(text) && /\d/.test(text)) score += 0.15;

  // Short to medium length is better
  if (text.trim().length >= 20 && text.trim().length <= 500) score += 0.1;

  return Math.min(score, 1.0);
}

function getTextContent(el: Element): string {
  // Clone to avoid modifying live DOM
  const clone = el.cloneNode(true) as Element;

  // Remove script, style, nav, footer elements
  const toRemove = clone.querySelectorAll('script, style, noscript, iframe, canvas, svg, nav, footer, header, aside');
  toRemove.forEach(e => e.remove());

  return clone.textContent?.trim() ?? '';
}

function getBoundingRect(el: Element): DOMRect | undefined {
  try {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return undefined;
    return rect;
  } catch {
    return undefined;
  }
}

export function extractPageText(): ExtractionResult {
  const title = document.title.trim() || 'Untitled';
  const url = window.location.href;

  const blocks: TextBlock[] = [];

  // Strategy 1: Look for common question container selectors
  const questionSelectors = [
    '[role="main"]',
    'main',
    'article',
    '.question',
    '.problem',
    '.exercise',
    '[class*="question"]',
    '[class*="problem"]',
    '[id*="question"]',
    '[id*="problem"]',
    '.quiz',
    '.test',
    '[class*="quiz"]',
    '.card-body',
    '.content',
    'body',
  ];

  let targetEl: Element | null = null;
  for (const sel of questionSelectors) {
    const found = document.querySelector(sel);
    if (found) { targetEl = found; break; }
  }
  if (!targetEl) targetEl = document.body;

  // Extract all meaningful text blocks
  const textEls = targetEl.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, label, span, div');

  for (const el of textEls) {
    if (!isVisible(el)) continue;
    const text = getTextContent(el);
    if (!isMeaningfulText(text)) continue;

    const rect = getBoundingRect(el);
    const confidence = extractQuestionScore(text);

    blocks.push({
      text,
      tag: el.tagName.toLowerCase(),
      rect,
      confidence,
    });
  }

  // Build full page text (all blocks, sorted by y-position)
  const sortedBlocks = blocks.slice().sort((a, b) => {
    const ay = a.rect?.top ?? 0;
    const by = b.rect?.top ?? 0;
    return ay - by;
  });

  const pageText = sortedBlocks
    .map(b => b.text)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  return {
    title,
    pageText,
    blocks,
    url,
    timestamp: Date.now(),
  };
}

/**
 * Get selected text from user selection
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString().trim() ?? '';
}

/**
 * Get text content within a specific DOM region
 */
export function getTextInRect(rect: DOMRect): string {
  const elements = document.elementsFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );

  let text = '';
  for (const el of elements) {
    const elText = getTextContent(el as Element);
    if (elText) text += elText + '\n';
  }
  return text.trim();
}