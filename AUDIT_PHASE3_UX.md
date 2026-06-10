# LakuPOS — Phase 3: Module-Specific UX Audit & Changes

> Generated: 2026-06-10 | POS + Warehouse + Dashboard UX audit

---

## CHANGES APPLIED (Quick Wins)

### POS Sales Terminal (`src/app/(app)/pos/sales/page.tsx`)

| # | Change | Before | After | Impact |
|---|--------|--------|-------|--------|
| 1 | Auto-select single outlet | Manual selection required every time | Auto-selects if only 1 outlet exists | Eliminates 1 mandatory click |
| 2 | Quick qty buttons touch target | `w-8 h-8` (32px) | `min-w-11 min-h-11` (44px) | Meets iOS touch guidelines |
| 3 | Cart +/- buttons touch target | `w-7 h-7` (28px) | `min-w-10 min-h-10` (40px) | Meets minimum touch target |

### PaymentModal (`src/components/payment/PaymentModal.tsx`)

| # | Change | Impact |
|---|--------|--------|
| 4 | Removed debug info div (Step/Selected/Loading) | No more debug text visible in production |

### Cash Payment (`src/components/payment/CashPaymentDisplay.tsx`)

| # | Change | Impact |
|---|--------|--------|
| 5 | Added "Uang Pas" (exact amount) quick button | 1-click exact payment, faster checkout |

### Inventory Page (`src/app/(app)/warehouse/inventory/page.tsx`)

| # | Change | Impact |
|---|--------|--------|
| 6 | Added real-time search input (name/SKU filter) | Find products instantly without scrolling |
| 7 | Hidden SKU + Category columns on mobile (low-stock table) | No more horizontal overflow on phones |
| 8 | Hidden SKU column on mobile (all-products table) | Cleaner mobile table layout |

### Stock Page (`src/app/(app)/warehouse/stock/page.tsx`)

| # | Change | Impact |
|---|--------|--------|
| 9 | Page header now visible on mobile | Users know which page they're on |

---

## REMAINING ISSUES (Prioritized)

### POS — HIGH Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | No category filter for products | 2h | Faster product discovery with 50+ items |
| 2 | No product grid/tile view (only table rows) | 4h | Better visual browsing on tablets |
| 3 | Cart not persisted to localStorage | 1h | Prevents cart loss on refresh |
| 4 | No "hold/park transaction" feature | 3h | Multi-customer scenarios |
| 5 | No swipe-to-delete on mobile cart items | 2h | Expected mobile UX |
| 6 | Cash quick amounts not configurable | 1h | Per-business customization |

### POS — MEDIUM Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 7 | No tap-to-add on mobile (requires select + scroll + add) | 2h | Faster mobile POS flow |
| 8 | Cart drawer blocks product list on mobile | 3h | Can't reference products while reviewing cart |
| 9 | No price override per item | 2h | Negotiated sales support |
| 10 | No auto-print receipt option | 1h | High-volume scenarios |
| 11 | onKeyPress deprecated — use onKeyDown | 15m | React best practice |

### Warehouse — HIGH Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | No stock movement history/audit trail | 4h | Can't trace who did what |
| 2 | No user attribution on stock recordings | 1h | Accountability gap |
| 3 | No searchable product selector on stock page | 2h | Painful with large catalogs |
| 4 | Inconsistent color-coding thresholds across pages | 1h | Confusing severity levels |
| 5 | Duplicate StatCard implementations (local vs shared) | 1h | Inconsistent styling |

### Warehouse — MEDIUM Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 6 | No category filter on inventory page | 1h | Better organization |
| 7 | No pagination on inventory table | 2h | Performance with 100+ products |
| 8 | No stock reason/notes field | 1h | Context for adjustments |
| 9 | No "all clear" state on dashboard low-stock | 30m | Reassurance that system works |
| 10 | Calculator strip wraps on narrow screens | 1h | Formula hard to follow |

### Dashboard — MEDIUM Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | Inline StatCard instead of shared component | 1h | Consistency |
| 2 | No quick action for "View Inventory" or "Stock Alerts" | 30m | Discoverability |
| 3 | Revenue targets hardcoded (5M daily, 150M monthly) | 1h | Per-business config |

---

## TRANSACTION FLOW ANALYSIS

### Current POS Flow (Happy Path)

```
Desktop:
  1. Select outlet (auto-skipped if 1 outlet) ← FIXED
  2. Search/select product
  3. Set quantity (default=1)
  4. Click "Tambah ke Keranjang"
  5. Click "Bayar"
  6. Select payment method
  7. Confirm payment (cash: enter amount or "Uang Pas") ← IMPROVED
  Total: 4-6 clicks

Mobile:
  Same + open cart drawer
  Total: 5-7 clicks
```

### Target POS Flow (Future)

```
Desktop:
  1. Search product (or scan barcode)
  2. Tap product → auto-add with qty=1
  3. Click "Bayar"
  4. Select payment → confirm
  Total: 3-4 clicks

Mobile:
  1. Scan barcode or tap product grid
  2. Swipe to adjust qty
  3. Tap "Bayar"
  4. Select payment → confirm
  Total: 3-4 clicks
```

---

## STOCK VISIBILITY ANALYSIS

### Current Color Coding

| Page | Critical | Warning | Low | OK |
|------|----------|---------|-----|-----|
| inventory (low-stock) | ≤5 (red) | ≤10 (yellow) | ≤20 (orange) | >20 |
| inventory (all-products) | 0 (red) | ≤10 (yellow) | — | >10 (green) |
| stock | — | ≤10 (red border) | — | >0 (green border) |
| alerts | out_of_stock (red) | low_stock (yellow) | — | — |

**Problem**: Thresholds are inconsistent across pages. Should be unified.

### Recommended Unified Thresholds

```
CRITICAL: stock ≤ 5   → red background, red text
WARNING:  stock ≤ 10  → yellow background, yellow text  
LOW:      stock ≤ 20  → orange background, orange text
OK:       stock > 20  → green text, no background
```

---

*Report generated by Hermes Agent — Phase 3 Module-Specific UX*
*Next: Phase 4 — Polish Checklist*
