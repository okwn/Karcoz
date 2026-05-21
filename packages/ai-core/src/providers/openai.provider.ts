import type {
  AIProvider, ExtractionInput, QuestionExtraction, SolveInput, QuestionSolution,
  ValidationInput, ValidationResult, TopicClassificationInput, TopicClassification,
  ProviderName,
} from '../types.js';
import { AIProviderError, ProviderTimeoutError, isRetryableError } from '../errors.js';

interface OpenAIModels {
  vision: string;
  text: string;
}

interface OpenAIProviderConfig {
  apiKey: string;
  models?: Partial<OpenAIModels>;
  timeoutMs?: number;
  maxTokens?: number;
}

const DEFAULT_MODELS: OpenAIModels = {
  vision: 'gpt-4o',
  text: 'gpt-4o-mini',
};

export class OpenAIProvider implements AIProvider {
  name: ProviderName = 'openai';
  private apiKey: string;
  private models: OpenAIModels;
  private timeoutMs: number;
  private maxTokens: number;

  constructor(config: string | OpenAIProviderConfig) {
    if (typeof config === 'string') {
      this.apiKey = config;
      this.models = DEFAULT_MODELS;
      this.timeoutMs = 30_000;
      this.maxTokens = 2048;
    } else {
      if (!config.apiKey) throw new AIProviderError('OPENAI_API_KEY is required', 'MISSING_API_KEY', 'openai');
      this.apiKey = config.apiKey;
      this.models = { ...DEFAULT_MODELS, ...config.models };
      this.timeoutMs = config.timeoutMs ?? 30_000;
      this.maxTokens = config.maxTokens ?? 2048;
    }
  }

