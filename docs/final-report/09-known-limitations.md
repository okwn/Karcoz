# 09 — Known Limitations

**Known Limitations and Gaps**

---

## Critical (Blocking Production)

1. **All AI providers are mocks** — `ai-core` returns hardcoded sample answers. Real OpenAI/Anthropic/Gemini API keys required for actual functionality.

2. **solver-core is empty** — No algorithmic question solving exists. The "solving" is entirely handled by mocked AI providers.

3. **Worker container is a placeholder** — `Dockerfile.worker` runs `node src/index.js` which doesn't exist. No background processing capability.

4. **Telegram bot Dockerfile broken** — Entry point `src/index.js` doesn't exist. Bot code is in `apps/api/src/telegram-bot.ts`.

5. **web-dashboard is a static shell** — No real dashboard pages, no backend integration, no dynamic content.

---

## High Priority

6. **No Prisma migration files** — Schema-only deploy. Migration history not version-controlled.

7. **practice_generate not subject to plan limits** — Only `solve` and `solve_image` trigger plan enforcement.

8. **ESLint not installed** — Code quality tooling missing.

9. **Confidence calibration: 0%** — Eval shows 0/5 questions had well-calibrated confidence scores.

10. **Redis unavailable → in-memory fallback** — Cache not shared across multiple API instances.

---

## Medium Priority

11. **No brute-force protection on magic link** — Verification endpoint not rate-limited per attempt.

12. **CSRF origin allowlist edge cases** — When `APP_BASE_URL` is unset, origin check is incomplete.

13. **Audit log failures silently swallowed** — `audit.service.ts` only logs to console on failure.

14. **Admin audit log has no deletion protection** — A rogue admin could delete audit trail.

15. **Query params `page`/`limit` cast via `as`** — Not validated via Zod.

16. **Notes field max(2000) not enforced server-side** — Schema limit not re-applied in DB insert.

17. **No response compression** — API doesn't gzip/brotli responses.

18. **No CDN for static assets** — web-dashboard served via npx serve.

---

## Low Priority / Notes

19. **`x-user-id` header fallback dead code** — Misleading comment in telegram routes.

20. **No bundle size analysis** — webpack-bundle-analyzer not configured.

21. **No database connection pooling config** — Prisma defaults used.

22. **Cache invalidation strategy not documented** — Pattern-based Redis caching without clear invalidation.

23. **`APP_BASE_URL` falls back to localhost:3100** — Could cause issues if not configured.

24. **Billing entirely placeholder** — Checkout/webhook return mock data.

25. **Telegram `/solve` command only sends instructions** — Doesn't actually solve; only photo sends trigger solve.

---

## What's Mocked Summary

| Component | Mocked? |
|-----------|---------|
| OpenAI provider | ✅ Yes — hardcoded |
| Anthropic provider | ✅ Yes — hardcoded |
| Gemini provider | ✅ Yes — hardcoded |
| OpenRouter provider | ✅ Yes — hardcoded |
| OCR (Vision) | ✅ Yes — delegates to mocked AI |
| OCR (Mock) | ✅ Yes — hardcoded sample |
| Solver algorithm | ✅ Yes — non-existent |
| Worker runtime | ✅ Yes — non-existent |
| Billing | ✅ Yes — placeholder |
| web-dashboard | ✅ Yes — static shell |

---

## What's Real

| Component | Status |
|-----------|--------|
| Extension (UI + capture) | ✅ Real — fully functional |
| API server + routes | ✅ Real — implemented |
| Database schema | ✅ Real — complete |
| Auth (magic link + sessions) | ✅ Real — functional |
| Rate limiting | ✅ Real — implemented |
| Telegram bot logic | ✅ Real — polling + webhook |
| capture-core | ✅ Real — crop/validation/compression |
| ocr-core (normalization) | ✅ Real — normalization logic |
| Docker Compose | ✅ Real — works |
| Nginx config | ✅ Real — complete |