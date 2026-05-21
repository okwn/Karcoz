# 05 — Database Review

**PostgreSQL + Prisma Schema Review**

---

## Schema Overview

Prisma schema with PostgreSQL. No migration files in repo — schema is the source of truth.

**Deploy command**: `npx prisma migrate deploy` or `npx prisma db push`

---

## Models

### User & Auth

| Model | Fields | Indexes |
|-------|--------|---------|
| `User` | id, email (unique), role, plan, createdAt, updatedAt | — |
| `Session` | id, userId, token (unique), expiresAt, ipAddress, userAgent | userId, token |
| `AuthToken` | id, userId, token (unique), type, expiresAt, usedAt, email | token, email |
| `ExtensionToken` | id, userId, token (unique), deviceName, lastUsedAt, expiresAt | userId, token |

### Questions

| Model | Fields | Indexes |
|-------|--------|---------|
| `Question` | id, userId, sourceUrl, pageTitle, sourceType, extractedText, normalizedText, questionType, topic, options (JSON), shortAnswer, selectedOption, fullExplanation, confidenceScore, questionHash, status | questionHash |
| `QuestionSave` | id, questionId, selectedOption, notes, tags | — |
| `AuditLog` | id, questionId, action, details (JSON), ipAddress, userAgent | — |

### Usage & Billing

| Model | Fields | Indexes |
|-------|--------|---------|
| `UsageRecord` | id, userId, endpoint, count, period | userId+period |
| `UsageEvent` | id, userId, eventType, count, period | userId+period+eventType, createdAt |
| `Subscription` | id, userId, plan, status, provider, providerSubId, currentPeriodStart/End, canceledAt | userId, providerSubId |
| `RateLimitConfig` | id, tier (unique), minute, daily, monthly | — |

### Practice

| Model | Fields | Indexes |
|-------|--------|---------|
| `PracticeSet` | id, topic, subtopic, difficulty, language, basedOnQuestionId | — |
| `PracticeQuestion` | id, practiceSetId, questionText, options (JSON), correctAnswer, explanation, difficulty, topic, orderIndex | — |
| `PracticeAttempt` | id, practiceSetId, userId, answers (JSON), score, totalQuestions, completedAt, timeSpentMs | — |

### Telegram

| Model | Fields | Indexes |
|-------|--------|---------|
| `TelegramAccount` | id, userId (unique), telegramChatId (unique), telegramUsername, displayName, isLinked, linkedAt, unlinkedAt, lastActivityAt | — |
| `TelegramAuditLog` | id, telegramAccountId, action, details, ipAddress, userAgent, telegramChatId | — |

### Settings & Admin

| Model | Fields | Indexes |
|-------|--------|---------|
| `UserSettings` | id, userId (unique), storeHistory, storeImages, maxHistoryItems, explanationLevel, resultMode, telegramEnabled | — |
| `ModelConfig` | id (="default"), provider, modelName, fallbackModel, timeoutMs, maxTokens, enableValidation, compactMode | — |
| `AdminAuditLog` | id, adminId, action, target, changes (JSON), createdAt | adminId, createdAt |

---

## Relationships

- User → Question (1:many)
- User → Session (1:many, cascade delete)
- User → AuthToken (1:many, cascade delete)
- User → ExtensionToken (1:many, cascade delete)
- User → UserSettings (1:1, cascade delete)
- User → TelegramAccount (1:1)
- User → Subscription (1:many)
- User → UsageRecord (1:many)
- User → UsageEvent (1:many)
- User → PracticeAttempt (1:many)
- Question → QuestionSave (1:many)
- Question → AuditLog (1:many)
- PracticeSet → PracticeQuestion (1:many, cascade delete)
- PracticeSet → PracticeAttempt (1:many, cascade delete)
- TelegramAccount → TelegramAuditLog (1:many)

---

## Key Design Decisions

1. **Privacy settings in UserSettings**: `storeHistory`, `storeImages`, `maxHistoryItems` — explicit user control
2. **Tiered rate limits**: `RateLimitConfig` table allows admin-configurable limits per tier
3. **Extension tokens**: Separate from session auth, enables browser extension auth with 1-year tokens
4. **UsageEvent for plan limits**: Per-event-type tracking enables fine-grained solve counting
5. **Audit logging**: AdminAuditLog, AuditLog, TelegramAuditLog for compliance
6. **Question hashing**: Indexed for deduplication across users
7. **GDPR support**: Account deletion removes all user data transactionally

---

## Migration Status

**No migration files in repo.** Schema is the source of truth. Deploy via:
- `npx prisma migrate deploy` (production)
- `npx prisma db push` (development)

Recommendation: Commit migration files for version-controlled schema evolution.

---

## Verdict

**SOUND SCHEMA** — Well-structured with appropriate indexes, relationships, and audit trails. Missing migration files should be committed for production readiness.