# Phase 4 Report: Capture Core

## Objective

Implement reliable screenshot capture, crop, compression, and preprocessing for the KARÇÖZ Chrome Extension, with proper high-DPI handling, browser zoom compensation, and strict safety boundaries.

## Safety Boundary

All capture is **user-triggered and visible**:
- No hidden capture, no invisible monitoring
- No proctoring bypass, no background exam automation
- No automatic capture without explicit user gesture

## Deliverables

### Packages Created

```
packages/capture-core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # Public exports
│   ├── types.ts                 # CaptureOptions, CaptureResult, ValidationError
│   ├── canvas-utils.ts          # OffscreenCanvas, drawImageOnCanvas, imageToBitmap
│   ├── crop.ts                  # calculateImageCropRect, clampCropRect, scaleCropRect
│   ├── image-normalize.ts        # High-DPI normalization, detectBrowserZoom, detectDevicePixelRatio
│   ├── compression.ts           # compressCanvas, compressToMaxSize, compressWithPreset
│   └── validation.ts             # validateCaptureOptions, validateCropRect, captureImage
└── __tests__/
    ├── crop.test.ts             # 18 tests: scaling, clamping, normalization
    └── validation.test.ts        # 24 tests: options, crop, dimensions, payload
```

### Extension Integration

```
apps/extension/src/lib/
└── capture-service.ts           # captureTab() using capture-core internally
```

## Features Implemented

| Feature | Status |
|---------|--------|
| Crop visible tab screenshot by user selection | ✅ |
| Normalize high-DPI scaling (DPR-aware) | ✅ |
| Handle browser zoom (0.5x–3x) | ✅ |
| Compress to WebP/JPEG/PNG | ✅ |
| Enforce max image dimensions (4096x4096) | ✅ |
| Enforce max payload size (10MB default) | ✅ |
| Optional contrast enhancement for OCR | ✅ |
| Binary search quality reduction | ✅ |
| OffscreenCanvas where available | ✅ |
| requestIdleCallback for contrast | ✅ |

### Return Types

```typescript
interface CaptureResult {
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  blob?: Blob;
  cropRect?: CropRect;
  createdAt: number;
}
```

### Error States

| Error | Code |
|-------|------|
| Capture failed | `CAPTURE_FAILED` |
| Crop too small (< 10px) | `CROP_TOO_SMALL` |
| Image too large | `IMAGE_TOO_LARGE` |
| Unsupported page | `UNSUPPORTED_PAGE` |
| Permission denied | `PERMISSION_DENIED` |
| Payload too large | `PAYLOAD_TOO_LARGE` |
| Invalid source | `INVALID_SOURCE` |

## Validation Results

| Test Suite | Result | Tests |
|------------|--------|-------|
| TypeScript | ✅ PASS | 0 errors |
| crop.test.ts | ✅ PASS | 18/18 |
| validation.test.ts | ✅ PASS | 24/24 |
| Build | ✅ PASS | dist/ compiled |

## Architecture

```
chrome.tabs.captureVisibleTab()
        ↓
captureImage(captureOptions)
        ↓
imageToBitmap()              # Efficient decode via createImageBitmap
        ↓
calculateImageCropRect()     # Apply zoom × DPR compensation
        ↓
clampCropRect()              # Clamp to image boundaries
        ↓
validateCropRect()           # Min size 10×10
        ↓
createCanvas()               # OffscreenCanvas where available
        ↓
drawImageOnCanvas()          # Crop + draw in single operation
        ↓
enhanceContrastCanvas()      # Optional OCR boost (requestIdleCallback)
        ↓
compressToMaxSize()          # Binary search quality (max 6 iterations)
        ↓
validatePayloadSize()        # Enforce maxSizeBytes
        ↓
CaptureResult { dataUrl, blob, sizeBytes, width, height, ... }
```

## Performance Strategies

| Strategy | Implementation |
|----------|----------------|
| OffscreenCanvas | Non-blocking rendering (Chrome 69+) |
| ImageBitmap | Zero-copy decode via createImageBitmap |
| Binary search compression | Max 6 iterations to find quality threshold |
| Direct crop via drawImage | No intermediate canvas copies |
| requestIdleCallback | Contrast enhancement deferred to idle time |

## Next Steps

1. Wire `capture-service.ts` into `capture-controller.ts` in extension background
2. Replace mock API with real solve endpoint
3. Add image preview in details panel (base64 render)
4. Add cancellation support for long-running captures
5. Add exif/orientation handling for rotated screenshots

## Verdict

**✅ READY** — Capture core is fully implemented, tested, and ready for integration into the extension. All safety boundaries respected, no hidden capture.