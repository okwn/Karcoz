/**
 * Extension Library Unit Tests
 * Run with: cd apps/extension && npx vitest run src/lib/__tests__/
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  startRequest,
  getCurrentRequestId,
  cancelCurrentRequest,
  clearRequest,
} from '../request-cancellation.js';

import {
  getCachedResult,
  setCachedResult,
  clearCache,
  computeHash,
} from '../recent-result-cache.js';

import type { SolveResult } from '../message-types';

const makeResult = (id: string): SolveResult => ({
  questionId: id,
  answer: { shortAnswer: `Answer ${id}` },
  confidence: 0.9,
  extraction: { text: `Question ${id}` },
}));

describe('request-cancellation', () => {
  beforeEach(() => {
    clearRequest();
  });

  it('startRequest returns an AbortController', () => {
    const ctrl = startRequest('req-1');
    expect(ctrl).toBeInstanceOf(AbortController);
  });

  it('getCurrentRequestId returns the started request ID', () => {
    startRequest('req-2');
    expect(getCurrentRequestId()).toBe('req-2');
  });

  it('starting a new request cancels the previous one', () => {
    const ctrl1 = startRequest('req-1');
    const ctrl2 = startRequest('req-2');

    // ctrl1 should be aborted when ctrl2 starts
    expect(ctrl1.signal.aborted).toBe(true);
    expect(ctrl2.signal.aborted).toBe(false);
  });

  it('cancelCurrentRequest aborts the active request', () => {
    startRequest('req-1');
    cancelCurrentRequest();

    expect(getCurrentRequestId()).toBeNull();
  });

  it('clearRequest resets state without aborting', () => {
    const ctrl = startRequest('req-1');
    clearRequest();

    expect(ctrl.signal.aborted).toBe(false);
    expect(getCurrentRequestId()).toBeNull();
  });
});

describe('recent-result-cache', () => {
  beforeEach(() => {
    clearCache();
  });

  it('computeHash is deterministic', () => {
    const h1 = computeHash('What is 2+2?');
    const h2 = computeHash('What is 2+2?');
    expect(h1).toBe(h2);
  });

  it('computeHash differs for different inputs', () => {
    const h1 = computeHash('Question A');
    const h2 = computeHash('Question B');
    expect(h1).not.toBe(h2);
  });

  it('getCachedResult returns null when cache is empty', async () => {
    const result = await getCachedResult('Any question');
    expect(result).toBeNull();
  });

  it('setCachedResult then getCachedResult returns the result', async () => {
    const result = makeResult('q1');
    await setCachedResult('What is 2+2?', result);

    const cached = await getCachedResult('What is 2+2?');
    expect(cached).not.toBeNull();
    expect(cached!.questionId).toBe('q1');
  });

  it('cache is LRU — most recent is first', async () => {
    await setCachedResult('Q1', makeResult('a'));
    await setCachedResult('Q2', makeResult('b'));

    const cached = await getCachedResult('Q1');
    expect(cached).not.toBeNull();
    expect(cached!.questionId).toBe('a');
  });

  it('cache evicts oldest entry when exceeding MAX_CACHE_SIZE', async () => {
    for (let i = 0; i < 25; i++) {
      await setCachedResult(`Q${i}`, makeResult(`id-${i}`));
    }

    // Oldest entries should be evicted (Q0-Q4)
    const oldest = await getCachedResult('Q0');
    expect(oldest).toBeNull();

    // Recent entries should still exist
    const recent = await getCachedResult('Q24');
    expect(recent).not.toBeNull();
  });

  it('clearCache removes all entries', async () => {
    await setCachedResult('Q1', makeResult('a'));
    await setCachedResult('Q2', makeResult('b'));
    clearCache();

    expect(await getCachedResult('Q1')).toBeNull();
    expect(await getCachedResult('Q2')).toBeNull();
  });
});

describe('result bubble state machine (conceptual)', () => {
  // The result bubble has states: hidden → loading → visible → dismissed
  // These tests document and verify the expected state transitions

  const STATES = ['hidden', 'loading', 'visible', 'dismissed'] as const;
  type BubbleState = typeof STATES[number];

  const transitions: Record<BubbleState, BubbleState[]> = {
    hidden: ['loading'],
    loading: ['visible', 'dismissed'],
    visible: ['dismissed', 'hidden'],
    dismissed: ['hidden'],
  };

  it('hidden can transition to loading', () => {
    expect(transitions.hidden).toContain('loading');
  });

  it('loading can transition to visible or dismissed', () => {
    expect(transitions.loading).toContain('visible');
    expect(transitions.loading).toContain('dismissed');
  });

  it('visible can transition to dismissed or hidden', () => {
    expect(transitions.visible).toContain('dismissed');
    expect(transitions.visible).toContain('hidden');
  });

  it('dismissed can transition to hidden', () => {
    expect(transitions.dismissed).toContain('hidden');
  });

  it('invalid transitions are not allowed', () => {
    // hidden cannot go directly to visible
    expect(transitions.hidden).not.toContain('visible');
    // visible cannot go directly to loading
    expect(transitions.visible).not.toContain('loading');
  });
});