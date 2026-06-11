# LakuPOS — Full Audit Report

> Generated: 2026-06-11 | Project: bahann-pos | Stack: Next.js 16 + tRPC + Supabase + Redis

---

## EXECUTIVE SUMMARY

| Area | Score | Trend | Status |
|------|-------|-------|--------|
| Security | 6/10 | ↑ improved | Rate limiter Redis-backed, middleware.ts, token hashing, permissions wired |
| Architecture | 5/10 | ↔ same | DDD boundaries still violated (routers → infra) |
| Code Quality | 7/10 | ↑ improved | `any` types eliminated, `throw new Error` → TRPCError |
| Dependencies | 6/10 | ↑ improved | Bloat removed (pnpm, puppeteer, nivo, supabase CLI) |
| Frontend/UX | 6/10 | → decent | Good components, bad i18n coverage |
| Testing | 3/10 | ↑ improved | 47 domain tests added, CI/CD pipeline created, coverage threshold fixed |
| **Overall** | **5.5/10** | | **P0+P1 done. Remaining: i18n, DDD refactor, more tests.** |

---

## PHASE 1 RETEST — Security Findings

| ID | Finding | Status | Details |
|----|---------|--------|---------|
| C1 | Rate limiter never invoked | **FIXED** | Redis-backed via Upstash, called in auth.ts login, async API |
| C2 | `requirePermission` is dead code | **FIXED** | Now wired to transactions.void and transactions.refund |
| C3 | No `src/middleware.ts` | **FIXED** | Created with route protection for all (app) routes |
| C4 | LoginUserUseCase has 3 infra deps | **STILL PRESENT** | bcrypt, JWT, Redis imported directly |
| C5 | BusinessProfileRepository interface missing | **STILL PRESENT** | Only concrete Supabase impl exists |
| C6 | 3 entities are type aliases | **STILL PRESENT** | Product, DailySale, DailyStock have no behavior |
| M1 | JWT access token = 7d | **FIXED** | Now uses 30m access token via `createRefreshToken()` |
| M2 | Tenant isolation bypass via getById | **FIXED** | `products.ts:99-110`, `outlets.ts:79-89` now filter by `owner_id` |
| M4 | `requirePermission` uses client Supabase | **FIXED** | Now uses supabaseAdmin from server |
| M5 | Promotion validate bypasses tenant scope | **FIXED** | Now filters by owner_id via getTenantOwnerId |

---

## NEW CRITICAL FINDINGS

### N1 — Password reset token stored in PLAINTEXT | **CRITICAL**
`src/server/routers/auth.ts:443` — Token saved directly to DB without hashing. Refresh tokens are properly SHA-256 hashed, but reset tokens are not. If `password_reset_tokens` table leaks, all accounts are hijackable.

### N2 — RLS enabled but ZERO policies defined | **MAJOR**
`supabase/migrations/016_enable_rls.sql` — RLS is on but no policies exist. App uses `supabaseAdmin` (service role) which bypasses RLS. Zero defense-in-depth if service role key leaks.

### N3 — Rate limiter in-memory = useless on serverless | **MAJOR**
`src/lib/security/rateLimiter.ts:11` — `new Map()` is ephemeral on Vercel. Resets on cold start, doesn't share across instances. Needs Redis-backed implementation.

### N4 — File upload has zero validation | **MAJOR**
`src/server/routers/paymentRequests.ts:202-252`, `superAdmin.ts:349-382` — No file size limit, no file type whitelist, content-type guessed from extension.

### N5 — No rate limiting on password reset | **MAJOR**
`src/server/routers/auth.ts:407` — `requestPasswordReset` is a `publicProcedure` with no rate limit. Enables email bombing and DoS.

### N6 — No CSRF protection beyond SameSite cookie | **MINOR**
`src/lib/cookies.ts:22` — Only `sameSite: 'lax'`. No CSRF tokens, no Origin/Referer validation.

### N7 — Password reset timing side-channel | **MINOR**
`src/server/routers/auth.ts:413-481` — Fast path for non-existent emails vs slow path (email send) reveals registered emails.

### N8 — Email logged for non-existent reset attempts | **MINOR**
`src/server/routers/auth.ts:426` — Enables email enumeration via log access.

---

## CODE QUALITY & ARCHITECTURE

### DDD Layer Violations — CRITICAL

**14 of 17 tRPC routers bypass the use-case layer** and import `@/infra/supabase/server` directly:
- `auth.ts`, `products.ts`, `outlets.ts`, `dashboard.ts`, `transactions.ts`, `users.ts`, `payments.ts`, `cashSessions.ts`, `promotions.ts`, `stockAlerts.ts`, `audit.ts`, `admin.ts`, `superAdmin.ts`, `paymentRequests.ts`

Only `sales.ts`, `stock.ts`, `businessProfile.ts` properly use use-cases/repositories.

**3 use-cases import infra directly:**
- `LoginUserUseCase.ts` — bcrypt, `@/lib/jwt`, `@/lib/redis-upstash`
- `LogoutUserUseCase.ts` — `@/lib/redis-upstash`
- `RegisterUserUseCase.ts` — bcrypt

