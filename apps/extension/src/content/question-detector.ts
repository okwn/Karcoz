/**
 * KARÇÖZ Question Detector
 *
 * Takes page text and blocks, returns candidate question objects.
 * Used for Study Scan Mode — user picks one before solving.
 */

import type { TextBlock } from './page-text-extractor';

export interface QuestionCandidate {
  id: string;
  text: string;
  options: string[];
  confidence: number;
  boundingHint?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  source: 'dom' | 'inferred';
}

/**
 * Detect question-like text blocks from page extraction
 */
export function detectQuestions(blocks: TextBlock[]): QuestionCandidate[] {
  const candidates: QuestionCandidate[] = [];

  // Sort by question likelihood score
  const sorted = blocks.slice().sort((a, b) => b.confidence - a.confidence);

  // Filter high-confidence blocks
  const questionBlocks = sorted.filter(b => b.confidence >= 0.25);

  for (const block of questionBlocks) {
    const id = generateId(block.text);

    // Try to extract options from the block text
    const { mainText, options } = parseOptions(block.text);

    candidates.push({
      id,
      text: mainText,
      options,
      confidence: block.confidence,
      boundingHint: block.rect ? {
        top: block.rect.top,
        left: block.rect.left,
        width: block.rect.width,
        height: block.rect.height,
      } : undefined,
      source: 'dom',
    });
  }

  // Merge nearby blocks into combined candidates
  const merged = mergeNearbyBlocks(candidates, blocks);

  // Sort by confidence desc, take top candidates
  return merged
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

/**
 * Extract option list from block text
 */
function parseOptions(text: string): { mainText: string; options: string[] } {
  const options: string[] = [];

  // Pattern 1: "A. ...\nB. ...\nC. ...\nD. ..."
  const letterOptionPattern = /(?:^|\n)\s*([A-D])\.\s*([^\n]+)/gi;
  const matches = [...text.matchAll(letterOptionPattern)];
  if (matches.length >= 2) {
    for (const m of matches) {
      options.push(m[2]?.trim() ?? '');
    }
    // Remove option lines from main text
    const mainText = text
      .replace(/(?:^|\n)\s*[A-D]\.\s*[^\n]+/gi, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return { mainText, options };
  }

  // Pattern 2: "(a) ... (b) ... (c) ... (d) ..."
  const parenOptionPattern = /\(\s*([a-d])\s*\)\s*([^\(\)]+)/gi;
  const parenMatches = [...text.matchAll(parenOptionPattern)];
  if (parenMatches.length >= 2) {
    for (const m of parenMatches) {
      options.push(m[2]?.trim() ?? '');
    }
    const mainText = text
      .replace(/\(\s*[a-d]\s*\)\s*[^\(\)]+/gi, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return { mainText, options };
  }

  // Pattern 3: numbered list "1. ...\n2. ...\n3. ..."
  const numberedPattern = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+)/g;
  const numMatches = [...text.matchAll(numberedPattern)];
  if (numMatches.length >= 2) {
    for (const m of numMatches) {
      options.push(m[2]?.trim() ?? '');
    }
    const mainText = text
      .replace(/(?:^|\n)\s*\d+[\.\)]\s*[^\n]+/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
    return { mainText, options };
  }

  // No options found — treat whole text as question
  return { mainText: text, options: [] };
}

/**
 * Merge nearby blocks if they look like the same question
 */
function mergeNearbyBlocks(
  candidates: QuestionCandidate[],
  allBlocks: TextBlock[]
): QuestionCandidate[] {
  // Group blocks by approximate vertical proximity
  const grouped: QuestionCandidate[][] = [];
  const used = new Set<string>();

  for (const candidate of candidates) {
    if (used.has(candidate.id)) continue;

    const group = [candidate];
    used.add(candidate.id);

    const candidateTop = candidate.boundingHint?.top ?? 0;
    const candidateBottom = candidateTop + (candidate.boundingHint?.height ?? 0);

    // Find nearby blocks within 100px vertically
    for (const block of allBlocks) {
      if (block.confidence < 0.15) continue;
      const blockTop = block.rect?.top ?? 0;

      // If block starts near where candidate ends
      if (blockTop >= candidateBottom && blockTop <= candidateBottom + 150) {
        const { mainText, options } = parseOptions(block.text);
        if (options.length > 0 || block.confidence > 0.3) {
          group.push({
            id: generateId(block.text),
            text: mainText,
            options,
            confidence: block.confidence,
            boundingHint: block.rect ? {
              top: block.rect.top,
              left: block.rect.left,
              width: block.rect.width,
              height: block.rect.height,
            } : undefined,
            source: 'dom',
          });
          used.add(generateId(block.text));
        }
      }
    }

    grouped.push(group);
  }

  // Merge each group into a single candidate
  return grouped.map(group => {
    if (group.length === 1) return group[0];

    // Combine texts
    const combinedText = group.map(c => c.text).filter(t => t.length > 10).join(' ');
    const allOptions = group.flatMap(c => c.options);

    // Average confidence weighted by original position
    const avgConf = group.reduce((s, c) => s + c.confidence, 0) / group.length;

    // Merge bounding hints
    let mergedRect: QuestionCandidate['boundingHint'] | undefined;
    if (group[0].boundingHint) {
      const tops = group.map(c => c.boundingHint?.top ?? 0);
      const lefts = group.map(c => c.boundingHint?.left ?? 0);
      const widths = group.map(c => c.boundingHint?.width ?? 0);
      const heights = group.map(c => c.boundingHint?.height ?? 0);
      const maxBottom = Math.max(...group.map(c => (c.boundingHint?.top ?? 0) + (c.boundingHint?.height ?? 0)));

      mergedRect = {
        top: Math.min(...tops),
        left: Math.min(...lefts),
        width: Math.max(...widths),
        height: maxBottom - Math.min(...tops),
      };
    }

    return {
      id: group[0].id,
      text: combinedText.slice(0, 2000), // cap at 2000 chars
      options: allOptions.slice(0, 10), // cap at 10 options
      confidence: avgConf,
      boundingHint: mergedRect,
      source: 'dom' as const,
    };
  });
}

function generateId(text: string): string {
  // Simple deterministic ID from text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `q_${Math.abs(hash).toString(36).slice(0, 8)}`;
}

/**
 * Rank candidates by question likelihood
 */
export function rankCandidates(candidates: QuestionCandidate[]): QuestionCandidate[] {
  return candidates
    .map(c => ({
      ...c,
      // Boost score if has options
      confidence: c.options.length >= 2
        ? c.confidence * 1.2
        : c.confidence * 0.9,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}