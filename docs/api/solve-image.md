# POST /api/solve/image

Sends a screenshot or captured image to the KARÇÖZ solver pipeline.

## Request

**Content-Type:** `application/json`

**Body:**

```json
{
  "imageBase64": "base64-encoded-image-data",
  "imageUrl": "https://example.com/image.png",
  "sourceType": "upload | url | clipboard | screen",
  "sourceUrl": "https://example.com/page",
  "pageTitle": "Math Quiz - Chapter 5",
  "explanationLevel": "brief | standard | detailed",
  "resultMode": "short | full | detailed"
}
```

One of `imageBase64` or `imageUrl` is required.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `imageBase64` | `string` | No | Base64-encoded PNG/JPEG image (max 15MB) |
| `imageUrl` | `string` (URL) | No | URL to image to fetch |
| `sourceType` | `enum` | Yes | How the image was captured |
| `sourceUrl` | `string` (URL) | No | URL of the page where capture occurred |
| `pageTitle` | `string` | No | Title of the page (max 500 chars) |
| `explanationLevel` | `enum` | No | Depth of explanation (default: `standard`) |
| `resultMode` | `enum` | No | Response verbosity (default: `full`) |

## Response

**200 OK**

```json
{
  "questionId": "req_1234567890_abc123",
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
    "fullExplanation": "Option A) Paris is the correct answer.\n\nParis is the capital...",
    "reasoningSummary": "Paris is the capital and largest city of France.",
    "confidenceScore": 0.97,
    "validationStatus": "pass"
  },
  "performance": {
    "totalLatencyMs": 847,
    "extractionLatencyMs": 203,
    "solvingLatencyMs": 412,
    "validationLatencyMs": 102
  }
}
```

## Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Missing or malformed body |
| 400 | `INVALID_IMAGE` | No image data provided |
| 413 | `IMAGE_TOO_LARGE` | Image exceeds 15MB limit |
| 422 | `NO_QUESTION_DETECTED` | OCR found no question text |
| 422 | `LOW_CONFIDENCE` | Extraction confidence < 30% |
| 429 | `RATE_LIMITED` | Per-minute or daily limit exceeded |
| 504 | `PROVIDER_TIMEOUT` | AI provider timed out |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Performance Metrics

| Field | Description |
|-------|-------------|
| `totalLatencyMs` | End-to-end request time |
| `extractionLatencyMs` | OCR/text extraction time |
| `solvingLatencyMs` | AI solving time |
| `validationLatencyMs` | Answer validation time |

## Rate Limits

| Tier | Per Minute | Daily |
|------|-----------|-------|
| Free | 10 | 100 |
| Premium | 60 | 1000 |

Headers returned:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After` (when limited)