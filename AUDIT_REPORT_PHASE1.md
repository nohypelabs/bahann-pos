# LakuPOS — Phase 1: Backend Architecture Audit Report

> Generated: 2026-06-10 | Project: bahann-pos | Stack: Next.js 16 + tRPC + Supabase + Redis

---

## EXECUTIVE SUMMARY

**Overall Health: 6.5/10** — Solid foundation with critical security and architecture gaps.

| Area | Score | Status |
|------|-------|--------|
| Domain Layer | 7/10 | Clean but incomplete (type aliases, not entities) |
| Use-Cases Layer | 5/10 | Multiple infra leaks (bcrypt, JWT, Redis) |
| Infra/DI | 6/10 | Container exists but incomplete, auth bypasses it |
| tRPC Server | 7/10 | Good procedure structure, dead permission middleware |
| Security | 4/10 | Rate limiter unused, JWT expiry wrong, tenant bypass |
| i18n | 9/10 | 403/403 keys balanced, no hardcoded strings found |
| Test Coverage | 1/10 | 2 UI tests + 1 e2e spec. Zero domain/use-case/router tests |

---

## FINDINGS BY SEVERITY

### CRITICAL (6 findings)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| C1 | Rate limiter defined but NEVER INVOKED | `src/lib/security/rateLimiter.ts` | Login brute-force, API abuse completely unprotected |
| C2 | `requirePermission` middleware is DEAD CODE | `src/server/trpc.ts:174-211` | No granular permission checks anywhere — cashiers can void transactions |
| C3 | No Next.js middleware.ts file | `src/middleware.ts` (missing) | No server-side route protection, no CSRF validation |
| C4 | LoginUserUseCase has 3 infra dependencies | `src/use-cases/auth/LoginUserUseCase.ts` | bcrypt, JWT, Redis imported directly — violates DDD, untestable |
| C5 | BusinessProfileRepository interface MISSING | `src/domain/repositories/` (no file) | Infra leaks into server layer, violates DI principle |
| C6 | 3 entities are type aliases, not DDD entities | `Product.ts`, `DailySale.ts`, `DailyStock.ts` | No identity enforcement, no invariant protection |

### MAJOR (8 findings)

| # | Finding | Location | Impact |
|---|---------|----------|--------|
| M1 | JWT access token = 7d, not 30m (constant UNUSED) | `jwt.ts:13` vs `refreshToken.ts:15` | Stolen token valid for 7 days, refresh rotation negated |
| M2 | Tenant isolation bypass via getById | `products.ts:96`, `outlets.ts:75` | Any user can access other tenant's products/outlets |
| M3 | IP/User-Agent never captured in audit logs | `src/lib/audit.ts` | Cannot trace malicious actions to source |
| M4 | requirePermission uses CLIENT Supabase | `trpc.ts:189` | Bypasses RLS when enabled |
| M5 | Promotion validate bypasses tenant scope | `promotions.ts:32` | Cross-tenant promo code abuse |
| M6 | PricingService returns 0 for missing price | `PricingService.ts:55` | Silent data corruption — should throw DomainException |
| M7 | BusinessTypeStrategy dead code + DRY violation | `BusinessTypeStrategy.ts` | Same defaults in 2 places, one never used |
| M8 | DI container incomplete — auth bypasses it | `src/infra/container.ts` | Auth repos manually instantiated in router |

### MINOR (10 findings)

| # | Finding | Location |
|---|---------|----------|
| m1 | Value objects are const enums, not true VOs | `src/domain/catalog/value-objects/` |
| m2 | StockService.assertCanDeduct inconsistent for CONSUMED | `StockService.ts:81` |
| m3 | RecordDailyStock uses generic Error, not DomainException | `RecordDailyStockUseCase.ts:22` |
| m4 | Container lambda wrappers for stateless services | `container.ts:20-21` |
| m5 | ProductRepository defined but never used (dead code) | `ProductRepository.ts` |
| m6 | Inconsistent error handling (TRPCError vs generic Error) | Multiple routers |
| m7 | Search inputs use unsanitized ILIKE patterns | `products.ts:54`, `auth.ts:372` |
| m8 | Transaction ID uses Math.random() | `transactions.ts:153` |
| m9 | Bcrypt rounds = 8 (should be 10+) | `auth.ts:545`, `users.ts:126` |
| m10 | Payment proof upload lacks file size/type validation | `paymentRequests.ts:202` |

---

## DOMAIN LAYER DETAILED FINDINGS

### Entities (src/domain/entities/)

```
User.ts           → ✅ Proper class with constructor + factory method
BusinessProfile.ts → ✅ Proper class with factory + BUSINESS_TYPE_DEFAULTS
Product.ts        → ❌ Type alias only — no constructor, no invariants
DailySale.ts      → ❌ Type alias only
DailyStock.ts     → ❌ Type alias only
```

**canDeductStock()** in Product.ts is a standalone function, not a method on the entity.

### Repository Interfaces (src/domain/repositories/)

