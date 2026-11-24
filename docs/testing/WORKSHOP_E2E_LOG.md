# Workshop module: end-to-end test log

Every end-to-end run of the workshop (bengkel) module is recorded here: environment, steps, expected and
actual results, evidence, and the bugs it found. Newest run first. Design: [../BENGKEL_MODULE.md](../BENGKEL_MODULE.md).

## Environments

| Name | What it is | Used for |
|---|---|---|
| **Prod copy (Postgres)** | Production restored into a throwaway `postgres:17` container with `deployment/backup/` | Migrations and SQL functions, before applying them to production |
| **Prod copy (PostgREST)** | The same, plus `public.ecr.aws/supabase/postgrest:v14.18`, a `/rest/v1` path proxy and a service-role JWT | `SupabaseWorkshopRepository.integration.test.ts` (opt-in, `WORKSHOP_IT=1`, localhost only) |
| **Local app → production DB** | `next dev -p 3123` on the laptop, `.env.local` pointing at the production Supabase project | UI and payment flows in Chrome |

Test tenant on production: `agdscid+bengkel-uji@gmail.com`, store "Uji Bengkel (test)", HYBRID, plan `custom`,
workshop module on. Seeded and re-seedable with `scripts/workshop-test-tenant.mjs`. The password is not stored in
the repo. Approval PIN for voids on this tenant: `4321`. It has a dummy bank-transfer method ("BANK UJI").

Known dev-environment gotcha: the PWA service worker (`public/sw.js`, cache-first on `/_next/static/`) serves
stale CSS and JS under `next dev`. Unregister it and clear caches in the test browser before testing UI changes.

---

## 2026-11-25 · Offline mode (local app → production DB)

Design: [../OFFLINE_MODE.md](../OFFLINE_MODE.md). Migration `057_offline_ops.sql` tested on a production copy
first (applied twice; first claim `true`, second claim while processing `false`, replay after done returns the stored
result, a claim older than 2 minutes is taken over; `current_stock_levels` gives spark plugs 12 = the latest
`daily_stock`; `authenticated` cannot execute either function), then applied to production.

| # | Spec | What it checks | Result |
|---|---|---|---|
| 7.1 | `07-offline` | `context.setOffline(true)`: open a note for a new plate, add oil change + spark plug from the cached catalogue, pay cash Rp50.000 for Rp40.000 on the station's cash screen; receipt shows Kembalian Rp10.000 and "Dicatat offline"; list shows Lunas + Belum terkirim. Back online: all sent, note paid Rp40.000, the sale's transaction number = the receipt number printed offline, amount paid 50.000 / change 10.000, spark plugs −1 | ✅ |
| 7.2 | `08-offline-push` | API: open + set item + pay cash in one push → done ×3; the same batch again → done ×3 with the same result, one sale, stock −1 once; an op on a missing note → failed `SERVICE_ORDER_NOT_FOUND`, and again on replay | ✅ |
| 7.3 | `09-offline-reload` | Service worker allowed: offline, open a note, reload on `?note=…` and on the list; both load from cache with the unsent note; back online it reaches the server | ✅ |
| 7.4 | `10-pos-offline` | Quick cashier: sell offline, the sale waits in IndexedDB (`synced = 0` index count > 0), back online it appears completed on the server, linked to the shift | ✅ |
| 7.5 | `01`–`06` | Online flows through the new station UI | ✅ |

Final local run of all ten specs: **10 passed in 1.6 min** (after topping up the test tenant through `stock.record`:
spark plugs 4 → 34, oil 6 → 26). Evidence from it: walk-in `E2EWV3VHUE` paid Rp110.000; offline note
`411e70d4-963d-4cf3-84a7-d7f3b34c9266` receipt `TRX-MWV3WLVB-GOFGY`; push replay `E2E-OFF-1795549663755`; quick-cashier
offline sale `TRX-MWV3X4JC-5MYNO`. Unit tests: 146 passed, 2 skipped; production build passed.

