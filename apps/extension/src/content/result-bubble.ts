/**
 * KARÇÖZ Result Bubble — Speed-first minimal UI
 *
 * States: Idle | Capturing | Reading | Solving | AnswerReady | LowConfidence | Error
 *
 * UX principles:
 * - Small, draggable, never blocking
 * - Keyboard accessible (Tab, Enter, Escape)
 * - No hidden mode — always visible when active
 * - Auto-hide only if user explicitly enabled it
 */

import './result-bubble.css';

export type BubbleState = 'idle' | 'capturing' | 'reading' | 'uploading' | 'solving' | 'validating' | 'ready' | 'low' | 'done' | 'error';

export type ProgressState = 'idle' | 'capturing' | 'reading' | 'uploading' | 'solving' | 'validating' | 'done' | 'error';

export interface SolveResult {
  answer: string;
  confidence: number;
  explanation?: string;
  question?: string;
  options?: string[];
  requestId: string;
  timestamp: number;
  progress?: ProgressState;
  progressMessage?: string;
  captureLatencyMs?: number;
  uploadLatencyMs?: number;
  extractionLatencyMs?: number;
  solveLatencyMs?: number;
  validationLatencyMs?: number;
  totalLatencyMs?: number;
}

export interface BubbleConfig {
  autoHideMs?: number;        // 0 = disabled (user preference)
  onDetails?: () => void;
  onSave?: (result: SolveResult) => void;
  onPractice?: () => void;
  onSendToTelegram?: (result: SolveResult) => void;
  onDismiss?: () => void;
}

interface BubblePosition {
  x: number;
  y: number;
}

const DEFAULT_POS: BubblePosition = { x: -1, y: -1 }; // -1 = use CSS default

export class ResultBubble {
  private el: HTMLDivElement | null = null;
  private config: BubbleConfig = {};
  private state: BubbleState = 'idle';
  private currentResult: SolveResult | null = null;
  private pos: BubblePosition = { ...DEFAULT_POS };
  private drag: { active: boolean; startX: number; startY: number; origX: number; origY: number } = {
    active: false, startX: 0, startY: 0, origX: 0, origY: 0,
  };
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private collapsed = false;
  private collapsedPos: BubblePosition = { x: -1, y: -1 };
  private currentProgressMessage: string | undefined = undefined;

  // ── Public API ─────────────────────────────────────────────────────────────

  configure(cfg: BubbleConfig): void {
    this.config = cfg;
  }

  /** Show Capturing state (user drawing selection) */
  showCapturing(): void {
    this.setState('capturing');
    this.render();
  }

  /** Show Reading state (image being processed) */
  showReading(): void {
    this.setState('reading');
    this.render();
  }

  /** Show Progress state (Reading, Uploading, Solving, Validating) */
  showProgress(progressState: ProgressState, message?: string): void {
    this.setState(progressState);
    this.currentProgressMessage = message;
    this.render();
  }

  /** Show Solving state (AI working) */
  showSolving(): void {
    this.setState('solving');
    this.render();
    this.startHideTimer();
  }

  /** Show Done state (final result) */
  showDone(result: SolveResult): void {
    this.currentResult = result;
    const conf = result.confidence;
    this.setState(conf < 0.6 ? 'low' : 'ready');
    this.render();
    this.startHideTimer();
  }

  /** Show Answer Ready */
  showAnswer(result: SolveResult): void {
    this.currentResult = result;
    const conf = result.confidence;
    this.setState(conf < 0.6 ? 'low' : 'ready');
    this.render();
    this.startHideTimer();
  }

  /** Show Error */
  showError(message: string): void {
    this.setState('error');
    this.render(message);
    this.startHideTimer();
  }

  /** Remove bubble from DOM */
  remove(): void {
    this.clearHideTimer();
    this.el?.remove();
    this.el = null;
    this.state = 'idle';
    this.currentResult = null;
  }

  /** Update position after drag */
  getPosition(): BubblePosition {
    return { ...this.pos };
  }

  setPosition(x: number, y: number): void {
    this.pos = { x, y };
    if (this.el) {
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
      this.el.style.left = `${x}px`;
      this.el.style.top = `${y}px`;
    }
  }

  // ── State Management ────────────────────────────────────────────────────────

  private setState(s: BubbleState): void {
    this.state = s;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  private getOrCreate(): HTMLDivElement {
    if (this.el) return this.el;
    this.el = document.createElement('div');
    this.el.className = 'kcz-bubble';
    this.el.id = 'kcz-result-bubble';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'KARÇÖZ Result');
    this.el.setAttribute('tabindex', '-1');
    this.applyPosition();
    document.body.appendChild(this.el);
    this.attachGlobalListeners();
    return this.el;
  }

