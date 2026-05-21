/**
 * Format a detailed explanation based on solver type.
 */
export function formatExplanation(solverType, language, data) {
    const lang = language === 'unknown' ? 'tr' : language;
    const d = data;
    switch (solverType) {
        case 'arithmetic': {
            const expr = String(d.expression ?? '');
            const result = String(d.result ?? '');
            const verified = d.verified;
            if (lang === 'tr') {
                return verified ? `Doğrulandı: ${expr} ✓` : `Hesaplama: ${expr} = ${result}`;
            }
            return `Calculation: ${expr} = ${result}`;
        }
        case 'percentage': {
            const percent = d.percent;
            const base = d.base;
            const result = String(d.result ?? '');
            const typ = String(d.type ?? '');
            if (lang === 'tr') {
                if (typ === 'discount') {
                    return `%${percent} indirim uygulanır: ${base} × ${percent}/100 = ${result}`;
                }
                return `%${percent} × ${base} = ${result}`;
            }
            return `${percent}% of ${base} = ${result}`;
        }
        case 'ratio': {
            const ratio = String(d.ratio ?? '');
            const value = String(d.value ?? '');
            if (lang === 'tr')
                return `Oran: ${ratio} → eksik: ${value}`;
            return `Ratio: ${ratio} → answer: ${value}`;
        }
        case 'simple_algebra': {
            const eq = String(d.equation ?? '');
            const result = String(d.result ?? '');
            const direct = d.direct;
            if (lang === 'tr') {
                return direct ? `x = ${result}` : `Denklem çözümü: ${eq} → x = ${result}`;
            }
            return `Solve: ${eq} → x = ${result}`;
        }
        case 'sequence': {
            const seq = String(d.sequence ?? '');
            const next = String(d.nextTerm ?? '');
            const typ = String(d.type ?? '');
            if (lang === 'tr')
                return `${typ} dizi: ${seq} → bir sonraki: ${next}`;
            return `${typ} sequence: ${seq} → next: ${next}`;
        }
        case 'multiple_choice': {
            const count = d.optionCount ?? 0;
            if (lang === 'tr') {
                return `${count} seçenek arasından seçim yapıldı. AI doğrulaması gereklidir.`;
            }
            return `Selected from ${count} options. AI verification recommended.`;
        }
        case 'ai_fallback':
        case 'fallback_ai': {
            const err = d.error ? String(d.error) : '';
            if (lang === 'tr') {
                return err ? `AI çözümü kullanıldı (hata: ${err})` : 'AI çözümü kullanıldı';
            }
            return err ? `AI solution used (error: ${err})` : 'AI solution used';
        }
        default:
            return `${solverType}: ${JSON.stringify(data)}`;
    }
}
/**
 * Generate brief reasoning summary (1-2 lines).
 */
export function briefSummary(solverType, result, language) {
    const lang = language === 'unknown' ? 'tr' : language;
    const map = {
        arithmetic: { tr: `Hesaplandı: ${result}`, en: `Calculated: ${result}` },
        percentage: { tr: `% hesaplandı: ${result}`, en: `% calculated: ${result}` },
        ratio: { tr: `Oran çözüldü: ${result}`, en: `Ratio solved: ${result}` },
        simple_algebra: { tr: `Denklem çözüldü: x = ${result}`, en: `Equation solved: x = ${result}` },
        sequence: { tr: `Dizi devamı: ${result}`, en: `Sequence next: ${result}` },
        multiple_choice: { tr: `Seçenek: ${result}`, en: `Option: ${result}` },
        ai_fallback: { tr: `AI ile çözüldü: ${result}`, en: `AI solved: ${result}` },
    };
    return map[solverType]?.[lang] ?? `${solverType}: ${result}`;
}