Evidence: offline note `60b2e31b-16ee-4001-8011-11ded56af95d`, receipt `TRX-MWV3M7QO-XVNN0`, spark plugs 6 → 5;
push replay note `57e94405-8748-437c-b162-f1df5403a325`, number `E2E-OFF-1795549178939`; reload note
`3c5aa66d-607f-4d96-b11a-0c8c9d5fd6e6` (cancelled afterwards); quick-cashier sale `TRX-MWV3PAXR-YVDQD` (completed,
has shift).

Bugs found and fixed while building it:

1. After an online payment the background sync removed the paid note from the open list while its receipt was on
   screen, so the receipt vanished (specs 03 and 04 failed). The editor now keeps the receipt.
2. Quick-cashier offline sales were never sent: `synced` was a boolean, which IndexedDB does not index (pre-existing).
3. The service worker usually never registered: its `load` listener was added after `load` (pre-existing).
4. Offline quick-cashier sales were sent without their shift, and dropped after five stock refusals (pre-existing).
5. The helper navigated with `page.goto` while offline (test bug); it now stays on the list.

---

## 2026-11-25 · Full suite against production after deploying the fixes

Environment: production `https://lakupos.vercel.app`, commit `8c92104`, Vercel deploy `success`;
`WORKSHOP_E2E_BASE_URL=https://lakupos.vercel.app pnpm test:e2e:workshop`, system Chromium.

**6 passed in 1.1 min.** The receipt preview is styled on the production build too (F3 was first seen there),
and the receipt shows Bayar Rp150.000 / Kembalian Rp40.000.

- walk-in: plate `E2EWV250KZ`, note `c497e34b-4412-4c6f-9c68-b00812a0299c`, paid Rp110.000, spark plugs 14 → 12
- guard: `E2EGV25DTU`, cancelled
- member: note `2eb1fad0-b63c-477f-8194-166e3f4615a1`, stamps 6 → 7 / 10
- voucher: `VCR-A34938A0`, paid Rp55.000
- labels: passed
- bulk barcodes: part `2000000000084`, service none

---

## 2026-11-25 · Fixing the findings from phases 1–6

The owner asked for every finding logged so far to be fixed. Each fix and how it was verified:

| # | Finding | Fix | Verified by |
|---|---|---|---|
| F1 | `daily_sales` kept only the first sale of a product per day (insert hit `UNIQUE (product_id, outlet_id, sale_date)`) | Migration `056_daily_sales_accumulate.sql`: `add_daily_sale` adds to the day's row atomically, never below 0; voids subtract on the day of the sale; existing rows recomputed from transactions | Prod copy: before 14 units, after 30 = completed sales; +2 +3 → 9, void −2 → 7, clamps at 0; idempotent; `authenticated` cannot execute. Applied to production. After the suite: today's `daily_sales` equals completed transactions for all 4 products (BUSI 6/6, JASA-GANTI-OLI 3/3, JASA-SRV-RINGAN 6/6, OLI 6/6, revenue equal). Unit tests for sale and void |
| F2 | "Buat barcode kosong" also gave services a barcode | Without a selection, only non-service items are passed to `assign_missing_barcodes`; a selection still gets what was picked | New spec `06-bulk-barcodes`: part got `2000000000077`, service stayed empty; both test products deleted afterwards |
| F3 | Receipt preview rendered inline and unstyled (styled-jsx scoping never applied, dev and prod) | `PrintPreviewModal` rewritten with Tailwind as a real dialog; receipt CSS moved to `src/components/print/receipt.css` (global, all rules under `receipt-*`, `text-*` scoped to `.receipt-container`, no global `@page`/`body` rules) | `01-walk-in` asserts the dialog has a white background and `.receipt-container` has a max width; production CSS bundle contains the receipt rules |
| F4 | `/pos/sales` (and Catat Stok, Riwayat, Produk) loaded only the first 50 products | `products.getAll({ all: true })` pages through the catalogue 1000 rows at a time; the POS draws at most 120 cards with a hint to search or scan for the rest | Unit test: 2300 products loaded in 3 requests; Chrome: POS lists all 6 test products, Catat Stok offers all products, Riwayat loads, no console errors |
| F5 | Receipt showed "Bayar" = total and no change | `PaymentModal` passes the cash handed over and the change to `onSuccess`; POS and service-note receipts use them | `01-walk-in` pays Rp150.000 for Rp110.000: receipt shows Bayar Rp150.000, Kembalian Rp40.000 |
| F6 | `gen:types` pointed at the old Supabase project | Points at `weizdahzmwgsqzdossdq`; `src/infra/database.types.ts` regenerated (now includes the workshop and product-code tables) | `tsc` passes with the new types |
| F7 | Unused `Search` import on the products page | Removed | eslint |

