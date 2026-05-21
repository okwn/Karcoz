import { AIProviderError, ProviderTimeoutError, isRetryableError } from '../errors.js';
export class OpenRouterProvider {
    constructor(config) {
        this.name = 'openrouter';
        if (typeof config === 'string') {
            this.apiKey = config;
            this.model = 'anthropic/claude-3.5-sonnet';
            this.timeoutMs = 30000;
            this.maxTokens = 2048;
        }
        else {
            if (!config.apiKey)
                throw new AIProviderError('OPENROUTER_API_KEY is required', 'MISSING_API_KEY', 'openrouter');
            this.apiKey = config.apiKey;
            this.model = config.model ?? 'anthropic/claude-3.5-sonnet';
            this.timeoutMs = config.timeoutMs ?? 30000;
            this.maxTokens = config.maxTokens ?? 2048;
        }
    }
    async extractQuestion(input) {
        if (!input.imageBase64 && !input.imageUrl) {
            throw new AIProviderError('No image provided for extraction', 'NO_IMAGE', 'openrouter', 400);
        }
        const lang = input.language ?? 'auto';
        const systemPrompt = lang === 'tr'
            ? `Sen bir soru çıkarıcısısın. Verilen görüntüden soruyu ve seçenekleri çıkar.\nKurallar:\n- Yalnızca geçerli JSON döndür — başka hiçbir şey yazma\n- Matematik sembollerini koru\n- Seçenekleri {label, value, order} formatında döndür\n- Bilmediğin bir şey varsa extractedText boş bırak\n- confidence 0.0-1.0 arasında\n- detectedLanguage: "en", "tr", veya "unknown"\n- questionType: "multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"`
            : `You are a question extractor. Extract questions and choices from images.\nRules:\n- Return ONLY valid JSON — nothing else, no markdown\n- Preserve math symbols\n- Return choices as {label, value, order}\n- If unclear, set extractedText to empty string\n- confidence between 0.0 and 1.0\n- detectedLanguage: "en", "tr", or "unknown"\n- questionType: "multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"` + `\n- extractedText: the full question text\n- normalizedText: cleaned question text`;
        let userContent;
        if (input.imageBase64) {
            userContent = [
                { type: 'text', text: 'Extract the question and any choices from this image.' },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` } },
            ];
        }
        else {
            userContent = [{ type: 'text', text: 'Extract the question and any choices from this image.\n' + (input.imageUrl ? `Image URL: ${input.imageUrl}` : '') }];
        }
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            max_tokens: this.maxTokens,
            temperature: 0.3,
        };
        const response = await this.makeRequest(payload);
        const content = response.choices?.[0]?.message?.content ?? '';
        return this.parseExtractionResponse(content);
    }
    async solveQuestion(input) {
        const lang = input.language ?? 'en';
        const systemPrompt = lang === 'tr'
            ? `Sen bir çalışma asistanısın. Soruyu çöz ve net cevap ver.\nKurallar:\n- Yalnızca geçerli JSON döndür\n- shortAnswer: kısa cevap metni\n- selectedOption: çoktan seçmeli ise 0 tabanlı indeks (değilse undefined)\n- fullExplanation: detaylı açıklama\n- reasoningSummary: özetli akıl yürütme\n- confidenceScore: 0.0-1.0\n- validationStatus: "pass", "fail", "low_confidence", "not_validated"`
            : `You are a study assistant. Solve the question and provide a clear, accurate answer.\nRules:\n- Return ONLY valid JSON — no markdown, no explanation\n- shortAnswer: brief answer text\n- selectedOption: 0-based option index for multiple choice (undefined otherwise)\n- fullExplanation: detailed explanation\n- reasoningSummary: summary of reasoning\n- confidenceScore: 0.0-1.0\n- validationStatus: "pass", "fail", "low_confidence", or "not_validated"` + `\nFor multiple choice, include selectedOption.`;
        let optionsText = '';
        if (input.options && input.options.length > 0) {
            optionsText = input.options.map(o => `${o.label}) ${o.value}`).join('\n');
        }
        const userContent = [
            `Question: ${input.question}`,
            optionsText ? `\nOptions:\n${optionsText}` : '',
            `\nExplanation level: ${input.explanationLevel}`,
        ].filter(Boolean).join('');
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
            ],
            max_tokens: this.maxTokens,
            temperature: 0.3,
        };
        const response = await this.makeRequest(payload);
        const content = response.choices?.[0]?.message?.content ?? '';
        return this.parseSolveResponse(content);
    }
    async validateAnswer(input) {
        const lang = input.language ?? 'en';
        const systemPrompt = lang === 'tr'
            ? `Bu cevabı doğrula.\nKurallar:\n- Yalnızca geçerli JSON döndür\n- status: "pass" | "fail" | "low_confidence" | "not_validated"\n- issues: sorun listesi\n- confidenceAdjustment: -0.3 ile +0.1 arası`
            : `Validate this answer.\nRules:\n- Return ONLY valid JSON\n- status: "pass" | "fail" | "low_confidence" | "not_validated"\n- issues: list of problems found\n- confidenceAdjustment: -0.3 to +0.1\n- Check for: empty answer, nonsensical answer, contradictory statements`;
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Answer: ${input.shortAnswer}\nQuestion: ${input.question}` },
            ],
            max_tokens: 512,
            temperature: 0.1,
        };
        const response = await this.makeRequest(payload);
        const content = response.choices?.[0]?.message?.content ?? '';
        return this.parseValidationResponse(content);
    }
    async classifyTopic(input) {
        const lang = input.language ?? 'en';
        const systemPrompt = lang === 'tr'
            ? `Bu sorunun konusunu sınıflandır.\nKurallar:\n- Yalnızca geçerli JSON döndür\n- topic: Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Edebiyat, Bilgisayar Bilimi, Hukuk, Ekonomi, Genel\n- confidence: 0.0-1.0\n- subtopic: varsa alt konu`
            : `Classify the topic of this question.\nRules:\n- Return ONLY valid JSON\n- topic: Mathematics, Physics, Chemistry, Biology, History, Geography, Literature, Computer Science, Law, Economics, General\n- confidence: 0.0-1.0\n- subtopic: optional subtopic`;
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Question: ${input.text}` },
            ],
            max_tokens: 256,
            temperature: 0.1,
        };
        const response = await this.makeRequest(payload);
        const content = response.choices?.[0]?.message?.content ?? '';
        return this.parseTopicResponse(content);
    }
    async makeRequest(payload) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': process.env.APP_BASE_URL ?? 'http://localhost:3100',
                    'X-Title': 'KARCOZ',
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errorBody = await response.text().catch(() => '');
                if (response.status === 429) {
                    throw new AIProviderError(`OpenRouter rate limit: ${response.status}`, 'RATE_LIMITED', 'openrouter', 429, errorBody);
                }
                throw new AIProviderError(`OpenRouter API error: ${response.status} ${response.statusText}`, 'PROVIDER_ERROR', 'openrouter', response.status, errorBody);
            }
            return await response.json();
        }
        catch (err) {
            clearTimeout(timeout);
            if (err instanceof Error && err.name === 'AbortError') {
                throw new ProviderTimeoutError('openrouter', this.timeoutMs);
            }
            if (err instanceof AIProviderError)
                throw err;
            if (isRetryableError(err))
                throw err;
            throw new AIProviderError(`OpenRouter request failed: ${err instanceof Error ? err.message : String(err)}`, 'PROVIDER_ERROR', 'openrouter', undefined, err);
        }
    }
    parseExtractionResponse(content) {
        const cleaned = this.extractJSON(content);
        if (!cleaned) {
            return { extractedText: '', normalizedText: '', detectedLanguage: 'unknown', questionType: 'unknown', confidence: 0 };
        }
        try {
            const parsed = JSON.parse(cleaned);
            return {
                extractedText: String(parsed.extractedText ?? ''),
                normalizedText: String(parsed.normalizedText ?? parsed.extractedText ?? ''),
                detectedLanguage: this.parseLanguage(parsed.detectedLanguage),
                questionType: this.parseQuestionType(parsed.questionType),
                topic: parsed.topic ? String(parsed.topic) : undefined,
                options: this.parseOptions(parsed.options),
                confidence: this.clampConfidence(parsed.confidence ?? 0.5),
            };
        }
        catch {
            return { extractedText: '', normalizedText: '', detectedLanguage: 'unknown', questionType: 'unknown', confidence: 0 };
        }
    }
    parseSolveResponse(content) {
        const cleaned = this.extractJSON(content);
        if (!cleaned) {
            return { shortAnswer: 'Solve failed', fullExplanation: '', reasoningSummary: '', confidenceScore: 0, validationStatus: 'not_validated' };
        }
        try {
            const parsed = JSON.parse(cleaned);
            return {
                shortAnswer: String(parsed.shortAnswer ?? 'Unknown'),
                selectedOption: parsed.selectedOption !== undefined && parsed.selectedOption !== null ? Number(parsed.selectedOption) : undefined,
                fullExplanation: String(parsed.fullExplanation ?? ''),
                reasoningSummary: String(parsed.reasoningSummary ?? ''),
                confidenceScore: this.clampConfidence(parsed.confidenceScore ?? 0.5),
                validationStatus: this.parseValidationStatus(parsed.validationStatus),
            };
        }
        catch {
            return { shortAnswer: 'Solve failed', fullExplanation: '', reasoningSummary: '', confidenceScore: 0, validationStatus: 'not_validated' };
        }
    }
    parseValidationResponse(content) {
        const cleaned = this.extractJSON(content);
        if (!cleaned)
            return { status: 'not_validated', issues: ['Could not parse validation response'], confidenceAdjustment: 0 };
        try {
            const parsed = JSON.parse(cleaned);
            return {
                status: this.parseValidationStatus(parsed.status, 'not_validated'),
                issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
                confidenceAdjustment: this.clampAdjustment(parsed.confidenceAdjustment ?? 0),
            };
        }
        catch {
            return { status: 'not_validated', issues: ['Validation parse error'], confidenceAdjustment: 0 };
        }
    }
    parseTopicResponse(content) {
        const cleaned = this.extractJSON(content);
        if (!cleaned)
            return { topic: 'General', confidence: 0.5 };
        try {
            const parsed = JSON.parse(cleaned);
            return {
                topic: String(parsed.topic ?? 'General'),
                subtopic: parsed.subtopic ? String(parsed.subtopic) : undefined,
                confidence: this.clampConfidence(parsed.confidence ?? 0.5),
            };
        }
        catch {
            return { topic: 'General', confidence: 0.5 };
        }
    }
    extractJSON(content) {
        const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch)
            return codeBlockMatch[1].trim();
        const bareMatch = content.match(/\{[\s\S]*\}/);
        return bareMatch ? bareMatch[0].trim() : null;
    }
    parseLanguage(lang) {
        if (lang === 'tr' || lang === 'en')
            return lang;
        if (typeof lang === 'string' && (lang.startsWith('tr') || lang.startsWith('en'))) {
            return lang.startsWith('tr') ? 'tr' : 'en';
        }
        return 'unknown';
    }
    parseQuestionType(t) {
        const valid = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering', 'unknown'];
        if (typeof t === 'string' && valid.includes(t))
            return t;
        return 'unknown';
    }
    parseValidationStatus(s, fallback = 'not_validated') {
        const valid = ['pass', 'fail', 'low_confidence', 'not_validated'];
        if (typeof s === 'string' && valid.includes(s))
            return s;
        return fallback;
    }
    parseOptions(opts) {
        if (!Array.isArray(opts))
            return undefined;
        return opts.map((o, i) => {
            if (typeof o === 'object' && o !== null) {
                return {
                    label: String(o.label ?? String.fromCharCode(65 + i)),
                    value: String(o.value ?? ''),
                    order: Number(o.order ?? i),
                };
            }
            return { label: String.fromCharCode(65 + i), value: String(o), order: i };
        });
    }
    clampConfidence(v) {
        return Math.max(0, Math.min(1, Number(v) || 0.5));
    }
    clampAdjustment(v) {
        return Math.max(-0.3, Math.min(0.1, Number(v) || 0));
    }
}
//# sourceMappingURL=openrouter.provider.js.map