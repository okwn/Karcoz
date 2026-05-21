import { MockOCREngine } from './mock-ocr.engine.js';
import { VisionOCREngine } from './vision-ocr.engine.js';
import { detectLanguage } from '../normalize/detect-language.js';
import { normalizeWhitespace } from '../normalize/normalize-whitespace.js';
import { parseOptions } from '../normalize/option-parser.js';
import { normalizeMathSymbols } from '../normalize/normalize-math-symbols.js';
import { computeConfidence } from '../confidence/ocr-confidence.js';
import { enhanceContrast, denoise, binarize, resizeForOCR } from '../preprocess/index.js';
let mockEngine;
let visionEngine = null;
let preprocessBeforeVision = false;
export function initHybridEngine(config) {
    mockEngine = new MockOCREngine();
    if (config.visionProvider) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visionEngine = new VisionOCREngine(config.visionProvider);
    }
    // Check env var as default, allow override via config
    preprocessBeforeVision = config.preprocessBeforeVision
        ?? process.env.OCR_PREPROCESSING_ENABLED === 'true';
}
/**
 * Apply image preprocessing steps before OCR.
 * Handles Buffer → ImageData → Buffer conversion via sharp (if available).
 * Returns { buffer, steps } where buffer is a Buffer ready for VisionOCR.
 * Skips gracefully if sharp is not available or conversion fails.
 */
async function applyPreprocessingSteps(image) {
    const steps = [];
    // Only process Buffer (not base64 string)
    if (!(image instanceof Buffer)) {
        return { buffer: image, steps };
    }
    // sharp is required for buffer ↔ ImageData conversion
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sharp;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        sharp = require('sharp');
    }
    catch {
        // sharp not installed — skip preprocessing
        return { buffer: image, steps };
    }
    try {
        // Decode to ImageData
        const { data, info } = await sharp(image)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const imgData = new ImageData(new Uint8ClampedArray(data), info.width, info.height);
        // Resize → enhance → denoise → binarize (each returns ImageData)
        const img1 = resizeForOCR(imgData, 300);
        steps.push('resize-300dpi');
        const img2 = enhanceContrast(img1);
        steps.push('enhance-contrast');
        const img3 = denoise(img2);
        steps.push('denoise');
        const img4 = binarize(img3);
        steps.push('binarize');
        // Encode back to Buffer (PNG)
        const dst = Buffer.from(img4.data);
        const processed = await sharp(dst, {
            raw: { width: img4.width, height: img4.height, channels: 4 },
        }).png().toBuffer();
        return { buffer: processed, steps };
    }
    catch {
        return { buffer: image, steps };
    }
}
export async function hybridOCR(input) {
    const steps = [];
    const startTime = Date.now();
    // Use providers from ai-core if not explicitly set
    if (!mockEngine)
        mockEngine = new MockOCREngine();
    let textResult;
    let preprocessedImage;
    // Step 0 (optional): Preprocess image before OCR
    if (preprocessBeforeVision && input.image instanceof Buffer) {
        const { buffer: processed, steps: prepSteps } = await applyPreprocessingSteps(input.image);
        if (prepSteps.length > 0) {
            preprocessedImage = processed;
            steps.push('preprocess', ...prepSteps);
        }
    }
    // Step 1: Try VisionOCR if available
    if (visionEngine && visionEngine.isAvailable()) {
        const imageForOcr = preprocessedImage ?? input.image;
        steps.push('vision-ocr');
        try {
            textResult = await visionEngine.process(imageForOcr);
        }
        catch {
            steps.push('vision-failed');
            textResult = await mockEngine.process(input.image);
        }
    }
    else {
        steps.push('mock-ocr');
        textResult = await mockEngine.process(input.image);
    }
    // Step 2: If low confidence, try merge with fallback
    if (textResult.confidence < 0.85 && mockEngine.isAvailable()) {
        steps.push('fallback-merge');
        const mockResult = await mockEngine.process(input.image);
        if (mockResult.confidence > textResult.confidence) {
            textResult = mockResult;
        }
        else {
            textResult = {
                text: textResult.text,
                confidence: Math.max(textResult.confidence, mockResult.confidence * 0.9),
                language: textResult.language || mockResult.language,
                processingTimeMs: textResult.processingTimeMs,
                engine: 'hybrid',
            };
        }
    }
    // Step 3: Normalize text
    const langHint = input.language === 'auto' ? undefined : input.language;
    const lang = textResult.language || langHint || detectLanguage(textResult.text);
    const mathNorm = normalizeMathSymbols(textResult.text);
    const wsNorm = normalizeWhitespace(mathNorm.text);
    const normalizedText = wsNorm.text;
    // Step 4: Parse options
    const options = parseOptions(normalizedText);
    // Step 5: Detect topic
    const topic = detectTopic(normalizedText);
    // Step 6: Detect question type
    const questionType = detectQuestionType(normalizedText, options);
    steps.push('normalize', 'parse-options', 'detect-topic');
    const overallConfidence = computeConfidence({
        ocrEngine: textResult.confidence,
        textQuality: textResult.text.length > 20 ? 0.8 : 0.4,
        languageConsistency: lang !== undefined && lang !== 'unknown' ? 0.9 : 0.5,
        optionStructure: options.length >= 2 ? 0.85 : 0.6,
    });
    return {
        extractedText: textResult.text,
        normalizedText,
        detectedLanguage: lang,
        questionType,
        options: options.length > 0 ? options : undefined,
        topic,
        confidence: overallConfidence,
        processingSteps: steps,
    };
}
function detectTopic(text) {
    const lowerText = text.toLowerCase();
    if (/equation|solve|x\^|sqrt|fraction|[\+\-\*]\s*\d+\s*=|\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(lowerText)) {
        return 'Mathematics';
    }
    if (/newton|force|velocity|acceleration|energy|joule|watt|ohm/i.test(lowerText)) {
        return 'Physics';
    }
    if (/atom|molecule|reaction|chemical|element|periodic|h2o|o2|n2/i.test(lowerText)) {
        return 'Chemistry';
    }
    if (/ DNA | RNA | cell|brain|organism|evolution|photosynthesis/i.test(lowerText)) {
        return 'Biology';
    }
    if (/capital|country|continent|population|river|mountain/i.test(lowerText)) {
        return 'Geography';
    }
    if (/year|century|empire|war|revolution|independence/i.test(lowerText)) {
        return 'History';
    }
    const keywords = [
        ['matematik', 'Mathematics'], ['fizik', 'Physics'], ['kimya', 'Chemistry'],
        ['biyoloji', 'Biology'], ['tarih', 'History'], ['coğrafya', 'Geography'],
        ['edebiyat', 'Literature'], ['bilgisayar', 'Computer Science'],
        ['hukuk', 'Law'], ['ekonomi', 'Economics'],
        ['derivative', 'Mathematics'], ['integral', 'Mathematics'],
        [' DNA', 'Biology'], ['capital', 'Geography'], ['history', 'History'],
    ];
    for (const [kw, topic] of keywords) {
        if (lowerText.includes(kw))
            return topic;
    }
    return 'General';
}
function detectQuestionType(text, options) {
    if (options.length >= 2)
        return 'multiple_choice';
    if (/true\s*[-–]\s*false/i.test(text))
        return 'true_false';
    if (text.length > 10)
        return 'short_answer';
    return 'unknown';
}
//# sourceMappingURL=hybrid.engine.js.map