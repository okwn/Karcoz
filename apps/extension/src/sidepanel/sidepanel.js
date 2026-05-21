/**
 * KARÇÖZ Side Panel — Details view for captured questions
 * Lazy-loaded only when user clicks "Details" in result bubble
 */

interface SolveResult {
  answer: string;
  confidence: number;
  explanation?: string;
  question?: string;
  options?: string[];
  timestamp: number;
  requestId: string;
  validationNotes?: string;
  subject?: string;
  topic?: string;
}

interface HistoryEntry {
  result: SolveResult;
  savedAt: number;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderResult(container: HTMLElement, result: SolveResult): void {
  const conf = Math.round(result.confidence * 100);
  const confClass = conf < 60 ? 'badge--warn' : conf < 80 ? 'badge--mid' : 'badge--ok';

  container.innerHTML = `
    <div class="sp-result">
      <!-- Meta header -->
      <div class="sp-result__meta">
        <span class="sp-badge ${confClass}">${conf}%</span>
        ${result.subject ? `<span class="sp-badge">${escapeHtml(result.subject)}</span>` : ''}
        ${result.topic ? `<span class="sp-badge">${escapeHtml(result.topic)}</span>` : ''}
      </div>

      <!-- Question section -->
      ${result.question ? `
      <div class="sp-section">
        <div class="sp-section__title">Question</div>
        <div class="sp-section__body">${escapeHtml(result.question)}</div>
      </div>
      ` : ''}

      <!-- Options section -->
      ${result.options?.length ? `
      <div class="sp-section">
        <div class="sp-section__title">Options</div>
        <div class="sp-options">
          ${result.options.map((opt, i) => {
            const label = String.fromCharCode(65 + i); // A, B, C, D
            const isAnswer = opt.trim().toUpperCase() === result.answer.trim().toUpperCase();
            return `
            <div class="sp-option${isAnswer ? ' sp-option--answer' : ''}">
              <span class="sp-option__label">${label}</span>
              <span class="sp-option__text">${escapeHtml(opt)}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Answer -->
      <div class="sp-section">
        <div class="sp-section__title">Answer</div>
        <div class="sp-answer">${escapeHtml(result.answer)}</div>
      </div>

      <!-- Explanation -->
      <div class="sp-section">
        <div class="sp-section__title">Explanation</div>
        <div class="sp-explanation">${escapeHtml(result.explanation || 'No explanation available')}</div>
      </div>

      <!-- Validation notes -->
      ${result.validationNotes ? `
      <div class="sp-section">
        <div class="sp-section__title">Validation Notes</div>
        <div class="sp-validation">${escapeHtml(result.validationNotes)}</div>
      </div>
      ` : ''}

      <!-- Timestamp -->
      <div class="sp-result__time">${formatTimestamp(result.timestamp)}</div>

      <!-- Actions -->
      <div class="sp-actions">
        <button class="sp-btn" id="sp-copy-btn">Copy Answer</button>
        <button class="sp-btn sp-btn--accent" id="sp-practice-btn">Practice Similar</button>
        <button class="sp-btn" id="sp-history-btn">History</button>
        <button class="sp-btn" id="sp-new-btn">New Capture</button>
      </div>
    </div>
  `;

  // Copy answer
  container.querySelector('#sp-copy-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(result.answer);
    const btn = container.querySelector('#sp-copy-btn') as HTMLButtonElement;
    if (btn) { btn.textContent = '✓ Copied'; btn.disabled = true; }
    setTimeout(() => { if (btn) { btn.textContent = 'Copy Answer'; btn.disabled = false; } }, 1500);
  });

  // Practice similar
  container.querySelector('#sp-practice-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'PRACTICE_SIMILAR', payload: { requestId: result.requestId } });
  });

  // History
  container.querySelector('#sp-history-btn')?.addEventListener('click', () => {
    renderHistory(container);
  });

  // New capture
  container.querySelector('#sp-new-btn')?.addEventListener('click', () => window.close());
}

function renderHistory(container: HTMLElement): void {
  chrome.storage.local.get('history', (item) => {
    const history: HistoryEntry[] = item.history ?? [];
    if (history.length === 0) {
      container.innerHTML = `
        <div class="sp-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z"/>
          </svg>
          <p>No history yet</p>
          <span>Saved captures will appear here</span>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="sp-history">
        <div class="sp-history__header">
          <span class="sp-history__title">History</span>
          <button class="sp-btn sp-btn--sm" id="sp-back-btn">← Back</button>
        </div>
        ${history.reverse().map((entry, i) => {
          const conf = Math.round(entry.result.confidence * 100);
          return `
          <div class="sp-history__item" data-index="${history.length - 1 - i}">
            <div class="sp-history__item-header">
              <span class="sp-badge sp-badge--${conf < 60 ? 'warn' : 'ok'}">${conf}%</span>
              <span class="sp-history__item-time">${formatTimestamp(entry.savedAt)}</span>
            </div>
            <div class="sp-history__item-question">${escapeHtml(entry.result.question?.slice(0, 80) ?? entry.result.answer)}</div>
            <div class="sp-history__item-answer">${escapeHtml(entry.result.answer)}</div>
          </div>`;
        }).join('')}
      </div>`;

    // Back button
    container.querySelector('#sp-back-btn')?.addEventListener('click', () => {
      loadLastResult(container);
    });

    // Click history item
    container.querySelectorAll('.sp-history__item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index') ?? '0', 10);
        const entry = history[history.length - 1 - idx];
        if (entry) renderResult(container, entry.result);
      });
    });
  });
}

function loadLastResult(container: HTMLElement): void {
  chrome.storage.local.get('lastResult', (item) => {
    if (item.lastResult) {
      renderResult(container, item.lastResult as SolveResult);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const content = document.getElementById('content');
  if (content) loadLastResult(content);
});