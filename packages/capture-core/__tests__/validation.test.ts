import { describe, it, expect } from 'vitest';
import {
  validateCaptureOptions,
  validateCropRect,
  validateImageDimensions,
  validatePayloadSize,
} from '../src/validation';
import type { CaptureOptions } from '../src/types';

describe('validateCaptureOptions', () => {
  it('returns null for valid options', () => {
    const options: CaptureOptions = {
      source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      cropRect: { x: 0, y: 0, width: 100, height: 100 },
      maxWidth: 4096,
      maxHeight: 4096,
      maxSizeBytes: 10 * 1024 * 1024,
      mimeType: 'image/webp',
      quality: 0.85,
    };
    expect(validateCaptureOptions(options)).toBeNull();
  });

  it('returns error for missing source', () => {
    const options = { source: '' } as CaptureOptions;
    const error = validateCaptureOptions(options);
    expect(error?.code).toBe('INVALID_SOURCE');
  });

  it('returns error for invalid max dimensions', () => {
    const options: CaptureOptions = {
      source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      maxWidth: 0,
    };
    expect(validateCaptureOptions(options)?.code).toBe('IMAGE_TOO_LARGE');
  });

  it('returns error for maxSizeBytes too small', () => {
    const options: CaptureOptions = {
      source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      maxSizeBytes: 512,
    };
    const error = validateCaptureOptions(options);
    expect(error?.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns error for quality out of range', () => {
    const options: CaptureOptions = {
      source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      quality: 1.5,
    };
    const error = validateCaptureOptions(options);
    expect(error?.code).toBe('INVALID_SOURCE');
  });

  it('returns error for crop rect too small', () => {
    const options: CaptureOptions = {
      source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      cropRect: { x: 0, y: 0, width: 5, height: 100 },
    };
    const error = validateCaptureOptions(options);
    expect(error?.code).toBe('CROP_TOO_SMALL');
  });

  it('returns null for valid default options', () => {
    const options: CaptureOptions = {
      source: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };
    expect(validateCaptureOptions(options)).toBeNull();
  });
});

describe('validateCropRect', () => {
  it('returns null for valid crop rect', () => {
    expect(validateCropRect({ x: 0, y: 0, width: 100, height: 100 }, 800, 600)).toBeNull();
  });

  it('returns null for crop touching image boundary', () => {
    expect(validateCropRect({ x: 0, y: 0, width: 800, height: 600 }, 800, 600)).toBeNull();
  });

  it('returns error for negative coordinates', () => {
    const error = validateCropRect({ x: -10, y: 0, width: 100, height: 100 }, 800, 600);
    expect(error?.code).toBe('CROP_TOO_SMALL');
  });

  it('returns error for crop exceeding image width', () => {
    const error = validateCropRect({ x: 700, y: 0, width: 200, height: 600 }, 800, 600);
    expect(error?.code).toBe('CROP_TOO_SMALL');
  });

  it('returns error for crop exceeding image height', () => {
    const error = validateCropRect({ x: 0, y: 500, width: 800, height: 200 }, 800, 600);
    expect(error?.code).toBe('CROP_TOO_SMALL');
  });

  it('returns error for crop smaller than minimum', () => {
    const error = validateCropRect({ x: 0, y: 0, width: 9, height: 9 }, 800, 600);
    expect(error?.code).toBe('CROP_TOO_SMALL');
  });

  it('normalizes flipped rectangles before validation', () => {
    // Negative width/height from drag left/up - should normalize then validate
    expect(validateCropRect({ x: 200, y: 200, width: -100, height: -100 }, 800, 600)).toBeNull();
  });
});

describe('validateImageDimensions', () => {
  it('returns null for valid dimensions', () => {
    expect(validateImageDimensions(1024, 768, 4096, 4096)).toBeNull();
  });

  it('returns null for dimensions at max boundary', () => {
    expect(validateImageDimensions(4096, 4096, 4096, 4096)).toBeNull();
  });

  it('returns error for zero dimensions', () => {
    const error = validateImageDimensions(0, 100, 4096, 4096);
    expect(error?.code).toBe('CAPTURE_FAILED');
  });

  it('returns error for negative dimensions', () => {
    const error = validateImageDimensions(-1, 100, 4096, 4096);
    expect(error?.code).toBe('CAPTURE_FAILED');
  });

  it('returns error for width exceeding max', () => {
    const error = validateImageDimensions(5000, 768, 4096, 4096);
    expect(error?.code).toBe('IMAGE_TOO_LARGE');
  });

  it('returns error for height exceeding max', () => {
    const error = validateImageDimensions(1024, 5000, 4096, 4096);
    expect(error?.code).toBe('IMAGE_TOO_LARGE');
  });
});

describe('validatePayloadSize', () => {
  it('returns null for size within limit', () => {
    expect(validatePayloadSize(5 * 1024 * 1024, 10 * 1024 * 1024)).toBeNull();
  });

  it('returns null for size at exact limit', () => {
    const maxBytes = 10 * 1024 * 1024;
    expect(validatePayloadSize(maxBytes, maxBytes)).toBeNull();
  });

  it('returns error for size exceeding max', () => {
    const error = validatePayloadSize(11 * 1024 * 1024, 10 * 1024 * 1024);
    expect(error?.code).toBe('PAYLOAD_TOO_LARGE');
    expect(error?.details).toEqual({ actual: 11 * 1024 * 1024, max: 10 * 1024 * 1024 });
  });

  it('handles small size limits', () => {
    const error = validatePayloadSize(2049, 2048);
    expect(error?.code).toBe('PAYLOAD_TOO_LARGE');
  });
});