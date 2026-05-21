/**
 * KARÇÖZ Question Candidate Overlay
 *
 * Shows highlighted candidate regions on the page.
 * User clicks to select one before solving.
 *
 * Safety: always visible, never hides content, keyboard accessible.
 */

import type { QuestionCandidate } from './question-detector';
import './question-candidate-overlay.css';

export interface CandidateOverlayConfig {
  onSelect: (candidate: QuestionCandidate) => void;
  onCancel: () => void;
}

export interface CandidateOverlay {
  show(candidates: QuestionCandidate[]): void;
  hide(): void;
}

/**
 * Renders candidate highlights on the page and handles selection
 */
export function createCandidateOverlay(config: CandidateOverlayConfig): CandidateOverlay {
  let container: HTMLDivElement | null = null;
  let candidates: QuestionCandidate[] = [];
  let selectedId: string | null = null;

  function createContainer(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'kcz-cand-overlay';
    el.setAttribute('role', 'listbox');
    el.setAttribute('aria-label', 'Select a question to solve');
    document.body.appendChild(el);
    return el;
  }

  function clearHighlights(): void {
    container?.querySelectorAll('.kcz-cand-item').forEach(el => {
      el.classList.remove('kcz-cand-item--selected', 'kcz-cand-item--hovered');
    });
  }

  function render(): void {
    if (!container) return;
    container.innerHTML = '';
    container.innerHTML = `
      <div class="kcz-cand-header">
        <div class="kcz-cand-logo">KARÇÖZ</div>
        <span class="kcz-cand-title">${candidates.length} question${candidates.length !== 1 ? 's' : ''} found — click to select</span>
        <button class="kcz-cand-cancel" id="kcz-cand-cancel">✕ Cancel</button>
      </div>
      <div class="kcz-cand-list">
        ${candidates.map(c => `
          <div class="kcz-cand-item" data-id="${c.id}" role="option" tabindex="0"
               aria-selected="${selectedId === c.id}">
            <div class="kcz-cand-item__rank">${candidates.indexOf(c) + 1}</div>
            <div class="kcz-cand-item__content">
              <div class="kcz-cand-item__text">${escapeHtml(c.text.slice(0, 120))}${c.text.length > 120 ? '...' : ''}</div>
              ${c.options.length > 0 ? `<div class="kcz-cand-item__options">${c.options.length} options</div>` : ''}
            </div>
            <div class="kcz-cand-item__conf">
              <span class="kcz-cand-item__conf-val">${Math.round(c.confidence * 100)}%</span>
              <div class="kcz-cand-item__conf-bar">
                <div class="kcz-cand-item__conf-fill" style="width: ${c.confidence * 100}%"></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Attach events
    container.querySelector('#kcz-cand-cancel')?.addEventListener('click', () => {
      config.onCancel();
      container?.remove();
      container = null;
    });

    container.querySelectorAll('.kcz-cand-item').forEach((el) => {
      const id = el.getAttribute('data-id') ?? '';

      el.addEventListener('click', () => {
        selectCandidate(id);
      });

      el.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          selectCandidate(id);
        }
      });

      el.addEventListener('mouseenter', () => {
        el.classList.add('kcz-cand-item--hovered');
      });

      el.addEventListener('mouseleave', () => {
        el.classList.remove('kcz-cand-item--hovered');
      });
    });
  }

  function selectCandidate(id: string): void {
    selectedId = id;
    clearHighlights();
    container?.querySelector(`[data-id="${id}"]`)?.classList.add('kcz-cand-item--selected');

    const candidate = candidates.find(c => c.id === id);
    if (candidate) {
      config.onSelect(candidate);
    }
  }

  return {
    show(cands: QuestionCandidate[]): void {
      candidates = cands;
      selectedId = null;
      container = createContainer();
      render();
    },

    hide(): void {
      container?.remove();
      container = null;
      candidates = [];
      selectedId = null;
    },
  };
}

/**
 * Create a simple floating candidate selector
 * Shows numbered badges on the page that user can click
 */
export function createFloatingCandidateSelector(
  onSelect: (candidate: QuestionCandidate) => void,
  onCancel: () => void
): CandidateOverlay {
  let markers: HTMLDivElement[] = [];
  let candidates: QuestionCandidate[] = [];
  let selectedId: string | null = null;
  let panel: HTMLDivElement | null = null;

  function createPanel(): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'kcz-cand-panel';
    el.innerHTML = `
      <div class="kcz-cand-panel__header">
        <span class="kcz-cand-panel__logo">KARÇÖZ</span>
        <span class="kcz-cand-panel__title">${candidates.length} questions found</span>
      </div>
      <div class="kcz-cand-panel__list" id="kcz-cand-panel-list"></div>
      <div class="kcz-cand-panel__footer">
        <button class="kcz-cand-panel__cancel" id="kcz-cand-panel-cancel">Cancel</button>
      </div>
    `;

    el.querySelector('#kcz-cand-panel-cancel')?.addEventListener('click', () => {
      onCancel();
      hide();
    });

    document.body.appendChild(el);
    return el;
  }

  function renderMarkers(): void {
    for (const candidate of candidates) {
      if (!candidate.boundingHint) continue;

      const marker = document.createElement('div');
      marker.className = 'kcz-cand-marker';
      marker.dataset.id = candidate.id;

      const index = candidates.indexOf(candidate) + 1;
      marker.textContent = String(index);

      marker.style.top = `${candidate.boundingHint.top + candidate.boundingHint.height / 2}px`;
      marker.style.left = `${candidate.boundingHint.left + candidate.boundingHint.width / 2}px`;

      marker.addEventListener('click', () => selectCandidate(candidate.id));
      document.body.appendChild(marker);
      markers.push(marker);
    }
  }

  function renderList(): void {
    const listEl = panel?.querySelector('#kcz-cand-panel-list');
    if (!listEl) return;

    listEl.innerHTML = candidates.map((c, i) => `
      <div class="kcz-cand-panel__item" data-id="${c.id}" role="option" tabindex="0">
        <span class="kcz-cand-panel__num">${i + 1}</span>
        <span class="kcz-cand-panel__text">${escapeHtml(c.text.slice(0, 80))}${c.text.length > 80 ? '...' : ''}</span>
        <span class="kcz-cand-panel__conf">${Math.round(c.confidence * 100)}%</span>
      </div>
    `).join('');

    listEl.querySelectorAll('.kcz-cand-panel__item').forEach(el => {
      el.addEventListener('click', () => selectCandidate(el.getAttribute('data-id') ?? ''));
      el.addEventListener('keydown', (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          selectCandidate(el.getAttribute('data-id') ?? '');
        }
      });
    });
  }

  function selectCandidate(id: string): void {
    selectedId = id;

    // Mark selected
    panel?.querySelectorAll('.kcz-cand-panel__item').forEach(el => {
      el.classList.toggle('kcz-cand-panel__item--selected', el.getAttribute('data-id') === id);
    });

    markers.forEach(m => {
      m.classList.toggle('kcz-cand-marker--selected', m.dataset.id === id);
    });

    const candidate = candidates.find(c => c.id === id);
    if (candidate) {
      onSelect(candidate);
    }
  }

  function hide(): void {
    panel?.remove();
    panel = null;
    markers.forEach(m => m.remove());
    markers = [];
    candidates = [];
    selectedId = null;
  }

  return {
    show(cands: QuestionCandidate[]): void {
      candidates = cands;
      selectedId = null;
      panel = createPanel();
      renderList();
      renderMarkers();
    },

    hide(): void {
      hide();
    },
  };
}

function escapeHtml(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}