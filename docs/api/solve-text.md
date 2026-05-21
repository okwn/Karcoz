# POST /api/solve/text

Sends plain text question directly to the KARÇÖZ solver pipeline.

## Request

**Content-Type:** `application/json`

**Body:**

```json
{
  "text": "What is the capital of France?\nA) Paris\nB) London\nC) Berlin\nD) Madrid",
  "sourceUrl": "https://example.com/quiz",
  "pageTitle": "Geography Quiz",
  "explanationLevel": "standard",
  "resultMode": "full"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | Yes | Raw question text (1–10,000 chars) |
| `sourceUrl` | `string` (URL) | No | URL of the page |
| `pageTitle` | `string` | No | Page title (max 500 chars) |
| `explanationLevel` | `enum` | No | `brief`, `standard`, `detailed` (default: `standard`) |
| `resultMode` | `enum` | No | `short`, `full`, `detailed` (default: `full`) |

## Response

**200 OK**

```json
{
  "questionId": "req_1234567890_xyz789",
  "extraction": {
    "extractedText": "What is the capital of France?",
    "normalizedText": "What is the capital of France?",
    "detectedLanguage": "en",
    "questionType": "multiple_choice",
    "topic": "Geography",
    "options": [
      { "label": "A", "value": "Paris", "order": 0 },
      { "label": "B", "value": "London", "order": 1 },
      { "label": "C", "value": "Berlin", "order": 2 },
      { "label": "D", "value": "Madrid", "order": 3 }
    ]
  },
  "solution": {
    "shortAnswer": "Paris",
    "selectedOption": 0,
    "fullExplanation": "Option A) Paris is the correct answer.\n\nParis is the capital and largest city of France...",
    "reasoningSummary": "Paris is the capital and largest city of France.",
    "confidenceScore": 0.97,
    "validationStatus": "pass"
  },
  "performance": {
    "totalLatencyMs": 612,
    "extractionLatencyMs": 148,
    "solvingLatencyMs": 398,
    "validationLatencyMs": 97
  }
}
```

## Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Missing or malformed body |
| 422 | `NO_QUESTION_DETECTED` | Text too short or invalid |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Option Detection Patterns

The text extractor recognizes these option formats:

- `\nA.\s+text` — Uppercase letter with period
- `\n(a)\s+text` — Lowercase in parentheses
- `\n[①]\s+text` — Circled numbers

Example inputs:

```
What is 2+2?
A) 3
B) 4
C) 5
D) 6
```

```
Which of the following is a mammal?
① Dog
② Crocodile
③ Frog
④ Salmon
```