```
UserRepository.ts           → ✅ Defined, used
ProductRepository.ts        → ⚠️ Defined but NEVER imported (dead code)
BusinessProfileRepository   → ❌ MISSING — Supabase class has no interface
StockRepository.ts          → ✅ Defined, used
```

### Domain Services (src/domain/services/)

```
StockService.ts         → ✅ OK (minor inconsistency with CONSUMED behavior)
PricingService.ts       → ⚠️ Returns 0 for missing price instead of throwing
ItemFactory.ts          → ✅ Well-structured, 5 combo validation rules
BusinessTypeStrategy.ts → ❌ Dead code — createBusinessTypeStrategy() never called
                        → ❌ DRY violation with BUSINESS_TYPE_DEFAULTS in BusinessProfile.ts
```

---

## USE-CASES LAYER DETAILED FINDINGS

### Dependency Analysis

| Use-Case | Domain-only? | Violations |
|----------|-------------|------------|
| LoginUserUseCase | ❌ NO | bcrypt, @/lib/jwt, @/lib/redis-upstash |
| LogoutUserUseCase | ❌ NO | @/lib/redis-upstash |
| RegisterUserUseCase | ❌ NO | bcrypt |
| RecordDailySaleUseCase | ✅ YES | — |
| RecordDailyStockUseCase | ✅ YES | — |

**Fix**: Extract infra deps into interfaces:
- `IPasswordHasher` (bcrypt wrapper)
- `ITokenService` (JWT sign/verify)
- `ISessionStore` (Redis session CRUD)

---

## tRPC SERVER LAYER

### Procedure Type Coverage

| Router | public | protected | admin | superAdmin | permCheck |
|--------|--------|-----------|-------|------------|-----------|
| auth | 7 | 7 | 1 | 0 | 0 |
| products | 0 | 2 | 7 | 0 | 0 |
| transactions | 0 | 7 | 0 | 0 | 0 |
| sales | 0 | 3 | 0 | 0 | 0 |
| outlets | 0 | 2 | 3 | 0 | 0 |
| dashboard | 0 | 6 | 0 | 0 | 0 |
| stock | 0 | 3 | 0 | 0 | 0 |
| cashSessions | 0 | 5 | 0 | 0 | 0 |
| promotions | 0 | 4 | 4 | 0 | 0 |
| stockAlerts | 0 | 5 | 1 | 0 | 0 |
| users | 0 | 4 | 4 | 3 | 0 |
| audit | 0 | 0 | 4 | 0 | 0 |
| superAdmin | 0 | 0 | 0 | 8 | 0 |
| paymentRequests | 0 | 5 | 0 | 3 | 0 |
| payments | 0 | 1 | 3 | 0 | 0 |
| businessProfile | 0 | 1 | 2 | 0 | 0 |

**KEY GAP**: `requirePermission` is NEVER used. `transactions.void` and `transactions.refund` should require `canVoidTransactions`.

### Console.log in Production

Found in `src/server/routers/`:
- `transactions.ts:223` — `console.error('Failed to insert daily_sales:', salesError)`
- `transactions.ts:276` — `console.error('Failed to update stock:', stockUpdateError)`
- `transactions.ts:312` — `console.error('Failed to create stock record:', stockInsertError)`
- `auth.ts:414` — `console.log('⚠️ Password reset requested for non-existent email:', ...)`
- `auth.ts:436` — `console.error('❌ Failed to save reset token:', ...)`
- `auth.ts:459` — `console.log('✅ Password reset email sent to:', ...)`
- `auth.ts:461` — `console.error('❌ Failed to send reset email:', ...)`
- `auth.ts:554` — `console.error('❌ Failed to update password:', ...)`
- `auth.ts:585` — `console.log('✅ Password reset successful for user:', ...)`

**Recommendation**: Replace all with structured logger.

---

## SECURITY AUDIT

### JWT & Auth

| Aspect | Status | Notes |
|--------|--------|-------|
| JWT_SECRET validation | ✅ Fail-fast on missing | |
| httpOnly cookies | ✅ XSS protection | |
| sameSite: 'lax' | ✅ CSRF protection | |
| secure flag | ✅ Conditional on production | |
| Access token expiry | ❌ 7d (should be 30m) | `ACCESS_TOKEN_EXPIRY` constant UNUSED |
| Refresh token rotation | ✅ SHA-256 hashing, reuse detection | |
| Session invalidation on password change | ❌ Only refresh tokens revoked | |
| Bcrypt rounds | ⚠️ 8 (should be 10+) | |

### Rate Limiting

**Status: COMPLETELY UNPROTECTED**

- `src/lib/security/rateLimiter.ts` defines 3 presets (LOGIN, API, SENSITIVE)
- Zero consumers — never called from any router or middleware
- In-memory Map() — resets on cold start, doesn't work across replicas
- **Fix**: Use Redis-backed rate limiting (Upstash already available)

### Tenant Isolation

| Check | Status |
|-------|--------|
| products.getById | ❌ NO tenant check |
| outlets.getById | ❌ NO tenant check |
| promotions.validate | ❌ NO tenant scope |
| transactions.create | ✅ Owner-scoped |
| stock operations | ✅ Owner-scoped |

### Payment Security

