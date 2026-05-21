export interface ParsedOption {
    label: string;
    value: string;
    order: number;
}
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
export declare function parseOptions(text: string): ParsedOption[];
//# sourceMappingURL=option-parser.d.ts.map