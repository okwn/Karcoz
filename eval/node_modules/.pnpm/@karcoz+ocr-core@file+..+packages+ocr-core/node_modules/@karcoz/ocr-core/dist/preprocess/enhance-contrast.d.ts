/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization) contrast boost.
 * Converts to grayscale, splits into tiles, equalizes each tile.
 * For OCR: improves text contrast on unevenly lit images.
 */
export declare function enhanceContrast(imageData: ImageData, tileSize?: number, clipLimit?: number): ImageData;
//# sourceMappingURL=enhance-contrast.d.ts.map