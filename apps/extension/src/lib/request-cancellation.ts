// Tracks the current in-flight request and cancels it on new capture
let currentRequestId: string | null = null;
let currentAbortController: AbortController | null = null;

export function startRequest(requestId: string): AbortController {
  // Cancel any previous in-flight request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentRequestId = requestId;
  currentAbortController = new AbortController();
  return currentAbortController;
}

export function getCurrentRequestId(): string | null {
  return currentRequestId;
}

export function cancelCurrentRequest(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    currentRequestId = null;
  }
}

export function clearRequest(): void {
  currentAbortController = null;
  currentRequestId = null;
}