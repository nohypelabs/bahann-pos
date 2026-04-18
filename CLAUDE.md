# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server on :3000
pnpm build            # Production build
pnpm lint             # ESLint
pnpm test             # Jest (unit/integration)
pnpm test:watch       # Jest in watch mode
pnpm test:coverage    # Jest with coverage
pnpm test:e2e         # Playwright E2E
pnpm test:e2e:ui      # Playwright with UI
ANALYZE=true pnpm build  # Bundle analysis

# Run a single test file
pnpm test -- src/components/ui/__tests__/Button.test.tsx

# Regenerate Supabase TypeScript types (outputs to src/infra/database.types.ts)
pnpm gen:types
```

## Architecture

This is a **Clean Architecture / DDD** Next.js app (App Router). Dependency flow:

```
domain → use-cases → infra → server (tRPC) → app (pages/components)
```

### Layer Responsibilities

| Layer | Path | Purpose |
|---|---|---|
| **Domain** | `src/domain/` | Pure entities (`User`, `Product`, `DailySale`, `DailyStock`) and repository interfaces — no framework deps |
| **Use Cases** | `src/use-cases/` | Application logic (`RecordDailySaleUseCase`, `LoginUserUseCase`, etc.) — depend only on domain interfaces |
| **Infra** | `src/infra/` | Supabase repository implementations; DI container at `container.ts` |
| **Server** | `src/server/` | tRPC routers that call use-cases/infra; `trpc.ts` defines context + procedure types |
| **App** | `src/app/` | Next.js App Router pages; authenticated routes under `(app)/` |
| **Lib** | `src/lib/` | Cross-cutting utilities: JWT, Redis, cookies, audit, payment, i18n, tRPC client |
| **Shared** | `src/shared/` | `AppError`, Zod v4 schemas, validation helpers |

There is also `src/interfaces/` (api, controllers, presenters) which mirrors an MVC adapter layer on top of the use cases, though tRPC routers are the primary API surface.

### tRPC

Router mounted at `src/app/api/trpc/[trpc]/`. All sub-routers combined in `src/server/routers/_app.ts`:

```
auth, stock, sales, products, outlets, dashboard, transactions,
cashSessions, promotions, stockAlerts, users, audit
```

Three procedure types in `src/server/trpc.ts`:
- `publicProcedure` — unauthenticated
- `protectedProcedure` — requires valid JWT session
- `adminProcedure` — requires `role === 'admin'`
- `requirePermission(key)` — granular permission middleware (admins bypass; others checked against `users.permissions` JSONB column)

tRPC client is at `src/lib/trpc/client.ts`; React provider at `src/lib/trpc/Provider.tsx`.

### Authentication

- JWT stored in **httpOnly cookie** (`auth-token`); Authorization header accepted as fallback.
- Sessions written to **Redis** (`session:<userId>`, 7-day TTL): `src/lib/redis.ts` (local ioredis) or `src/lib/redis-upstash.ts` (Upstash in production).
- Route middleware at `src/middleware/auth.ts` (Supabase session helper).
- Refresh tokens: `src/lib/refreshToken.ts` + DB table via `supabase/migrations/006_refresh_tokens.sql`.

### Dependency Injection

`src/infra/container.ts` is a simple factory — instantiate use cases with Supabase repo implementations. Import `container` in tRPC routers rather than constructing directly.

### Localization

All **code elements** (variables, functions, comments, errors) must be **English only**. UI text uses i18n:

```tsx
import { useLanguage } from '@/lib/i18n/LanguageContext'
const { t } = useLanguage()
// t('dashboard.title')
```

String tables: `src/locales/en.json` and `src/locales/id.json`. Never hardcode Indonesian strings in JSX.

### Key Patterns

- **Zod v4** for all validation — schemas in `src/shared/schemas/`.
- **Recharts** charts lazy-loaded via wrapper components in `src/components/charts/`.
- **PWA / Offline**: service worker at `public/sw.js`; offline DB via Dexie in `src/lib/offline/`; `SyncManager` auto-syncs every 30 seconds when online.
- **Payment**: `src/lib/payment/` — supports `cash`, `qris` (static QRIS), `bank_transfer`, `debit`, `credit_card`; QRIS generation via `qris-generator.ts`.
- **Exports**: CSV and PDF generators in `src/lib/exporters/`.
- **Rate limiting**: `src/lib/security/rateLimiter.ts` — presets `LOGIN` (5/15 min), `API` (100/min), `SENSITIVE` (10/min).
- **Audit logging**: `src/lib/audit.ts`; DB table via `supabase/migrations/005_audit_logs.sql`.
- **Sentry**: configured via `withSentryConfig` in `next.config.ts`; per-runtime configs in `sentry.client/server/edge.config.ts`.
- **React Compiler** (`babel-plugin-react-compiler`) is enabled — avoid manual `useMemo`/`useCallback` where the compiler can handle it.

### Authenticated App Routes (`src/app/(app)/`)

```
dashboard, pos, products, transactions, payments, stock (warehouse),
outlets, promotions, alerts, eod, settings, profile, reports, help
```

### Environment Variables

Required locally (copy from `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
REDIS_HOST / REDIS_PORT / REDIS_PASSWORD   # local Redis
REDIS_URL / REDIS_TOKEN                    # Upstash (production)
NEXT_PUBLIC_APP_URL
```

Full list including optional Sentry/GA vars: `deployment/ENV_VARIABLES.md`.

### Database Migrations

Supabase migrations live in `supabase/migrations/`. Run via Supabase CLI. When adding new DB columns, use English names (existing mixed-language columns are kept stable to avoid breaking changes).
