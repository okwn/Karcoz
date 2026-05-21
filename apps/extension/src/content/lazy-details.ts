import type { SolveResult } from '../lib/message-types';

export async function loadDetails(requestId: string): Promise<void> {
  // Dynamically import the side panel logic
  const { getLastResult } = await import('../lib/extension-storage');
  const result = await getLastResult();

  if (!result) {
    // Fetch from API if not in storage
    const response = await fetch(`http://localhost:8100/api/questions/${requestId}`);
    if (!response.ok) return;
    const question = await response.json();
    // Store for side panel to pick up
    await import('../lib/extension-storage').then(m => m.setLastResult({
      answer: question.shortAnswer,
      confidence: question.confidenceScore,
      explanation: question.fullExplanation,
      requestId: question.id,
      timestamp: Date.now(),
    } as SolveResult));
    return;
  }

  // Result already in storage — side panel will pick it up
}

export async function openDetailsLazy(requestId?: string): Promise<void> {
  // If requestId provided, fetch the explanation in background first
  if (requestId) {
    loadDetails(requestId).catch(() => {});
  }

  // Open side panel
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    await chrome.sidePanel.open({ windowId: -1 });
  }
}