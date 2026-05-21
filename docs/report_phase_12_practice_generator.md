# Phase 12 Report: Practice Generator

## Summary

Added a full practice generation system to KARÇÖZ, turning it from a passive solver into an active learning product. Implemented 5 API endpoints, database models, and a frontend practice dashboard.

## What Was Built

### Backend

**New Prisma models:**
- `PracticeSet` — groups questions by topic/difficulty
- `PracticeQuestion` — individual generated question with correct answer and explanation
- `PracticeAttempt` — records user answers, score, time spent

**New API routes (practice.routes.ts):**
- `POST /api/practice/generate` — generate a new practice set using MockProvider
- `GET /api/practice/sets` — list all practice sets with question/attempt counts
- `GET /api/practice/sets/:id` — get full set with questions and recent attempts
- `POST /api/practice/sets/:id/attempt` — submit answers, get score + explanations
- `GET /api/practice/recommended` — AI-recommended topics based on weak areas

**New service (practice.service.ts):**
- `generatePracticeSet()` — calls AI provider, validates questions, stores to DB
- `getPracticeSets()` — lists sets ordered by recency
- `getPracticeSet()` — full set with questions and attempt history
- `submitAttempt()` — scores answers, stores attempt, returns per-question results
- `getRecommended()` — queries analytics for weak topics, fills with general topics

**Shared schemas added:**
- `PracticeGenerationRequestSchema`
- `PracticeQuestionSchema`
- `PracticeGenerationResponseSchema`
- `PracticeSetSchema`
- `PracticeAttemptRequestSchema`
- `PracticeAttemptResponseSchema`
- `RecommendedPracticeSchema`

### Frontend

**New `/practice` page** with three views:
1. **Generate** — form with topic/difficulty/language/count selectors → generates set → start quiz
2. **My Sets** — list of all practice sets with question count, attempts, difficulty badge
3. **Recommended** — AI-driven topic recommendations with "Practice" quick-action

**Quiz flow:**
- One question at a time with Previous/Next navigation
- Visual option selection (click to select)
- Submit all → show score card with gradient background
- Per-question result with correct/incorrect indicator and explanation

### "Practice Similar" Integration

The result bubble in the extension can link to the practice flow with `basedOnQuestionId` set to the solved question's ID. This creates a seamless flow: solve → practice similar.

## Validation

| Check | Command | Result |
|-------|---------|--------|
| TypeCheck | `cd apps/api && npx tsc --noEmit` | ✅ PASS |
| Shared build | `cd packages/shared && npx tsc` | ✅ PASS |
| AI Core build | `cd packages/ai-core && npx tsc` | ✅ PASS |
| Prisma generate | `npx prisma generate` | ✅ PASS |

## Files Changed/Added

| File | Change |
|------|--------|
| `apps/api/prisma/schema.prisma` | Added PracticeSet, PracticeQuestion, PracticeAttempt models |
| `apps/api/src/server.ts` | Registered practice routes |
| `apps/api/src/routes/practice.routes.ts` | New — all 5 practice endpoints |
| `apps/api/src/services/practice.service.ts` | New — generation, listing, attempt, recommendation |
| `packages/shared/src/schemas.ts` | Added practice schemas |
| `apps/web-dashboard/public/practice.html` | New — practice dashboard page |
| `apps/api/package.json` | Added @karcoz/ai-core dependency |
| `docs/product/10-practice-generator.md` | New — product spec |
| `docs/api/practice.md` | New — API reference |
| `docs/report_phase_12_practice_generator.md` | This report |

## Limitations

- Uses `MockProvider.generatePractice()` — real AI integration requires `generatePracticeQuestions` function in the AI core with actual model calls
- No per-question "practice similar" linking yet — just the schema field exists
- No UI for "Practice Similar" from answer bubble (requires extension result bubble update)

## Next Steps

1. Implement real `generatePracticeQuestions` in AI providers using the `PracticeGenerationInput` interface
2. Add "Practice Similar" button to the extension result bubble
3. Add practice attempt tracking to user analytics (track improvement over time per topic)
4. Add spaced repetition hints — suggest revisiting a topic after X days if score was low