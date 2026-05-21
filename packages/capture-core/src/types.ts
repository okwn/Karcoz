export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOptions {
  /** Source image data URL or Blob */
  source: string | Blob;
  /** Rectangle to crop in image pixel coordinates */
  cropRect?: CropRect;
  /** Maximum output width in pixels (default: 4096) */
  maxWidth?: number;
  /** Maximum output height in pixels (default: 4096) */
  maxHeight?: number;
  /** Maximum payload size in bytes (default: 10MB) */
  maxSizeBytes?: number;
  /** Output MIME type (default: 'image/webp') */
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
  /** JPEG/WebP quality 0-1 (default: 0.85) */
  quality?: number;
  /** Apply contrast enhancement for OCR (default: false) */
  enhanceContrast?: boolean;
  /** Scale factor for high-DPI displays (default: 1) */
  devicePixelRatio?: number;
  /** Current browser zoom level (default: 1) */
  browserZoom?: number;
}

export interface CaptureResult {
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  blob?: Blob;
  cropRect?: CropRect;
  createdAt: number;
}

export interface ValidationError {
  code:
    | 'CAPTURE_FAILED'
    | 'CROP_TOO_SMALL'
    | 'IMAGE_TOO_LARGE'
    | 'UNSUPPORTED_PAGE'
    | 'PERMISSION_DENIED'
    | 'PAYLOAD_TOO_LARGE'
    | 'INVALID_SOURCE';
  message: string;
  details?: unknown;
}

export type CaptureResultOrError =
  | { success: true; result: CaptureResult }
  | { success: false; error: ValidationError };

export interface ImageMetadata {
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}