import { calculateImageCropRect, clampCropRect, isValidCropRect, normalizeCropRect, } from './crop';
import { detectBrowserZoom, detectDevicePixelRatio } from './image-normalize';
import { createCanvas, drawImageOnCanvas, imageToBitmap, enhanceContrastCanvas } from './canvas-utils';
import { compressToMaxSize } from './compression';
/**
 * Validates capture options and returns detailed error if invalid.
 */
export function validateCaptureOptions(options) {
    if (!options.source) {
        return { code: 'INVALID_SOURCE', message: 'Source image is required' };
    }
    const maxWidth = options.maxWidth ?? 4096;
    const maxHeight = options.maxHeight ?? 4096;
    if (maxWidth < 1 || maxHeight < 1) {
        return { code: 'IMAGE_TOO_LARGE', message: 'Invalid max dimensions' };
    }
    const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
    if (maxSizeBytes < 1024) {
        return { code: 'PAYLOAD_TOO_LARGE', message: 'maxSizeBytes too small (min 1KB)' };
    }
    const quality = options.quality ?? 0.85;
    if (quality <= 0 || quality > 1) {
        return { code: 'INVALID_SOURCE', message: 'Quality must be between 0 and 1' };
    }
    if (options.cropRect) {
        if (!isValidCropRect(options.cropRect, 10)) {
            return { code: 'CROP_TOO_SMALL', message: 'Crop rectangle too small (min 10x10px)' };
        }
    }
    return null;
}
/**
 * Validates crop rectangle against image dimensions.
 */
export function validateCropRect(cropRect, imageWidth, imageHeight) {
    const normalized = normalizeCropRect(cropRect);
    if (normalized.x < 0 || normalized.y < 0) {
        return { code: 'CROP_TOO_SMALL', message: 'Crop coordinates cannot be negative' };
    }
    if (normalized.x + normalized.width > imageWidth) {
        return { code: 'CROP_TOO_SMALL', message: 'Crop extends beyond image width' };
    }
    if (normalized.y + normalized.height > imageHeight) {
        return { code: 'CROP_TOO_SMALL', message: 'Crop extends beyond image height' };
    }
    if (!isValidCropRect(normalized, 10)) {
        return { code: 'CROP_TOO_SMALL', message: 'Crop rectangle too small (min 10x10px)' };
    }
    return null;
}
/**
 * Validates image dimensions against max constraints.
 */
export function validateImageDimensions(width, height, maxWidth, maxHeight) {
    if (width < 1 || height < 1) {
        return { code: 'CAPTURE_FAILED', message: 'Image has invalid dimensions' };
    }
    if (width > maxWidth || height > maxHeight) {
        return { code: 'IMAGE_TOO_LARGE', message: `Image ${width}x${height} exceeds max ${maxWidth}x${maxHeight}` };
    }
    return null;
}
/**
 * Validates payload size.
 */
export function validatePayloadSize(sizeBytes, maxSizeBytes) {
    if (sizeBytes > maxSizeBytes) {
        return {
            code: 'PAYLOAD_TOO_LARGE',
            message: `Image size ${sizeBytes} exceeds max ${maxSizeBytes} bytes`,
            details: { actual: sizeBytes, max: maxSizeBytes },
        };
    }
    return null;
}
/**
 * Main capture function: crops, normalizes, compresses an image source.
 * Handles high-DPI and browser zoom automatically.
 */
export async function captureImage(options) {
    const validationError = validateCaptureOptions(options);
    if (validationError)
        throw validationError;
    const maxWidth = options.maxWidth ?? 4096;
    const maxHeight = options.maxHeight ?? 4096;
    const maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024;
    const mimeType = options.mimeType ?? 'image/webp';
    const quality = options.quality ?? 0.85;
    const browserZoom = options.browserZoom ?? detectBrowserZoom();
    const devicePixelRatio = options.devicePixelRatio ?? detectDevicePixelRatio();
    // Decode source to ImageBitmap for efficient handling
    const bitmap = await imageToBitmap(options.source);
    const { width: srcWidth, height: srcHeight } = bitmap;
    // Calculate crop rect in image coordinates
    let cropRect = options.cropRect;
    if (cropRect) {
        const rawRect = calculateImageCropRect(cropRect, browserZoom, devicePixelRatio);
        cropRect = clampCropRect(rawRect, srcWidth, srcHeight);
        const cropError = validateCropRect(cropRect, srcWidth, srcHeight);
        if (cropError)
            throw cropError;
    }
    else {
        // Default: full image
        cropRect = { x: 0, y: 0, width: srcWidth, height: srcHeight };
    }
    // Validate dimensions
    const dimError = validateImageDimensions(cropRect.width, cropRect.height, maxWidth, maxHeight);
    if (dimError)
        throw dimError;
    // Create canvas and draw cropped image
    const { canvas, ctx } = createCanvas(cropRect.width, cropRect.height);
    drawImageOnCanvas(bitmap, cropRect.width, cropRect.height, ctx);
    // Contrast enhancement (runs async via putImageData)
    if (options.enhanceContrast) {
        await enhanceContrastCanvas(ctx, cropRect.width, cropRect.height, 1.4);
    }
    // Scale if needed to fit max dimensions
    const scaleX = maxWidth / cropRect.width;
    const scaleY = maxHeight / cropRect.height;
    const scale = Math.min(1, scaleX, scaleY);
    if (scale < 1) {
        const scaledWidth = Math.round(cropRect.width * scale);
        const scaledHeight = Math.round(cropRect.height * scale);
        const { canvas: scaledCanvas, ctx: scaledCtx } = createCanvas(scaledWidth, scaledHeight);
        scaledCtx.drawImage(ctx.canvas, 0, 0, scaledWidth, scaledHeight);
        // Compress with size constraint
        const compressed = await compressToMaxSize(scaledCanvas, maxSizeBytes, { mimeType, quality });
        const sizeError = validatePayloadSize(compressed.sizeBytes, maxSizeBytes);
        if (sizeError)
            throw sizeError;
        return {
            width: scaledWidth,
            height: scaledHeight,
            mimeType: compressed.mimeType,
            sizeBytes: compressed.sizeBytes,
            dataUrl: compressed.dataUrl,
            blob: compressed.blob,
            cropRect,
            createdAt: Date.now(),
        };
    }
    // No scaling needed
    const compressed = await compressToMaxSize(canvas, maxSizeBytes, { mimeType, quality });
    const sizeError = validatePayloadSize(compressed.sizeBytes, maxSizeBytes);
    if (sizeError)
        throw sizeError;
    return {
        width: cropRect.width,
        height: cropRect.height,
        mimeType: compressed.mimeType,
        sizeBytes: compressed.sizeBytes,
        dataUrl: compressed.dataUrl,
        blob: compressed.blob,
        cropRect,
        createdAt: Date.now(),
    };
}
//# sourceMappingURL=validation.js.map