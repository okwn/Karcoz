/**
 * KARÇÖZ Result Bubble Controller
 *
 * Orchestrates the result bubble lifecycle:
 * Idle → Capturing → Reading → Solving → AnswerReady/LowConfidence/Error
 *
 * Responsibilities:
 * - Coordinates bubble state transitions
 * - Handles auto-hide based on user settings
 * - Manages the single bubble instance
 * - Wires up callbacks (details, save, practice, dismiss)
 */

import { ResultBubble, type BubbleState, type SolveResult, createResultBubble } from './result-bubble';

export interface BubbleControllerConfig {
  autoHideMs?: number;
  onOpenDetails?: (result: SolveResult) => void;
  onSave?: (result: SolveResult) => void;
  onPractice?: (result: SolveResult) => void;
}

export class ResultBubbleController {
  private bubble: ResultBubble;
  private config: BubbleControllerConfig = {};

  constructor(config?: BubbleControllerConfig) {
    this.bubble = createResultBubble();
    this.config = config ?? {};
    this.wireCallbacks();
  }

  private wireCallbacks(): void {
    this.bubble.configure({
      autoHideMs: this.config.autoHideMs ?? 8000,
      onDetails: () => {
        if (this.bubble['currentResult']) {
          this.config.onOpenDetails?.(this.bubble['currentResult']);
        }
      },
      onSave: (result) => {
        this.config.onSave?.(result);
        this.pulseSave();
      },
      onPractice: () => {
        if (this.bubble['currentResult']) {
          this.config.onPractice?.(this.bubble['currentResult']);
        }
      },
      onDismiss: () => {
        this.bubble.remove();
      },
    });
  }

  private pulseSave(): void {
    // Save animation feedback is handled inside bubble via DOM
  }

  // ── State transitions ──────────────────────────────────────────────────────

  startCapture(): void {
    this.bubble.showCapturing();
  }

  finishCapture(): void {
    this.bubble.showReading();
  }

  startSolving(): void {
    this.bubble.showSolving();
  }

  showAnswer(result: SolveResult): void {
    this.bubble.showAnswer(result);
  }

  showError(message: string): void {
    this.bubble.showError(message);
  }

  // ── Manual control ─────────────────────────────────────────────────────────

  remove(): void {
    this.bubble.remove();
  }

  setPosition(x: number, y: number): void {
    this.bubble.setPosition(x, y);
  }

  getState(): BubbleState {
    return this.bubble['state'];
  }

  reconfigure(config: BubbleControllerConfig): void {
    this.config = { ...this.config, ...config };
    this.wireCallbacks();
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let _controller: ResultBubbleController | null = null;

export function getBubbleController(config?: BubbleControllerConfig): ResultBubbleController {
  if (!_controller) {
    _controller = new ResultBubbleController(config);
  }
  return _controller;
}

export function resetBubbleController(config?: BubbleControllerConfig): void {
  _controller?.remove();
  _controller = new ResultBubbleController(config);
}