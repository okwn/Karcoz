/**
 * Parse multiple choice options from normalized question text.
 * Supports:
 * - A) B) C) D) E)
 * - A. B. C. D. E.
 * - a) b) c)
 * - ① ② ③ ④ ⑤
 * - 1. 2. 3. 4. 5.
 * - Line-broken options
 */
export function parseOptions(text) {
    const options = [];
    // Patterns for option starts
    const patterns = [
        /^([A-E])\)\s*(.+)/im, // A) text
        /^([A-E])\.\s+(.+)/im, // A. text
        /^([a-e])\)\s*(.+)/im, // a) text
        /^\(([A-E])\)\s*(.+)/im, // (A) text
        /^[①-⑤]\s*(.+)/im, // ① text
        /^(\d+)\)\s*(.+)/im, // 1) text
        /^(\d+)\.\s+(.+)/im, // 1. text
    ];
    const lines = text.split('\n');
    let currentOption = null;
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        let matched = false;
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                // Save previous option if exists
                if (currentOption)
                    options.push(currentOption);
                const label = match[1];
                const value = match[2].trim();
                currentOption = { label, value, order: options.length };
                matched = true;
                break;
            }
        }
        // If no new option started, continue building current option
        if (!matched && currentOption && line.length > 0) {
            currentOption.value += ' ' + line;
        }
    }
    // Don't forget last option
    if (currentOption)
        options.push(currentOption);
    // Clean up values
    return options.map(o => ({ ...o, value: o.value.replace(/\s+/g, ' ').trim() }));
}
//# sourceMappingURL=option-parser.js.map