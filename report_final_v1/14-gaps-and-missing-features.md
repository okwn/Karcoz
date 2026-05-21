# 14 — Gaps and Missing Features

## Purpose
Comprehensive list of missing features across product, engineering, safety, admin, AI/OCR, deployment, and testing.

---

## Missing MVP Features

| Feature | Status | Where | What's Needed |
|---|---|---|---|
| **Real extension API call** | ❌ Blocked | `api-client.ts` | Flip to `RealApiClient` + configurable API URL |
| **Real payment collection** | ❌ Blocked | `billing.service.ts` | Stripe or Paddle SDK integration |
| **Dashboard → API wiring** | ❌ Blocked | `web-dashboard/public/*.html` | JavaScript API client, auth flow, data rendering |
| **AI quality measurement** | ❌ Blocked | `eval/` | Fix `eval/run-eval.ts` |

---

## Missing Product Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| User onboarding flow | P1 | ❌ Missing | No welcome, no feature tour |
| Password reset | P1 | ❌ Missing | Magic link only; no password-based auth |
| Email verification | P1 | ❌ Missing | Magic link creates account but doesn't verify email |
| Notification system | P2 | ❌ Missing | No in-app notifications |
| Push notifications | P3 | ❌ Missing | Browser push for Telegram messages |
| User profile page | P2 | ❌ Missing | No editable profile |
| Team features | P2 | ❌ Missing | Team plan exists but no team management |
| API access | P2 | ❌ Missing | Team plan promises API but no API key management |
| Mobile app | P3 | ❌ Not planned | Only browser extension + web |
| Bookmark/favorites | P3 | ❌ Missing | No way to bookmark questions |
| Share to social | P3 | ❌ Missing | Share to Twitter/WhatsApp/Telegram |
| Dark mode | P3 | ❌ Missing | Only light theme |
| Keyboard shortcuts help | P3 | ❌ Missing | Extension shows shortcuts but no help page |

---

## Missing Engineering Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| pnpm workspace | P0 | ❌ Missing | Needs `pnpm-workspace.yaml` |
| CI/CD pipeline | P1 | ❌ Missing | GitHub Actions needed |
| API integration tests | P1 | ❌ Missing | No route-level tests |
| E2E tests | P1 | ❌ Missing | No Playwright tests |
| Eval system | P0 | ❌ Broken | `run-eval.ts` missing |
| Docker build fix | P0 | ❌ Broken | Path mismatch in prod compose |
| TLS configuration | P1 | ❌ Missing | Manual certbot setup |
| Static asset caching | P2 | ❌ Missing | No Cache-Control headers |
| Redis connection pooling | P3 | ❌ Missing | Default pool settings |
| Background worker | P2 | ❌ Empty | `apps/worker/` empty |
| Hot config reload | P2 | ❌ Missing | Admin model config changes require restart |
| Prometheus metrics | P3 | ❌ Missing | No observability |
| Sentry/error tracking | P2 | ❌ Missing | No error tracking in production |
| Uptime monitoring | P3 | ❌ Missing | No external health checks |
| Load testing | P3 | ❌ Missing | No k6 or artillery tests |
| Backup rotation | P3 | ❌ Missing | No cleanup of old backups |
| Backup encryption | P3 | ❌ Missing | Backups stored unencrypted |
| Disaster recovery plan | P2 | ❌ Missing | No documented recovery steps |

---

## Missing Safety Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| CAPTCHA on magic link | P3 | ❌ Missing | Could be abused by bots |
| IP allowlist for admin | P2 | ❌ Missing | Admin routes open to all |
| Admin IP logging | P2 | ❌ Missing | Admin actions should log source IP |
| Rate limit per-IP (not just global) | P2 | ❌ Missing | Global rate limit exists but not per-IP |
| Magic link attempt logging | P3 | ❌ Missing | Failed auth should be audited |
| Telegram webhook verification | P2 | ❌ Missing | `chat_id` should be verified |
| Extension malware scan | P3 | ❌ Not applicable | Not feasible; user-initiated capture |
| Content Security Policy | P2 | ❌ Missing | CSP headers for web dashboard |
| HSTS header | P3 | ❌ Missing | Strict-Transport-Security |
| Subresource integrity | P3 | ❌ Missing | For CDN resources if any |

---

## Missing Admin Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Live user dashboard | P1 | ❌ Missing | Static admin page; no live data |
| User suspension/ban | P2 | ❌ Missing | Can delete but not suspend |
| Usage alerts | P2 | ❌ Missing | Notify admins when system usage is high |
| AI model A/B testing | P3 | ❌ Missing | No way to split traffic between models |
| Content moderation | P2 | ❌ Missing | No review of saved questions |
| Audit log UI | P2 | ❌ Missing | Admin audit logs not visible in dashboard |
| Error log UI | P2 | ❌ Missing | Admin errors not visible in dashboard |
| Feature flags | P3 | ❌ Missing | No dynamic feature toggles |

---

