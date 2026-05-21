import { captureVisibleTab, cropImage, dataURLtoBlob } from '../lib/image-utils';
import { apiClient } from '../lib/api-client';
import type { CapturePayload, ExtensionMessage, SolveResult } from '../lib/message-types';
import { setLastResult } from '../lib/extension-storage';
import { getCachedResult, setCachedResult, clearCache, computeHash } from '../lib/recent-result-cache';

export interface CaptureController {
  captureArea(tabId: number, payload: CapturePayload): Promise<SolveResult>;
  scanPage(tabId: number, fullPage?: boolean): Promise<SolveResult>;
}

class CaptureControllerImpl implements CaptureController {
  async captureArea(tabId: number, payload: CapturePayload): Promise<SolveResult> {
    const t0 = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData = await captureVisibleTab(tabId);
    const captureLatencyMs = Math.round(performance.now() - t0);

    let processedImage = imageData;
    if (payload.area) {
      processedImage = await cropImage(imageData, payload.area);
    }

    // LRU cache check: use image data hash as key
    const cacheKey = computeHash(processedImage.substring(0, 200));
    const cached = await getCachedResult(cacheKey);
    if (cached) {
      return { ...cached, progress: 'done', captureLatencyMs, totalLatencyMs: Math.round(performance.now() - t0) };
    }

    const t1 = performance.now();
    const result = await apiClient.solve({
      imageData: processedImage,
      mode: 'area',
    }, requestId);
    const totalLatencyMs = Math.round(performance.now() - t0);

    // Cache the result
    await setCachedResult(cacheKey, result);

    const enrichedResult: SolveResult = {
      ...result,
      progress: 'done',
      captureLatencyMs,
      totalLatencyMs,
    };

    await setLastResult(enrichedResult);
    return enrichedResult;
  }

  async scanPage(tabId: number, fullPage = true): Promise<SolveResult> {
    const t0 = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageData = await captureVisibleTab(tabId);
    const captureLatencyMs = Math.round(performance.now() - t0);

    // LRU cache check: use image data hash as key
    const cacheKey = computeHash(imageData.substring(0, 200));
    const cached = await getCachedResult(cacheKey);
    if (cached) {
      return { ...cached, progress: 'done', captureLatencyMs, totalLatencyMs: Math.round(performance.now() - t0) };
    }

    const t1 = performance.now();
    const result = await apiClient.solve({
      imageData,
      mode: 'page',
    }, requestId);
    const totalLatencyMs = Math.round(performance.now() - t0);

    // Cache the result
    await setCachedResult(cacheKey, result);

    const enrichedResult: SolveResult = {
      ...result,
      progress: 'done',
      captureLatencyMs,
      totalLatencyMs,
    };

    await setLastResult(enrichedResult);
    return enrichedResult;
  }
}

let controllerInstance: CaptureController | null = null;

export function getCaptureController(): CaptureController {
  if (!controllerInstance) {
    controllerInstance = new CaptureControllerImpl();
  }
  return controllerInstance;
}

export async function handleCaptureMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<SolveResult> {
  const controller = getCaptureController();
  const tabId = sender.tab?.id;

  if (!tabId) {
    throw new Error('No tab ID available');
  }

  if (message.action === 'CAPTURE_AREA') {
    return controller.captureArea(tabId, (message.payload as CapturePayload) ?? {});
  }

  if (message.action === 'SCAN_PAGE') {
    return controller.scanPage(tabId);
  }

  throw new Error(`Unknown capture action: ${message.action}`);
}