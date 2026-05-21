# API Solve Pipeline Architecture

## Overview

The `/api/solve/image` and `/api/solve/text` endpoints form the core of the KARÇÖZ problem-solving pipeline. They accept questions from images (via base64 or URL) or plain text, extract the question content, classify the topic, derive an answer, and validate the solution — all with detailed performance tracking.

## Architecture

```
Client Request (imageBase64 / imageUrl / text)
        ↓
    ┌──────────────────────────────────────────────┐
    │            Rate Limit Middleware             │
    │  Per-minute / daily / monthly enforcement   │
    └──────────────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────────────┐
    │            SolveController                    │
    │  • Zod schema validation                     │
    │  • Request ID generation                    │
    │  • Error mapping                            │
    └──────────────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────────────┐
    │           SolveService                        │
    │  Orchestrates the full pipeline              │
    └──────────────────────────────────────────────┘
        ↓            ↓            ↓            ↓
   ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
   │Extract │  │ Topic  │  │ Solve  │  │ Validate │
   │Service │  │Classify│  │Service │  │ Service  │
   └────────┘  └────────┘  └────────┘  └──────────┘
        ↓
   ┌──────────────────────────────────────────────┐
   │           AuditService                       │
   │  Logs: SOLVE_REQUEST, SOLVE_SUCCESS,         │
   │        SOLVE_ERROR, RATE_LIMIT_EXCEEDED     │
   └──────────────────────────────────────────────┘
        ↓
   ┌──────────────────────────────────────────────┐
   │           UsageService                       │
   │  Tracks per-user/per-endpoint usage counts   │
   └──────────────────────────────────────────────┘
        ↓
   ┌──────────────────────────────────────────────┐
   │           PostgreSQL (Prisma)                │
   │  Questions, QuestionSaves, AuditLogs,        │
   │  UsageRecords, RateLimitConfig               │
   └──────────────────────────────────────────────┘
```

## Services

### extraction.service.ts

Mock OCR/text extraction. Returns structured question data:

```typescript
interface ExtractionResult {
  extractedText: string;
  normalizedText: string;
  detectedLanguage: string | undefined;
  questionType: QuestionType;
  topic: string | undefined;
  options: { label: string; value: string; order: number }[] | undefined;
  confidence: number;
}
```

Supports:
- Multiple choice detection (`A.`, `B.`, `(a)`, `①`)
- Topic keyword matching
- Language detection (English, Turkish)

### topic-classifier.service.ts

Keyword-based topic classification across 10 domains: Mathematics, Physics, Chemistry, Biology, History, Geography, Literature, Computer Science, Law, Economics.

### solution.service.ts

Mock solver that returns predefined answers with confidence scores. In production, this will call real AI/OCR providers.

### validation.service.ts

Post-solve validation:

```typescript
validateSolution(shortAnswer, extractedText, extractedConfidence) → ValidationResult
```

Checks:
- Non-empty answer
- Extraction confidence threshold
- Answer length proportionality
- Control character detection

### audit.service.ts

Non-blocking audit logging to PostgreSQL:

```typescript
logSolveRequest(requestId, imageBase64, imageUrl)
logSolveSuccess(questionId, latencyMs)
logSolveError(questionId, errorCode, message)
logRateLimitExceeded(ip, endpoint)
```

### usage.service.ts

Per-user endpoint usage tracking with configurable limits:

```typescript
DEFAULT_LIMITS = {
  free:  { minute: 10, daily: 100, monthly: 1000 },
  premium: { minute: 60, daily: 1000, monthly: 20000 },
}
```

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_IMAGE` | 400 | No image provided |
| `IMAGE_TOO_LARGE` | 413 | Base64 > 15MB |
| `NO_QUESTION_DETECTED` | 422 | Extraction < 5 chars |
| `LOW_CONFIDENCE` | 422 | Extraction confidence < 0.3 |
| `PROVIDER_TIMEOUT` | 504 | AI provider timed out |
| `RATE_LIMITED` | 429 | User hit rate limit |

## Data Flow

```
POST /api/solve/image
  → parse body (Zod)
  → generate requestId
  → check rate limit
  → extractionService.extractFromImage()
  → topicClassifier.classifyTopic()
  → solutionService.solveQuestion()
  → validationService.validateSolution()
  → update confidence with validation adjustment
  → prisma.question.create()
  → auditService.logSolveSuccess()
  → return { questionId, extraction, solution, performance }
```

## Performance Budgets

| Stage | Target | Limit |
|-------|--------|-------|
| Extraction | < 300ms | 500ms |
| Solving | < 500ms | 1000ms |
| Validation | < 150ms | 300ms |
| Total | < 1000ms | 2000ms |

## Database Schema

```
Question → stores all solve inputs and outputs
QuestionSave → user annotations
AuditLog → audit trail for compliance
UsageRecord → per-user usage counters
RateLimitConfig → tier-based limit overrides
```

## Future Integration Points

When connecting real providers:

1. **extraction.service.ts** → Replace with real OCR provider (Google Cloud Vision, AWS Textract)
2. **solution.service.ts** → Replace with real AI solver (OpenAI, Anthropic, local model)
3. **validation.service.ts** → Can remain as-is for post-solve validation