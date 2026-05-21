/**
 * Resize image to target DPI for OCR normalization.
 * Target: 300 DPI. Scale factor = targetDPI / sourceDPI (default 72 DPI assumed).
 */
export declare function resizeForOCR(imageData: ImageData, targetDPI?: number, sourceDPI?: number): ImageData;
//# sourceMappingURL=resize-for-ocr.d.ts.map