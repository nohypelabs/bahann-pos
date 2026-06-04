# Modular POS Architecture — Multi-Business Type Support

> Dokumentasi arsitektur modular POS yang mendukung berbagai jenis usaha: Retail, FnB/Kuliner, Jasa, dan Hybrid.

---

## Overview

Laku POS sekarang mendukung **4 tipe bisnis** dan **4 tipe item** dengan perilaku stok dan model harga yang fleksibel. Sistem tidak lagi mengasumsikan semua item adalah produk fisik dengan stok terlacak.

### Business Types

| Type | Icon | Contoh Usaha | Default Modules |
|------|------|-------------|-----------------|
| `RETAIL` | 🏪 | Minimarket, toko kelontong, warung | `inventory` |
| `FNB` | 🍜 | Warung makan, cafe, resto, nasi goreng | `recipe` |
| `SERVICE` | ✂️ | Barbershop, car wash, laundry, servis AC | `appointment` |
| `HYBRID` | 🔄 | Toko + jasa, retail + kuliner | `inventory`, `recipe` |

### Item Types

| Type | Deskripsi | Contoh |
|------|-----------|--------|
| `PRODUCT` | Barang fisik dengan SKU | Minyak, rokok, aqua |
| `MENU` | Makanan / minuman | Nasi goreng, pecel lele, kopi |
| `SERVICE` | Jasa / layanan | Potong rambut, cuci mobil |
| `PACKAGE` | Bundling produk/menu/jasa | Paket hemat, combo meal |

### Stock Behaviors

| Behavior | Deskripsi | Kapan Dipakai |
|----------|-----------|---------------|
| `TRACKED` | Stok dipotong otomatis per transaksi | Produk fisik retail |
| `UNTRACKED` | Stok tidak dilacak | Jasa, menu standar |
| `CONSUMED` | Stok bahan baku dikurangi via resep | Menu dengan resep (advanced FNB) |

### Pricing Models

| Model | Deskripsi | Contoh |
|-------|-----------|--------|
| `FIXED` | Harga tetap / flat | Rp 5.000 per item |
| `TIERED` | Harga grosir berdasarkan qty | 1-10: Rp 10.000, 11-50: Rp 8.000, 50+: Rp 6.000 |
| `TIME_BASED` | Harga per durasi | Rp 5.000/menit, Rp 50.000/jam |

---

## Valid State Combinations

Tidak semua kombinasi item type + stock behavior + pricing model valid:

| Item Type | ✅ TRACKED | ✅ UNTRACKED | ✅ CONSUMED |
|-----------|-----------|-------------|-------------|
| **PRODUCT** | ✅ | ✅ | ❌ |
| **MENU** | ✅ | ✅ | ✅ |
| **SERVICE** | ❌ | ✅ | ✅ |
| **PACKAGE** | ✅ | ✅ | ❌ |

| Item Type | ✅ FIXED | ✅ TIERED | ✅ TIME_BASED |
|-----------|---------|----------|--------------|
| **PRODUCT** | ✅ | ✅ | ✅ |
| **MENU** | ✅ | ✅ | ❌ |
| **SERVICE** | ✅ | ❌ | ✅ |
| **PACKAGE** | ✅ | ✅ | ✅ |

Validasi dilakukan di:
- **Backend**: `ItemFactory.validateCombo()` → throws `DomainException`
- **tRPC**: `DomainException` di-catch dan di-map ke `TRPCError(BAD_REQUEST)`
- **Zod Schema**: `ItemTypeComboSchema` dengan `.refine()` untuk validasi kombinasi

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  App Layer (Pages & Components)                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ /setup   │ │ /products│ │ /pos/    │ │ /warehouse/   │  │
│  │ (new)    │ │ (updated)│ │ sales    │ │ stock         │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  tRPC Routers                                               │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────┐            │
│  │businessProfile│ │ products │ │ transactions │            │
│  │ (new)        │ │ (updated)│ │ (updated)    │            │
│  └──────────────┘ └──────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure (Supabase Repositories + Container)         │
│  ┌──────────────────────────┐ ┌──────────┐                 │
│  │SupabaseBusinessProfileRepo│ │ container│                 │
│  │ (new)                    │ │ (updated)│                 │
│  └──────────────────────────┘ └──────────┘                 │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer (Entities, Services, Value Objects)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │StockSvc  │ │PricingSvc│ │ItemFactory│ │BusTypeStrat│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │BusinessType│ │ItemType │ │StockBehav│ │PricingModel│     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│  Database (Supabase PostgreSQL)                             │
│  ┌──────────────┐ ┌──────────┐ ┌──────────────────────┐    │
│  │business_profiles│ │ products │ │ 4 PostgreSQL Enums  │    │
│  │ (new table)   │ │ (+5 cols)│ │ (new)               │    │
│  └──────────────┘ └──────────┘ └──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Flow

```
domain (pure, no deps)
  ↓
use-cases (depend on domain interfaces)
  ↓
infra (Supabase implementations)
  ↓
server/tRPC (routers call infra + domain services)
  ↓
app (pages/components call tRPC)
```

---