### Error Handling — CRITICAL

**33 instances of `throw new Error` in tRPC routers** instead of `TRPCError`:
- `auth.ts` (9), `products.ts` (10), `outlets.ts` (5), `payments.ts` (4), `admin.ts` (2), `stock.ts` (2)

All become `INTERNAL_SERVER_ERROR` with no error code mapping. Client can't distinguish `UNAUTHORIZED` from `BAD_REQUEST`.

### TypeScript Quality — CRITICAL

**25 instances of `any` type:**
- `products.ts:143-145` — `as any` defeats enum validation
- `dashboard.ts:36,267,327-331` — untyped RPC + data
- `payments.ts:16-18` — untyped JSON column
- `csv-generator.ts`, `pdf-generator.ts`, `payment-service.ts` — utility code untyped

### Dead Code — MAJOR

| File | Issue |
|------|-------|
| `domain/repositories/ProductRepository.ts` | Defined but never imported |
| `domain/services/BusinessTypeStrategy.ts` | `createBusinessTypeStrategy()` never called |
| `infra/container.ts` | Only 4 of ~15 repos registered; all 17 routers bypass it |

### Code Duplication — MAJOR

`getTenantOutletIds` is **copy-pasted 4 times** across `transactions.ts:72`, `cashSessions.ts:13`, `stockAlerts.ts:13`, `dashboard.ts:55`. Should be in `server/lib/tenant.ts`.

---

## DEPENDENCIES & CONFIG

### CRITICAL

| # | Issue | Fix |
|---|-------|-----|
| D1 | `pnpm` in runtime `dependencies` | Remove — it's a package manager, not a library |
| D2 | `vercel.json` uses `npm` but project uses `pnpm` | Change to `pnpm install` / `pnpm build` |
| D3 | `supabase` CLI in runtime `dependencies` | Move to devDeps or use `npx supabase` |

### MAJOR

| # | Issue | Fix |
|---|-------|-----|
| D4 | Dual Redis: `ioredis` + `@upstash/redis` | Pick one. Health checks use wrong client. |
| D5 | Dual charting: `@nivo/*` + `recharts` | Remove @nivo — only 1 component uses it |
| D6 | `@supabase/auth-helpers-nextjs` deprecated | Migrate to `@supabase/ssr` |
| D7 | `@solana/web3.js` (~2MB) for single use | Dynamic import or remove |
| D8 | `xlsx` (SheetJS, ~400KB, license risk) | Dynamic import + verify license |
| D9 | `puppeteer` in devDeps, never imported | Remove (~170MB install footprint) |
| D10 | `pg` + `@types/pg` in devDeps, never imported | Remove |
| D11 | `marked` in devDeps, never imported | Remove |

### Configuration

| # | Issue |
|---|-------|
| C1 | `tsconfig.json` target `ES2017` — should be `ES2022` for Next.js 16 |
| C2 | Security headers duplicated in `next.config.ts` AND `vercel.json` |
| C3 | `coverageThresholds` (plural) in `jest.config.js` — Jest ignores it, 50% threshold never enforced |

---

## FRONTEND & UX

### Strengths
- Solid UI component library (`Button`, `Input`, `Modal`, `Card`, `Toast`) with dark mode
- Good accessibility on core UI (`aria-invalid`, `role="dialog"`, keyboard handlers)
- Charts lazy-loaded, tRPC query defaults sensible

### Issues

| # | Severity | Finding |
|---|----------|---------|
| F1 | **High** | `window.confirm()` used in 3 places (products, outlets, profile) — should use Modal |
| F2 | **High** | Duplicate Modal in `products/page.tsx:20-32` — bypasses shared Modal's a11y |
| F3 | **High** | Debug UI shipped: "✅ Lazy Loaded" visible in `LazyDatePicker.tsx:155` |
| F4 | **Medium** | `PaymentModal.tsx` builds custom modal without `role="dialog"`, focus trap |
| F5 | **Medium** | Auth check via `localStorage.getItem('user')` — fragile, tamperable |
| F6 | **Medium** | `alert('Aktifkan popup...')` in POS page — use Toast |
| F7 | **Low** | `onKeyPress` deprecated — use `onKeyDown` |

### i18n — Only ~30% Coverage

The i18n system (`en.json`/`id.json` with 423 keys) exists and works, but most pages bypass it:

| Page/Component | Status |
|----------------|--------|
| Sidebar nav labels | ✅ Uses `t()` |
| Dashboard titles | ❌ Hardcoded Indonesian |
| POS sales page | ❌ Hundreds of hardcoded strings |
| Products page | ❌ All strings hardcoded |
| Payment modal | ❌ Hardcoded |
| Error boundary | ❌ Hardcoded Indonesian |
| Offline indicator | ❌ Hardcoded |

### PWA & Offline

