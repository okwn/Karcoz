import type { SolveResult } from './message-types';
import { showExtensionLogin } from '../background/service-worker';
import { startRequest } from './request-cancellation';

const DEFAULT_API_BASE_URL = 'http://localhost:8132';
const STORAGE_KEY_API_URL = 'karcoz_api_url';
const STORAGE_KEY_USE_MOCK = 'karcoz_use_mock';
const STORAGE_KEY_TOKEN = 'karcoz_extension_token';
const STORAGE_KEY_EXPIRY = 'karcoz_token_expiry';
const TOKEN_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export interface SolveRequest {
  imageData: string;
  mode: 'area' | 'page';
}

export interface ApiClient {
  solve(request: SolveRequest, requestId?: string): Promise<SolveResult>;
}

// ── Token Storage Helpers ──────────────────────────────────────────────────────

export async function getExtensionToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_TOKEN, STORAGE_KEY_EXPIRY], (items) => {
      const token = items[STORAGE_KEY_TOKEN] as string | undefined;
      const expiry = items[STORAGE_KEY_EXPIRY] as number | undefined;

      if (!token || !expiry) {
        resolve(null);
        return;
      }

      if (Date.now() > expiry) {
        chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_EXPIRY]);
        resolve(null);
        return;
      }

      resolve(token);
    });
  });
}

export async function setExtensionToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    const expiry = Date.now() + TOKEN_EXPIRY_MS;
    chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token, [STORAGE_KEY_EXPIRY]: expiry }, resolve);
  });
}

export async function clearExtensionToken(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_EXPIRY], resolve);
  });
}

// ── API URL Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true only when mock mode is explicitly enabled by the user.
 * RealApiClient is the default when mock is off or unset.
 */
export async function isMockMode(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_USE_MOCK], (items) => {
      resolve(items[STORAGE_KEY_USE_MOCK] === true);
    });
  });
}

/**
 * Returns the configured API base URL, or throws if none is set and mock is off.
 * In development, defaults to http://localhost:8132 if no URL is stored.
 */
export async function getApiBaseUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_API_URL, STORAGE_KEY_USE_MOCK], (items) => {
      const useMock = items[STORAGE_KEY_USE_MOCK] as boolean | undefined;
      if (useMock) {
        resolve('');
        return;
      }
      const url = (items[STORAGE_KEY_API_URL] as string | undefined)?.trim();
      if (!url) {
        // Default for development; in production this should be explicitly set
        resolve(DEFAULT_API_BASE_URL);
        return;
      }
      resolve(url.replace(/\/$/, ''));
    });
  });
}

/**
 * Checks whether the extension has a valid API configuration (mock off + URL available).
 */
export async function isApiConfigured(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY_API_URL, STORAGE_KEY_USE_MOCK], (items) => {
      const useMock = items[STORAGE_KEY_USE_MOCK] as boolean | undefined;
      if (useMock === true) {
        resolve(true); // mock is a valid "configured" state
      }
      const url = (items[STORAGE_KEY_API_URL] as string | undefined)?.trim();
      resolve(!!url);
    });
  });
}

