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
export declare function computeNormalizationFactors(browserZoom: number, devicePixelRatio: number): NormalizationFactors;
/**
 * Converts screen coordinates to image coordinates.
 *
 * @param screenX - X coordinate in screen pixels
 * @param screenY - Y coordinate in screen pixels
 * @param factors - Normalization factors from computeNormalizationFactors
 */
export declare function screenToImageCoords(screenX: number, screenY: number, factors: NormalizationFactors): {
    x: number;
    y: number;
};
/**
 * Converts image coordinates back to screen coordinates.
 */
export declare function imageToScreenCoords(imageX: number, imageY: number, factors: NormalizationFactors): {
    x: number;
    y: number;
};
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
export declare function createNormalizedCanvas(cssWidth: number, cssHeight: number, devicePixelRatio?: number): HTMLCanvasElement;
/**
 * Normalizes an image by drawing it at CSS pixel dimensions.
 * This ensures consistent coordinate space regardless of DPR.
 */
export declare function normalizeImage(source: ImageBitmap | HTMLImageElement | HTMLCanvasElement, targetWidth: number, targetHeight: number, ctx: CanvasRenderingContext2D, devicePixelRatio?: number): Promise<void>;
/**
 * Detects if the browser is at a non-standard zoom level.
 */
export declare function detectBrowserZoom(): number;
/**
 * Detects device pixel ratio.
 */
export declare function detectDevicePixelRatio(): number;
//# sourceMappingURL=image-normalize.d.ts.map