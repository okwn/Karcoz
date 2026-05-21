/**
 * Resize image to target DPI for OCR normalization.
 * Target: 300 DPI. Scale factor = targetDPI / sourceDPI (default 72 DPI assumed).
 */
export function resizeForOCR(imageData: ImageData, targetDPI = 300, sourceDPI = 72): ImageData {
  const scale = targetDPI / sourceDPI;

  if (Math.abs(scale - 1) < 0.01) return imageData;

  const newWidth = Math.round(imageData.width * scale);
  const newHeight = Math.round(imageData.height * scale);

  const src = imageData.data;
  const dst = new Uint8ClampedArray(newWidth * newHeight * 4);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = Math.round(x / scale);
      const srcY = Math.round(y / scale);
      const srcIdx = (srcY * imageData.width + srcX) * 4;
      const dstIdx = (y * newWidth + x) * 4;
      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = 255;
    }
  }

  return new ImageData(dst, newWidth, newHeight);
}