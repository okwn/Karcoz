/**
 * KARÇÖZ Extension Settings Panel
 * Allows configuration of API URL and connection testing.
 */

const STORAGE_KEY_API_URL = 'karcoz_api_url';
const STORAGE_KEY_USE_MOCK = 'karcoz_use_mock';
const DEFAULT_API_URL = 'http://localhost:8132';

async function loadSettings(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_API_URL, STORAGE_KEY_USE_MOCK], (items) => {
      const apiUrlInput = document.getElementById('apiBaseUrl') as HTMLInputElement;
      const useMockCheckbox = document.getElementById('useMockApi') as HTMLInputElement;

      if (apiUrlInput) {
        apiUrlInput.value = (items[STORAGE_KEY_API_URL] as string) || DEFAULT_API_URL;
      }
      if (useMockCheckbox) {
        useMockCheckbox.checked = (items[STORAGE_KEY_USE_MOCK] as boolean) ?? false;
      }
      resolve();
    });
  });
}

async function saveApiUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY_API_URL]: url }, resolve);
  });
}

async function saveUseMock(useMock: boolean): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY_USE_MOCK]: useMock }, resolve);
  });
}

async function getStoredToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get('karcoz_extension_token', (items) => {
      resolve(items['karcoz_extension_token'] ?? null);
    });
  });
}

async function saveExtensionToken(token: string): Promise<void> {
  const expiry = Date.now() + 365 * 24 * 60 * 60 * 1000;
  return new Promise((resolve) => {
    chrome.storage.local.set({ karcoz_extension_token: token, karcoz_token_expiry: expiry }, resolve);
  });
}

function showStatus(dotClass: string, text: string): void {
  const statusDiv = document.getElementById('connectionStatus') as HTMLDivElement;
  const dot = document.getElementById('statusDot') as HTMLSpanElement;
  const textEl = document.getElementById('statusText') as HTMLSpanElement;

  if (!statusDiv || !dot || !textEl) return;

  dot.className = `settings__status-dot ${dotClass}`;
  textEl.textContent = text;
  statusDiv.hidden = false;
}

function hideStatus(): void {
  const statusDiv = document.getElementById('connectionStatus') as HTMLDivElement;
  if (statusDiv) statusDiv.hidden = true;
}

async function testConnection(): Promise<void> {
  const apiUrlInput = document.getElementById('apiBaseUrl') as HTMLInputElement;
  const testBtn = document.getElementById('testConnectionBtn') as HTMLButtonElement;
  const btnText = testBtn?.querySelector('.settings__btn-text') as HTMLSpanElement;

  const baseUrl = (apiUrlInput?.value || DEFAULT_API_URL).replace(/\/$/, '');
  const healthUrl = `${baseUrl}/health`;

  if (testBtn) testBtn.disabled = true;
  if (btnText) btnText.textContent = 'Testing…';
  hideStatus();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      showStatus('settings__status-dot--ok', `Connected — ${data.status ?? 'OK'}`);
    } else {
      showStatus('settings__status-dot--err', `Error: HTTP ${response.status}`);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      showStatus('settings__status-dot--err', 'Request timed out (5s)');
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      showStatus('settings__status-dot--err', `Failed: ${msg}`);
    }
  } finally {
    if (testBtn) testBtn.disabled = false;
    if (btnText) btnText.textContent = 'Test API Connection';
  }
}

async function clearToken(): Promise<void> {
  if (!confirm('Disconnect your account? This will require logging in again.')) return;

  return new Promise((resolve) => {
    chrome.storage.local.remove(['karcoz_extension_token', 'karcoz_token_expiry'], resolve);
  });
}

async function updateTokenStatus(): Promise<void> {
  const token = await getStoredToken();
  const tokenValueEl = document.getElementById('tokenStatus');
  const clearBtn = document.getElementById('clearTokenBtn') as HTMLButtonElement;

  if (tokenValueEl) {
    tokenValueEl.textContent = token ? `Connected (${token.slice(0, 12)}…)` : 'Not connected';
  }
  if (clearBtn) {
    clearBtn.hidden = !token;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await updateTokenStatus();

  // Save API URL on change
  const apiUrlInput = document.getElementById('apiBaseUrl') as HTMLInputElement;
  apiUrlInput?.addEventListener('change', async () => {
    await saveApiUrl(apiUrlInput.value);
  });

  // Save mock checkbox on change
  const useMockCheckbox = document.getElementById('useMockApi') as HTMLInputElement;
  useMockCheckbox?.addEventListener('change', async () => {
    await saveUseMock(useMockCheckbox.checked);
  });

  // Test connection button
  const testBtn = document.getElementById('testConnectionBtn') as HTMLButtonElement;
  testBtn?.addEventListener('click', testConnection);

  // Save token button
  const saveTokenBtn = document.getElementById('saveTokenBtn') as HTMLButtonElement;
  const tokenInput = document.getElementById('extensionTokenInput') as HTMLInputElement;
  saveTokenBtn?.addEventListener('click', async () => {
    const token = tokenInput?.value.trim();
    if (!token) {
      showStatus('settings__status-dot--err', 'Please enter a token');
      return;
    }
    await saveExtensionToken(token);
    await updateTokenStatus();
    showStatus('settings__status-dot--ok', 'Token saved successfully');
  });

  // Open dashboard link
  const openDashboardLink = document.getElementById('openDashboardLink') as HTMLAnchorElement;
  openDashboardLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'http://localhost:3100/login?extension=true' });
  });

  // Clear token button
  const clearBtn = document.getElementById('clearTokenBtn') as HTMLButtonElement;
  clearBtn?.addEventListener('click', async () => {
    await clearToken();
    await updateTokenStatus();
    showStatus('settings__status-dot--warn', 'Account disconnected');
  });
});