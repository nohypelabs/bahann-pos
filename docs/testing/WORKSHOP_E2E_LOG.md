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
