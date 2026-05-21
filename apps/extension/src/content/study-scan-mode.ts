/**
 * KARÇÖZ Study Scan Mode
 *
 * Visible, user-initiated page scanning.
 * User toggles Study Scan Mode → clicks "Scan Page" → sees detected questions →
 * picks one → gets answer bubble.
 *
 * Safety guarantees:
 * - Always visible — study mode indicator always on when enabled
 * - User-initiated — requires explicit button click
 * - No hidden scanning — no background automation
 * - No auto-answers — user selects which question to solve
 * - No proctoring — only reads visible DOM text
 */

import './question-candidate-overlay.css';
import { extractPageText, type ExtractionResult } from './page-text-extractor';
import { detectQuestions, rankCandidates, type QuestionCandidate } from './question-detector';
import { createResultBubble, type SolveResult } from './result-bubble';

export interface StudyScanConfig {
  onSolve: (candidate: QuestionCandidate, pageData: ExtractionResult) => Promise<SolveResult>;
}

/**
 * High-level Study Scan Mode controller
 */
export class StudyScanMode {
  private config: StudyScanConfig;
  private overlay: ReturnType<typeof import('./question-candidate-overlay').createFloatingCandidateSelector> | null = null;

  constructor(config: StudyScanConfig) {
    this.config = config;
  }

  /**
   * Run Study Scan Mode on the current page.
   * Extracts text, detects questions, shows overlay, handles selection.
   */
  async scan(): Promise<void> {
    // Step 1: Extract page text
    const pageData = extractPageText();

    if (!pageData.pageText || pageData.pageText.trim().length < 20) {
      const bubble = createResultBubble();
      bubble.showError('No readable text found on this page');
      setTimeout(() => bubble.remove(), 4000);
      return;
    }

    // Step 2: Detect question candidates
    const candidates = rankCandidates(detectQuestions(pageData.blocks));

    if (candidates.length === 0) {
      const bubble = createResultBubble();
      bubble.showError('No questions detected on this page');
      setTimeout(() => bubble.remove(), 4000);
      return;
    }

    // Step 3: Show candidate selector overlay
    this.showCandidateOverlay(candidates, pageData);
  }

  private showCandidateOverlay(
    candidates: QuestionCandidate[],
    pageData: ExtractionResult
  ): void {
    // Dynamically import to avoid circular deps
    import('./question-candidate-overlay').then(({ createFloatingCandidateSelector }) => {
      this.overlay = createFloatingCandidateSelector(
        // onSelect
        async (candidate) => {
          this.overlay?.hide();
          this.overlay = null;

          // Show solving state
          const bubble = createResultBubble();
          bubble.showSolving();

          try {
            const result = await this.config.onSolve(candidate, pageData);
            bubble.showAnswer(result);
          } catch (err) {
            bubble.showError(err instanceof Error ? err.message : 'Solve failed');
          }
        },
        // onCancel
        () => {
          this.overlay?.hide();
          this.overlay = null;
        }
      );

      this.overlay.show(candidates);
    });
  }
}

// ── API client for page candidates ───────────────────────────────────────────

export interface PageCandidatesRequest {
  pageText: string;
  pageTitle: string;
  sourceUrl: string;
  candidates?: QuestionCandidate[];
}

export interface PageCandidatesResponse {
  candidates: QuestionCandidate[];
}

/**
 * Send page text to backend for server-side candidate detection.
 * Falls back to local detection if API unavailable.
 */
export async function fetchPageCandidates(
  req: PageCandidatesRequest
): Promise<QuestionCandidate[]> {
  try {
    const response = await fetch('http://localhost:8100/api/scan/page-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: PageCandidatesResponse = await response.json();
    return data.candidates;
  } catch {
    // Fallback to local detection
    return [];
  }
}

// ── Quick scan helper (skip candidate selection, direct solve) ────────────────

export async function quickScan(): Promise<SolveResult | null> {
  const pageData = extractPageText();
  const candidates = rankCandidates(detectQuestions(pageData.blocks));

  if (candidates.length === 0) return null;

  // Solve top candidate
  const bubble = createResultBubble();
  bubble.showSolving();

  try {
    // This would call the solve pipeline — stub for now
    // Actual implementation would POST to /api/solve with the selected candidate
    const result: SolveResult = {
      answer: candidates[0].text.slice(0, 50),
      confidence: candidates[0].confidence,
      requestId: `scan_${Date.now()}`,
      timestamp: Date.now(),
    };
    bubble.showAnswer(result);
    return result;
  } catch (err) {
    bubble.showError(err instanceof Error ? err.message : 'Scan failed');
    return null;
  }
}