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
export declare function calculateImageCropRect(screenRect: CropRect, browserZoom?: number, devicePixelRatio?: number, scrollX?: number, scrollY?: number): CropRect;
/**
 * Clamps a crop rectangle to image boundaries.
 */
export declare function clampCropRect(cropRect: CropRect, imageWidth: number, imageHeight: number): CropRect;
/**
 * Scales a crop rectangle by a given factor.
 */
export declare function scaleCropRect(rect: CropRect, scale: number): CropRect;
/**
 * Checks if a crop rectangle is valid (minimum size).
 */
export declare function isValidCropRect(rect: CropRect, minSize?: number): boolean;
/**
 * Normalizes crop coordinates to handle flipped rectangles
 * (user drags in any direction).
 */
export declare function normalizeCropRect(rect: CropRect): CropRect;
/**
 * Calculates scale factors needed to fit image within max dimensions.
 */
export declare function calculateFitScale(imageWidth: number, imageHeight: number, maxWidth: number, maxHeight: number): ScaleFactors;
/**
 * Applies crop to image source using canvas.
 */
export declare function applyCropToImage(source: HTMLImageElement | HTMLCanvasElement | ImageBitmap, cropRect: CropRect, ctx: CanvasRenderingContext2D): Promise<void>;
//# sourceMappingURL=crop.d.ts.map