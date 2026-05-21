# 08 — Database and Data Model Review

## Purpose
Analyze the Prisma schema, migrations, relationships, indexes, and data management.

---

## Schema Overview

**File:** `apps/api/prisma/schema.prisma`

**Database:** PostgreSQL 16 (via `DATABASE_URL` env var)

**Migration:** Single migration `20260517181506_initial` — all 18 models created.

---

## Models

### User
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  role      Role     @default(USER)  // USER | ADMIN
  plan      Plan     @default(FREE)  // FREE | PRO | TEAM
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```
**Indexes:** `email` (unique)
**Relationships:** One-to-many: questions, sessions, tokens, practice attempts, settings, telegram accounts, subscriptions

**Status: ✅ Clean**

### Question
```prisma
model Question {
  id               String    @id @default(cuid())
  userId           String?
  extractedText    String?
  normalizedText   String?
  questionType     String?
  topic            String?
  subtopic         String?
  options          Json?     // [{label, value, order}]
  shortAnswer      String?
  fullExplanation  String?
  confidenceScore  Float?
  questionHash     String?   @unique  // Deduplication
  status           String    @default("pending")  // pending/solved/saved
  sourceUrl        String?
  pageTitle        String?
  difficulty       String?
  language         String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User?     @relation(fields: [userId], references: [id])
  saves            QuestionSave[]
  auditLogs        AuditLog[]
}
```
**Indexes:** `userId`, `questionHash` (unique), `createdAt`, `topic`
**Relationships:** User (1:many), QuestionSave (1:many), AuditLog (1:many)

**Status: ✅ Good — questionHash enables deduplication**

### QuestionSave
```prisma
model QuestionSave {
  id           String   @id @default(cuid())
  questionId   String
  userId       String
  selectedOption Int?
  notes        String?
  tags         String[]  @default([])
  createdAt    DateTime @default(now())
  question     Question @relation(fields: [questionId], references: [id])
}
```
**Indexes:** `questionId`, `userId`

**Status: ✅ Clean**

### AuditLog
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  questionId String?
  userId     String?
  action     String   // e.g., "created", "viewed", "saved"
  details    Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())
  question   Question? @relation(fields: [questionId], references: [id])
}
```
**Indexes:** `userId`, `createdAt`

**Status: ✅ Good for compliance**

### UsageRecord
```prisma
model UsageRecord {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   // e.g., "solve_image", "solve"
  period    String   // "minute", "day", "month"
  count     Int      @default(0)
  updatedAt DateTime @updatedAt
}
```
**Indexes:** `userId`, `endpoint`, `period` (unique composite)

**Status: ✅ Good for rate limiting**

### UsageEvent
```prisma
model UsageEvent {
  id        String   @id @default(cuid())
  userId    String
  event     String   // "solve", "solve_image", "practice_generate", "telegram_message"
  count     Int      @default(1)
  createdAt DateTime @default(now())
}
```
**Indexes:** `userId`, `createdAt`

**Status: ✅ Good**

### Subscription
```prisma
model Subscription {
  id              String   @id @default(cuid())
  userId          String   @unique
  plan            String
  status          String   // "active", "canceled", "past_due", "trialing"
  provider        String?  // "stripe", "paddle", "manual"
  providerSubId   String?
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  canceledAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Status: ✅ Good schema — ready for Stripe/Paddle integration**

### RateLimitConfig
```prisma
model RateLimitConfig {
  id          String @id @default(cuid())
  tier        String @unique  // "free", "pro", "team"
  minuteLimit Int
  dailyLimit  Int?
  monthlyLimit Int?
}
```

**Status: ✅ Good**

### PracticeSet
```prisma
model PracticeSet {
  id         String   @id @default(cuid())
  userId     String
  topic      String
  subtopic   String?
  difficulty String   @default("medium")
  language   String   @default("tr")
  questions  PracticeQuestion[]
  attempts   PracticeAttempt[]
  createdAt  DateTime @default(now())
}
```

**Status: ✅ Good**

### PracticeQuestion
```prisma
model PracticeQuestion {
  id           String  @id @default(cuid())
  practiceSetId String
  questionText String
  options      Json?   // [{label, value, order}]
  correctAnswer String
  explanation  String?
  difficulty   String?
  order        Int     @default(0)
  practiceSet  PracticeSet @relation(fields: [practiceSetId], references: [id])
}
```

**Status: ✅ Good**

### PracticeAttempt
```prisma
model PracticeAttempt {
  id           String   @id @default(cuid())
  practiceSetId String
  userId       String
  answers      Json     // [{questionId, answer, correct, timeSpentMs?}]
  score        Float
  timeSpentMs  Int?
  createdAt    DateTime @default(now())
  practiceSet  PracticeSet @relation(fields: [practiceSetId], references: [id])
}
```

**Status: ✅ Good**

### TelegramAccount
```prisma
model TelegramAccount {
  id             String   @id @default(cuid())
  userId         String   @unique
  telegramChatId String   @unique
  username       String?
  displayName    String?
  isLinked       Boolean  @default(false)
  linkedAt       DateTime?
  lastActivityAt DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  user           User     @relation(fields: [userId], references: [id])
}
```

**Status: ✅ Good**

### UserSettings
```prisma
model UserSettings {
  id               String  @id @default(cuid())
  userId          String  @unique
  storeHistory    Boolean @default(true)
  storeImages     Boolean @default(true)
  maxHistoryItems Int     @default(100)
  explanationLevel String @default("standard")  // brief/standard/detailed
  resultMode      String  @default("full")      // short/full/detailed
  telegramEnabled Boolean @default(false)
}
```

**Status: ✅ Good**

### Session
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
}
```
**Indexes:** `token` (unique), `userId`

