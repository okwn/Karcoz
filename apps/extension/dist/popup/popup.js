interface StatusResponse {
  studyMode: { enabled: boolean };
  apiUrl?: string;
  apiConnected?: boolean;
  apiError?: string;
}

interface ActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function sendMessage(action: string, payload?: unknown): Promise<ActionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, payload }, (response) => {
      resolve(response);
    });
  });
}

async function checkApiHealth(): Promise<{ connected: boolean; error?: string }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['karcoz_api_url', 'karcoz_use_mock'], (items) => {
      const useMock = items['karcoz_use_mock'] as boolean | undefined;
      if (useMock === true) {
        resolve({ connected: false, error: 'Mock mode enabled' });
        return;
      }
      const baseUrl = (items['karcoz_api_url'] as string | undefined) || 'http://localhost:8132';
      const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      fetch(healthUrl, { signal: controller.signal })
        .then((res) => {
          clearTimeout(timeoutId);
          resolve({ connected: res.ok });
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          const msg = err instanceof DOMException && err.name === 'AbortError'
            ? 'Request timed out'
            : err instanceof Error ? err.message : String(err);
          resolve({ connected: false, error: msg });
        });
    });
  });
}

async function updateStatus(): Promise<void> {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const studyModeToggle = document.getElementById('studyModeToggle');
  const apiBadge = document.getElementById('apiBadge');
  const apiBadgeText = document.getElementById('apiBadgeText');

  if (!statusDot || !statusText || !studyModeToggle) return;

  const response = await sendMessage('GET_STATUS');
  const data = response.data as StatusResponse | undefined;
  const enabled = data?.studyMode?.enabled ?? false;

  statusDot.classList.toggle('popup__status-dot--active', enabled);
  statusText.textContent = enabled ? 'Study Mode On' : 'Ready';
  studyModeToggle.classList.toggle('popup__toggle-switch--active', enabled);
  studyModeToggle.setAttribute('aria-checked', String(enabled));

  // API connection status
  if (apiBadge && apiBadgeText) {
    const health = await checkApiHealth();
    if (health.connected) {
      apiBadge.className = 'popup__api-badge popup__api-badge--ok';
      apiBadgeText.textContent = 'API: Connected';
    } else if (health.error === 'Mock mode enabled') {
      apiBadge.className = 'popup__api-badge popup__api-badge--warn';
      apiBadgeText.textContent = 'API: Mock';
    } else {
      apiBadge.className = 'popup__api-badge popup__api-badge--err';
      apiBadgeText.textContent = 'API: Not configured';
    }
  }
}

async function toggleStudyMode(): Promise<void> {
  await sendMessage('TOGGLE_STUDY_MODE');
  await updateStatus();
}

async function captureArea(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  chrome.tabs.sendMessage(tab.id, { action: 'START_CAPTURE_MODE', mode: 'area' });
  window.close();
}

async function scanPage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;

  const response = await sendMessage('SCAN_PAGE', { tabId: tab.id });
  if (response.success) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'SHOW_RESULT',
      payload: response.data,
    });
  }
  window.close();
}

async function openDetails(): Promise<void> {
  await sendMessage('OPEN_DETAILS');
  window.close();
}

async function openHistory(): Promise<void> {
  await sendMessage('OPEN_HISTORY');
  window.close();
}

async function openSettings(): Promise<void> {
  await sendMessage('OPEN_SETTINGS');
  window.close();
}

document.addEventListener('DOMContentLoaded', async () => {
  await updateStatus();

  const studyModeToggle = document.getElementById('studyModeToggle');
  const captureBtn = document.getElementById('captureBtn');
  const scanBtn = document.getElementById('scanBtn');
  const detailsBtn = document.getElementById('detailsBtn');
  const historyBtn = document.getElementById('historyBtn');
  const settingsBtn = document.getElementById('settingsBtn');

  studyModeToggle?.addEventListener('click', toggleStudyMode);
  studyModeToggle?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleStudyMode();
    }
  });

  captureBtn?.addEventListener('click', captureArea);
  scanBtn?.addEventListener('click', scanPage);
  detailsBtn?.addEventListener('click', openDetails);
  historyBtn?.addEventListener('click', openHistory);
  settingsBtn?.addEventListener('click', openSettings);
});