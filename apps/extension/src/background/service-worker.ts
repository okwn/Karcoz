import { routeMessage, registerRoute } from './message-router';
import { handleCaptureMessage, getCaptureController } from './capture-controller';
import { getStudyMode, setStudyMode, addToHistory, clearHistory, setLastResult, type HistoryEntry } from '../lib/extension-storage';
import type { ExtensionMessage, SolveResult, StudyModeState } from '../lib/message-types';
import { getExtensionToken, setExtensionToken, clearExtensionToken } from '../lib/api-client';

// ── Route handlers ────────────────────────────────────────────────────────────

const handleStudyModeToggle = async (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
  const current = await getStudyMode();
  const newState: StudyModeState = {
    enabled: !current.enabled,
    tabId: sender.tab?.id,
  };
  await setStudyMode(newState);

  if (sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'STUDY_MODE_CHANGED',
      payload: newState,
    });
  }

  return newState;
};

const handleGetStatus = async () => {
  return { studyMode: await getStudyMode() };
};

const handleOpenDetails = async (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
  const requestId = (message.payload as { requestId?: string })?.requestId;

  // Lazily fetch explanation before opening side panel
  if (requestId) {
    const { loadDetails } = await import('../content/lazy-details');
    loadDetails(requestId).catch(() => {});
  }

  if (sender.tab?.id) {
    await chrome.sidePanel.open({ tabId: sender.tab.id });
  } else {
    await chrome.sidePanel.open({ windowId: -1 });
  }
  return { opened: true };
};

const handleSaveResult = async (message: ExtensionMessage) => {
  const payload = message.payload as { requestId?: string; result?: SolveResult } | undefined;

  if (payload?.result) {
    await addToHistory(payload.result);
  }

  return { saved: true, requestId: payload?.requestId };
};

const handleOpenHistory = async (_message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
  if (sender.tab?.id) {
    await chrome.sidePanel.open({ tabId: sender.tab.id });
  } else {
    await chrome.sidePanel.open({ windowId: -1 });
  }
  return { opened: true };
};

const handleOpenSettings = async (_message: ExtensionMessage) => {
  // Open settings as a new tab since side panel navigation is limited
  await chrome.tabs.create({ url: 'popup/settings.html' });
  return { opened: true };
};

const handleGetHistory = async () => {
  const { getHistory } = await import('../lib/extension-storage');
  return { history: await getHistory() };
};

const handleClearHistory = async () => {
  await clearHistory();
  return { cleared: true };
};

const handleDeleteAllData = async () => {
  await clearHistory();
  const { clearLastResult } = await import('../lib/extension-storage');
  await clearLastResult();
  return { deleted: true };
};

const handleGetSettings = async () => {
  const { getSettings } = await import('../lib/extension-storage');
  return { settings: await getSettings() };
};

const handleUpdateSettings = async (message: ExtensionMessage) => {
  const { setSettings } = await import('../lib/extension-storage');
  await setSettings(message.payload as Record<string, unknown>);
  return { updated: true };
};

const handleProgressUpdate = async (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
  const payload = message.payload as { progress?: string; progressMessage?: string; requestId?: string } | undefined;
  if (sender.tab?.id && payload) {
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'PROGRESS_UPDATE',
      payload,
    });
  }
  return { received: true };
};

// ── Auth helpers ────────────────────────────────────────────────────────────────

// Service workers cannot access the DOM — open the login page in a new tab instead.
export function showExtensionLogin(): void {
  chrome.tabs.create({ url: 'http://localhost:3100/login?extension=true' });
}

// Handle extension auth check on startup
export async function checkExtensionAuth(): Promise<void> {
  const token = await getExtensionToken();
  if (!token) {
    // Show login UI after a short delay to let the extension finish loading
    setTimeout(() => showExtensionLogin(), 500);
  }
}

// Store token after magic link verification
export async function handleExtensionAuthVerify(token: string): Promise<void> {
  await setExtensionToken(token);
}

// ── Register routes ───────────────────────────────────────────────────────────

registerRoute('CAPTURE_AREA', handleCaptureMessage);
registerRoute('SCAN_PAGE', handleCaptureMessage);
registerRoute('SCAN_PAGE_CANDIDATES', async (message, sender) => {
  const controller = getCaptureController();
  const tabId = sender.tab?.id;
  if (!tabId) throw new Error('No tab ID available');
  // For candidate selection: send text data to solve endpoint
  const payload = message.payload as { candidateId?: string; pageData?: { pageText: string; title?: string } };
  if (payload?.pageData?.pageText) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { apiClient } = await import('../lib/api-client');
    const result = await apiClient.solve({
      imageData: payload.pageData.pageText,
      mode: 'page',
    }, requestId);
    await setLastResult(result);
    return result;
  }
  return controller.scanPage(tabId, true);
});
registerRoute('TOGGLE_STUDY_MODE', handleStudyModeToggle);
registerRoute('GET_STATUS', handleGetStatus);
registerRoute('OPEN_DETAILS', handleOpenDetails);
registerRoute('SAVE_RESULT', handleSaveResult);
registerRoute('OPEN_HISTORY', handleOpenHistory);
registerRoute('OPEN_SETTINGS', handleOpenSettings);
registerRoute('GET_HISTORY', handleGetHistory);
registerRoute('CLEAR_HISTORY', handleClearHistory);
registerRoute('DELETE_ALL_DATA', handleDeleteAllData);
registerRoute('SAVE', handleSaveResult);
registerRoute('GET_SETTINGS', handleGetSettings);
registerRoute('UPDATE_SETTINGS', handleUpdateSettings);
registerRoute('PROGRESS_UPDATE', handleProgressUpdate);

// ── Message listener ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  routeMessage(message, sender)
    .then((result) => sendResponse({ success: true, data: result }))
    .catch((error) => sendResponse({ success: false, error: error.message }));

  return true;
});

// ── Startup auth check ─────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  checkExtensionAuth();
});

// Also check on startup (service worker can be woken up)
checkExtensionAuth();