## Missing Dashboard Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Login page | P0 | ⚠️ Shell | HTML exists but no auth flow |
| Dashboard home | P0 | ⚠️ Shell | No stats rendered |
| History page | P1 | ⚠️ Shell | No question list |
| Weak topics page | P1 | ⚠️ Shell | No analytics display |
| Practice page | P1 | ⚠️ Shell | No generation UI |
| Settings page | P1 | ⚠️ Shell | No settings save |
| Telegram page | P1 | ⚠️ Shell | No link/unlink UI |
| Billing page | P1 | ⚠️ Shell | No plan display or checkout |
| Question detail page | P2 | ⚠️ Shell | No single question view |
| Dark mode | P3 | ❌ Missing | Only light theme |
| Mobile responsive | P2 | ❌ Unknown | Not tested on mobile |
| Loading skeletons | P3 | ❌ Missing | No skeleton states |

---

## Missing Billing Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Stripe integration | P0 | ❌ Stub | Only console.log placeholder |
| Paddle integration | P0 | ❌ Stub | Alternative to Stripe |
| Webhook handler | P0 | ❌ Stub | Signature verification missing |
| Checkout flow | P0 | ❌ Stub | Returns mock URL |
| Usage tracking | P1 | ⚠️ Partial | Events tracked but enforcement unclear |
| Plan upgrades/downgrades | P1 | ⚠️ Partial | DB update only, no provider call |
| Invoice history | P2 | ❌ Missing | No invoice management |
| Refund handling | P2 | ❌ Missing | No refund flow |
| Usage notifications | P2 | ❌ Missing | Notify before hitting limits |
| Referral program | P3 | ❌ Missing | No referral tracking |

---

## Missing AI/OCR/Solver Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Image preprocessing wired | P2 | ❌ Not wired | Preprocess functions exist but not called |
| Tesseract OCR | P3 | ❌ Not planned | Vision engine used instead |
| Math OCR | P2 | ❌ Missing | LaTeX/math formula OCR |
| Handwriting recognition | P2 | ❌ Missing | Not in scope but would help |
| Multi-language support | P2 | ⚠️ Partial | Turkish + English only |
| Cross-validation | P2 | ❌ Missing | No human-in-the-loop for low confidence |
| Answer explanation quality | P1 | ⚠️ Unknown | No eval = no measurement |
| Topic auto-detection | P2 | ⚠️ Partial | Classifies but not always accurate |
| Difficulty estimation | P3 | ❌ Missing | No difficulty scoring |
| Similar question lookup | P3 | ❌ Missing | No semantic search |

---

## Missing Deployment Features

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Kubernetes manifests | P2 | ❌ Missing | Docker Compose only |
| Helm chart | P3 | ❌ Missing | Not needed at scale |
| Terraform for infra | P3 | ❌ Missing | Manual server setup |
| Database migrations CI | P1 | ❌ Missing | No automated migration on deploy |
| Blue-green deployment | P3 | ❌ Missing | No deployment strategy |
| Rollback procedure | P2 | ⚠️ Manual | `docker compose down && docker compose up -d` |
| Log aggregation | P2 | ❌ Missing | No centralized logging |
| Secrets rotation | P2 | ❌ Missing | No automatic secret rotation |
| Auto-scaling | P3 | ❌ Missing | Not needed at MVP scale |

---

## Missing Tests

| Test Type | Priority | Status | Notes |
|---|---|---|---|
| API route integration | P1 | ❌ Missing | No Supertest/Vitest API tests |
| Auth flow tests | P1 | ❌ Missing | Magic link, session, token |
| Solve pipeline tests | P1 | ❌ Missing | Full extract→solve→validate |
| Practice flow tests | P1 | ❌ Missing | Generate → attempt → grade |
| Rate limit tests | P2 | ❌ Missing | Enforcement verification |
| Billing flow tests | P1 | ❌ Missing | Cannot test without Stripe |
| Telegram bot tests | P2 | ❌ Missing | No bot command tests |
| Extension E2E | P1 | ❌ Missing | No Playwright extension tests |
| Admin route tests | P2 | ❌ Missing | No admin endpoint tests |
| Accessibility tests | P2 | ❌ Missing | No axe-core |
| Load tests | P3 | ❌ Missing | No k6/artillery |
| Security tests | P2 | ❌ Missing | No auth/permission tests |

---

## Summary: Critical Gaps Blocking Production

| Gap | Impact | Estimated Fix Time |
|---|---|---|
| Extension uses mock API client | Cannot solve real questions | 1h |
| Billing is a no-op | Cannot collect payment | 2–3 days |
| Dashboard is disconnected | No user-facing app | 3–5 days |
| Docker build path broken | Cannot build prod images | 15min |
| Eval system broken | Cannot measure quality | 3h |
| No CI/CD | Manual deployments only | 4h |
| TLS not configured | No HTTPS | 30min |
| No API integration tests | Low confidence in routes | 2–3 days |

**Total critical gap fix time: ~9 days + 5h**