## File Changes Reference

### New Files (15)

| File | Purpose |
|------|---------|
| `src/domain/catalog/value-objects/business-type.ts` | BusinessType enum + labels |
| `src/domain/catalog/value-objects/item-type.ts` | ItemType enum + labels |
| `src/domain/catalog/value-objects/stock-behavior.ts` | StockBehavior enum + labels |
| `src/domain/catalog/value-objects/pricing-model.ts` | PricingModel enum + PricingTier interface |
| `src/domain/catalog/value-objects/index.ts` | Barrel export |
| `src/domain/errors/DomainException.ts` | DomainException class + error codes |
| `src/domain/entities/BusinessProfile.ts` | BusinessProfile entity + createDefaults() |
| `src/domain/services/StockService.ts` | Stock deduction logic (pure functions) |
| `src/domain/services/PricingService.ts` | Price calculation (FIXED/TIERED/TIME_BASED) |
| `src/domain/services/BusinessTypeStrategy.ts` | Strategy pattern per business type |
| `src/domain/services/ItemFactory.ts` | Product creation with validation |
| `src/infra/repositories/SupabaseBusinessProfileRepository.ts` | DB operations for business_profiles |
| `src/server/routers/businessProfile.ts` | tRPC router (getMyProfile, setup, update) |
| `src/app/(app)/setup/page.tsx` | Business type selection page |
| `supabase/migrations/030_modular_product_types.sql` | Database migration |

### Modified Files (10)

| File | Changes |
|------|---------|
| `src/domain/entities/Product.ts` | +itemType, stockBehavior, pricingModel, pricingTiers, durationMinutes, canDeductStock() |
| `src/infra/database.types.ts` | +business_profiles table, +5 product columns, +4 enum types |
| `src/infra/container.ts` | +businessProfileRepo, stockService, pricingService |
| `src/server/routers/products.ts` | +itemType/stockBehavior/pricingModel fields in create/update/getAll, +DomainException handling |
| `src/server/routers/transactions.ts` | Stock deduction skips UNTRACKED/CONSUMED items |
| `src/server/routers/_app.ts` | +businessProfile router |
| `src/app/(app)/layout.tsx` | +business profile check, redirect to /setup |
| `src/app/(app)/pos/sales/page.tsx` | Skip stock check for UNTRACKED, ∞ badge, item type badges |
| `src/app/(app)/warehouse/stock/page.tsx` | Filter to TRACKED only, info banner |
| `src/app/(app)/products/page.tsx` | +itemType/stockBehavior/pricingModel dropdowns, PricingTierBuilder, badges |
| `src/shared/schemas/product.schemas.ts` | +ItemTypeSchema, StockBehaviorSchema, PricingModelSchema, .refine() validation |
| `src/locales/id.json` | +30 `modular.*` translation keys |
| `src/locales/en.json` | +30 `modular.*` translation keys |
| `src/lib/audit.ts` | +'business_profile' to AuditEntity |

---

## Database Migration

### Migration 030: `030_modular_product_types.sql`

**Apa yang dilakukan:**
1. Buat 4 PostgreSQL enum types
2. Buat `business_profiles` table
3. Tambah 5 kolom ke `products` table (dengan DEFAULT → backward compatible)
4. Buat indexes
5. Enable RLS pada `business_profiles`
6. Backfill: semua admin user existing dapat profile RETAIL

**Rollback:**
```sql
-- Rollback migration 030
DROP TABLE IF EXISTS business_profiles;
ALTER TABLE products
  DROP COLUMN IF EXISTS item_type,
  DROP COLUMN IF EXISTS stock_behavior,
  DROP COLUMN IF EXISTS pricing_model,
  DROP COLUMN IF EXISTS pricing_tiers,
  DROP COLUMN IF EXISTS duration_minutes;
DROP TYPE IF EXISTS pricing_model;
DROP TYPE IF EXISTS stock_behavior;
DROP TYPE IF EXISTS item_type;
DROP TYPE IF EXISTS business_type;
```

---

## User Flow

### New User Registration

```
/register → (fill form) → /login → /setup → (select business type) → /dashboard
```

### Existing User (after migration)

```
/login → (auto-detect no profile) → /setup → (select business type) → /dashboard
```

### Creating Products

```
/products → Tambah Produk →
  1. Pilih Tipe Item (Produk/Menu/Jasa/Paket)
  2. Auto-suggest Perilaku Stok & Model Harga
  3. Isi SKU, Nama, Harga
  4. Jika TIERED → tambah tier (min qty + harga/unit)
  5. Jika TIME_BASED → isi durasi (menit)
  6. Submit → validasi kombinasi → simpan
```

### POS Sales

```
/pos/sales →
  - Produk TRACKED: tampil stok, cek stok saat add to cart
  - Produk UNTRACKED: tampil ∞, skip stok check
  - Badge tipe item: 📦/🍜/✂️ terlihat di product list
  - Transaksi: stok hanya dipotong untuk TRACKED items
```

---

## Error Handling

### Domain Error Codes

