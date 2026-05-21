import type { ExtensionStorage, StudyModeState, SolveResult } from './message-types';

const STORAGE_KEYS = {
  STUDY_MODE: 'studyMode',
  LAST_RESULT: 'lastResult',
  HISTORY: 'history',
  SETTINGS: 'settings',
} as const;

export interface ExtensionSettings {
  storeHistory: boolean;
  storeImages: boolean;
  autoHideBubbleMs: number;
  showStudyIndicator: boolean;
  maxHistoryItems: number;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  storeHistory: true,
  storeImages: true,
  autoHideBubbleMs: 8000,
  showStudyIndicator: true,
  maxHistoryItems: 50,
};

// ── Study Mode ────────────────────────────────────────────────────────────────

export async function getStudyMode(): Promise<StudyModeState> {
  const result = await chrome.storage.local.get('studyMode');
  const value = result['studyMode'] as StudyModeState | undefined;
  return value ?? { enabled: false };
}

export async function setStudyMode(state: StudyModeState): Promise<void> {
  await chrome.storage.local.set({ studyMode: state });
}

// ── Last Result ───────────────────────────────────────────────────────────────

export async function getLastResult(): Promise<SolveResult | undefined> {
  const result = await chrome.storage.local.get('lastResult');
  return result.lastResult as SolveResult | undefined;
}

export async function setLastResult(result: SolveResult): Promise<void> {
  await chrome.storage.local.set({ lastResult: result });
}

export async function clearLastResult(): Promise<void> {
  await chrome.storage.local.remove('lastResult');
}

// ── History ────────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  result: SolveResult;
  savedAt: number;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get('history');
  return (result.history ?? []) as HistoryEntry[];
}

export async function addToHistory(result: SolveResult): Promise<void> {
  const settings = await getSettings();
  if (!settings.storeHistory) return;

  const history = await getHistory();
  history.push({ result, savedAt: Date.now() });

  // Trim to max items
  const trimmed = history.slice(-(settings.maxHistoryItems ?? 50));
  await chrome.storage.local.set({ history: trimmed });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove('history');
}

export async function deleteHistoryItem(index: number): Promise<void> {
  const history = await getHistory();
  history.splice(index, 1);
  await chrome.storage.local.set({ history });
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get('settings');
  const stored = result.settings as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function setSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...settings } });
}

export async function resetSettings(): Promise<void> {
  await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
}

// ── Utility ──────────────────────────────────────────────────────────────────

export function createStorageKey(key: keyof ExtensionStorage): string {
  return STORAGE_KEYS[key as keyof typeof STORAGE_KEYS] ?? key;
}