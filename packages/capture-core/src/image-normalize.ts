/**
 * Normalizes image coordinates for high-DPI displays and browser zoom.
 */

export interface NormalizationFactors {
  /** Scale factor from screen pixels to image pixels */
  scaleX: number;
  scaleY: number;
  /** Overall factor combining zoom and DPR */
  combinedScale: number;
}

/**
 * Computes normalization factors for a given display environment.
 *
 * @param browserZoom - Browser zoom level (1 = 100%, 1.5 = 150%)
 * @param devicePixelRatio - Device pixel ratio for high-DPI (1 = standard, 2 = Retina)
 * @param sourceWidth - Original source width
 * @param sourceHeight - Original source height
 */
export function computeNormalizationFactors(
  browserZoom: number,
  devicePixelRatio: number
): NormalizationFactors {
  const combinedScale = browserZoom * devicePixelRatio;
  return {
    scaleX: combinedScale,
    scaleY: combinedScale,
    combinedScale,
  };
}

/**
 * Converts screen coordinates to image coordinates.
 *
 * @param screenX - X coordinate in screen pixels
 * @param screenY - Y coordinate in screen pixels
 * @param factors - Normalization factors from computeNormalizationFactors
 */
export function screenToImageCoords(
  screenX: number,
  screenY: number,
  factors: NormalizationFactors
): { x: number; y: number } {
  return {
    x: Math.round(screenX / factors.combinedScale),
    y: Math.round(screenY / factors.combinedScale),
  };
}

/**
 * Converts image coordinates back to screen coordinates.
 */
export function imageToScreenCoords(
  imageX: number,
  imageY: number,
  factors: NormalizationFactors
): { x: number; y: number } {
  return {
    x: Math.round(imageX * factors.combinedScale),
    y: Math.round(imageY * factors.combinedScale),
  };
}

/**
 * Applies normalization: scales canvas to natural image size
 * to handle high-DPI displays properly.
 */
export interface NormalizedCanvas {
  /** Canvas with normalized dimensions */
  canvas: HTMLCanvasElement;
  /** The drawing context */
  ctx: CanvasRenderingContext2D;
  /** Width in CSS pixels (before DPR scaling) */
  cssWidth: number;
  /** Height in CSS pixels (before DPR scaling) */
  cssHeight: number;
}

/**
 * Creates a canvas sized for CSS pixels, letting the browser
 * handle DPR scaling automatically.
 */
export function createNormalizedCanvas(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number = 1
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cssWidth * devicePixelRatio);
  canvas.height = Math.round(cssHeight * devicePixelRatio);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  return canvas;
}

/**
 * Normalizes an image by drawing it at CSS pixel dimensions.
 * This ensures consistent coordinate space regardless of DPR.
 */
export async function normalizeImage(
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  ctx: CanvasRenderingContext2D,
  devicePixelRatio: number = 1
): Promise<void> {
  const cssWidth = Math.round(targetWidth / devicePixelRatio);
  const cssHeight = Math.round(targetHeight / devicePixelRatio);

  ctx.canvas.width = Math.round(targetWidth);
  ctx.canvas.height = Math.round(targetHeight);

  ctx.drawImage(source, 0, 0, cssWidth, cssHeight);
}

/**
 * Detects if the browser is at a non-standard zoom level.
 */
export function detectBrowserZoom(): number {
  // Match media query approach used by browsers
  const matchMedia = window.matchMedia?.('(-webkit-min-device-pixel-ratio: 0.5), (min--moz-device-pixel-ratio: 0.5), (min-resolution: 0.5dppx)');
  if (matchMedia?.matches) return 0.5;

  const zoom = (window as unknown as { outerWidth: number; innerWidth: number }).outerWidth /
    (window as unknown as { innerWidth: number }).innerWidth;

  // Only return if zoom is outside normal range
  if (zoom < 0.5 || zoom > 3) return 1;
  return zoom || 1;
}

/**
 * Detects device pixel ratio.
 */
export function detectDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}