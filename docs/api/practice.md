# Practice API — Reference

Base URL: `http://localhost:8100/api`

## POST /api/practice/generate

Generate a new practice set of questions.

**Request:**
```json
{
  "topic": "Mathematics",
  "subtopic": "Derivatives",
  "difficulty": "medium",
  "count": 5,
  "basedOnQuestionId": "q_abc123",
  "language": "en",
  "includeExplanations": true
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `topic` | string | Yes | — | Primary topic (Mathematics, Physics, etc.) |
| `subtopic` | string | No | — | Specific subtopic |
| `difficulty` | string | No | "medium" | "easy" \| "medium" \| "hard" |
| `count` | number | No | 5 | Questions to generate (1–20) |
| `basedOnQuestionId` | string | No | — | Generate similar to an existing question |
| `language` | string | No | "en" | "en" \| "tr" |
| `includeExplanations` | boolean | No | true | Include explanations per question |

**Response (200):**
```json
{
  "practiceSetId": "ps_xyz789",
  "questions": [
    {
      "questionText": "...",
      "options": [{ "label": "A", "value": "...", "order": 0 }, ...],
      "correctAnswer": "B",
      "explanation": "...",
      "difficulty": "medium",
      "topic": "Mathematics"
    }
  ]
}
```

**Errors:**
- `400` — Invalid request body
- `500` — Generation failed (no valid questions produced)

---

## GET /api/practice/sets

List all practice sets ordered by creation date.

**Response (200):**
```json
{
  "data": [
    {
      "id": "ps_xyz789",
      "topic": "Mathematics",
      "subtopic": "Derivatives",
      "difficulty": "medium",
      "language": "en",
      "basedOnQuestionId": "q_abc123",
      "createdAt": 1747442400000,
      "questionCount": 5,
      "attemptCount": 2
    }
  ]
}
```

---

## GET /api/practice/sets/:id

Get a specific practice set with its questions.

**Response (200):**
```json
{
  "id": "ps_xyz789",
  "topic": "Mathematics",
  "subtopic": "Derivatives",
  "difficulty": "medium",
  "language": "en",
  "createdAt": 1747442400000,
  "questions": [
    {
      "id": "pq_001",
      "questionText": "What is the derivative of x³?",
      "options": [...],
      "difficulty": "medium",
      "topic": "Mathematics",
      "orderIndex": 0
    }
  ],
  "recentAttempts": [
    {
      "id": "pa_001",
      "score": 80,
      "totalQuestions": 5,
      "completedAt": 1747443000000,
      "timeSpentMs": 45000
    }
  ]
}
```

**Errors:**
- `404` — Practice set not found

---

## POST /api/practice/sets/:id/attempt

Submit answers for a practice set.

**Request:**
```json
{
  "answers": [
    { "questionId": "pq_001", "answer": "B" },
    { "questionId": "pq_002", "answer": "A" }
  ],
  "timeSpentMs": 45000
}
```

**Response (200):**
```json
{
  "attemptId": "pa_001",
  "score": 80,
  "totalQuestions": 5,
  "correctCount": 4,
  "results": [
    {
      "questionId": "pq_001",
      "correctAnswer": "B",
      "userAnswer": "B",
      "isCorrect": true,
      "explanation": "Using the power rule..."
    }
  ]
}
```

**Errors:**
- `400` — Invalid request body
- `404` — Practice set not found

---

## GET /api/practice/recommended

Get AI-recommended practice topics based on weak areas.

**Query params:**
- `count` (optional): Number of recommendations (1–10, default 3)

**Response (200):**
```json
{
  "data": [
    {
      "topic": "Physics",
      "reason": "Practice recommended",
      "questionCount": 7,
      "difficulty": "medium"
    },
    {
      "topic": "Chemistry",
      "reason": "Needs review",
      "questionCount": 10,
      "difficulty": "easy"
    }
  ]
}
```

**Logic:**
- Computes per-topic average confidence from question history
- Topics with avg confidence < 0.6 → "Needs review", difficulty: easy
- Topics with avg confidence 0.6–0.75 → "Practice recommended", difficulty: medium
- Topics with avg confidence > 0.75 → "Monitor progress"
- Fills with general topics if fewer than requested