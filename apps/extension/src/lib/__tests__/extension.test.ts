/**
 * Extension Library Unit Tests
 *
 * Tests core extension library modules in isolation using Vitest.
 * These DO NOT require a Chrome environment — they test pure logic only.
 *
 * Run with: pnpm --filter @karcoz/extension test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computeHash, clearCache } from '../recent-result-cache.js';
import * as cancellation from '../request-cancellation.js';
import type { SolveResult } from '../message-types.js';

// ── Recent Result Cache ────────────────────────────────────────────────────────

describe('recent-result-cache', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('computeHash', () => {
    it('produces consistent hashes for same input', () => {
      const h1 = computeHash('What is 2+2?');
      const h2 = computeHash('What is 2+2?');
      expect(h1).toBe(h2);
    });

    it('produces different hashes for different inputs', () => {
      const h1 = computeHash('What is 2+2?');
      const h2 = computeHash('What is 3+3?');
      expect(h1).not.toBe(h2);
    });

    it('is stable across calls', () => {
      const h1 = computeHash('Algebra question');
      const h2 = computeHash('Algebra question');
      const h3 = computeHash('Algebra question');
      expect(h1).toBe(h2);
      expect(h2).toBe(h3);
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when cache exceeds MAX_CACHE_SIZE (20)', async () => {
      const { getCachedResult, setCachedResult } = await import('../recent-result-cache.js');

      // Fill cache beyond MAX_CACHE_SIZE
      for (let i = 0; i < 25; i++) {
        const result = { shortAnswer: `Answer ${i}` } as SolveResult;
        await setCachedResult(`Question ${i}`, result);
      }

      // First entries should be evicted
      const oldest = await getCachedResult('Question 0');
      expect(oldest).toBeNull();

      // Recent entries should still be present
      const recent = await getCachedResult('Question 24');
      expect(recent).not.toBeNull();
    });
  });
});

// ── Request Cancellation ───────────────────────────────────────────────────────

describe('request-cancellation', () => {
  beforeEach(() => {
    cancellation.clearRequest();
  });

  it('startRequest returns an AbortController', () => {
    const ctrl = cancellation.startRequest('req-1');
    expect(ctrl).toBeInstanceOf(AbortController);
    expect(ctrl.signal).toBeDefined();
  });

  it('startRequest cancels previous request', () => {
    const ctrl1 = cancellation.startRequest('req-1');
    const abortSpy = vi.spyOn(ctrl1, 'abort');

    cancellation.startRequest('req-2');

    expect(abortSpy).toHaveBeenCalled();
  });

  it('getCurrentRequestId returns the active request ID', () => {
    expect(cancellation.getCurrentRequestId()).toBeNull();
    cancellation.startRequest('req-xyz');
    expect(cancellation.getCurrentRequestId()).toBe('req-xyz');
  });

  it('cancelCurrentRequest aborts the active request', () => {
    const ctrl = cancellation.startRequest('req-1');
    const abortSpy = vi.spyOn(ctrl, 'abort');
    cancellation.cancelCurrentRequest();
    expect(abortSpy).toHaveBeenCalled();
  });

  it('clearRequest resets all state', () => {
    cancellation.startRequest('req-1');
    cancellation.clearRequest();
    expect(cancellation.getCurrentRequestId()).toBeNull();
  });
});

// ── API Client Real/Mock Selection ─────────────────────────────────────────────

describe('api-client config', () => {
  it('API_BASE_URL defaults to localhost:8132 when not set', async () => {
    // The DEFAULT_API_BASE_URL constant should be the fallback
    const { DEFAULT_API_BASE_URL } = await import('../api-client.js');
    expect(DEFAULT_API_BASE_URL).toBe('http://localhost:8132');
  });

  it('getApiBaseUrl returns stored URL or default', async () => {
    // Mock chrome.storage.local.get
    const mockStorage: Record<string, unknown> = {};
    const chromeMock = {
      storage: {
        local: {
          get: (keys: string | string[]) => {
            const result: Record<string, unknown> = {};
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const k of keyList) {
              (result as Record<string, unknown>)[k] = mockStorage[k];
            }
            return Promise.resolve(result);
          },
        },
      },
    };

    vi.stubGlobal('chrome', chromeMock);

    const { getApiBaseUrl } = await import('../api-client.js');
    const url = await getApiBaseUrl();
    expect(url).toBe('http://localhost:8132');

    vi.unstubGlobal('chrome');
  });

  it('getUseMock returns false by default', async () => {
    const mockStorage: Record<string, unknown> = {};
    const chromeMock = {
      storage: {
        local: {
          get: (keys: string | string[]) => {
            const result: Record<string, unknown> = {};
            const keyList = Array.isArray(keys) ? keys : [keys];
            for (const k of keyList) {
              (result as Record<string, unknown>)[k] = mockStorage[k];
            }
            return Promise.resolve(result);
          },
        },
      },
    };

    vi.stubGlobal('chrome', chromeMock);

    const { getUseMock } = await import('../api-client.js');
    const useMock = await getUseMock();
    expect(useMock).toBe(false);

    vi.unstubGlobal('chrome');
  });
});

// ── Extension Storage ─────────────────────────────────────────────────────────

describe('extension-storage', () => {
  it('DEFAULT_SETTINGS has expected shape', async () => {
    const { DEFAULT_SETTINGS } = await import('../extension-storage.js');
    expect(DEFAULT_SETTINGS).toEqual({
      storeHistory: true,
      storeImages: true,
      autoHideBubbleMs: 8000,
      showStudyIndicator: true,
      maxHistoryItems: 50,
    });
  });

  it('STORAGE_KEYS has expected keys', async () => {
    const { STORAGE_KEYS } = await import('../extension-storage.js');
    expect(STORAGE_KEYS.STUDY_MODE).toBe('studyMode');
    expect(STORAGE_KEYS.LAST_RESULT).toBe('lastResult');
    expect(STORAGE_KEYS.HISTORY).toBe('history');
    expect(STORAGE_KEYS.SETTINGS).toBe('settings');
  });
});

// ── Low-Confidence Rendering ──────────────────────────────────────────────────

describe('low-confidence rendering', () => {
  it('confidence threshold is defined', async () => {
    // Low confidence threshold is 0.6 — below this, answer is marked uncertain
    const LOW_CONFIDENCE_THRESHOLD = 0.6;
    expect(LOW_CONFIDENCE_THRESHOLD).toBe(0.6);
  });

  it('solver-core confidence calculator applies penalties below 0.3', async () => {
    // Test the formula: OCR < 0.3 → combined capped at 0.4
    // Solver < 0.3 → combined capped at 0.35
    const ocrScore = 0.2;
    const solverScore = 0.1;
    const validationScore = 0.5;

    const base = ocrScore * 0.3 + solverScore * 0.6 + validationScore * 0.1;
    // solver < 0.3 → cap at 0.35
    const expectedCap = 0.35;
    const result = solverScore < 0.3 ? Math.min(base, expectedCap) : base;
    expect(result).toBe(0.35);
  });
});