| Code | Message (ID) | When |
|------|-------------|------|
| `INSUFFICIENT_STOCK` | Stok tidak mencukupi | TRACKED item, stok < qty |
| `ITEM_UNTRACKED_NO_DEDUCT` | Item ini tidak memiliki stok | Deduct dipanggil untuk UNTRACKED |
| `INVALID_ITEM_TYPE_STOCK_COMBO` | Kombinasi tipe item dan stok tidak valid | SERVICE+TRACKED, PRODUCT+CONSUMED |
| `INVALID_ITEM_TYPE_PRICING_COMBO` | Kombinasi tipe item dan harga tidak valid | SERVICE+TIERED, MENU+TIME_BASED |
| `MISSING_PRICING_TIERS` | Tier harga wajib diisi | TIERED tanpa tiers |
| `MISSING_DURATION` | Durasi wajib diisi | TIME_BASED tanpa duration |
| `BUSINESS_PROFILE_NOT_FOUND` | Profil bisnis tidak ditemukan | Query profile yang belum ada |
| `BUSINESS_PROFILE_ALREADY_EXISTS` | Profil bisnis sudah ada | Double setup |

### Error Flow

```
DomainException (domain layer)
  ↓ catch in tRPC router
TRPCError(BAD_REQUEST) (server layer)
  ↓ tRPC client
Error.message (frontend)
  ↓ showToast / setError
User sees friendly message
```

---

## Testing Checklist

### Business Profile
- [ ] Register baru → auto redirect ke /setup
- [ ] Login existing user (tanpa profile) → redirect ke /setup
- [ ] Pilih setiap business type → profile tersimpan
- [ ] Setelah setup → redirect ke /dashboard
- [ ] /setup diakses langsung (sudah punya profile) → redirect ke /dashboard

### Product Creation
- [ ] Buat PRODUCT + TRACKED + FIXED → berhasil
- [ ] Buat MENU + UNTRACKED + FIXED → berhasil
- [ ] Buat SERVICE + UNTRACKED + FIXED → berhasil
- [ ] Buat SERVICE + TRACKED → error "Service items cannot have tracked stock"
- [ ] Buat PRODUCT + CONSUMED → error "Physical products cannot use consumed stock"
- [ ] Buat SERVICE + TIERED → error "Service items cannot use tiered pricing"
- [ ] Buat MENU + TIME_BASED → error "Menu items cannot use time-based pricing"
- [ ] Buat TIERED tanpa tiers → error "Pricing tiers required"
- [ ] Buat TIME_BASED tanpa duration → error "Duration required"

### POS Sales
- [ ] Produk TRACKED: stok tampil, cek stok saat add to cart
- [ ] Produk UNTRACKED: tampil ∞, bisa add tanpa stok
- [ ] Badge tipe item (Jasa/Menu/Paket) tampil di product list
- [ ] Transaksi dengan UNTRACKED item → stok tidak dipotong
- [ ] Transaksi dengan TRACKED item → stok terpotong otomatis

### Stock Page
- [ ] Hanya produk TRACKED yang tampil di dropdown
- [ ] Info banner: "X item disembunyikan" (count UNTRACKED products)
- [ ] Record stock untuk TRACKED product → berhasil

### Dashboard
- [ ] Low stock widget: exclude UNTRACKED items
- [ ] Revenue stats: include semua tipe item

---

## i18n Keys

Semua key menggunakan prefix `modular.*`:

```
modular.businessType
modular.businessType.select
modular.businessType.fnB
modular.businessType.retail
modular.businessType.service
modular.businessType.hybrid
modular.itemType
modular.itemType.product
modular.itemType.menu
modular.itemType.service
modular.itemType.package
modular.stockBehavior
modular.stockBehavior.tracked
modular.stockBehavior.untracked
modular.stockBehavior.consumed
modular.pricingModel
modular.pricingModel.fixed
modular.pricingModel.tiered
modular.pricingModel.timeBased
modular.pricingTiers
modular.pricingTiers.add
modular.pricingTiers.minQty
modular.pricingTiers.pricePerUnit
modular.durationMinutes
modular.noStock
modular.unlimited
modular.setup.title
modular.setup.description
modular.setup.complete
modular.error.invalidCombo
modular.error.serviceNoTrack
modular.error.productNoConsume
modular.error.serviceNoTiered
modular.error.menuNoTimeBased
modular.error.missingTiers
modular.error.missingDuration
```

---

## Future Enhancements

### Phase 2 (Planned)
- [ ] **Recipe Management** — CONSUMED stock behavior dengan resep (bahan baku per menu item)
- [ ] **Appointment Module** — untuk SERVICE businesses (booking, scheduling)
- [ ] **Package Builder** — compose PRODUCT + MENU + SERVICE menjadi PACKAGE
- [ ] **Business Profile Settings** — edit business type di halaman Settings

### Phase 3 (Advanced)
- [ ] **Inventory Forecasting** — prediksi stok habis berdasarkan sales velocity
- [ ] **Multi-outlet Stock Transfer** — pindah stok antar outlet
- [ ] **Supplier Management** — PO dan receiving
- [ ] **Advanced Reporting** — breakdown revenue per item type
