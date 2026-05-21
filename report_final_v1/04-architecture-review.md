# 04 — Architecture Review

## Purpose
Assess the monorepo structure, package boundaries, separation of concerns, and code quality.

---

## Monorepo Structure

```
karcoz/ (root)
├── apps/
│   ├── api/              → @karcoz/api
│   ├── extension/        → Browser extension (not a package)
│   ├── telegram-bot/      → EMPTY
│   ├── web-dashboard/     → @karcoz/web-dashboard (static)
│   └── worker/           → EMPTY
├── packages/
│   ├── ai-core/          → @karcoz/ai-core
│   ├── ocr-core/         → @karcoz/ocr-core
│   ├── solver-core/       → @karcoz/solver-core
│   ├── capture-core/      → @karcoz/capture-core
│   └── shared/           → @karcoz/shared
└── eval/                  → @karcoz/eval
```

**Workspace config issue:** `package.json` uses `workspaces: ["apps/*", "packages/*"]` which pnpm **ignores**. No `pnpm-workspace.yaml` exists. The `node_modules` is a flat install, not proper workspace symlinks.

**Evidence:** `pnpm install` shows warning: `The "workspaces" field in package.json is not supported by pnpm. Create a "pnpm-workspace.yaml" file instead.`

---

## Package Boundaries

| Package | Responsibility | Dependencies |
|---|---|---|
| `@karcoz/shared` | Zod schemas, shared types | `zod` |
| `@karcoz/ai-core` | AI provider abstraction, chain orchestration | `zod` |
| `@karcoz/ocr-core` | OCR engines, preprocessing, normalization | `@karcoz/ai-core` |
| `@karcoz/solver-core` | Question solvers, validation, confidence | `@karcoz/shared`, `zod` |
| `@karcoz/capture-core` | Image crop, compression, canvas utils | None |
| `@karcoz/api` | Fastify server, routes, services, middleware | All packages above |
| `@karcoz/extension` | Chrome extension (esbuild) | All packages above |

**Dependency direction is correct:** Inner packages have no outer dependencies. API depends on all packages. Extension depends on packages.

---

## Route/Service/Repository Structure (API)

```
apps/api/src/
├── server.ts                    ← Bootstrap, route registration
├── routes/
│   ├── auth.routes.ts           ← Auth + user management
│   ├── solve.routes.ts          ← Solve image/text
│   ├── questions.routes.ts      ← History + analytics
│   ├── scan.routes.ts           ← Page candidate detection
│   ├── practice.routes.ts       ← Practice generation + attempts
│   ├── telegram.routes.ts       ← Telegram linking + webhook
│   ├── admin.routes.ts          ← Admin stats + config
│   └── billing.routes.ts        ← Billing (stub)
├── services/
│   ├── auth.service.ts           ← Business logic
│   ├── solve.service.ts         ← Orchestrates pipeline
│   ├── practice.service.ts      ← Practice logic
│   ├── billing.service.ts       ← STUB
│   ├── admin.service.ts
│   ├── telegram.service.ts
│   ├── cache.service.ts         ← Redis cache
│   ├── extraction.service.ts    ← OCR/text extraction
│   ├── solution.service.ts      ← AI solve
│   ├── topic-classifier.service.ts ← Topic classification
│   ├── validation.service.ts    ← Answer validation
│   └── audit.service.ts
├── middleware/
│   ├── session-auth.ts          ← Cookie → userId
│   ├── extension-auth.ts        ← Bearer → userId
│   ├── admin-auth.ts            ← Role check
│   ├── rate-limit.ts            ← Per-endpoint + per-plan
│   └── csrf.ts
└── config/
    ├── env.ts                   ← Zod validation
    └── plan-limits.ts           ← Tier limits
```

**Pattern: Routes → Services → [AI Core / DB]**

No repository layer — services query Prisma directly. This is acceptable for this scale but mixes data access with business logic.

**Evidence:** `apps/api/src/services/solve.service.ts` — direct Prisma calls within service methods.

---

## Shared Schemas

`@karcoz/shared/src/schemas.ts` is the **central Zod schema registry** used by:
- `apps/api/src/routes/*.ts` — Request validation
- `apps/api/src/config/env.ts` — Environment variable validation
- `packages/ai-core` — Type narrowing

This is good: single source of truth for shared types.

---

## Code Duplication

