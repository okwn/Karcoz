export interface PageScanIndicator {
  show(): void;
  hide(): void;
}

function createIndicator(): HTMLDivElement {
  const indicator = document.createElement('div');
  indicator.className = 'kcz-page-scan-indicator';
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', 'Scanning page');
  indicator.innerHTML = `
    <svg class="kcz-scan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 21V9"/>
    </svg>
    <span class="kcz-scan-text">Scanning visible page...</span>
  `;
  return indicator;
}

export function createPageScanIndicator(): PageScanIndicator {
  let indicator: HTMLDivElement | null = null;

  return {
    show(): void {
      if (indicator) return;
      indicator = createIndicator();
      document.body.appendChild(indicator);
    },

    hide(): void {
      indicator?.remove();
      indicator = null;
    },
  };
}