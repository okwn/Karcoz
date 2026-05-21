/**
 * Otsu threshold for automatic binarization.
 * Best for high-contrast text images. Converts to pure black/white.
 */
export function binarize(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;

  // Grayscale
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // Otsu threshold
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0, wB = 0, maxVar = 0, threshold = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVar) { maxVar = variance; threshold = i; }
  }

  // Apply threshold
  const result = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < gray.length; i++) {
    const val = gray[i] > threshold ? 255 : 0;
    result[i * 4] = val;
    result[i * 4 + 1] = val;
    result[i * 4 + 2] = val;
    result[i * 4 + 3] = 255;
  }

  return new ImageData(result, width, height);
}