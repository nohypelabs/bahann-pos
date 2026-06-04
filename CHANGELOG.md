# Changelog

All notable changes to Laku POS are documented in this file.

---

## [Unreleased] — 2026-06-03

### Added — Modular POS Architecture (Multi-Business Type)

#### Domain Layer
- **BusinessType** enum: `FNB`, `RETAIL`, `SERVICE`, `HYBRID` (`src/domain/catalog/value-objects/business-type.ts`)
- **ItemType** enum: `PRODUCT`, `MENU`, `SERVICE`, `PACKAGE` (`src/domain/catalog/value-objects/item-type.ts`)
- **StockBehavior** enum: `TRACKED`, `UNTRACKED`, `CONSUMED` (`src/domain/catalog/value-objects/stock-behavior.ts`)
- **PricingModel** enum: `FIXED`, `TIERED`, `TIME_BASED` (`src/domain/catalog/value-objects/pricing-model.ts`)
- **PricingTier** interface: `{ minQuantity, pricePerUnit }` for tiered pricing
- **DomainException** class with 12 machine-readable error codes (`src/domain/errors/DomainException.ts`)
- **BusinessProfile** entity with `createDefaults()` factory method (`src/domain/entities/BusinessProfile.ts`)
- **StockService** — pure functions: `deduct()`, `check()`, `assertCanDeduct()` (`src/domain/services/StockService.ts`)
- **PricingService** — pure functions: `calculatePrice()` for FIXED/TIERED/TIME_BASED (`src/domain/services/PricingService.ts`)
- **ItemFactory** — `create()` with validation, `validateCombo()` for state validation (`src/domain/services/ItemFactory.ts`)
- **BusinessTypeStrategy** — Strategy pattern per business type (`src/domain/services/BusinessTypeStrategy.ts`)

#### Database
- Migration `030_modular_product_types.sql`:
  - 4 PostgreSQL enum types (`business_type`, `item_type`, `stock_behavior`, `pricing_model`)
  - `business_profiles` table (id, user_id, business_type, enabled_modules, created_at)
  - 5 new columns on `products` table: `item_type`, `stock_behavior`, `pricing_model`, `pricing_tiers`, `duration_minutes`
  - Backward compatible: all columns have NOT NULL defaults matching existing behavior
  - RLS enabled on `business_profiles`
  - Auto-backfill: existing admin users get RETAIL business profile

#### API (tRPC)
- New `businessProfile` router: `getMyProfile`, `setup`, `update`
- `products.create` and `products.update`: accept `itemType`, `stockBehavior`, `pricingModel`, `pricingTiers`, `durationMinutes`
- `products.getAll`: new filters `itemType`, `stockBehavior`
- `transactions.create`: stock deduction now skips UNTRACKED/CONSUMED items

#### Frontend
- **Setup page** (`/setup`): business type selection with 4 cards (Retail/FnB/Service/Hybrid)
- **App layout**: auto-redirect to `/setup` if no business profile exists
- **Products page**: ProductFormModal with item type, stock behavior, pricing model dropdowns + PricingTierBuilder
- **POS sales page**: skip stock check for UNTRACKED items, ∞ badge, item type badges
- **Stock page**: filter to TRACKED products only, info banner for hidden items

#### i18n
- 30+ new `modular.*` translation keys in `id.json` and `en.json`

### Changed
- `Product` entity: added `itemType`, `stockBehavior`, `pricingModel`, `pricingTiers`, `durationMinutes` fields
- `database.types.ts`: updated `products` table definition, added `business_profiles` table, added enum types
- `container.ts`: added `businessProfileRepo`, `stockService`, `pricingService`
- `audit.ts`: added `'business_profile'` to `AuditEntity` type

---

## Previous Releases

See git history for changes before this changelog was created.

### Key Milestones
- **2026-04-24**: Landing page EN/ID, security fixes, header cleanup
- **2026-04-23**: SaaS Sesi 1 (Super Admin), X-style sidebar, multi-tenant fix
- **2026-04-21**: Sentry, scalability (PgBouncer, indexes, Redis cache), UpgradeModal
- **2026-04-20**: UI design system, dark mode, charts, about page
- **2026-04-19**: Bulk import, email verification, barcode, stock management, PWA
