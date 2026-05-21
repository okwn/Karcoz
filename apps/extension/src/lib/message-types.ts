export type MessageAction =
  | 'CAPTURE_AREA'
  | 'SCAN_PAGE'
  | 'SCAN_PAGE_CANDIDATES'
  | 'TOGGLE_STUDY_MODE'
  | 'GET_STATUS'
  | 'OPEN_DETAILS'
  | 'SAVE_RESULT'
  | 'PRACTICE_SIMILAR'
  | 'OPEN_HISTORY'
  | 'OPEN_SETTINGS'
  | 'GET_HISTORY'
  | 'CLEAR_HISTORY'
  | 'DELETE_ALL_DATA'
  | 'SAVE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'PROGRESS_UPDATE'

export interface ExtensionMessage {
  action: MessageAction;
  payload?: unknown;
  tabId?: number;
  requestId?: string;
}

export interface CapturePayload {
  imageData?: string;
  area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fullPage?: boolean;
}

export type ProgressState = 'idle' | 'capturing' | 'reading' | 'uploading' | 'solving' | 'validating' | 'done' | 'error';

export interface SolveResult {
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
  progress?: ProgressState;
  progressMessage?: string;
  captureLatencyMs?: number;
  uploadLatencyMs?: number;
  extractionLatencyMs?: number;
  solveLatencyMs?: number;
  validationLatencyMs?: number;
  totalLatencyMs?: number;
}

export interface StudyModeState {
  enabled: boolean;
  tabId?: number;
}

export interface ExtensionStorage {
  studyMode: StudyModeState;
  lastResult?: SolveResult;
}

export type MessageHandler = (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
) => Promise<unknown> | unknown;