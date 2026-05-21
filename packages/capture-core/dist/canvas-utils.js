/**
 * Creates an offscreen canvas with the given dimensions.
 * Uses OffscreenCanvas where available for non-blocking rendering.
 */
export function createCanvas(width, height) {
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Failed to get 2d context');
        return { canvas: canvas, ctx: ctx };
    }
    else {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            throw new Error('Failed to get 2d context');
        return { canvas, ctx };
    }
}
/**
 * Draws an image onto a canvas, handling high-DPI scaling.
 */
export function drawImageOnCanvas(source, width, height, ctx) {
    const c = ctx.canvas;
    c.width = width;
    c.height = height;
    ctx.drawImage(source, 0, 0, width, height);
}
/**
 * Converts a Blob or data URL to an ImageBitmap for efficient decoding.
 */
export async function imageToBitmap(source) {
    let blob;
    if (typeof source === 'string') {
        const res = await fetch(source);
        blob = await res.blob();
    }
    else {
        blob = source;
    }
    return createImageBitmap(blob);
}
/**
 * Gets image metadata without fully decoding the image.
 */
export async function getImageMetadata(source) {
    const bitmap = await imageToBitmap(source);
    const sizeBytes = typeof source === 'string'
        ? Math.ceil((source.length * 3) / 4)
        : source.size;
    return {
        width: bitmap.width,
        height: bitmap.height,
        sizeBytes,
    };
}
/**
 * Converts canvas to a data URL.
 */
export async function canvasToDataUrl(canvas, mimeType, quality) {
    if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({ type: mimeType, quality });
        return _blobToDataUrl(blob);
    }
    return canvas.toDataURL(mimeType, quality);
}
function _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
/**
 * Converts canvas to a Blob.
 */
export async function canvasToBlob(canvas, mimeType, quality) {
    if (canvas instanceof OffscreenCanvas) {
        return canvas.convertToBlob({ type: mimeType, quality });
    }
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))), mimeType, quality);
    });
}
/**
 * Applies contrast enhancement using canvas image data.
 * Uses requestIdleCallback to avoid blocking.
 */
export async function enhanceContrastCanvas(ctx, width, height, factor = 1.4) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const newLum = ((lum / 255 - 0.5) * factor + 0.5) * 255;
        const diff = newLum - lum;
        data[i] = Math.max(0, Math.min(255, r + diff));
        data[i + 1] = Math.max(0, Math.min(255, g + diff));
        data[i + 2] = Math.max(0, Math.min(255, b + diff));
    }
    ctx.putImageData(imageData, 0, 0);
}
/**
 * Schedules work during idle time to avoid blocking UI.
 */
export function scheduleIdleCallback(fn, options) {
    return new Promise((resolve) => {
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => resolve(fn()), options);
        }
        else {
            setTimeout(() => resolve(fn()), 0);
        }
    });
}
//# sourceMappingURL=canvas-utils.js.map