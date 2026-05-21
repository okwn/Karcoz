/**
 * KARÇÖZ Dashboard API Client
 * Shared fetch wrapper with auth, error handling, and credentials.
 */

const API_BASE = window.API_BASE || 'http://localhost:8100/api';

class ApiError extends Error {
  constructor(status, code, message, requestId) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const defaults = {
    credentials: 'include', // send session cookie
    headers: { 'Content-Type': 'application/json' },
  };
  const config = { ...defaults, ...options };

  let res;
  try {
    res = await fetch(url, config);
  } catch (networkErr) {
    throw new ApiError(0, 'NETWORK_ERROR', `Network error: ${networkErr.message}`);
  }

  // 401 → redirect to login
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired — redirecting to login');
  }

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const code = body?.error?.code ?? `HTTP_${res.status}`;
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    const requestId = body?.error?.requestId;
    throw new ApiError(res.status, code, message, requestId);
  }

  return body;
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function getSession() {
  return apiFetch('/auth/session');
}

async function sendMagicLink(email, type = 'login') {
  return apiFetch('/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email, type }),
  });
}

async function verifyMagicLink(token) {
  return apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

async function logout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

// ── User ───────────────────────────────────────────────────────────────────────

async function getUserSettings() {
  return apiFetch('/users/me/settings');
}

async function updateUserSettings(data) {
  return apiFetch('/users/me/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function exportUserData() {
  return apiFetch('/users/me/export');
}

async function deleteAllHistory() {
  return apiFetch('/users/me/history', { method: 'DELETE' });
}

async function deleteAccount() {
  return apiFetch('/users/me', { method: 'DELETE' });
}

// ── Questions ────────────────────────────────────────────────────────────────

async function getQuestionHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/questions/history?${qs}`);
}

async function getQuestion(id) {
  return apiFetch(`/questions/${id}`);
}

async function saveQuestion(id, data) {
  return apiFetch(`/questions/${id}/save`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

async function getOverview() {
  return apiFetch('/analytics/overview');
}

async function getWeakTopics() {
  return apiFetch('/analytics/weak-topics');
}

// ── Practice ──────────────────────────────────────────────────────────────────

async function generatePracticeSet(data) {
  return apiFetch('/practice/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function getPracticeSets() {
  return apiFetch('/practice/sets');
}

async function getPracticeSet(id) {
  return apiFetch(`/practice/sets/${id}`);
}

async function submitPracticeAttempt(setId, answers, timeSpentMs) {
  return apiFetch(`/practice/sets/${setId}/attempt`, {
    method: 'POST',
    body: JSON.stringify({ answers, timeSpentMs }),
  });
}

async function getRecommendedPractice() {
  return apiFetch('/practice/recommended');
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function getTelegramStatus() {
  return apiFetch('/telegram/status');
}

async function linkTelegramAccount(telegramChatId, telegramUsername, displayName) {
  return apiFetch('/telegram/link-account', {
    method: 'POST',
    body: JSON.stringify({ telegramChatId, telegramUsername, displayName }),
  });
}

async function unlinkTelegramAccount(telegramChatId) {
  return apiFetch('/telegram/unlink-account', {
    method: 'POST',
    body: JSON.stringify({ telegramChatId }),
  });
}

// ── Billing ───────────────────────────────────────────────────────────────────

async function getBillingPlan() {
  return apiFetch('/billing/plan');
}

async function getBillingUsage() {
  return apiFetch('/billing/usage');
}

async function cancelBilling() {
  return apiFetch('/billing/cancel', { method: 'POST' });
}

// ── Auth guard ────────────────────────────────────────────────────────────────

/**
 * Call this at the top of each page's init function.
 * Redirects to /login if the user is not authenticated.
 */
async function requireAuth() {
  try {
    await getSession();
    return true;
  } catch (err) {
    if (err.status === 401) {
      window.location.href = '/login';
      return false;
    }
    throw err;
  }
}

// ── UI helpers (reusable across pages) ────────────────────────────────────────

function showToast(message, type = 'info') {
  const id = 'toast-' + Date.now();
  const colours = { info: 'var(--accent)', error: 'var(--danger)', warn: 'var(--warn)' };
  const colour = colours[type] ?? colours.info;
  const toast = document.createElement('div');
  toast.id = id;
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;padding:10px 16px;background:var(--surface);border:1px solid ${colour};border-left:3px solid ${colour};border-radius:var(--radius);font-size:11px;color:var(--text);z-index:9999;animation:toastIn 0.2s ease`;
  toast.textContent = message;
  document.body.appendChild(toast);
  const style = document.createElement('style');
  style.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

function escapeHtml(t) {
  if (!t && t !== 0) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function showLoading(el) {
  if (el) { el.style.display = 'flex'; }
}

function hideLoading(el) {
  if (el) { el.style.display = 'none'; }
}

function showErrorBanner(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function hideErrorBanner(el) {
  if (el) { el.style.display = 'none'; }
}

window.KARCOZ = {
  apiFetch,
  ApiError,
  requireAuth,
  showToast,
  escapeHtml,
  formatDate,
  showLoading,
  hideLoading,
  showErrorBanner,
  hideErrorBanner,
  getSession,
  sendMagicLink,
  verifyMagicLink,
  logout,
  getUserSettings,
  updateUserSettings,
  exportUserData,
  deleteAllHistory,
  deleteAccount,
  getQuestionHistory,
  getQuestion,
  saveQuestion,
  getOverview,
  getWeakTopics,
  generatePracticeSet,
  getPracticeSets,
  getPracticeSet,
  submitPracticeAttempt,
  getRecommendedPractice,
  getTelegramStatus,
  linkTelegramAccount,
  unlinkTelegramAccount,
  getBillingPlan,
  getBillingUsage,
  cancelBilling,
};