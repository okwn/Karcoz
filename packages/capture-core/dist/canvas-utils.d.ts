export interface CanvasContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}
export interface OffscreenCanvasContext {
    canvas: OffscreenCanvas;
    ctx: OffscreenCanvasRenderingContext2D;
}
/**
 * Creates an offscreen canvas with the given dimensions.
 * Uses OffscreenCanvas where available for non-blocking rendering.
 */
export declare function createCanvas(width: number, height: number): CanvasContext | OffscreenCanvasContext;
/**
 * Draws an image onto a canvas, handling high-DPI scaling.
 */
export declare function drawImageOnCanvas(source: HTMLImageElement | HTMLCanvasElement | ImageBitmap, width: number, height: number, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;
/**
 * Converts a Blob or data URL to an ImageBitmap for efficient decoding.
 */
export declare function imageToBitmap(source: string | Blob): Promise<ImageBitmap>;
/**
 * Gets image metadata without fully decoding the image.
 */
export declare function getImageMetadata(source: string | Blob): Promise<{
    width: number;
    height: number;
    sizeBytes: number;
}>;
/**
 * Converts canvas to a data URL.
 */
export declare function canvasToDataUrl(canvas: HTMLCanvasElement | OffscreenCanvas, mimeType: string, quality: number): Promise<string>;
/**
 * Converts canvas to a Blob.
 */
export declare function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, mimeType: string, quality: number): Promise<Blob>;
/**
 * Applies contrast enhancement using canvas image data.
 * Uses requestIdleCallback to avoid blocking.
 */
export declare function enhanceContrastCanvas(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, width: number, height: number, factor?: number): Promise<void>;
/**
 * Schedules work during idle time to avoid blocking UI.
 */
export declare function scheduleIdleCallback<T>(fn: () => T, options?: {
    timeout?: number;
}): Promise<T>;
//# sourceMappingURL=canvas-utils.d.ts.map