  async extractQuestion(input: ExtractionInput): Promise<QuestionExtraction> {
    if (!input.imageBase64 && !input.imageUrl) {
      throw new AIProviderError('No image provided for extraction', 'NO_IMAGE', 'openai', 400);
    }

    const lang = input.language ?? 'auto';

    const systemPrompt = lang === 'tr'
      ? `Sen bir soru çıkarıcısısın. Verilen görüntüden soruyu ve seçenekleri çıkar.\nKurallar:\n- Yalnızca geçerli JSON döndür — başka hiçbir şey yazma\n- Matematik sembollerini koru (², √, ∑, vb.)\n- Seçenekleri {label, value, order}格式ında döndür\n- Bilmediğin bir şey varsa extractedText boş bırak\n- confidence 0.0-1.0 arasında\n- detectedLanguage: "en", "tr", veya "unknown"\n- questionType: "multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"\n- extractedText: sorunun tam metni\n- normalizedText: temizlenmiş soru metni`
      : `You are a question extractor. Extract questions and choices from images.\nRules:\n- Return ONLY valid JSON — nothing else, no markdown, no explanation\n- Preserve math symbols (², √, ∑, ∫, etc.)\n- Return choices as {label, value, order}\n- If unclear, set extractedText to empty string\n- confidence between 0.0 and 1.0\n- detectedLanguage: "en", "tr", or "unknown"\n- questionType: "multiple_choice", "true_false", "short_answer", "essay", "fill_blank", "matching", "ordering", "unknown"\n- extractedText: the full question text\n- normalizedText: cleaned question text`;

    const userParts: string[] = ['Extract the question and any choices from this image.'];

    if (input.imageBase64) {
      userParts.push({
        role: 'user',
        content: [
          { type: 'text', text: userParts[0] },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` } },
        ],
      } as any);
    } else if (input.imageUrl) {
      userParts.push({
        type: 'image_url',
        image_url: { url: input.imageUrl },
      } as any);
    }

    const payload: Record<string, unknown> = {
      model: this.models.vision,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userParts.length === 1 ? userParts[0] : userParts },
      ],
      max_tokens: this.maxTokens,
      temperature: 0.3,
    };

    const response = await this.makeRequest('/chat/completions', payload);

    const content = response.choices?.[0]?.message?.content ?? '';
    return this.parseExtractionResponse(content);
  }

  async solveQuestion(input: SolveInput): Promise<QuestionSolution> {
    const lang = input.language ?? 'en';

    const systemPrompt = lang === 'tr'
      ? `Sen bir çalışma asistanısın. Soruyu çöz ve net cevap ver.\nKurallar:\n- Yalnızca geçerli JSON döndür — başka hiçbir şey yazma\n- shortAnswer: kısa cevap metni\n- selectedOption: çoktan seçmeli ise 0 tabanlı seçenek indeksi (değilse undefined)\n- fullExplanation: detaylı açıklama\n- reasoningSummary: özetli akıl yürütme\n- confidenceScore: 0.0-1.0 arası güven skoru\n- validationStatus: "pass", "fail", "low_confidence", veya "not_validated"`
      : `You are a study assistant. Solve the question and provide a clear, accurate answer.\nRules:\n- Return ONLY valid JSON — no markdown, no explanation, just the JSON object\n- shortAnswer: brief answer text\n- selectedOption: 0-based option index for multiple choice (undefined otherwise)\n- fullExplanation: detailed explanation\n- reasoningSummary: summary of reasoning\n- confidenceScore: 0.0-1.0 confidence\n- validationStatus: "pass", "fail", "low_confidence", or "not_validated"\n- For multiple choice, include selectedOption`;

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
      model: this.models.text,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: this.maxTokens,
      temperature: 0.3,
    };

    const response = await this.makeRequest('/chat/completions', payload);
    const content = response.choices?.[0]?.message?.content ?? '';
    return this.parseSolveResponse(content);
  }

  async validateAnswer(input: ValidationInput): Promise<ValidationResult> {
    const lang = input.language ?? 'en';

    const systemPrompt = lang === 'tr'
      ? `Bu cevabı doğrula.\nKurallar:\n- Yalnızca geçerli JSON döndür\n- status: "pass" | "fail" | "low_confidence" | "not_validated"\n- issues: sorun listesi\n- confidenceAdjustment: -0.3 ile +0.1 arası\n- Boş cevap, anlamsız cevap, çelişkili ifadeler kontrol et`
      : `Validate this answer.\nRules:\n- Return ONLY valid JSON\n- status: "pass" | "fail" | "low_confidence" | "not_validated"\n- issues: list of problems found\n- confidenceAdjustment: -0.3 to +0.1\n- Check for: empty answer, nonsensical answer, contradictory statements`;

    const payload = {
      model: this.models.text,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Answer: ${input.shortAnswer}\nQuestion: ${input.question}` },
      ],
      max_tokens: 512,
      temperature: 0.1,
    };

    const response = await this.makeRequest('/chat/completions', payload);
    const content = response.choices?.[0]?.message?.content ?? '';
    return this.parseValidationResponse(content, input.shortAnswer);
  }

  async classifyTopic(input: TopicClassificationInput): Promise<TopicClassification> {
    const lang = input.language ?? 'en';

    const systemPrompt = lang === 'tr'
      ? `Bu sorunun konusunu sınıflandır.\nKurallar:\n- Yalnızca geçerli JSON döndür\n- topic: Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Edebiyat, Bilgisayar Bilimi, Hukuk, Ekonomi, Genel\n- confidence: 0.0-1.0\n- subtopic: varsa alt konu`
      : `Classify the topic of this question.\nRules:\n- Return ONLY valid JSON\n- topic: Mathematics, Physics, Chemistry, Biology, History, Geography, Literature, Computer Science, Law, Economics, General\n- confidence: 0.0-1.0\n- subtopic: optional subtopic`;

    const payload = {
      model: this.models.text,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${input.text}` },
      ],
      max_tokens: 256,
      temperature: 0.1,
    };

    const response = await this.makeRequest('/chat/completions', payload);
    const content = response.choices?.[0]?.message?.content ?? '';
    return this.parseTopicResponse(content);
  }

  private async makeRequest(endpoint: string, payload: Record<string, unknown>): Promise<{ choices?: Array<{ message?: { content?: string } }> }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        if (response.status === 429) {
          throw new AIProviderError(
            `OpenAI rate limit: ${response.status}`,
            'RATE_LIMITED',
            'openai',
            429,
            errorBody
          );
        }
        throw new AIProviderError(
          `OpenAI API error: ${response.status} ${response.statusText}`,
          'PROVIDER_ERROR',
          'openai',
          response.status,
          errorBody
        );
      }

      return await response.json() as Record<string, unknown>;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProviderTimeoutError('openai', this.timeoutMs);
      }
      if (err instanceof AIProviderError) throw err;
      if (isRetryableError(err)) throw err;
      throw new AIProviderError(
        `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
        'PROVIDER_ERROR',
        'openai',
        undefined,
        err
      );
    }
  }

  private parseExtractionResponse(content: string): QuestionExtraction {
    const cleaned = this.extractJSON(content);
    if (!cleaned) {
      return this.fallbackExtraction('Failed to parse extraction response as JSON');
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
    } catch {
      return this.fallbackExtraction(`JSON parse error: ${cleaned.slice(0, 100)}`);
    }
  }

