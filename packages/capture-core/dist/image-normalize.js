/**
 * Normalizes image coordinates for high-DPI displays and browser zoom.
 */
/**
 * Computes normalization factors for a given display environment.
 *
 * @param browserZoom - Browser zoom level (1 = 100%, 1.5 = 150%)
 * @param devicePixelRatio - Device pixel ratio for high-DPI (1 = standard, 2 = Retina)
 * @param sourceWidth - Original source width
 * @param sourceHeight - Original source height
 */
export function computeNormalizationFactors(browserZoom, devicePixelRatio) {
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
export function screenToImageCoords(screenX, screenY, factors) {
    return {
        x: Math.round(screenX / factors.combinedScale),
        y: Math.round(screenY / factors.combinedScale),
    };
}
/**
 * Converts image coordinates back to screen coordinates.
 */
export function imageToScreenCoords(imageX, imageY, factors) {
    return {
        x: Math.round(imageX * factors.combinedScale),
        y: Math.round(imageY * factors.combinedScale),
    };
}
/**
 * Creates a canvas sized for CSS pixels, letting the browser
 * handle DPR scaling automatically.
 */
export function createNormalizedCanvas(cssWidth, cssHeight, devicePixelRatio = 1) {
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
export async function normalizeImage(source, targetWidth, targetHeight, ctx, devicePixelRatio = 1) {
    const cssWidth = Math.round(targetWidth / devicePixelRatio);
    const cssHeight = Math.round(targetHeight / devicePixelRatio);
    ctx.canvas.width = Math.round(targetWidth);
    ctx.canvas.height = Math.round(targetHeight);
    ctx.drawImage(source, 0, 0, cssWidth, cssHeight);
}
/**
 * Detects if the browser is at a non-standard zoom level.
 */
export function detectBrowserZoom() {
    // Match media query approach used by browsers
    const matchMedia = window.matchMedia?.('(-webkit-min-device-pixel-ratio: 0.5), (min--moz-device-pixel-ratio: 0.5), (min-resolution: 0.5dppx)');
    if (matchMedia?.matches)
        return 0.5;
    const zoom = window.outerWidth /
        window.innerWidth;
    // Only return if zoom is outside normal range
    if (zoom < 0.5 || zoom > 3)
        return 1;
    return zoom || 1;
}
/**
 * Detects device pixel ratio.
 */
export function detectDevicePixelRatio() {
    return window.devicePixelRatio || 1;
}
//# sourceMappingURL=image-normalize.js.map