| Aspect | Status |
|--------|--------|
| QRIS generation | ✅ Static QRIS, proper encoding |
| Unique amount matching | ⚠️ Low entropy (1-999 offset) |
| QRIS storage | ⚠️ Base64 in DB (should use Storage) |
| Payment proof upload | ❌ No file size/type validation |
| Solana verification | ✅ On-chain verification |

---

## i18n AUDIT

| Metric | Value |
|--------|-------|
| EN keys | 403 |
| ID keys | 403 |
| Missing in ID | 0 |
| Missing in EN | 0 |
| Hardcoded strings in JSX | 0 found |

**Status: ✅ CLEAN** — i18n implementation is solid.

---

## TEST COVERAGE

| Category | Files | Coverage |
|----------|-------|----------|
| Unit tests (domain) | 0 | 0% |
| Unit tests (use-cases) | 0 | 0% |
| Unit tests (routers) | 0 | 0% |
| UI component tests | 2 | Button.test.tsx, Card.test.tsx |
| E2E tests | 1 | login.spec.ts |

**Total source files**: 19 domain + 5 use-cases + 18 routers + 8 infra = 50 files
**Total test files**: 3
**Test ratio**: 6% (critically low)

Jest config exists with 50% threshold but **zero actual tests** for business logic.

---

## REFACTOR ROADMAP (Priority Order)

### P0 — CRITICAL (Do Before Any Feature Work)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Activate rate limiting on auth endpoints (Redis-backed) | 2h | Blocks brute-force attacks |
| 2 | Wire `requirePermission` to transactions.void/refund | 1h | Prevents unauthorized voids |
| 3 | Create `src/middleware.ts` for route protection | 2h | Server-side auth enforcement |
| 4 | Fix JWT expiry: use 30m for access tokens | 30m | Proper token rotation |
| 5 | Add tenant checks to getById queries | 1h | Multi-tenant isolation |

### P1 — HIGH (Architecture Cleanup)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 6 | Extract infra deps from auth use-cases into interfaces | 4h | DDD compliance, testability |
| 7 | Create BusinessProfileRepository interface | 1h | DI consistency |
| 8 | Complete DI container — register all use-cases | 2h | Centralized dependency management |
| 9 | Fix PricingService to throw on missing price | 30m | Prevent silent data corruption |
| 10 | Remove BusinessTypeStrategy dead code | 30m | DRY violation fix |

### P2 — MEDIUM (Hardening)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 11 | Capture IP/UA in audit logs from tRPC context | 1h | Forensic capability |
| 12 | Scope promotions to tenant in validate | 30m | Cross-tenant abuse prevention |
| 13 | Replace console.* with structured logger | 2h | Production log hygiene |
| 14 | Standardize error handling to TRPCError | 2h | Consistent error responses |
| 15 | Increase bcrypt rounds to 10+ | 5m | Security hardening |
| 16 | Sanitize ILIKE search inputs | 30m | Prevent unexpected results |
| 17 | Use crypto.randomBytes for transaction IDs | 15m | Predictability prevention |

### P3 — LOW (Polish)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 18 | Convert Product/DailySale/DailyStock to proper entities | 4h | DDD purity |
| 19 | Add value object equality methods | 2h | DDD completeness |
| 20 | Move QRIS storage from DB base64 to Storage | 1h | Performance |
| 21 | Validate payment proof file size/type | 30m | Security |
| 22 | Add tests (domain services → use-cases → routers) | 16h+ | Confidence |

---

## QUICK WINS (30 min each, high impact)

1. **Fix JWT expiry** — Change `signJWT()` call to use `ACCESS_TOKEN_EXPIRY`
2. **Add tenant filter to getById** — One `.eq('owner_id', userId)` per query
3. **Activate rate limiter on login** — Import + call `checkRateLimit()` in auth.login
4. **Fix PricingService** — Change `?? 0` to `throw new DomainException()`
5. **Remove dead BusinessTypeStrategy** — Delete file, update imports if any

---

## LAYER VIOLATION MAP

```
src/use-cases/auth/LoginUserUseCase.ts
  └── import bcrypt from 'bcryptjs'          ❌ npm package
  └── import { signJWT } from '@/lib/jwt'    ❌ infra
  └── import { createSession }               ❌ infra (redis-upstash)

src/use-cases/auth/LogoutUserUseCase.ts
  └── import { deleteSession }               ❌ infra (redis-upstash)

src/use-cases/auth/RegisterUserUseCase.ts
  └── import bcrypt from 'bcryptjs'          ❌ npm package

src/server/routers/auth.ts
  └── import SupabaseUserRepository          ❌ direct infra (should use container)
  └── import SupabaseBusinessProfileRepo     ❌ direct infra + no interface

src/server/routers/auth.ts (lines 57, 132, 145, 231, 256, 272, 357, 402, 481)
  └── Direct Supabase calls from router      ❌ bypasses use-cases + repos
```

Domain layer (`src/domain/`): **CLEAN** ✅ — No infra imports found.

---

*Report generated by Hermes Agent — Phase 1 Backend Audit*
*Next: Phase 2 — Design System*
