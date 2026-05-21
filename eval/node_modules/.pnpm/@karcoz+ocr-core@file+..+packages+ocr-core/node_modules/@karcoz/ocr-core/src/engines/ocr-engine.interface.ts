import { OCRTextResult } from '../types.js';

export interface OCREngine {
  name: string;
  process(image: Buffer | string): Promise<OCRTextResult>;
  isAvailable(): boolean;
}