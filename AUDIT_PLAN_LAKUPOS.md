# LakuPOS — Full Audit & Phased Strategy

> Comprehensive audit plan for LakuPOS (bahann-pos).  
> Backend → Design System → UI/UX Polish → Module-Specific UX.

---

## PHASE 1: Architecture Audit & Validation (CRITICAL — Do This First)

Before touching UI, validate the backend foundation. Based on the codebase, there are gaps to address.

### Identified Concerns

| # | Area | Issue |
|---|------|-------|
| 1 | **Serialization inconsistency** | tRPC + Supabase type alignment — Supabase generated types may drift from tRPC router output types. |
| 2 | **Migration strategy** | Tenant-aware migrations? Module-specific migrations (FNB vs Retail vs Service)? Current: single `supabase/migrations/` folder. |
| 3 | **Query optimization** | N+1 problems in tRPC routers, lazy loading strategy for products/transactions. |
| 4 | **Module boundaries** | F&B vs Retail vs Service — what overlaps, what diverges? Modular architecture already exists (`BusinessType`, `ItemType` in `src/domain/catalog/value-objects/`), but boundary enforcement needs validation. |

### Existing Modular Architecture (Already Implemented)

The codebase already has modular POS support:

- **`BusinessType`**: `FNB | RETAIL | SERVICE | HYBRID` — configured per tenant via `business_profiles` table
- **`ItemType`**: `PRODUCT | MENU | SERVICE | PACKAGE` — configured per product
- **`StockBehavior`**: `TRACKED | UNTRACKED | CONSUMED` — controls stock deduction
- **`PricingModel`**: `FIXED | TIERED | TIME_BASED` — controls price calculation
- **Domain services**: `StockService`, `PricingService`, `ItemFactory`, `BusinessTypeStrategy`
- **Migration**: `030_modular_product_types.sql`
- **Invalid combos** (e.g. `SERVICE+TRACKED`, `PRODUCT+CONSUMED`) throw `DomainException` via `ItemFactory.validateCombo()`

### Action Items

1. **Code audit**: Validate DDD layer boundaries (`domain → use-cases → infra → server → app`)
   - Check for layer violations (infra leaking into domain, etc.)
   - Validate DI container (`src/infra/container.ts`) consistency
2. **Database schema review**: Multi-tenant handling, module extensibility, RLS policies
3. **tRPC API surface**: Type safety, error handling consistency, procedure authorization (`public`/`protected`/`admin`/`requirePermission`)
4. **Test coverage**: Unit (business logic in domain/services), integration (module interactions), e2e (critical flows)
5. **Performance bottlenecks**: Query depth, subscription patterns, offload to Supabase realtime where possible
6. **Security audit**:
   - Multi-tenant data isolation (RLS enforcement)
   - Payment/QRIS security (input validation, idempotency)
   - JWT session management (7-day TTL, refresh token rotation)
   - Rate limiting coverage (`LOGIN`, `API`, `SENSITIVE` presets)
7. **i18n audit**: Validate `en.json` / `id.json` completeness — no hardcoded strings in JSX, all UI text goes through `t()` function.

### Deliverable

Audit report + refactor roadmap with 2-3 priority fixes.

---

## PHASE 2: Design System (Hybrid = Professional + UMKM Casual)

### Color Palette

| Role | Color | Hex | Notes |
|------|-------|-----|-------|
| **Primary surface** | Clean white | `#FFFFFF`, `#F8F9FA` | Backgrounds |
| **Primary accent** | Professional blue | `#2563EB` | Trust, stability — primary actions |
| **Secondary accent** | Warm orange/brown | `#EA7317`, `#D97706` | Approachable — hover, highlights |
| **Surface** | Light gray | `#F3F4F6`, `#E5E7EB` | Cards, sections — clean not sterile |
| **Text primary** | Dark gray | `#1F2937` | Readable, warm (not pure black) |
| **Text secondary** | Medium gray | `#374151` | Labels, descriptions |
| **Success** | Green | `#0A6B2E` | Positive states |
| **Warning** | Yellow | `#EAB308` | Caution (NOT brown) |
| **Error** | Dark red | `#8B1A1A` | Errors, critical stock |
| **Score high** | Green | `#0A6B2E` | Score badges |
| **Score mid** | Yellow | `#EAB308` | Score badges |
| **Score low** | Red | `#8B1A1A` | Score badges |

> Button example: Blue primary → Orange hover accent = professional but friendly.

### Typography (Hybrid Approach)

| Role | Font | Rationale |
|------|------|-----------|
| **Headlines** | Geist / Inter | Clean, modern — Vercel/Anthropic feel. Already in project (`geist` package). |
| **Body** | Space Grotesk / Plus Jakarta Sans | Friendly, warm — good for UMKM readability |
| **Monospace** | Fira Code / JetBrains Mono | Technical, readable — for codes, SKUs |

**Tone**: "Professional tapi ngga formal" — matches communication style.

