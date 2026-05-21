import type { CropRect, CaptureOptions, CaptureResult, ValidationError } from './types';
/**
 * Validates capture options and returns detailed error if invalid.
 */
export declare function validateCaptureOptions(options: CaptureOptions): ValidationError | null;
/**
 * Validates crop rectangle against image dimensions.
 */
export declare function validateCropRect(cropRect: CropRect, imageWidth: number, imageHeight: number): ValidationError | null;
/**
 * Validates image dimensions against max constraints.
 */
export declare function validateImageDimensions(width: number, height: number, maxWidth: number, maxHeight: number): ValidationError | null;
/**
 * Validates payload size.
 */
export declare function validatePayloadSize(sizeBytes: number, maxSizeBytes: number): ValidationError | null;
/**
 * Main capture function: crops, normalizes, compresses an image source.
 * Handles high-DPI and browser zoom automatically.
 */
export declare function captureImage(options: CaptureOptions): Promise<CaptureResult>;
//# sourceMappingURL=validation.d.ts.map