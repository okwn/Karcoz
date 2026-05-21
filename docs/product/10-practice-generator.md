# Practice Generator — Product Specification

## Overview

The Practice Generator transforms KARÇÖZ from a passive solver into an active learning tool. Users solve AI-generated questions on topics where they need reinforcement, attempt them, and receive targeted feedback with explanations.

## User Flow

```
Solve Question → "Practice Similar" → Generate Set → Attempt Quiz → View Score → Review Explanations
```

## Practice Generation Request

```json
{
  "topic": "Mathematics",
  "subtopic": "Calculus",
  "difficulty": "medium",
  "count": 5,
  "basedOnQuestionId": "q_abc123",
  "language": "en",
  "includeExplanations": true
}
```

## Practice Generation Response

```json
{
  "practiceSetId": "ps_xyz789",
  "questions": [
    {
      "questionText": "What is the derivative of x³?",
      "options": [
        { "label": "A", "value": "x²", "order": 0 },
        { "label": "B", "value": "3x²", "order": 1 },
        { "label": "C", "value": "3x", "order": 2 },
        { "label": "D", "value": "x³", "order": 3 }
      ],
      "correctAnswer": "B",
      "explanation": "Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. For x³, the derivative is 3x².",
      "difficulty": "medium",
      "topic": "Mathematics"
    }
  ]
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/practice/generate` | Generate a new practice set |
| GET | `/api/practice/sets` | List all practice sets |
| GET | `/api/practice/sets/:id` | Get a specific practice set with questions |
| POST | `/api/practice/sets/:id/attempt` | Submit answers and get results |
| GET | `/api/practice/recommended` | Get AI-recommended practice topics |

## Recommended Logic

The system analyzes question history and computes per-topic average confidence. Topics with low confidence (<0.6) are flagged for review. The recommended endpoint surfaces these weak areas with suggested question counts and difficulty levels.

## Answer Validation

Questions are validated at generation time by checking:
- Question text ≥ 10 characters
- Answer non-empty
- Options array: ≥ 2 items (if present)

The mock provider returns consistent answers that pass the validator. A real AI provider would call `generatePractice` on the AI provider and validate the output before storing.

## Frontend Pages

- `/practice` — Main practice hub with three views: Generate, My Sets, Recommended
- Quiz flow: Generate → Start Quiz → Answer questions (one at a time with Previous/Next) → Submit → Score + Explanations

## Database

`PracticeSet` → has many `PracticeQuestion` → has many `PracticeAttempt`

Attempt stores the user's answers as JSON for replay/review.