import type { CropRect } from './types';

export interface ScaleFactors {
  scaleX: number;
  scaleY: number;
}

/**
 * Calculates crop rectangle in image coordinates, accounting for
 * browser zoom and device pixel ratio.
 *
 * @param screenRect - Rectangle drawn by user in screen coordinates
 * @param browserZoom - Current browser zoom level (1 = 100%)
 * @param devicePixelRatio - Display scaling factor (1 = standard)
 * @param scrollX - Horizontal scroll offset
 * @param scrollY - Vertical scroll offset
 */
export function calculateImageCropRect(
  screenRect: CropRect,
  browserZoom: number = 1,
  devicePixelRatio: number = 1,
  scrollX: number = 0,
  scrollY: number = 0
): CropRect {
  const effectiveScale = browserZoom * devicePixelRatio;

  return {
    x: Math.round((screenRect.x - scrollX) * effectiveScale),
    y: Math.round((screenRect.y - scrollY) * effectiveScale),
    width: Math.round(screenRect.width * effectiveScale),
    height: Math.round(screenRect.height * effectiveScale),
  };
}

/**
 * Clamps a crop rectangle to image boundaries.
 */
export function clampCropRect(
  cropRect: CropRect,
  imageWidth: number,
  imageHeight: number
): CropRect {
  return {
    x: Math.max(0, Math.min(cropRect.x, imageWidth - 1)),
    y: Math.max(0, Math.min(cropRect.y, imageHeight - 1)),
    width: Math.max(1, Math.min(cropRect.width, imageWidth - cropRect.x)),
    height: Math.max(1, Math.min(cropRect.height, imageHeight - cropRect.y)),
  };
}

/**
 * Scales a crop rectangle by a given factor.
 */
export function scaleCropRect(rect: CropRect, scale: number): CropRect {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.round(rect.width * scale),
    height: Math.round(rect.height * scale),
  };
}

/**
 * Checks if a crop rectangle is valid (minimum size).
 */
export function isValidCropRect(rect: CropRect, minSize: number = 10): boolean {
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Normalizes crop coordinates to handle flipped rectangles
 * (user drags in any direction).
 */
export function normalizeCropRect(rect: CropRect): CropRect {
  return {
    x: rect.width < 0 ? rect.x + rect.width : rect.x,
    y: rect.height < 0 ? rect.y + rect.height : rect.y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

/**
 * Calculates scale factors needed to fit image within max dimensions.
 */
export function calculateFitScale(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): ScaleFactors {
  const scaleX = maxWidth / imageWidth;
  const scaleY = maxHeight / imageHeight;
  const scale = Math.min(1, scaleX, scaleY);
  return {
    scaleX: scale,
    scaleY: scale,
  };
}

/**
 * Applies crop to image source using canvas.
 */
export async function applyCropToImage(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  cropRect: CropRect,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  ctx.canvas.width = cropRect.width;
  ctx.canvas.height = cropRect.height;
  ctx.drawImage(
    source,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    cropRect.width,
    cropRect.height
  );
}