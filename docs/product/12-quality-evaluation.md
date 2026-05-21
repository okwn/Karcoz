# Quality Evaluation System

**Phase:** 16
**Status:** Implemented

---

## Overview

The evaluation system measures KARÇÖZ's OCR extraction and question-solving quality across multiple dimensions. It runs against curated dataset files and produces structured JSON reports + Markdown summaries.

## Evaluation Dimensions

| Dimension | Description | Pass Threshold |
|-----------|-------------|----------------|
| **OCR extraction** | Character accuracy and token-level similarity vs expected text | similarity > 0.7 |
| **Option parsing** | Correct extraction and labeling of A/B/C/D options | accuracy ≥ 0.75 |
| **Topic classification** | Predicted topic matches dataset topic (substring match) | exact or partial |
| **Answer correctness** | Exact match or label match vs ground truth | exact match |
| **Confidence calibration** | Confidence score aligned with actual correctness (within 0.15) | true |
| **Latency** | Total E2E time within SLA | < 5s text, < 8s image |
| **Explanation quality** | Non-empty explanation generated | has content |

## Dataset Format

```typescript
interface EvalDatasetEntry {
  id: string;
  language: 'tr' | 'en';
  topic: string;
  difficulty: 'kolay' | 'orta' | 'zor' | 'easy' | 'medium' | 'hard';
  questionText: string;
  options?: string[];           // e.g. ["A. Paris", "B. London", ...]
  correctAnswer: string;        // 'A', 'B', 'C', 'D' or full text
  imagePath?: string;           // path to sample image (optional)
  expectedNormalizedText?: string; // what OCR should produce
}
```

## Running Evaluation

```bash
pnpm eval              # Full evaluation (OCR + solver)
pnpm eval:solver       # Solver only (skip OCR)
pnpm eval:ocr          # OCR only (extraction, no solving)
pnpm eval:report       # Generate markdown from latest report
```

## Output

- **JSON report:** `eval/reports/eval_<timestamp>.json`
- **Markdown report:** `eval/reports/eval_<timestamp>.md`

## Architecture

```
eval/
├── datasets/                    # Ground truth datasets
│   ├── turkish_math_basic.json
│   ├── turkish_logic_basic.json
│   ├── multiple_choice_mixed.json
│   └── ocr_samples/             # Sample images for OCR testing
├── scripts/
│   ├── run-eval.ts             # Main eval runner
│   ├── score-ocr.ts            # OCR-specific scoring utilities
│   ├── score-solver.ts         # Solver-specific scoring utilities
│   └── report-eval.ts          # Markdown report generator
└── src/
    ├── types.ts                # All eval schema types
    └── scorers/
        └── solver.ts           # Scoring functions per dimension
```

## Adding New Datasets

Add a JSON file to `eval/datasets/` following the `EvalDatasetEntry` schema. The runner auto-loads all `.json` files in that directory.

## Scope Flags

| Flag | OCR | Solver | Use Case |
|------|-----|--------|----------|
| `full` | ✅ | ✅ | Full pipeline validation |
| `solver` | ❌ | ✅ | Test solver quality in isolation |
| `ocr` | ✅ | ❌ | Test OCR extraction quality |

## Confidence Calibration

Well-calibrated means: when the model says 70% confidence and is correct, or 30% and is wrong. Threshold: |actual − expected| < 0.15.

## SLA Targets

| Input type | SLA |
|------------|-----|
| Text | < 5000ms total |
| Image | < 8000ms total |

## Mock Mode

The eval runner uses mock pipelines when real AI providers are unavailable. Mock answers are derived from dataset ground truth (correctAnswer field) so answer correctness can still be evaluated.