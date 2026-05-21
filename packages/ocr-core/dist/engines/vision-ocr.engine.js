export class VisionOCREngine {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(provider) {
        this.name = 'vision';
        this.provider = provider;
    }
    isAvailable() {
        return this.provider !== undefined;
    }
    async process(image) {
        const start = Date.now();
        const imageBase64 = typeof image === 'string'
            ? image
            : image.toString('base64');
        // Call ai-core extractQuestion
        const result = await this.provider.extractQuestion({ imageBase64 });
        return {
            text: result.extractedText,
            confidence: result.confidence,
            language: result.detectedLanguage === 'unknown' ? undefined : result.detectedLanguage,
            processingTimeMs: Date.now() - start,
            engine: 'vision',
        };
    }
}
//# sourceMappingURL=vision-ocr.engine.js.map