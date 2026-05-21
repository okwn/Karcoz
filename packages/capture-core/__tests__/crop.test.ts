import { describe, it, expect } from 'vitest';
import {
  calculateImageCropRect,
  clampCropRect,
  scaleCropRect,
  isValidCropRect,
  normalizeCropRect,
  calculateFitScale,
} from '../src/crop';
import type { CropRect } from '../src/types';

describe('crop rect scaling', () => {
  it('calculates image crop rect accounting for zoom and DPR', () => {
    const screenRect: CropRect = { x: 100, y: 200, width: 300, height: 400 };
    const result = calculateImageCropRect(screenRect, 1.5, 2);

    // At 1.5x zoom and 2x DPR, combinedScale = 3
    expect(result.x).toBe(Math.round(100 * 3));
    expect(result.y).toBe(Math.round(200 * 3));
    expect(result.width).toBe(Math.round(300 * 3));
    expect(result.height).toBe(Math.round(400 * 3));
  });

  it('handles zero zoom gracefully', () => {
    const screenRect: CropRect = { x: 50, y: 50, width: 100, height: 100 };
    const result = calculateImageCropRect(screenRect, 0, 1);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('scales crop rect correctly', () => {
    const rect: CropRect = { x: 10, y: 20, width: 100, height: 200 };
    const result = scaleCropRect(rect, 0.5);
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
  });

  it('scales crop rect with integer rounding', () => {
    const rect: CropRect = { x: 11, y: 22, width: 101, height: 201 };
    const result = scaleCropRect(rect, 0.333);
    expect(result.x).toBe(4); // 11 * 0.333 = 3.663 → 4
    expect(result.y).toBe(7); // 22 * 0.333 = 7.326 → 7
    expect(result.width).toBe(34); // 101 * 0.333 = 33.633 → 34
    expect(result.height).toBe(67); // 201 * 0.333 = 66.933 → 67
  });

  it('clamps crop rect to image boundaries', () => {
    const cropRect: CropRect = { x: 500, y: 500, width: 2000, height: 2000 };
    const result = clampCropRect(cropRect, 800, 600);
    expect(result.x).toBe(500);
    expect(result.y).toBe(500);
    expect(result.width).toBe(300); // limited by image width
    expect(result.height).toBe(100); // limited by image height
  });

  it('clamps negative coordinates', () => {
    const cropRect: CropRect = { x: -50, y: -50, width: 100, height: 100 };
    const result = clampCropRect(cropRect, 800, 600);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  it('normalizes flipped rectangles (drag left/up)', () => {
    const rect: CropRect = { x: 300, y: 400, width: -100, height: -200 };
    const result = normalizeCropRect(rect);
    expect(result.x).toBe(200);
    expect(result.y).toBe(200);
    expect(result.width).toBe(100);
    expect(result.height).toBe(200);
  });

  it('normalizeCropRect handles normal rectangles unchanged', () => {
    const rect: CropRect = { x: 100, y: 200, width: 300, height: 400 };
    const result = normalizeCropRect(rect);
    expect(result).toEqual(rect);
  });

  it('calculates fit scale correctly', () => {
    // Both scale to min(1024/4000, 1024/3000) = min(0.256, 0.341) = 0.256
    const result = calculateFitScale(4000, 3000, 1024, 1024);
    expect(result.scaleX).toBeCloseTo(0.256, 2);
    expect(result.scaleY).toBeCloseTo(0.256, 2);
  });

  it('returns scale of 1 when image fits', () => {
    const result = calculateFitScale(100, 100, 1024, 1024);
    expect(result.scaleX).toBe(1);
    expect(result.scaleY).toBe(1);
  });
});

describe('isValidCropRect', () => {
  it('returns true for valid crop rect', () => {
    expect(isValidCropRect({ x: 0, y: 0, width: 100, height: 100 })).toBe(true);
  });

  it('returns true for minimum valid size', () => {
    expect(isValidCropRect({ x: 0, y: 0, width: 10, height: 10 })).toBe(true);
  });

  it('returns false for width too small', () => {
    expect(isValidCropRect({ x: 0, y: 0, width: 9, height: 100 })).toBe(false);
  });

  it('returns false for height too small', () => {
    expect(isValidCropRect({ x: 0, y: 0, width: 100, height: 9 })).toBe(false);
  });

  it('respects custom minSize', () => {
    expect(isValidCropRect({ x: 0, y: 0, width: 50, height: 50 }, 60)).toBe(false);
    expect(isValidCropRect({ x: 0, y: 0, width: 60, height: 60 }, 60)).toBe(true);
  });
});

describe('calculateImageCropRect edge cases', () => {
  it('handles high DPR and no zoom', () => {
    const rect: CropRect = { x: 10, y: 20, width: 100, height: 200 };
    const result = calculateImageCropRect(rect, 1, 3);
    expect(result.x).toBe(30);
    expect(result.y).toBe(60);
    expect(result.width).toBe(300);
    expect(result.height).toBe(600);
  });

  it('handles zoom without DPR', () => {
    const rect: CropRect = { x: 10, y: 20, width: 100, height: 200 };
    const result = calculateImageCropRect(rect, 2, 1);
    expect(result.x).toBe(20);
    expect(result.y).toBe(40);
    expect(result.width).toBe(200);
    expect(result.height).toBe(400);
  });

  it('includes scroll offsets', () => {
    const rect: CropRect = { x: 110, y: 220, width: 100, height: 200 };
    const result = calculateImageCropRect(rect, 1, 1, 100, 200);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });
});