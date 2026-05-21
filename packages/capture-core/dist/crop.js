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
export function calculateImageCropRect(screenRect, browserZoom = 1, devicePixelRatio = 1, scrollX = 0, scrollY = 0) {
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
export function clampCropRect(cropRect, imageWidth, imageHeight) {
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
export function scaleCropRect(rect, scale) {
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
export function isValidCropRect(rect, minSize = 10) {
    return rect.width >= minSize && rect.height >= minSize;
}
/**
 * Normalizes crop coordinates to handle flipped rectangles
 * (user drags in any direction).
 */
export function normalizeCropRect(rect) {
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
export function calculateFitScale(imageWidth, imageHeight, maxWidth, maxHeight) {
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
export async function applyCropToImage(source, cropRect, ctx) {
    ctx.canvas.width = cropRect.width;
    ctx.canvas.height = cropRect.height;
    ctx.drawImage(source, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
}
//# sourceMappingURL=crop.js.map