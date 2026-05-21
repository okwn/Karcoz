# Capture Core Architecture

## Overview

`packages/capture-core` provides screenshot capture, crop, normalization, compression, and validation for the KARÇÖZ Chrome Extension. All capture is user-triggered and visible — no hidden or background capture.

## Module Structure

```
packages/capture-core/src/
├── types.ts           # Interfaces: CaptureOptions, CaptureResult, ValidationError
├── canvas-utils.ts   # OffscreenCanvas creation, image drawing, bitmap conversion
├── crop.ts           # Rectangle cropping, scaling, clamping
├── image-normalize.ts # High-DPI normalization, browser zoom detection
├── compression.ts    # WebP/JPEG/PNG compression, binary search quality reduction
└── validation.ts     # Option validation, error codes, captureImage() main entry
```

## Key Interfaces

```typescript
interface CaptureOptions {
  source: string | Blob;        // Raw screenshot data
  cropRect?: CropRect;          // User selection in screen coordinates
  maxWidth?: number;           // Default 4096
  maxHeight?: number;           // Default 4096
  maxSizeBytes?: number;       // Default 10MB
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  quality?: number;            // Default 0.85
  enhanceContrast?: boolean;    // OCR contrast boost
  devicePixelRatio?: number;  // Auto-detected if not provided
  browserZoom?: number;       // Auto-detected if not provided
}

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

## Data Flow

```
chrome.tabs.captureVisibleTab()
        ↓ (data URL)
captureImage(options)
        ↓
imageToBitmap(source)           # Efficient decode
        ↓
calculateImageCropRect()       # Apply zoom/DPR compensation
        ↓
clampCropRect()                # Clamp to image boundaries
        ↓
validateCropRect()             # Min 10x10px check
        ↓
createCanvas()                 # OffscreenCanvas if available
        ↓
drawImageOnCanvas()            # Crop + draw in one step
        ↓
enhanceContrastCanvas()        # Optional OCR enhancement
        ↓
compressToMaxSize()            # Binary search quality reduction
        ↓
validatePayloadSize()          # Enforce maxSizeBytes
        ↓
CaptureResult { dataUrl, width, height, sizeBytes, ... }
```

## Error Codes

| Code | Meaning |
|------|---------|
| `CAPTURE_FAILED` | General capture failure |
| `CROP_TOO_SMALL` | Selection < 10x10px |
| `IMAGE_TOO_LARGE` | Exceeds maxWidth/maxHeight |
| `UNSUPPORTED_PAGE` | Cannot capture this page type |
| `PERMISSION_DENIED` | Missing tab capture permission |
| `PAYLOAD_TOO_LARGE` | Compressed result > maxSizeBytes |
| `INVALID_SOURCE` | Missing or invalid source |

## High-DPI and Browser Zoom Handling

```typescript
const combinedScale = browserZoom * devicePixelRatio;

// Screen coordinates → image coordinates
imageX = Math.round(screenX / combinedScale);
imageY = Math.round(screenY / combinedScale);
```

## Performance Strategies

1. **OffscreenCanvas** — Non-blocking rendering where supported (Chrome 69+)
2. **ImageBitmap** — Efficient decode without loading into main memory
3. **Binary search compression** — Max 6 iterations to find quality threshold
4. **No unnecessary copies** — Direct drawImage with crop coordinates
5. **requestIdleCallback** — Contrast enhancement scheduled during idle time

## Safety Guarantees

- All capture originates from `chrome.tabs.captureVisibleTab()` — requires user gesture
- Content script selection overlay requires explicit mouse drag
- No hidden capture, no continuous monitoring, no proctoring bypass
- All errors are user-facing with clear messages
- Results are user-controlled (bubble + side panel, not hidden channels)