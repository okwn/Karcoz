export type MimeType = 'image/webp' | 'image/jpeg' | 'image/png';
export interface CompressionOptions {
    mimeType: MimeType;
    quality: number;
}
export interface CompressionResult {
    dataUrl: string;
    blob: Blob;
    sizeBytes: number;
    mimeType: string;
    width: number;
    height: number;
}
/**
 * Compresses a canvas to a data URL or Blob.
 */
export declare function compressCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, options?: Partial<CompressionOptions>): Promise<CompressionResult>;
/**
 * Iteratively compresses an image, reducing quality until
 * it fits within maxSizeBytes.
 *
 * Uses binary search for efficiency.
 */
export declare function compressToMaxSize(canvas: HTMLCanvasElement | OffscreenCanvas, maxSizeBytes: number, options?: Partial<CompressionOptions>): Promise<CompressionResult>;
/**
 * Compresses using a fixed set of quality presets.
 */
export declare function compressWithPreset(canvas: HTMLCanvasElement | OffscreenCanvas, preset: 'low' | 'medium' | 'high', options?: Partial<CompressionOptions>): Promise<CompressionResult>;
/**
 * Estimates compressed size for a given quality setting
 * using a rough heuristic based on pixel count and quality.
 */
export declare function estimateCompressedSize(width: number, height: number, mimeType: MimeType, quality: number): number;
//# sourceMappingURL=compression.d.ts.map