| # | Issue |
|---|-------|
| P1 | No Background Sync API — sync stops when tab closes |
| P2 | `pullProducts()` in `sync-manager.ts:234-281` is a no-op (commented out) |
| P3 | Offline fallback returns dashboard HTML which needs tRPC data |

---

## TESTING — CRITICAL

| Metric | Value |
|--------|-------|
| Source files | 181 |
| Test files | 3 |
| Test-to-source ratio | 1.6% |
| Domain service tests | 0 |
| Use-case tests | 0 |
| Router tests | 0 |
| Payment logic tests | 0 |
| E2E flows | 1 (login only) |
| CI/CD pipeline | **None** |

### What exists
- `Button.test.tsx` — decent (tests behavior, but couples to CSS classes)
- `Card.test.tsx` — basic rendering test
- `login.spec.ts` — E2E login flow

### What's missing (everything else)
- **Zero tests** on `PricingService`, `StockService`, `ItemFactory` — pure functions, trivially testable
- **Zero tests** on payment logic (`qris-generator.ts`, `unique-amount.ts`)
- **Zero tests** on validators, formatters, JWT
- **No CI** — `.github/workflows/` doesn't exist
- `jest.config.js` has `coverageThresholds` typo — threshold never enforced

### Not real tests
- `test-payment-system.js` — console.log script, no assertions
- `test-qris.ts` — manual debugging script, no test framework

---

## PRIORITIZED ACTION PLAN

### P0 — CRITICAL (Fix Before Any Feature Work)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Hash password reset tokens (like refresh tokens) | 30m | Prevents account hijacking |
| 2 | Fix `vercel.json` to use `pnpm` commands | 5m | Prevents broken deployments |
| 3 | Remove `pnpm`, `supabase` CLI from dependencies | 5m | Reduces bundle size |
| 4 | Remove unused devDeps (puppeteer, pg, marked) | 5m | ~170MB install savings |
| 5 | Fix `coverageThresholds` → `coverageThreshold` in jest.config.js | 1m | Enables threshold enforcement |
| 6 | Wire `requirePermission` to transactions.void/refund | 1h | Prevents unauthorized voids |
| 7 | Create `src/middleware.ts` for route protection | 2h | Server-side auth enforcement |

### P1 — HIGH (Architecture & Security)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 8 | Replace in-memory rate limiter with Redis-backed | 2h | Actual rate limiting in production |
| 9 | Add rate limiting to password reset endpoints | 30m | Prevents email bombing |
| 10 | Validate file uploads (size, type) | 1h | Prevents abuse |
| 11 | Replace `throw new Error` with `TRPCError` in all routers | 3h | Proper error codes for clients |
| 12 | Extract `getTenantOutletIds` to shared utility | 30m | Eliminates 4x duplication |
| 13 | Remove dead code (ProductRepository, BusinessTypeStrategy) | 30m | Reduces confusion |
| 14 | Remove `@solana/web3.js` or dynamic import | 30m | ~2MB bundle reduction |
| 15 | Remove `@nivo/*` (unused charting library) | 5m | Bundle reduction |

### P2 — MEDIUM (Quality & Coverage)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 16 | Add domain service tests (PricingService, StockService, ItemFactory) | 3h | Covers core business logic |
| 17 | Add payment logic tests (qris-generator, unique-amount) | 2h | Covers financial calculations |
| 18 | Set up GitHub Actions CI | 30m | Prevents untested deployments |
| 19 | Replace `any` types with proper types (25 instances) | 3h | Type safety |
| 20 | Replace `window.confirm()` with Modal (3 files) | 1h | Consistent UX |
| 21 | Remove debug UI from LazyDatePicker | 5m | No debug info in production |
| 22 | Fix `tsconfig.json` target to `ES2022` | 5m | Modern JS output |

### P3 — LOW (Polish)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 23 | Complete i18n coverage (~70% remaining) | 8h+ | Multi-language support |
| 24 | Add Background Sync API to service worker | 2h | Reliable offline sync |
| 25 | Migrate `@supabase/auth-helpers-nextjs` to `@supabase/ssr` | 2h | Future-proof auth |
| 26 | Consolidate Redis clients (pick one) | 1h | Simpler infra |
| 27 | Remove duplicate header config (pick next.config.ts or vercel.json) | 30m | Single source of truth |

---

## QUICK WINS (5 min each, high impact)

1. **`pnpm` → remove from dependencies** — package.json:44
2. **`vercel.json` → `pnpm install`/`pnpm build`** — vercel.json:5-6
3. **`coverageThresholds` → `coverageThreshold`** — jest.config.js:23
4. **Remove `puppeteer`, `pg`, `marked` from devDeps** — package.json
5. **Remove `@nivo/*` from dependencies** — package.json:22-23
6. **Delete `test-payment-system.js` and `test-qris.ts`** — root directory
7. **Remove debug UI from `LazyDatePicker.tsx:155`** — green "✅ Lazy Loaded" box

---

*Report compiled from 5 parallel audit agents: Security, Code Quality, Dependencies, Frontend/UX, Testing*