  private applyPosition(): void {
    if (!this.el) return;
    if (this.pos.x >= 0) {
      this.el.style.left = `${this.pos.x}px`;
      this.el.style.right = 'auto';
    } else {
      this.el.style.right = '24px';
      this.el.style.left = 'auto';
    }
    if (this.pos.y >= 0) {
      this.el.style.top = `${this.pos.y}px`;
      this.el.style.bottom = 'auto';
    } else {
      this.el.style.bottom = '24px';
      this.el.style.top = 'auto';
    }
  }

  private render(errorMessage?: string): void {
    const el = this.getOrCreate();
    el.className = `kcz-bubble kcz-bubble--${this.state}`;
    if (this.collapsed) el.classList.add('kcz-bubble--collapsed');
    if (this.state === 'low') el.classList.add('kcz-bubble--low-confidence');

    el.innerHTML = this.buildHTML(errorMessage);
    this.attachListeners(el);
  }

  private buildHTML(errorMessage?: string): string {
    const stateLabel = this.stateLabel();
    const collapseIcon = this.collapsed ? '▲' : '▼';

    switch (this.state) {
      case 'idle':
        return this.headerHTML(stateLabel, false) + '<div class="kcz-bubble__body"></div>';

      case 'capturing':
        return this.headerHTML(stateLabel, true) + `
          <div class="kcz-bubble__body">
            <div class="kcz-bubble__loading">
              <div class="kcz-bubble__spinner"></div>
              <span class="kcz-bubble__loading-text">Draw area to capture</span>
            </div>
          </div>`;

      case 'reading':
      case 'uploading':
      case 'solving':
      case 'validating':
        return this.headerHTML(stateLabel, true) + `
          <div class="kcz-bubble__body">
            <div class="kcz-bubble__loading">
              <div class="kcz-bubble__spinner"></div>
              <span class="kcz-bubble__loading-text">${this.getProgressText()}</span>
            </div>
          </div>`;

      case 'done':
      case 'ready':
      case 'low':
        return this.headerHTML(stateLabel, true) + this.answerBodyHTML();

      case 'error':
        return this.headerHTML(stateLabel, true) + `
          <div class="kcz-bubble__error">
            ${escapeHtml(errorMessage ?? 'An error occurred')}
          </div>
          <div class="kcz-bubble__actions">
            <button class="kcz-btn" id="kcz-dismiss-btn">Dismiss</button>
          </div>`;

      default:
        return '';
    }
  }

  private headerHTML(stateLabel: string, draggable: boolean): string {
    return `
      <div class="kcz-bubble__header" ${draggable ? '' : ''}>
        <div class="kcz-bubble__logo">KARÇÖZ</div>
        <div class="kcz-bubble__state kcz-bubble__state--${this.state}">${stateLabel}</div>
        <button class="kcz-bubble__collapse-btn" id="kcz-collapse-btn" aria-label="Collapse bubble" title="Collapse">${this.collapsed ? '▲' : '▼'}</button>
      </div>`;
  }

  private answerBodyHTML(): string {
    if (!this.currentResult) return '';
    const conf = Math.round(this.currentResult.confidence * 100);
    const confLow = conf < 60;

    return `
      <div class="kcz-bubble__body">
        <div class="kcz-bubble__answer-label">Answer</div>
        <div class="kcz-bubble__answer">${escapeHtml(this.currentResult.answer)}</div>
        <div class="kcz-bubble__confidence-row">
          <span class="kcz-bubble__confidence-value">${conf}%</span>
          <div class="kcz-bubble__confidence-bar">
            <div class="kcz-bubble__confidence-fill${confLow ? ' kcz-bubble__confidence-fill--low' : ''}"
                 style="width: ${conf}%"></div>
          </div>
        </div>
      </div>
      <div class="kcz-bubble__actions">
        <button class="kcz-btn" id="kcz-details-btn">Details</button>
        <button class="kcz-btn" id="kcz-practice-btn">Practice</button>
        <button class="kcz-btn" id="kcz-telegram-btn">Send to Telegram</button>
        <button class="kcz-btn kcz-btn--primary" id="kcz-save-btn">Save</button>
        <button class="kcz-btn" id="kcz-dismiss-btn">✕</button>
      </div>`;
  }

  private stateLabel(): string {
    switch (this.state) {
      case 'idle': return '';
      case 'capturing': return 'Capturing';
      case 'reading': return 'Reading';
      case 'uploading': return 'Uploading';
      case 'solving': return 'Solving';
      case 'validating': return 'Validating';
      case 'done': return 'Done';
      case 'ready': return 'Ready';
      case 'low': return 'Review';
      case 'error': return 'Error';
      default: return '';
    }
  }

