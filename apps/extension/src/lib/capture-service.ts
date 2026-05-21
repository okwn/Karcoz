// @ts-nocheck — external package types
import { captureImage, validateCaptureOptions } from '@karcoz/capture-core';
import type { CaptureOptions, CaptureResult, ValidationError } from '@karcoz/capture-core';
import { cropImage as ccropImage, captureVisibleTab, dataURLtoBlob } from './image-utils';

export interface CaptureTabOptions {
  tabId: number;
  cropRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fullPage?: boolean;
  maxSizeBytes?: number;
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number;
  enhanceContrast?: boolean;
  browserZoom?: number;
  devicePixelRatio?: number;
}

export interface CaptureTabResult {
  result: CaptureResult;
  imageData: string;
}

class CaptureService {
  async captureTab(options: CaptureTabOptions): Promise<CaptureTabResult> {
    const {
      tabId,
      cropRect,
      maxSizeBytes = 10 * 1024 * 1024,
      mimeType = 'image/webp',
      quality = 0.85,
      enhanceContrast = false,
      browserZoom = 1,
      devicePixelRatio = 1,
    } = options;

    const dataUrl = await this.captureVisibleTab(tabId);

    const captureOptions: CaptureOptions = {
      source: dataUrl,
      cropRect,
      maxSizeBytes,
      mimeType,
      quality,
      enhanceContrast,
      browserZoom,
      devicePixelRatio,
    };

    const validationError = validateCaptureOptions(captureOptions);
    if (validationError) {
      throw validationError;
    }

    const result = await captureImage(captureOptions);

    return {
      result,
      imageData: result.dataUrl,
    };
  }

  private captureVisibleTab(tabId: number): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.tabs.captureVisibleTab(tabId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(dataUrl);
      });
    });
  }
}

export const captureService = new CaptureService();

export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isValidationError(error)) {
    return (error as ValidationError).message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}