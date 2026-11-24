# Offline mode (workshop cashier station and quick cashier)

Written 25 Nov 2026 for the Mr Bengkel go-live. Tests: `e2e/workshop/07`–`10`, log in
`docs/testing/WORKSHOP_E2E_LOG.md`.

## Decision: local-first in the browser, not a second database on the cashier PC

A second PostgreSQL on the cashier PC would need two-way replication with Supabase (not built in;
conflicts are ours to solve), a server to maintain and back up on shop hardware, and it loses
whatever was not yet replicated when that disk dies. Instead:

- **The browser keeps a working copy** in IndexedDB (Dexie, `src/lib/offline/database.ts`, tables
  `ws*`): catalogue with stock per outlet, customers and members, motors, mechanics, outlets, the
  open shift, and the open service notes. It is refreshed while online (notes every 15 s, the rest
  every 5 minutes and after every sync).
- **Every change is an operation in an outbox** (`wsOutbox`) with an id made on the PC. The screen
  shows the server's notes with the unconfirmed operations replayed on top
  (`src/lib/offline/workshop/reducer.ts`), so the same code path runs online and offline.
- **The server applies operations in order, once each** (`workshop.offline.push`,
  `src/server/routers/workshopOffline.ts`). `offline_ops` (migration 057) records every op id; a
  replay after a lost response gets the stored outcome. Notes, customers and sales carry the ids
  made on the PC, so nothing is created twice.
- **The server stays the source of truth** for stock, stamps, reports and member codes.

## What works without internet

| Works offline | Waits for internet |
|---|---|
| Open a note (known or new plate, existing or new customer, member sign-up), mechanic, km, complaint | QRIS, bank transfer, e-wallet (need confirmation) |
| Add/remove parts and services, agreed labour price, scan barcodes (cached catalogue) | Vouchers (two stations could spend one twice) |
| Cancel a note with a reason | Stamp card display; stamps are counted when the payment reaches the server |
| Take **cash** and print the receipt (number printed = transaction number on the server) | New member code (shows "kode menyusul") |
| Reload the page / reopen the browser (service worker serves the page) | Reports, settings, products page |
| Quick cashier `/pos/sales` cash sales | |

## Rules on the server for sales made offline

- Recorded at the time they were made (`created_at`), with the receipt number from the station.
- The note is pinned to the lines and prices the customer was charged before the sale is recorded.
- Not refused for a stock shortfall: the line takes what is left (down to 0) and the gap is logged
  ("Offline sale oversold …"). Not refused for the plan limit.
- Accepted on a shift the same cashier has closed meanwhile; the EOD page refuses to close a shift
  while offline work is still waiting, so this is only a fallback.

## When the server refuses an operation

A business-rule refusal (e.g. another device already paid the note, the plate got an open note
elsewhere) is stored as failed and shown on the station: "N perubahan ditolak server, perlu dicek",
with *Coba lagi* (sent again under a new id) or *Buang*. Server errors and network errors are not
refusals: the batch stops and is retried in order later.

## Things the shop must know

- **Open the station once online** on each PC (and after a long time away) so it downloads its
  data. The bar shows "Data barang & member per HH:MM".
- **Open the cashier shift while online.** Without a stored shift the station cannot take cash
  offline.
- **Do not clear browser data or use a private window** on the cashier PC: unsent work lives in
  IndexedDB. The app asks the browser for persistent storage.
- Work recorded by one account is sent only by that account; signing in as someone else shows a
  warning until the original user signs in again.

## Fixed along the way

- Quick-cashier offline sales were never sent: `synced` was a boolean, which IndexedDB cannot
  index, so the "not sent yet" query always came back empty. It is now 0/1 (Dexie v2 migrates old
  rows), sales carry their shift, and they are no longer dropped after five stock refusals.
- The service worker was registered inside a `load` listener added after `load` had fired, so it
  usually never registered and no page was cached for offline use.