| Area | Duplication Found | Severity |
|---|---|---|
| Provider JSON parsing | `extractJSON`, `parseLanguage`, `parseQuestionType`, `parseValidationStatus`, `parseOptions` are copied verbatim in `openai.provider.ts` and `openrouter.provider.ts` | P2 |
| Turkish/English prompts | System prompts for `extractQuestion`, `solveQuestion`, `validateAnswer`, `classifyTopic` are duplicated in each provider | P2 |
| OCR option parsing | `option-parser.ts` logic appears in both `ocr-core` and `solver-core` | P2 |
| Confidence clamping | `clampConfidence` and `clampAdjustment` duplicated across providers | P3 |

**Recommended fix:** Extract common parsing utilities into `@karcoz/shared` to avoid duplication.

---

## Dead Code / Empty Packages

| Path | Status |
|---|---|
| `apps/telegram-bot/` | **EMPTY** — bot code is in `apps/api/src/telegram-bot.ts` |
| `apps/worker/` | **EMPTY** — no background jobs implemented |
| `packages/solver-core/src/parser.ts` | **FILE DOES NOT EXIST** — `src/index.ts` re-exports from subdirectories |
| `packages/solver-core/src/validator.ts` | **FILE DOES NOT EXIST** — validation is in `validate/answer-validator.ts` |
| `packages/solver-core/src/confidence.ts` | **FILE DOES NOT EXIST** — confidence is in `validate/confidence-calculator.ts` |
| `packages/ai-core/src/prompt-templates/solve.ts` | **FILE DOES NOT EXIST** — prompts are in `prompts/image-to-question.prompt.ts` |
| `packages/ocr-core/src/preprocessing.ts` | **FILE DOES NOT EXIST** — preprocessing is in `preprocess/*.ts` |
| `packages/ocr-core/src/tesseract.ts` | **FILE DOES NOT EXIST** — Tesseract not used; Vision engine used instead |
| `packages/shared/src/validation.ts` | **FILE DOES NOT EXIST** — validation is via Zod schemas |

---

## Incorrect Abstractions

1. **Provider registry path mismatch** — `providers/anthropic.ts` and `providers/openai.ts` do not exist; actual files are `providers/openai.provider.ts`, `providers/openrouter.provider.ts`, `providers/mock.provider.ts`

2. **OCR engine naming** — `VisionOCREngine` uses `AIProvider` from `@karcoz/ai-core` but is named "OCR" — this is actually an AI-powered extraction engine, not traditional OCR

3. **Billing service as factory** — `createBillingService(prisma)` returns a service object; should be a class or dependency-injected singleton

4. **Telegram bot in API package** — `apps/api/src/telegram-bot.ts` is a standalone process but lives in the API package; should be `apps/telegram-bot/`

---

## Maintainability Risks

| Risk | Severity | Evidence |
|---|---|---|
| pnpm workspace not configured | P1 | `node_modules` flat install; packages not symlinked; could break imports |
| Billing completely stubbed | P1 | No Stripe/Paddle; entire billing flow is placeholder |
| Worker service is empty | P1 | `Dockerfile.worker` is no-op; no job queue architecture |
| Extension hardcoded to mock | P0 | `createApiClient(true)` must be changed in code |
| Web dashboard disconnected | P0 | Static HTML shells; no API wiring |

---

## Code Quality Assessment

| Metric | Result |
|---|---|
| TypeScript | ✅ Zero errors across all workspaces |
| Linting | ✅ Zero errors |
| Tests | ✅ 88/88 passing |
| Build | ✅ All packages compile |
| Circular dependencies | ✅ None detected |
| Large files (>300 lines) | ✅ `result-bubble.ts` (452 lines) is the only exception — acceptable for a complex UI component |
| Missing JSDoc comments | ✅ No docs required per project standard |

---

## Recommended Fixes

| Priority | Issue | Fix |
|---|---|---|
| P0 | Missing `pnpm-workspace.yaml` | Create workspace file with `packages: ['apps/*', 'packages/*']` |
| P1 | Provider JSON parsing duplicated | Extract `shared/src/provider-utils.ts` |
| P1 | Billing is stub | Implement Stripe SDK integration |
| P2 | Telegram bot in wrong location | Move to `apps/telegram-bot/` |
| P2 | Empty `apps/worker/` | Document why empty, or implement worker |
| P3 | Documentation paths wrong | Update re-exports/comments that reference non-existent files |