/**
 * Normalize whitespace:
 * - Collapse multiple spaces/tabs to single space
 * - Remove leading/trailing whitespace per line
 * - Preserve double-newline paragraph breaks
 * - Handle line-broken words (join words broken across lines)
 */
export function normalizeWhitespace(text) {
    const changes = [];
    let result = text;
    // Replace tabs with spaces
    if (result.includes('\t')) {
        changes.push('tabs→spaces');
        result = result.replace(/\t/g, ' ');
    }
    // Collapse multiple spaces
    if (/  +/.test(result)) {
        changes.push('collapse-multiple-spaces');
        result = result.replace(/  +/g, ' ');
    }
    // Remove leading/trailing whitespace per line
    const beforeLines = result.split('\n');
    const afterLines = beforeLines.map(l => l.trim());
    if (beforeLines.some((l, i) => l !== afterLines[i])) {
        changes.push('trim-line-ends');
        result = afterLines.join('\n');
    }
    // Join line-broken words (line ends with hyphen)
    result = result.replace(/-\n\s*/g, '');
    // Collapse 3+ consecutive newlines to 2 (preserve paragraph breaks)
    if (/\n{3,}/.test(result)) {
        changes.push('collapse-paragraph-breaks');
        result = result.replace(/\n{3,}/g, '\n\n');
    }
    return { text: result, changes };
}
//# sourceMappingURL=normalize-whitespace.js.map