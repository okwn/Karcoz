const TURKISH_EXTRACT_SYSTEM = `Sen bir soru çıkarıcısısın. Verilen görüntüden soruyu ve seçenekleri çıkar.
Kurallar:
- Yalnızca geçerli JSON döndür
- Matematik sembollerini koru
- Seçenekleri label, value, order ile döndür
- Bilmediğiniz bir şey varsa "extractedText" boş bırak
- confidence 0.0-1.0 arasında`;
const ENGLISH_EXTRACT_SYSTEM = `You are a question extractor. Extract questions and choices from images.
Rules:
- Return only valid JSON
- Preserve math symbols (², √, ∑, etc.)
- Return choices as {label, value, order}
- If unclear, set extractedText to empty
- confidence between 0.0 and 1.0`;
export function buildImagePrompt(options = {}) {
    const lang = options.language ?? 'auto';
    const system = lang === 'tr' ? TURKISH_EXTRACT_SYSTEM : ENGLISH_EXTRACT_SYSTEM;
    const user = [
        'Extract the question and any choices from this image.',
        options.preserveMath ? 'Preserve all mathematical notation.' : '',
        'Return JSON with: extractedText, normalizedText, detectedLanguage, questionType, options, confidence.',
    ].filter(Boolean).join('\n');
    return { system, user };
}
export const SOLVE_QUESTION_PROMPT = {
    system: {
        en: `You are a study assistant. Solve the question and provide a clear, accurate answer.
Rules:
- Return only valid JSON
- Be precise and concise
- Mark your confidence (0.0-1.0)
- For multiple choice, include selectedOption (0-based index)
- Provide fullExplanation and reasoningSummary
- Do not over-explain`,
        tr: `Sen bir çalışma asistanısın. Soruyu çöz ve net bir cevap ver.
Kurallar:
- Yalnızca geçerli JSON döndür
- Net ve öz ol
- Güven skorunu belirt (0.0-1.0)
- Çoktan seçmeli ise selectedOption ekle (0 tabanlı)`,
    },
};
export function buildSolvePrompt(question, explanationLevel, language = 'en') {
    const system = SOLVE_QUESTION_PROMPT.system[language] ?? SOLVE_QUESTION_PROMPT.system.en;
    const user = `Question: ${question}\n\nExplanation level: ${explanationLevel}`;
    return { system, user };
}
export const VALIDATE_ANSWER_PROMPT = {
    en: `Validate this answer. Check for:
- Empty or nonsensical answer
- Answer length vs question length
- Contradictory statements
- Confidence score adjustment needed

Return JSON with: status (pass/fail/low_confidence/not_validated), issues[], confidenceAdjustment (-0.3 to +0.1)`,
    tr: `Bu cevabı doğrula. Şunları kontrol et:
- Boş veya anlamsız cevap
- Cevap uzunluğu soru uzunluğu ile orantılı mı
- Çelişkili ifadeler
- Güven skoru ayarlaması gerekli mi

JSON döndür: status, issues[], confidenceAdjustment`,
};
export function buildValidatePrompt(shortAnswer, question, language = 'en') {
    const system = VALIDATE_ANSWER_PROMPT[language] ?? VALIDATE_ANSWER_PROMPT.en;
    const user = `Answer: ${shortAnswer}\nQuestion: ${question}`;
    return { system, user };
}
export const CLASSIFY_TOPIC_PROMPT = {
    en: `Classify the topic of this question. Return JSON with: topic, subtopic?, confidence (0.0-1.0). Topics: Mathematics, Physics, Chemistry, Biology, History, Geography, Literature, Computer Science, Law, Economics, or General.`,
    tr: `Bu sorunun konusunu sınıflandır. JSON döndür: topic, subtopic?, confidence. Konular: Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Edebiyat, Bilgisayar Bilimi, Hukuk, Ekonomi, veya Genel.`,
};
export function buildTopicPrompt(text, language = 'en') {
    const system = CLASSIFY_TOPIC_PROMPT[language] ?? CLASSIFY_TOPIC_PROMPT.en;
    return { system, user: `Question: ${text}` };
}
//# sourceMappingURL=image-to-question.prompt.js.map