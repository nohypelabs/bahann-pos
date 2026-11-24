# Workshop module: browser E2E suite

Playwright tests for the bengkel flows, run against the workshop test tenant
(`<E2E_EMAIL local>+bengkel-uji@<domain>`, seeded by `scripts/workshop-test-tenant.mjs`).
Every run is also written up in `docs/testing/WORKSHOP_E2E_LOG.md`.

```bash
E2E_EMAIL=you@gmail.com WORKSHOP_TEST_PASSWORD=… pnpm test:e2e:workshop
```

| Variable | Meaning |
|---|---|
| `E2E_EMAIL`, `WORKSHOP_TEST_PASSWORD` | Base email and password of the test account (the password is not in the repo) |
| `WORKSHOP_E2E_BASE_URL` | Deployment to test; default `http://localhost:3123`, which starts `next dev` if it is not running (database from `.env.local`) |
| `PLAYWRIGHT_CHROMIUM_PATH` | Optional system Chromium, e.g. `/usr/bin/chromium`, when Playwright's own browser is not installed |

The global setup logs in once (login is rate-limited), refuses any account that is not a
`+bengkel-uji@` one, checks the workshop module is on, and opens a cashier shift if none is open.

| Spec | Flow |
|---|---|
| `01-walk-in` | New plate, walk-in customer, agreed labour price, spark plugs ×2, Rp150.000 cash for Rp110.000; receipt dialog shows paid amount and change; paid total, agreed price and stock deduction checked through the API |
| `02-open-note-guard` | A plate with an unpaid note cannot get a second one; jump to it and cancel it with a reason |
| `03-member-stamps` | Member plate `B1234UJI`: a paid visit adds a stamp; a full card issues a voucher |
| `04-voucher` | A manually issued free-service voucher removes the labour from the bill and is used up |
| `05-labels` | Select products, print A4 labels (print call intercepted), custom sheet with decimal commas and the "does not fit" guard |
| `06-bulk-barcodes` | "Buat barcode kosong" gives a temporary part a barcode and leaves a temporary service without one; both are deleted afterwards |
| `07-offline` | Internet off: open a note, add items, cash payment and receipt on the station; back online it syncs (paid total, receipt number = transaction number, stock) |
| `08-offline-push` | API: a replayed push batch changes nothing twice; a refused operation stays refused |
| `09-offline-reload` | Service worker on: reload while offline (note and list) keeps the unsent note; it syncs afterwards |
| `10-pos-offline` | Quick cashier: an offline sale is kept in IndexedDB and reaches the server when back online |

The tests change real data on that tenant: each run adds paid notes, one or two new plates
(`E2E…`), stamps and stock movements. Parts run down over time (2 spark plugs and 2 oil per
run); when a test stops with "top it up", record new stock for the test tenant.
