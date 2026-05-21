import type { SolveResult } from './message-types';

const MAX_CACHE_SIZE = 20; // LRU cache size

interface CachedResult {
  hash: string;
  result: SolveResult;
  timestamp: number;
}

const cache: CachedResult[] = [];

function computeHash(text: string): string {
  // Simple hash for cache key — use normalized question text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export async function getCachedResult(normalizedText: string): Promise<SolveResult | null> {
  const hash = computeHash(normalizedText);
  const entry = cache.find(c => c.hash === hash);
  if (!entry) return null;

  // Check if older than 1 hour
  if (Date.now() - entry.timestamp > 60 * 60 * 1000) {
    const idx = cache.indexOf(entry);
    if (idx > -1) cache.splice(idx, 1);
    return null;
  }

  // Move to front (LRU)
  const idx = cache.indexOf(entry);
  if (idx > 0) {
    cache.splice(idx, 1);
    cache.unshift(entry);
  }

  return entry.result;
}

export async function setCachedResult(normalizedText: string, result: SolveResult): Promise<void> {
  const hash = computeHash(normalizedText);

  // Remove existing entry for this hash
  const existingIdx = cache.findIndex(c => c.hash === hash);
  if (existingIdx > -1) {
    cache.splice(existingIdx, 1);
  }

  // Add to front
  cache.unshift({ hash, result, timestamp: Date.now() });

  // Trim to max size
  while (cache.length > MAX_CACHE_SIZE) {
    cache.pop();
  }
}

export function clearCache(): void {
  cache.length = 0;
}

export { computeHash };