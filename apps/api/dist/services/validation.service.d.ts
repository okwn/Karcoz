export type ValidationStatus = 'pass' | 'fail' | 'low_confidence' | 'not_validated';
export interface ValidationResult {
    status: ValidationStatus;
    issues: string[];
    confidenceAdjustment: number;
}
export declare function validateSolution(shortAnswer: string, extractedText: string, extractedConfidence: number): Promise<ValidationResult>;
//# sourceMappingURL=validation.service.d.ts.map