**Status: ✅ Good**

### AuthToken
```prisma
model AuthToken {
  id        String   @id @default(cuid())
  token     String   @unique
  email     String
  type      String   // "magic_link"
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```
**Indexes:** `token` (unique), `expiresAt` (for cleanup)

**Status: ✅ Good**

### ExtensionToken
```prisma
model ExtensionToken {
  id          String   @id @default(cuid())
  userId      String
  token       String   @unique
  deviceName  String?
  lastUsedAt  DateTime?
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}
```
**Indexes:** `token` (unique), `userId`

**Status: ✅ Good**

### ModelConfig
```prisma
model ModelConfig {
  id        String @id @default("default")
  provider  String
  modelName String
  fallback  String?
  timeout   Int    @default(30000)
  maxTokens Int   @default(2048)
  enableValidation Boolean @default(true)
  compactMode      Boolean @default(false)
}
```

**Status: ✅ Singleton pattern — good for admin config**

### AdminAuditLog
```prisma
model AdminAuditLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  details   Json?
  ip        String?
  createdAt DateTime @default(now())
}
```

**Status: ✅ Good for admin accountability**

---

## Cascade Behavior

| Relation | On Delete |
|---|---|
| Question → User | `SetNull` (question remains, userId becomes null) |
| QuestionSave → Question | `Cascade` |
| AuditLog → Question | `SetNull` |
| PracticeQuestion → PracticeSet | `Cascade` |
| PracticeAttempt → PracticeSet | `Cascade` |
| TelegramAccount → User | `Cascade` |
| UserSettings → User | `Cascade` |
| Session → User | `Cascade` |
| ExtensionToken → User | `Cascade` |
| Subscription → User | `Cascade` |
| AuthToken → User | No relation (email-based, no FK) |

**⚠️ Concern:** `Question → User` is `SetNull`, not `Cascade`. If a user is deleted, their questions remain with `userId = null`. This could leave orphaned questions.

**Evidence:** `apps/api/src/services/auth.service.ts` has `deleteAllUserHistory` which explicitly deletes Question records before deleting the user — the relation-level cascade is NOT relied upon.

---

## Missing Indexes

| Table | Column | Recommended |
|---|---|---|
| `Question` | `topic`, `createdAt` | Composite for analytics queries |
| `Question` | `status`, `userId` | For saved questions query |
| `PracticeAttempt` | `userId`, `createdAt` | For recent attempts |
| `UsageEvent` | `event`, `createdAt` | For usage aggregation |
| `AuditLog` | `userId`, `action`, `createdAt` | For filtered audit queries |

---

## Data Privacy

| Feature | Status |
|---|---|
| User data export | ✅ `/api/users/me/export` — full JSON export |
| User data deletion | ✅ `DELETE /api/users/me` — transactional delete |
| History deletion | ✅ `DELETE /api/users/me/history` — deletes all Question records |
| Session invalidation | ✅ Session deleted on logout |
| Extension token revocation | ✅ `DELETE /api/auth/extension/token` |
| Audit logs | ✅ `AuditLog` + `AdminAuditLog` |

**Status: ✅ Good privacy controls**

---

## Migration Status

**Single migration:** `20260517181506_initial`

**Concerns:**
- Only one migration exists; no migration history to review incremental changes
- No migration rollback tested
- `pnpm db:migrate:deploy` is in the docker-compose prod healthcheck

**Evidence:** `Dockerfile.api`:
```dockerfile
RUN npx prisma migrate deploy --preview-feature
```

---

## Image Storage

**Questions table:** `options` and `shortAnswer` are text fields. Images are NOT stored in the database.

**Extension capture:** Images are base64-encoded in transit, not stored persistently by default. `ExtensionSettings.storeImages` setting exists but is not enforced server-side.

**Evidence:** `capture-controller.ts` — `setLastResult()` stores in `chrome.storage.local`, not sent to API.

---

## Summary

**Strengths:**
- 18 well-structured models covering all product entities
- Proper use of unique indexes for deduplication
- Cascade behavior appropriate for most relations
- Privacy features (export, delete, audit) are complete

**Weaknesses:**
- Missing composite indexes for analytics queries
- `Question → User` is `SetNull` not `Cascade` — inconsistent with transactional delete approach
- No partial indexes (e.g., soft deletes)
- Only one migration — cannot track schema evolution