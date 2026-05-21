import { NormalizeResult } from '../types.js';

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization) contrast boost.
 * Converts to grayscale, splits into tiles, equalizes each tile.
 * For OCR: improves text contrast on unevenly lit images.
 */
export function enhanceContrast(imageData: ImageData, tileSize = 64, clipLimit = 2): ImageData {
  const { data, width, height } = imageData;

  // Convert to grayscale luminance values
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Build histogram and CDF per tile
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);
  const result = new Uint8ClampedArray(width * height * 4);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(x0 + tileSize, width);
      const y1 = Math.min(y0 + tileSize, height);

      // Histogram for tile
      const hist = new Uint32Array(256);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[gray[y * width + x]]++;
        }
      }

      // CDF
      const cdf = new Uint32Array(256);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

      // Clip histogram (contrast limit) - CLAHE standard approach
      const tileArea = tileSize * tileSize;
      const clipThreshold = Math.floor((clipLimit * tileArea) / 256);

      const clipHist = new Uint32Array(256);
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > clipThreshold) {
          excess += hist[i] - clipThreshold;
          clipHist[i] = clipThreshold;
        } else {
          clipHist[i] = hist[i];
        }
      }
      // Redistribute clipped values uniformly across all bins
      const perBin = excess / 256;
      for (let i = 0; i < 256; i++) clipHist[i] += perBin;

      // Rebuild CDF from clipped histogram
      const cdfClip = new Uint32Array(256);
      cdfClip[0] = clipHist[0];
      for (let i = 1; i < 256; i++) cdfClip[i] = cdfClip[i - 1] + clipHist[i];

      const cdfMin = cdfClip[0];
      const cdfRange = cdfClip[255] - cdfMin || 1;

      // Apply mapping
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const val = gray[y * width + x];
          const mapped = Math.round(((cdfClip[val] - cdfMin) / cdfRange) * 255);
          const idx = (y * width + x) * 4;
          result[idx] = mapped;
          result[idx + 1] = mapped;
          result[idx + 2] = mapped;
          result[idx + 3] = 255;
        }
      }
    }
  }

  return new ImageData(result, width, height);
}