Suite after the fixes (local app → production DB): **6 passed in 1.8 min.**

- walk-in: plate `E2EWV1UAYI`, note `32e55609-d546-46c3-9756-e1b0381aca48`, paid Rp110.000, spark plugs 16 → 14
- guard: `E2EGV1UOTK`, cancelled
- member: note `9cfd309f-d6e3-412c-9735-b5ce636a44bb`, stamps 4 → 5 / 10
- voucher: `VCR-8EE32E0A`, paid Rp55.000
- labels: passed
- bulk barcodes: part `2000000000077`, service none

Unit tests 140 passed, 2 skipped; production build passed.

---

## 2026-11-25 · Phase 6: automated browser suite (`pnpm test:e2e:workshop`)

Environment: local app → production DB (`next dev -p 3123` started by Playwright), system Chromium
(`PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium`), service workers blocked, test tenant as admin. How to run:
[`e2e/workshop/README.md`](../../e2e/workshop/README.md).

| # | Spec | What it checks | Result |
|---|---|---|---|
| 6.1 | `01-walk-in` | New plate, walk-in, labour agreed at Rp60.000 instead of Rp50.000, 2 spark plugs, cash with exact amount; paid total Rp110.000, agreed price stored, spark-plug stock −2, plate has no owner and no open note | ✅ |
| 6.2 | `02-open-note-guard` | Plate with an unpaid note (opened through the API): the dialog warns, "Buka nota" is disabled, "Buka nota itu" jumps to it; cancel needs a reason; status `cancelled` | ✅ |
| 6.3 | `03-member-stamps` | Member B1234UJI pays a visit: stamp card 2 → 3 of 10, vouchers unchanged (a full card would add one); member list shows M0001 | ✅ |
| 6.4 | `04-voucher` | Free-service voucher (max Rp50.000) issued through the API, picked on the note: bill Rp105.000 → Rp55.000, paid total Rp55.000, voucher no longer usable | ✅ |
| 6.5 | `05-labels` | 2 products selected on the products page → label page; 25 + 1 copies = 26 labels on 2 sheets; print intercepted: `@page size: A4`, 21 + 5 labels, 26 barcode SVGs; custom width "52,5" kept; 70 mm × 4 columns blocks printing | ✅ |

Final run: **5 passed in 1.6 min.** Evidence printed by the run:

- walk-in and guard: fresh `E2EW…`/`E2EG…` plates (one each per run)
- member: note `dc7460e4-97e7-4ee1-b97a-7a094aeb5ff4`, stamps 2 → 3 / 10, vouchers 1 → 1
- voucher: note `a739b74a-d50a-41fc-8842-82105ba3874b`, voucher `VCR-C64888E8`, paid Rp55.000

Getting there:

1. First run: all 5 failed to launch. Playwright 1.56.1 wants Chromium build 1194, the cache had 1243. Fixed by
   allowing a system Chromium through `PLAYWRIGHT_CHROMIUM_PATH` (no download).
2. Second run: every page bounced to `/dashboard`. The app layout requires the `user` entry the login page keeps
   in localStorage; an API login only sets cookies, so the layout sent the browser to `/login` and the proxy sent
   it on to `/dashboard`. The global setup now writes that entry into the saved storage state. 4 of 5 passed.