### Component Style Guide

- **Cards**: Subtle shadow (`shadow-sm` → `shadow-md` on hover), rounded corners `8-12px`
- **Spacing**: 8px grid system — clean, consistent
- **Icons**: Lucide React (already in project) — consistent, Indonesian-friendly
- **Forms**: Clear labels + helper text — UMKM users need guidance
- **Buttons**: Rounded `8px`, clear CTA color, instant feedback (NEVER `window.confirm()`)
- **Modals**: Backdrop click to close, styled (not browser default)
- **Tooltips**: 10ms delay, `createPortal` + `z-[9999]`, `cloneElement` (no wrapper)
- **Data viz**: Deep saturated solid colors (no pastel/glass)

---

## PHASE 3: Module-Specific UX (Not Generic Dashboard)

### POS — Transaction Speed First

Priority: minimize time-to-checkout.

- **Large touch targets** — tablet usage common in F&B
- **Minimal clicks** to complete sale (3-4 max)
- **Clear product/category navigation** — grid with search
- **Payment method obvious & quick** — cash, QRIS, bank transfer, debit, credit card

> Flow: Search item → Add qty → Checkout (hamburger menu for settings)

### Warehouse — Inventory Clarity

Priority: stock visibility at a glance.

- **Stock levels color-coded**: green (high), yellow (low), red (critical)
- **Batch/SKU grouping** — UMKM juggle multiple categories
- **Filter/search prominent** — chaos common in small operations
- **Audit trail simple** — who moved what, when

> Flow: Category → Subcategory → Items with stock visual (bar graph)

### Multi-Tenant Considerations

- **Business switching prominent** — F&B vs Retail user might share the same app
- **Settings per module** — F&B needs payment terminals, Retail needs barcode scanner
- **Quick action buttons** based on module type (e.g., F&B gets "Split Bill", Retail gets "Barcode Scan")

---

## PHASE 4: Polish Checklist (After Backend + Design System)

- [ ] Dark mode support (toggle in settings)
- [ ] Loading states (skeleton + spinners — never blank screens)
- [ ] Error messages (user-friendly, actionable — not "An error occurred")
- [ ] Mobile responsive (UMKM often on phone/tablet — primary target: tablet)
- [ ] Accessibility (WCAG AA minimum)
- [ ] Keyboard navigation (speed for power users)
- [ ] Animations (subtle, purposeful — tidak overdone)
- [ ] Offline fallback (unstable internet common di Indonesia — Dexie + service worker already in project)
- [ ] Print layouts (receipt formatting, PDF/CSV reports — exporters already exist)

---

## RECOMMENDED WORKFLOW

| Week | Focus | Notes |
|------|-------|-------|
| **Week 1-2** | Backend Audit | Run code audit + document findings. Create priority refactor list. Fix critical architecture issues. |
| **Week 3** | Design System Lock | Finalize colors, typography, component rules. Build component library (HTML/storybook). Document tone/voice guidelines. |
| **Week 4+** | UI Implementation | Build component library (based on audit insights). Module-by-module: POS first → Warehouse second. Beta test with UMKM users. |

---

## QUICK WINS (Do These First For Instant Progress)

| # | Task | Time | Impact |
|---|------|------|--------|
| 1 | Pick & apply color palette | 30 min | Big visual impact |
| 2 | Fix 1-2 critical UX flows | 1-2 hrs | POS checkout, Warehouse search |
| 3 | Add loading states | 1-2 hrs | Shows polish, boosts perception |
| 4 | Mobile-first responsive | 2-3 hrs | UMKM users appreciate this |

---

## EXISTING INFRASTRUCTURE NOTES

Before starting, know what's already built:

- **PWA/Offline**: Service worker at `public/sw.js`, Dexie offline DB at `src/lib/offline/`, `SyncManager` auto-syncs every 30s
- **Payment system**: Cash, QRIS (static), bank transfer, debit, credit card — `src/lib/payment/`
- **Exports**: CSV + PDF generators at `src/lib/exporters/`
- **Rate limiting**: `src/lib/security/rateLimiter.ts` — LOGIN (5/15min), API (100/min), SENSITIVE (10/min)
- **Audit logging**: `src/lib/audit.ts` — DB table via `supabase/migrations/005_audit_logs.sql`
- **Sentry**: Configured via `withSentryConfig` in `next.config.ts`
- **i18n**: `src/locales/en.json` and `src/locales/id.json` via `LanguageContext`
- **Auth**: JWT in httpOnly cookie + Redis session (7-day TTL) + refresh token rotation
- **tRPC**: 12+ routers (auth, stock, sales, products, outlets, dashboard, transactions, cashSessions, promotions, stockAlerts, users, audit, businessProfile)

---

*Document generated: 2026-06-10*  
*Project: LakuPOS (bahann-pos)*  
*Stack: Next.js 16 + tRPC + Supabase + Redis + Tailwind CSS 4*