class MockApiClient implements ApiClient {
  async solve(_request: SolveRequest): Promise<SolveResult> {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockResults = [
      {
        answer: 'The answer is B: 42',
        confidence: 0.94,
        explanation:
          'Based on the problem analysis, using the quadratic formula x = (-b ± √(b²-4ac)) / 2a, we substitute a=1, b=-5, c=6. This gives us x = (5 ± √(25-24)) / 2 = (5 ± 1) / 2, resulting in x = 3 or x = 2. Checking both solutions confirms x=2 is valid.',
      },
      {
        answer: 'Photosynthesis equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
        confidence: 0.91,
        explanation:
          'Photosynthesis is the process by which plants convert carbon dioxide and water into glucose and oxygen using sunlight energy. The balanced chemical equation shows that 6 molecules of CO₂ react with 6 molecules of H₂O in the presence of light/chlorophyll to produce 1 molecule of glucose (C₆H₁₂O₆) and 6 molecules of O₂.',
      },
      {
        answer: "Newton's Second Law: F = ma",
        confidence: 0.97,
        explanation:
          'Force equals mass times acceleration. This fundamental law of classical mechanics describes how the velocity of an object changes when subjected to an external force. The greater the mass, the more force required to accelerate it.',
      },
    ];

    const result = mockResults[Math.floor(Math.random() * mockResults.length)];

    return {
      answer: result.answer,
      confidence: result.confidence,
      explanation: result.explanation,
      timestamp: Date.now(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

class RealApiClient implements ApiClient {
  private async getApiUrl(): Promise<string> {
    return getApiBaseUrl();
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await getExtensionToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async attemptSolve(
    baseUrl: string,
    request: SolveRequest,
    timeoutMs: number,
    abortController?: AbortController
  ): Promise<SolveResult> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal = abortController?.signal ?? timeoutController.signal;

    // Route to image or text endpoint
    const isImageData = request.imageData.startsWith('data:') || request.imageData.startsWith('/9j/') || /^[A-Za-z0-9+/=]{20,}$/.test(request.imageData);
    const endpoint = isImageData ? '/api/solve/image' : '/api/solve/text';
    const body = isImageData
      ? { imageBase64: request.imageData, sourceType: 'screen' as const, mode: 'compact' as const }
      : { text: request.imageData, mode: 'compact' as const };

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(body),
      signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401) {
      await clearExtensionToken();
      showExtensionLogin();
      throw new Error('Unauthorized — please log in again');
    }

    if (response.status === 413) {
      throw new Error('Image too large — please crop a smaller area');
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited — try again in ${retryAfter ?? 60}s`);
    }

    if (!response.ok) {
      let msg = `API error: ${response.status}`;
      try {
        const body = await response.json();
        msg = body.error?.message ?? msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await response.json();
    // Normalize API response to SolveResult shape
    return {
      answer: data.solution?.shortAnswer ?? data.answer ?? '',
      confidence: data.solution?.confidenceScore ?? data.confidence ?? 0.5,
      explanation: data.solution?.fullExplanation ?? data.explanation ?? '',
      question: data.extraction?.extractedText ?? data.question ?? '',
      options: data.extraction?.options?.map((o: { label: string }) => o.label) ?? [],
      requestId: data.questionId ?? `req_${Date.now()}`,
      timestamp: Date.now(),
      captureLatencyMs: data.performance?.captureLatencyMs,
      uploadLatencyMs: data.performance?.uploadLatencyMs,
      extractionLatencyMs: data.performance?.extractionLatencyMs,
      solveLatencyMs: data.performance?.solvingLatencyMs,
      validationLatencyMs: data.performance?.validationLatencyMs,
      totalLatencyMs: data.performance?.totalLatencyMs,
    };
  }

  async solve(request: SolveRequest, requestId?: string): Promise<SolveResult> {
    let abortController: AbortController | undefined;
    if (requestId) {
      abortController = startRequest(requestId);
    }

    const baseUrl = await this.getApiUrl();

    try {
      return await this.attemptSolve(baseUrl, request, 5000, abortController);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[API] First attempt timed out, retrying with longer timeout...');
        return await this.attemptSolve(baseUrl, request, 12000, abortController);
      }
      throw err;
    }
  }
}

export function createApiClient(useMock = true): ApiClient {
  return useMock ? new MockApiClient() : new RealApiClient();
}

// ── Dynamic API client (reads settings at call time) ────────────────────────

let _cachedClient: ApiClient | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 5000;

async function getDynamicClient(): Promise<ApiClient> {
  const now = Date.now();
  if (_cachedClient && now - _cacheTimestamp < CACHE_TTL_MS) {
    return _cachedClient;
  }

  const mock = await isMockMode();
  _cachedClient = createApiClient(mock);
  _cacheTimestamp = now;
  return _cachedClient;
}

export const apiClient: ApiClient = {
  async solve(request: SolveRequest, requestId?: string): Promise<SolveResult> {
    const client = await getDynamicClient();
    return client.solve(request, requestId);
  },
};