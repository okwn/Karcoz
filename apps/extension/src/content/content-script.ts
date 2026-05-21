/**
 * KARÇÖZ Content Script
 *
 * Injected into web pages. Handles:
 * - Study mode indicator (floating pill)
 * - Capture area overlay (selection layer)
 * - Result bubble (answer display)
 * - Page scan indicator
 *
 * All UI is visible, non-blocking, and keyboard accessible.
 * No hidden modes, no auto-answers.
 */

import { createSelectionLayer } from './selection-layer';
import { createResultBubble, ResultBubble } from './result-bubble';
import type { SolveResult } from './result-bubble';
import { createPageScanIndicator } from './page-scan-indicator';
import { extractPageText } from './page-text-extractor';
import { detectQuestions, rankCandidates } from './question-detector';
import { createFloatingCandidateSelector } from './question-candidate-overlay';

// ── State ─────────────────────────────────────────────────────────────────────

interface ContentState {
  studyModeEnabled: boolean;
  selectionLayer: ReturnType<typeof createSelectionLayer> | null;
  resultBubble: ResultBubble | null;
  scanIndicator: { show(): void; hide(): void } | null;
  studyIndicator: HTMLDivElement | null;
  candidateOverlay: ReturnType<typeof createFloatingCandidateSelector> | null;
}

const state: ContentState = {
  studyModeEnabled: false,
  selectionLayer: null,
  resultBubble: null,
  scanIndicator: null,
  studyIndicator: null,
  candidateOverlay: null,
};

// ── Study Mode Indicator ───────────────────────────────────────────────────────

function showStudyIndicator(): void {
  if (state.studyIndicator) return;
  const el = document.createElement('div');
  el.className = 'kcz-study-indicator';
  el.id = 'kcz-study-indicator';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'KARÇÖZ Study Mode active');
  el.textContent = 'KARÇÖZ Study Mode On';
  document.body.appendChild(el);
  state.studyIndicator = el;
}

function hideStudyIndicator(): void {
  state.studyIndicator?.remove();
  state.studyIndicator = null;
}

// ── History persistence ───────────────────────────────────────────────────────

async function saveResultToHistory(result: SolveResult): Promise<void> {
  const { addToHistory } = await import('../lib/extension-storage');
  await addToHistory(result);
}

// ── Capture Area ─────────────────────────────────────────────────────────────

function startCaptureArea(): void {
  // Clean up any existing UI
  state.resultBubble?.remove();
  state.scanIndicator?.hide();

  state.resultBubble = createResultBubble();
  state.resultBubble.showCapturing();

  state.selectionLayer = createSelectionLayer();

  state.selectionLayer.onSelectionComplete((rect) => {
    state.selectionLayer = null;
    state.resultBubble!.showReading();

    chrome.runtime.sendMessage({
      action: 'CAPTURE_AREA',
      payload: { area: rect },
    }).then((response) => {
      if (response?.success && response?.data) {
        const result = response.data as SolveResult;
        state.resultBubble!.showAnswer(result);
        saveResultToHistory(result);
      } else {
        state.resultBubble!.showError(response?.error ?? 'Capture failed');
      }
    }).catch((err) => {
      state.resultBubble!.showError(err instanceof Error ? err.message : 'Unknown error');
    });
  });

  state.selectionLayer.onSelectionCancel(() => {
    state.selectionLayer = null;
    state.resultBubble?.remove();
    state.resultBubble = null;
  });
}

// ── Scan Page (Study Scan Mode — detect candidates first) ─────────────────────

function startScanPage(): void {
  state.resultBubble?.remove();
  state.scanIndicator?.hide();

  state.resultBubble = createResultBubble();
  state.resultBubble.showCapturing();

  // Step 1: Extract page text
  const pageData = extractPageText();

  if (!pageData.pageText || pageData.pageText.trim().length < 20) {
    state.resultBubble.showError('No readable text found on this page');
    setTimeout(() => state.resultBubble?.remove(), 4000);
    return;
  }

  // Step 2: Detect question candidates locally
  const candidates = rankCandidates(detectQuestions(pageData.blocks));

  if (candidates.length === 0) {
    state.resultBubble.showError('No questions detected on this page');
    setTimeout(() => state.resultBubble?.remove(), 4000);
    return;
  }

  // Step 3: Show candidate selector overlay
  state.resultBubble.remove();
  state.resultBubble = null;

  state.candidateOverlay = createFloatingCandidateSelector(
    // onSelect
    async (candidate) => {
      state.candidateOverlay?.hide();
      state.candidateOverlay = null;

      // Show solving bubble
      state.resultBubble = createResultBubble();
      state.resultBubble.showSolving();

      try {
        // Send to backend for solving
        const response = await chrome.runtime.sendMessage({
          action: 'CAPTURE_AREA',
          payload: { candidateId: candidate.id, pageData },
        });

        if (response?.success && response?.data) {
          const result = response.data as SolveResult;
          state.resultBubble!.showAnswer(result);
          saveResultToHistory(result);
        } else {
          state.resultBubble!.showError(response?.error ?? 'Solve failed');
        }
      } catch (err) {
        state.resultBubble!.showError(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    // onCancel
    () => {
      state.candidateOverlay?.hide();
      state.candidateOverlay = null;
    }
  );

  state.candidateOverlay.show(candidates);
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function cleanup(): void {
  hideStudyIndicator();
  state.resultBubble?.remove();
  state.resultBubble = null;
  state.scanIndicator?.hide();
  state.scanIndicator = null;
  state.selectionLayer?.cancel();
  state.selectionLayer = null;
  state.candidateOverlay?.hide();
  state.candidateOverlay = null;
}

// ── Message Router ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const { action, payload } = message;

    switch (action) {
      case 'START_CAPTURE_MODE':
        startCaptureArea();
        sendResponse({ success: true });
        break;

      case 'SCAN_PAGE':
        startScanPage();
        sendResponse({ success: true });
        break;

      case 'TOGGLE_STUDY_MODE': {
        state.studyModeEnabled = !state.studyModeEnabled;
        if (state.studyModeEnabled) {
          showStudyIndicator();
        } else {
          hideStudyIndicator();
        }
        sendResponse({ success: true, studyMode: { enabled: state.studyModeEnabled } });
        break;
      }

      case 'STUDY_MODE_CHANGED': {
        const newState = payload as { enabled: boolean };
        state.studyModeEnabled = newState.enabled;
        if (state.studyModeEnabled) {
          showStudyIndicator();
        } else {
          hideStudyIndicator();
        }
        sendResponse({ success: true });
        break;
      }

      case 'SHOW_RESULT':
        state.resultBubble = createResultBubble();
        state.resultBubble.showAnswer(payload as SolveResult);
        sendResponse({ success: true });
        break;

      case 'CLEANUP':
        cleanup();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: `Unknown action: ${action}` });
    }

    return true; // Keep message channel open for async response
  });
});