  private getProgressText(): string {
    const labels: Record<ProgressState, string> = {
      capturing: 'Drawing area to capture',
      reading: 'Reading question',
      uploading: 'Uploading image',
      solving: 'Solving',
      validating: 'Validating answer',
      done: 'Complete',
      error: 'Error',
      idle: '',
    };
    const base = this.currentProgressMessage ?? labels[this.state as ProgressState] ?? '';
    if (!base || this.state === 'done' || this.state === 'error') return base;
    return `${base}<span class="kcz-bubble__progress-dot">.</span><span class="kcz-bubble__progress-dot">.</span><span class="kcz-bubble__progress-dot">.</span>`;
  }

  // ── Event Handling ─────────────────────────────────────────────────────────

  private attachListeners(el: HTMLElement): void {
    // Collapse toggle
    el.querySelector('#kcz-collapse-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapse();
    });

    // Details
    el.querySelector('#kcz-details-btn')?.addEventListener('click', () => {
      this.config.onDetails?.();
    });

    // Practice
    el.querySelector('#kcz-practice-btn')?.addEventListener('click', () => {
      this.config.onPractice?.();
    });

    // Send to Telegram
    el.querySelector('#kcz-telegram-btn')?.addEventListener('click', () => {
      if (this.currentResult && this.config.onSendToTelegram) {
        this.config.onSendToTelegram(this.currentResult);
        const btn = el.querySelector('#kcz-telegram-btn') as HTMLButtonElement | null;
        if (btn) {
          btn.textContent = '✓ Sent';
          btn.classList.add('kcz-btn--success');
          btn.disabled = true;
        }
      }
    });

    // Save
    el.querySelector('#kcz-save-btn')?.addEventListener('click', () => {
      if (this.currentResult) {
        this.config.onSave?.(this.currentResult);
        const btn = el.querySelector('#kcz-save-btn') as HTMLButtonElement | null;
        if (btn) {
          btn.textContent = '✓ Saved';
          btn.classList.add('kcz-btn--success');
          btn.disabled = true;
        }
      }
    });

    // Dismiss
    el.querySelector('#kcz-dismiss-btn')?.addEventListener('click', () => {
      this.config.onDismiss?.();
      this.remove();
    });
  }

  private attachGlobalListeners(): void {
    // Drag to move
    const header = this.el?.querySelector('.kcz-bubble__header');
    if (header) {
      header.addEventListener('mousedown', (e: Event) => this.onDragStart(e as MouseEvent));
    }
    document.addEventListener('mousemove', (e: Event) => this.onDragMove(e as MouseEvent));
    document.addEventListener('mouseup', () => this.onDragEnd());

    // Keyboard
    this.el?.addEventListener('keydown', (e: Event) => this.onKeyDown(e as KeyboardEvent));
  }

  private onDragStart(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target.closest('#kcz-collapse-btn')) return;

    this.drag = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: this.el!.offsetLeft,
      origY: this.el!.offsetTop,
    };
    this.el?.classList.add('kcz-bubble--dragging');
    e.preventDefault();
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.drag.active) return;
    const dx = e.clientX - this.drag.startX;
    const dy = e.clientY - this.drag.startY;
    this.el!.style.left = `${this.drag.origX + dx}px`;
    this.el!.style.right = 'auto';
    this.el!.style.top = `${this.drag.origY + dy}px`;
    this.el!.style.bottom = 'auto';
  }

  private onDragEnd(): void {
    if (!this.drag.active) return;
    this.drag.active = false;
    this.el?.classList.remove('kcz-bubble--dragging');

    if (this.el) {
      this.pos = { x: this.el.offsetLeft, y: this.el.offsetTop };
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.config.onDismiss?.();
      this.remove();
    }
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (this.el) {
      this.el.classList.toggle('kcz-bubble--collapsed', this.collapsed);
      const btn = this.el.querySelector('#kcz-collapse-btn');
      if (btn) btn.textContent = this.collapsed ? '▲' : '▼';
    }
  }

  // ── Auto-hide Timer ────────────────────────────────────────────────────────

  private startHideTimer(): void {
    this.clearHideTimer();
    const ms = this.config.autoHideMs ?? 0;
    if (ms <= 0) return;

    this.hideTimer = setTimeout(() => {
      if (this.state === 'ready' || this.state === 'low' || this.state === 'error') {
        this.el?.classList.add('kcz-bubble--auto-hide');
        setTimeout(() => this.remove(), 350);
      }
    }, ms);
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

let _instance: ResultBubble | null = null;

export function getResultBubble(): ResultBubble {
  if (!_instance) {
    _instance = new ResultBubble();
  }
  return _instance;
}

export function createResultBubble(config?: BubbleConfig): ResultBubble {
  if (_instance) {
    _instance.remove();
  }
  _instance = new ResultBubble();
  if (config) _instance.configure(config);
  return _instance;
}

// ── Utilities ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}