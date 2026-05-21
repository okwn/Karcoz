export interface LatencyBreakdown {
  captureLatencyMs: number;
  uploadLatencyMs: number;
  extractionLatencyMs: number;
  solveLatencyMs: number;
  validationLatencyMs: number;
  totalLatencyMs: number;
}

export class LatencyTracker {
  private phases: Map<string, number> = new Map();
  private startTime: number = Date.now();

  start(phase: keyof LatencyBreakdown): void {
    this.phases.set(phase, Date.now());
  }

  end(phase: keyof LatencyBreakdown): number {
    const start = this.phases.get(phase);
    if (start === undefined) return 0;
    const elapsed = Date.now() - start;
    this.phases.set(phase, elapsed);
    return elapsed;
  }

  getBreakdown(): LatencyBreakdown {
    const get = (key: string) => this.phases.get(key) ?? 0;
    return {
      captureLatencyMs: get('captureLatencyMs'),
      uploadLatencyMs: get('uploadLatencyMs'),
      extractionLatencyMs: get('extractionLatencyMs'),
      solveLatencyMs: get('solveLatencyMs'),
      validationLatencyMs: get('validationLatencyMs'),
      totalLatencyMs: Date.now() - this.startTime,
    };
  }

  reset(): void {
    this.phases.clear();
    this.startTime = Date.now();
  }
}