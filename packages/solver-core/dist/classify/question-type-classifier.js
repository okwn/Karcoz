/**
 * Classify question type from text patterns.
 * Order matters: check more specific patterns (algebra, sequence) before general ones (arithmetic).
 */
export function classifyQuestionType(question) {
    const text = question.normalizedText;
    // 1. SEQUENCE FIRST — number sequences look like algebra so checked first
    const sequencePatterns = [
        /(?:\d+\s*,\s*){2,}\d+/, // "1, 2, 3, 4"
        /(?:\d+\s*\.\s*){2,}\d+/, // "1. 2. 3. 4."
        /devam[ıi]\s*(?:ettir|et)/i, // Turkish: "devam ettir"
        /s[ıi]ra\s*(?:dizisi|d[ıi]?)/i, // Turkish: "sıra dizisi"
        /say[ıi]\s*dizisi/i, // Turkish: "sayı dizisi"
        /(?:\d+\s*,\s*){1,3}\.\.\./, // "1, 2, 3..."
        /\?\s*(?:dizisinde|kaçtır)/i, // sequence question
        /Fibonacci/i, // Fibonacci sequence
    ];
    for (const p of sequencePatterns) {
        if (p.test(text))
            return { type: 'sequence', confidence: 0.85 };
    }
    // 2. ALGEBRA — variables make it algebra, not arithmetic
    const algebraPatterns = [
        /[xyXYn][\+\-\*\/]?\s*[=\d]/, // x=, y/, n+3
        /\d+[xyXYn]\s*[\+\-\*\/]/, // 3x+, 5y-, 2n*
        /[=\-]\s*\d+\s*[xXyYn]/, // = 22, - 3
        /denklemin.*çözüm/i, // Turkish: "denklemin çözümü"
        /denklemini\s*çöz/i, // Turkish: "denklemini çöz"
    ];
    for (const p of algebraPatterns) {
        if (p.test(text))
            return { type: 'simple_algebra', confidence: 0.85 };
    }
    // 3. PERCENTAGE
    const percentPatterns = [
        /%\s*\d|%.*yüzde|%.*indirim|%.*art[ıi]ş/i,
        /yüzde\s*\d/i,
        /percent\s*(of|\d)/i,
        /'in\s*%/i, // 80'in %25'i
    ];
    for (const p of percentPatterns) {
        if (p.test(text))
            return { type: 'percentage', confidence: 0.9 };
    }
    // 4. RATIO
    const ratioPatterns = [
        /oran/i,
        /(?<![^\s])(\d+):(\d+)/, // 2:5 anywhere
        /\d+:\d+\s*(?:=|ise|e[şs]it)/i, // 2:5 = or 2:5 ise
    ];
    for (const p of ratioPatterns) {
        if (p.test(text))
            return { type: 'ratio', confidence: 0.8 };
    }
    // 5. ARITHMETIC — pure number operations (no variables)
    const arithmeticPatterns = [
        /[\+\-\*\/\=]\s*\d/, // operators with numbers
        /[×÷]\s*\d/, // Unicode multiply/divide
        /=\s*\?$/, // "= ?"
        /ka[çc]\s*(?:t[ıi]r|e?dir)/i, // Turkish: "kaçtır", "kaç eder"
    ];
    for (const p of arithmeticPatterns) {
        if (p.test(text))
            return { type: 'arithmetic', confidence: 0.85 };
    }
    // 6. MULTIPLE CHOICE — options detected
    if (question.options && question.options.length >= 2) {
        return { type: 'multiple_choice', confidence: 0.9 };
    }
    return { type: 'unknown', confidence: 0.3 };
}
