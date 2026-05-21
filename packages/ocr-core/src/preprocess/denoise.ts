/**
 * Gaussian blur for noise reduction.
 * kernelSize: odd number, typically 3 or 5
 * sigma: standard deviation
 */
export function denoise(imageData: ImageData, kernelSize = 3, sigma = 1): ImageData {
  const { data, width, height } = imageData;
  const half = Math.floor(kernelSize / 2);

  // Build Gaussian kernel
  const kernel = new Float32Array(kernelSize * kernelSize);
  let sum = 0;
  for (let ky = 0; ky < kernelSize; ky++) {
    for (let kx = 0; kx < kernelSize; kx++) {
      const dx = kx - half;
      const dy = ky - half;
      const val = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[ky * kernelSize + kx] = val;
      sum += val;
    }
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;

  const result = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const sx = Math.min(Math.max(x + kx - half, 0), width - 1);
          const sy = Math.min(Math.max(y + ky - half, 0), height - 1);
          const idx = (sy * width + sx) * 4;
          const w = kernel[ky * kernelSize + kx];
          rSum += data[idx] * w;
          gSum += data[idx + 1] * w;
          bSum += data[idx + 2] * w;
        }
      }

      const idx = (y * width + x) * 4;
      result[idx] = Math.round(rSum);
      result[idx + 1] = Math.round(gSum);
      result[idx + 2] = Math.round(bSum);
      result[idx + 3] = 255;
    }
  }

  return new ImageData(result, width, height);
}