3. `05-labels` selectors were ambiguous (product names repeat in the preview; "Kolom" also matched "Jarak antar
   kolom"). Fixed in the spec, then the full suite passed.

Finding outside the workshop module (not fixed): while the suite ran, the server logged
`Failed to insert daily_sales: duplicate key … daily_sales_product_id_outlet_id_sale_date_key` for every second
sale of the same product on the same day. `CreateTransactionUseCase.recordDailySales` inserts one row per sale,
but the table allows one row per product, outlet and day; the error is caught and logged, the sale itself
succeeds. Nothing in the app reads `daily_sales` (only the admin tenant delete touches it), so no number on screen
is wrong. The table is incomplete and the logs are noisy.

Not covered by the suite yet: void/refund of a workshop sale (PIN approval, stamp and voucher reversal), non-cash
payments, and the stamp-card settings page. These were tested by hand in phases 3 and 4.

---

## 2026-11-24 · Phase 5: generated SKUs and barcodes, A4 sticker labels

### Migration 055 on a production copy

Environment: prod copy (Postgres), dump taken through the session pooler; container and dump deleted afterwards.

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| 5.1 | Apply `055_product_codes.sql` twice | Both runs succeed (idempotent) | exit 0 both times | ✅ |
| 5.2 | `internal_ean13(1)`, `(9999999999)` | Valid EAN-13 starting with 20 | `2000000000015`, `2099999999998` | ✅ |
| 5.3 | SQL and TypeScript give the same codes | `internal_ean13` = `internalBarcode()` for 1, 2, 12345 | Identical | ✅ |
| 5.4 | `assign_missing_barcodes` with number 1 already taken by another product | Number 1 skipped; 4 products without a barcode get 2–5 | `…022`, `…039`, `…046`, `…053`; 0 left without a barcode | ✅ |
| 5.5 | Run it again | Nothing to assign | 0 rows | ✅ |
| 5.6 | Give a second product an existing barcode | Refused by `products_tenant_barcode_key` | duplicate key error | ✅ |
| 5.7 | `next_product_codes(tenant, 'sku', 3)` | 1, 2, 3 | 1, 2, 3 | ✅ |

Applied to production afterwards (with the owner's approval): `_migrations` latest is `055_product_codes.sql`,
index present, the three functions are not executable by `authenticated`.

### UI, local app → production DB

Environment: local app → production DB, Chrome at desktop width, test tenant as admin, service worker unregistered.

| # | Scenario | Expected | Actual | Result |
|---|---|---|---|---|
| 5.8 | New product, category "Oli", "Otomatis" next to SKU and barcode | SKU from the category prefix, in-store EAN-13 | `OLI-00001`, `2000000000015`; product saved | ✅ |
| 5.9 | "Buat barcode kosong" on the products page | The 5 older products get barcodes, the one just made is skipped | Toast "5 produk diberi barcode baru"; DB `…022`–`…060`, counter at 6 | ✅ |
| 5.10 | Select all → "Cetak label" | Label page lists the 6 products with their barcodes; preview of the first sheet | As expected; selection survives a reload | ✅ |
| 5.11 | 25 copies of one item, then print (print dialog stubbed in the page) | 30 labels on 2 A4 pages (21 + 9), `@page { size: A4; margin: 0 }`, 30 barcode SVGs, no guide lines | As expected | ✅ |
| 5.12 | Custom size: width "52,5", 4 columns, skip 5 | Decimal comma accepted; first label at row 2, column 2 (52,5 mm; 37,5 mm) | As expected | ✅ (after fix) |
| 5.13 | Custom width 70 mm × 4 columns | "Tidak muat di kertas A4", print disabled, no preview | As expected | ✅ |
| 5.14 | Console on the label page | No hydration or runtime errors | None | ✅ |
| 5.15 | Barcodes decode: the page's JsBarcode settings rendered in Node and scaled to the smallest preset (38,1 mm at 300 dpi), read with `zbarimg` | EAN-13 and CODE128 read back exactly | `2000000000015`, `2000000000060`, `OLI-00001` | ✅ |

Bug found and fixed: in the custom-size fields a decimal comma was dropped on each keystroke ("52,5" became 525).
The fields now keep the typed text and parse it separately; columns and rows are whole numbers.

Not tested: a physical print on sticker paper and a handheld scanner (no hardware yet). Test this on site with the
"garis bantu" option on plain paper first.

Unit tests: `productCodes.test.ts` (6) and `sheets.test.ts` (4); full suite 136 passed, 2 skipped.

---

## 2026-11-24 · Production smoke test after deploying phase 4

Environment: production, commit `780d62c`, Vercel deploy `success`, production build passed locally first.

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| P4.1 | `/` | 200 | 200 | ✅ |
| P4.2 | `/members`, `/settings/workshop` without a session | redirect to login | 307 | ✅ |
| P4.3 | `scripts/workshop-test-tenant.mjs` against production | login, plan `custom`, module on, stamp program, plate lookup | all ✅ | ✅ |

---

## 2026-11-24 · Phase 4: stamp-card settings and member pages

Environment: local app → production DB, Chrome at desktop width, test tenant as admin.

| # | Scenario | Expected | Actual | Result |
|---|---|---|---|---|
| 4.1 | Settings → Bengkel loads the saved stamp program | 10 stamps, free service capped Rp50.000, 90 days, summary sentence | As expected | ✅ |
| 4.2 | Change stamps to 8, save, reload; then back to 10 | Value persists across reload; summary follows the form | 8 after reload, summary "Setelah 8 stempel"; restored to 10 | ✅ |
| 4.3 | `/members` list | Andi M0001 and Budi Santoso M0002 with phones; "Member" in the sidebar | As expected | ✅ |
| 4.4 | Budi's member page | M0002 since 24 Nov 2026, stamp card 0/10, voucher SRV-91EDA8F0 usable until 22 Feb 2027, admin buttons | As expected | ✅ |
| 4.5 | Service history of F4321AB | Ten paid notes newest first, paid totals from the sales (first one Rp140.000), km, mechanic, items, complaint; the voided voucher sale not listed | As expected | ✅ |
| 4.6 | Issue a manual voucher | Fixed Rp20.000, 30 days → listed as usable | `VCR-205279B8`, "-Rp 20.000 · bisa dipakai · berlaku s/d 24 Des 2026" | ✅ |
| 4.7 | Void that voucher | Reason required; status "dibatalkan"; no void button afterwards | As expected | ✅ |
| 4.8 | New customer, not a member | Page shows "Jadikan member", no voucher section or stamp card | As expected ("Citra (pelanggan uji)") | ✅ |
| 4.9 | Enrol from the member page | Next member code, stamp card and vouchers appear | M0003, card 0/10 | ✅ |
| 4.10 | Add a motor | `b 777 cit` stored as B777CIT, Honda Vario, listed under the customer | As expected | ✅ |

Changed while testing: service history now shows the amount actually paid (from the sale) instead of recomputing
from current list prices; `/members` got its own top-bar title.

---

## 2026-11-24 · Production smoke test after deploying phases 2–3

Environment: production `https://lakupos.vercel.app`, commit `5404935`, Vercel deploy `success`.

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| P.1 | `/`, `/login` | 200 | 200 | ✅ |
| P.2 | `/pos/notes`, `/settings/workshop` without a session | redirect to login | 307 | ✅ |
| P.3 | `scripts/workshop-test-tenant.mjs` against production | login, plan `custom` with no end date, workshop module on, stamp program saved, plate lookup B1234UJI → Andi, 0/10, no duplicate rows | as expected | ✅ |
| P.4 | Production build output: receipt preview styles | `.modal-overlay` gets its styled-jsx class | the CSS rule `.modal-overlay.jsx-fd57750d3ab24db9` exists but the element renders with `className:"modal-overlay"` only, so the preview is not an overlay in production either (also on the quick-cashier page) | ❌ open, must fix before go-live |

---

## 2026-11-24 · Phase 3: paying service notes, stamp card, vouchers

Environment: local app → production DB (commit `19a5700`). Driven in Chrome and, for repeated sales, through the
same tRPC calls from the logged-in browser session. Cash shift opened with `shifts.open` (opening cash Rp200.000).

| # | Scenario | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| 3.1 | Cash payment of a member's note | Note F4321AB (member M0002 Budi Santoso, mechanic Dedi, 8.200 km): Kampas Rem Depan ×2 @45.000 + Jasa Servis Ringan @50.000 → Bayar → Cash → 200K → Konfirmasi | Total Rp140.000, change Rp60.000; sale completed; stock kampas −2; note paid; 1 stamp; receipt shows plate, mechanic, km, member, stamps | Change Rp60.000 shown; `TRX-MWUUD63V-AH4I9` completed, linked to customer, vehicle and note `9943d22c…`; note `paid` with `closed_at`; kampas stock 20 → 18; stamp balance 1; receipt as expected | ✅ |
| 3.2 | Stamp card fills up | Nine more notes for F4321AB, each with Jasa Ganti Oli, paid cash via API | Balance 2/10 … 9/10; 10th issues a voucher and resets to 0/10 | 2/10 … 9/10; 10th: `0/10`, voucher `SRV-91EDA8F0` issued | ✅ |
| 3.3 | Paying with the voucher | Note `e419757d…`: Jasa Servis Ringan 50.000 + Oli MPX1 55.000 → choose `SRV-91EDA8F0` → Cash, exact | Preview and charge Rp105.000 − Rp50.000 = Rp55.000; voucher redeemed and linked; receipt shows the voucher | Preview and payment Rp55.000; `TRX-MWUUGGEF-PL4ZE` `discount_amount` 50.000, `voucher_discount` 50.000; voucher `redeemed`, linked; receipt line "Voucher SRV-91EDA8F0: -Rp 50.000" | ✅ |
| 3.4 | Voiding a note sale | `users.setPin` → `transactions.void` on `TRX-MWUUGGEF-PL4ZE` → `transactionApprovals.approve` (PIN) | Voucher back to the member, stamp from that sale reversed, note cancelled, stock restored | Note `cancelled` ("Penjualan nota di-void"); stamp balance 0; `SRV-91EDA8F0` `issued` again; oli stock back to 20 (stock_out 0) | ✅ |
| 3.5 | Restarted and abandoned transfer checkouts | Note `196fa439…` with Jasa Servis Ringan; `startCheckout` bank_transfer + voucher (payment `4087e5af…`), start again (payment `243da9d5…`), then `workshop.notes.abandonCheckout` | Voucher unusable while claimed; restart cancels the first checkout and re-claims; abandon cancels the second and returns the voucher; no stock change | As expected; both payments `cancelled`, both transactions `voided` ("Checkout nota dibatalkan sebelum dibayar"); voucher usable again. Amount was Rp0 (labour fully covered by the voucher). Note then cancelled to clean up | ✅ |

Bugs found and fixed in `19a5700`:
- `payments.startCheckout` kept its own plan-limit table without `custom`, capping contract tenants at 100 sales
  a month. Now one `MONTHLY_TRANSACTION_LIMITS` table, typed so every plan must be listed.
- Receipts printed a stray "00" when discount and tax were 0 (affected every receipt, not only notes).
- The server ignores client prices, so a note's agreed labour price would have been replaced by the list price.
  Note items now carry `agreedUnitPrice`, set only by server code from the note (unit tests added).

Found, not fixed:
- The receipt preview (`PrintPreviewModal`, styled-jsx) renders inline instead of as an overlay under `next dev`;
  its styles are not applied. Production not checked yet.
- The receipt prints "Bayar" = total and no change, like the quick-cashier page.

Open question for the client: a visit paid with a free-service voucher currently also earns a stamp.

---

## 2026-11-24 · Phase 2: service-note screens

Environment: local app → production DB (commit `03554d9`, plus `b3c59b8`), Chrome at desktop width.

| # | Scenario | Expected | Actual | Result |
|---|---|---|---|---|
| 2.1 | Module gating | "Nota Servis" in the sidebar and `/pos/notes` reachable only with the workshop module on | Shown for the test tenant after `businessProfile.setOptionalModule`; Settings → Business shows the toggle | ✅ |
| 2.2 | Plate lookup, known member | `b 1234 uji` → B1234UJI, Honda Beat, Andi (M0001), stamp card 0/10 | As expected | ✅ |
| 2.3 | Open a note | Mechanic Budi, 12.345 km, complaint → note page with those details | As expected | ✅ |
| 2.4 | Add items | Search "jasa servis" + Enter; type SKU `OLI-MPX1-08` + Enter (barcode-style) | Both lines added, subtotal Rp105.000 | ✅ |
| 2.5 | Edit quantity and agreed labour price | Oil ×2; labour 50.000 → 45.000 | Subtotal Rp155.000 | ✅ after fix (lines changed order on update) |
| 2.6 | Open-notes list | Card shows plate, member badge, mechanic, "3 item" | Showed "0 item" until reload | ✅ after fix (list cache not refreshed) |
| 2.7 | Second note for the same motor | Warning "masih punya nota yang belum dibayar" with a link to the open note | As expected | ✅ |
| 2.8 | Cancel a note | Reason required; note leaves the list | As expected (note `2d022b71…`) | ✅ |
| 2.9 | New customer enrolled as member from the dialog | F 4321 AB, Yamaha Mio, Budi Santoso, phone, "Daftarkan sebagai member" | Member M0002 created and linked; km "8.200" stored as 8200 | ✅ |
| 2.10 | Server-side item search | "kampas", "jasa" return matches beyond the first 50 products; labour shows the wrench icon | As expected | ✅ after fix (icon read the wrong field) |
| 2.11 | Mechanics settings | Budi and Dedi listed, activate/deactivate | As expected | ✅ |

Bugs found and fixed: modal bodies had no padding on desktop app-wide (`--card-padding-mobile` never defined,
`b3c59b8`); note lines reordered after edits; open-notes list showed stale item counts; total bar covered the
collapsed sidebar; labour icon missing in search results (`products.getAll` returns `item_type`); top bar said
"Kasir Cepat" on notes; new-note dialog stayed open after opening a note.

Found, not fixed: `/pos/sales` loads only the first 50 products (`products.getAll` default limit), so most of a
900-SKU workshop's parts cannot be searched or scanned there. Must be fixed before Mr Bengkel goes live.

---

## 2026-11-24 · Phase 1: schema, SQL functions, repository

| # | Environment | Scenario | Result |
|---|---|---|---|
| 1.1 | Prod copy (Postgres) | Apply migration 054, then apply it again | ✅ applies; re-apply is a no-op |
| 1.2 | Prod copy (Postgres) | Parts-only sale earns no stamp; non-member earns none | ✅ `not_qualifying`, `not_member` |
| 1.3 | Prod copy (Postgres) | 9 qualifying sales → 9; 10th → voucher, balance 0 | ✅ |
| 1.4 | Prod copy (Postgres) | Award the same sale twice | ✅ no second stamp or voucher |
| 1.5 | Prod copy (Postgres) | Reverse the 10th sale, then reverse again | ✅ voucher void, balance 9; second call no-op |
| 1.6 | Prod copy (Postgres) | Claim voucher (code in lower case), claim again, claim by another customer | ✅ claimed; `VOUCHER_NOT_AVAILABLE`; `VOUCHER_OTHER_CUSTOMER` |
| 1.7 | Prod copy (Postgres) | Bad plate, duplicate plate, second open note, cancel without reason | ✅ all refused by constraints |
| 1.8 | Prod copy (Postgres) | `authenticated` may not execute loyalty functions | ✅ only `service_role` |
| 1.9 | Prod copy (PostgREST) | Integration test: member → note → items (agreed price) → list → reserved stock → lookup → search → cancel; stamp program; manual voucher issue/void | ✅ 2/2 passed, test rows removed |
| 1.10 | Production | `scripts/workshop-test-tenant.mjs` creates and seeds the test tenant through the tRPC API, then reruns without duplicates | ✅ |

Bug found in the test itself (not the code): PostgREST bulk inserts fill unlisted columns with NULL, not defaults.

## How to rerun

- Migration/function checks: restore a copy with `deployment/backup/lakupos-backup.sh` and
  `lakupos-restore-test.sh`, then run the SQL scenarios above against it.
- Repository integration test: see the header of
  `src/infra/repositories/__tests__/SupabaseWorkshopRepository.integration.test.ts`.
- Test tenant: `E2E_EMAIL=… SUPABASE_PROJECT_REF=… WORKSHOP_TEST_PASSWORD=… node scripts/workshop-test-tenant.mjs`.
- UI and payment flows: log in as the test tenant on a local dev server, open a shift, and follow the steps in
  the tables. An automated Playwright suite for these flows is planned (phase 6).
