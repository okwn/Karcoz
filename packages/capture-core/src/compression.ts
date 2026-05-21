export type MimeType = 'image/webp' | 'image/jpeg' | 'image/png';

export interface CompressionOptions {
  mimeType: MimeType;
  quality: number; // 0-1
}

export interface CompressionResult {
  dataUrl: string;
  blob: Blob;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
}

const DEFAULT_QUALITY = 0.85;
const DEFAULT_MIME_TYPE: MimeType = 'image/webp';

/**
 * Compresses a canvas to a data URL or Blob.
 */
export async function compressCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options?: Partial<CompressionOptions>
): Promise<CompressionResult> {
  const mimeType = options?.mimeType ?? DEFAULT_MIME_TYPE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: mimeType, quality });
    const buffer = await blob.arrayBuffer();
    const dataUrl = await _blobToDataUrl(blob);
    return {
      dataUrl,
      blob,
      sizeBytes: buffer.byteLength,
      mimeType,
      width: canvas.width,
      height: canvas.height,
    };
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('compressCanvas: toBlob returned null'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve({
            dataUrl,
            blob,
            sizeBytes: blob.size,
            mimeType,
            width: canvas.width,
            height: canvas.height,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * Converts Blob to data URL.
 */
function _blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Iteratively compresses an image, reducing quality until
 * it fits within maxSizeBytes.
 *
 * Uses binary search for efficiency.
 */
export async function compressToMaxSize(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  maxSizeBytes: number,
  options?: Partial<CompressionOptions>
): Promise<CompressionResult> {
  let quality = options?.quality ?? DEFAULT_QUALITY;
  const mimeType = options?.mimeType ?? DEFAULT_MIME_TYPE;

  const result = await compressCanvas(canvas, { mimeType, quality });

  if (result.sizeBytes <= maxSizeBytes) {
    return result;
  }

  // Binary search for optimal quality between 0.1 and 0.9
  let minQuality = 0.1;
  let maxQuality = quality;
  let bestResult = result;

  while (maxQuality - minQuality > 0.05) {
    const midQuality = (minQuality + maxQuality) / 2;
    const candidate = await compressCanvas(canvas, { mimeType, quality: midQuality });

    if (candidate.sizeBytes <= maxSizeBytes) {
      bestResult = candidate;
      minQuality = midQuality;
    } else {
      maxQuality = midQuality;
    }
  }

  return bestResult;
}

/**
 * Compresses using a fixed set of quality presets.
 */
export async function compressWithPreset(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  preset: 'low' | 'medium' | 'high',
  options?: Partial<CompressionOptions>
): Promise<CompressionResult> {
  const qualityMap = { low: 0.6, medium: 0.8, high: 0.95 };
  const quality = qualityMap[preset];
  return compressCanvas(canvas, { ...options, quality });
}

/**
 * Estimates compressed size for a given quality setting
 * using a rough heuristic based on pixel count and quality.
 */
export function estimateCompressedSize(
  width: number,
  height: number,
  mimeType: MimeType,
  quality: number
): number {
  const pixels = width * height;

  // Rough bytes-per-pixel estimates
  const bppMap = {
    'image/png': 2.5,
    'image/jpeg': 0.15 + quality * 0.25,
    'image/webp': 0.1 + quality * 0.2,
  };

  const bpp = bppMap[mimeType];
  return Math.round(pixels * bpp * quality);
}