  private parseSolveResponse(content: string): QuestionSolution {
    const cleaned = this.extractJSON(content);
    if (!cleaned) {
      return this.fallbackSolve('Failed to parse solve response as JSON');
    }

    try {
      const parsed = JSON.parse(cleaned);
      return {
        shortAnswer: String(parsed.shortAnswer ?? 'Unknown'),
        selectedOption: parsed.selectedOption !== undefined && parsed.selectedOption !== null
          ? Number(parsed.selectedOption) : undefined,
        fullExplanation: String(parsed.fullExplanation ?? ''),
        reasoningSummary: String(parsed.reasoningSummary ?? ''),
        confidenceScore: this.clampConfidence(parsed.confidenceScore ?? 0.5),
        validationStatus: this.parseValidationStatus(parsed.validationStatus),
      };
    } catch {
      return this.fallbackSolve(`JSON parse error: ${cleaned.slice(0, 100)}`);
    }
  }

  private parseValidationResponse(content: string, originalAnswer: string): ValidationResult {
    const cleaned = this.extractJSON(content);
    if (!cleaned) {
      return { status: 'not_validated', issues: ['Could not parse validation response'], confidenceAdjustment: 0 };
    }

    try {
      const parsed = JSON.parse(cleaned);
      return {
        status: this.parseValidationStatus(parsed.status, 'not_validated'),
        issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
        confidenceAdjustment: this.clampAdjustment(parsed.confidenceAdjustment ?? 0),
      };
    } catch {
      return { status: 'not_validated', issues: ['Validation parse error'], confidenceAdjustment: 0 };
    }
  }

  private parseTopicResponse(content: string): TopicClassification {
    const cleaned = this.extractJSON(content);
    if (!cleaned) {
      return { topic: 'General', confidence: 0.5 };
    }

    try {
      const parsed = JSON.parse(cleaned);
      return {
        topic: String(parsed.topic ?? 'General'),
        subtopic: parsed.subtopic ? String(parsed.subtopic) : undefined,
        confidence: this.clampConfidence(parsed.confidence ?? 0.5),
      };
    } catch {
      return { topic: 'General', confidence: 0.5 };
    }
  }

  private extractJSON(content: string): string | null {
    // Try to find JSON in markdown code blocks first
    const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();

    // Try bare object
    const bareMatch = content.match(/\{[\s\S]*\}/);
    if (bareMatch) return bareMatch[0].trim();

    return null;
  }

  private parseLanguage(lang: unknown): 'en' | 'tr' | 'unknown' {
    if (lang === 'tr' || lang === 'en') return lang;
    if (typeof lang === 'string' && (lang.startsWith('tr') || lang.startsWith('en'))) {
      return lang.startsWith('tr') ? 'tr' : 'en';
    }
    return 'unknown';
  }

  private parseQuestionType(t: unknown): QuestionExtraction['questionType'] {
    const valid = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank', 'matching', 'ordering', 'unknown'];
    if (typeof t === 'string' && valid.includes(t)) return t as QuestionExtraction['questionType'];
    return 'unknown';
  }

  private parseValidationStatus(s: unknown, fallback: ValidationResult['status'] = 'not_validated'): ValidationResult['status'] {
    const valid: ValidationResult['status'][] = ['pass', 'fail', 'low_confidence', 'not_validated'];
    if (typeof s === 'string' && valid.includes(s as ValidationResult['status'])) return s as ValidationResult['status'];
    return fallback;
  }

  private parseOptions(opts: unknown): QuestionExtraction['options'] {
    if (!Array.isArray(opts)) return undefined;
    return opts.map((o: unknown, i: number) => {
      if (typeof o === 'object' && o !== null) {
        return {
          label: String((o as Record<string, unknown>).label ?? String.fromCharCode(65 + i)),
          value: String((o as Record<string, unknown>).value ?? ''),
          order: Number((o as Record<string, unknown>).order ?? i),
        };
      }
      return { label: String.fromCharCode(65 + i), value: String(o), order: i };
    });
  }

  private clampConfidence(v: number): number {
    return Math.max(0, Math.min(1, Number(v) || 0.5));
  }

  private clampAdjustment(v: number): number {
    return Math.max(-0.3, Math.min(0.1, Number(v) || 0));
  }

  private fallbackExtraction(reason: string): QuestionExtraction {
    return {
      extractedText: '',
      normalizedText: '',
      detectedLanguage: 'unknown',
      questionType: 'unknown',
      confidence: 0,
    };
  }

  private fallbackSolve(reason: string): QuestionSolution {
    return {
      shortAnswer: 'Solve failed',
      fullExplanation: '',
      reasoningSummary: '',
      confidenceScore: 0,
      validationStatus: 'not_validated',
    };
  }
}