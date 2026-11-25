# Bengkel module: members, vehicles, mechanics, open service notes, loyalty

Status: design, 24 Nov 2026. First client: Mr Bengkel (contract 001/LKP-PKS/XI/2026, Pasal 2 ayat 2 huruf c).
Everything here is tenant-scoped and reusable by any workshop tenant (business type HYBRID or SERVICE).

## What the contract promises

Member data, member benefits, vehicle data (plate, make, type), mechanic per service, service history per motor
(date, labour, parts, odometer), and SKU/barcode generation with A4 label printing.

**Out of scope:** WhatsApp service reminders, a real-time queue or work-status board, and mechanic commission.
The open-notes list below is a plain list. Adding statuses such as "waiting / in progress / done" would be the
excluded queue feature and needs a separate written change (Pasal 11).

## Concepts

| Concept | Table | Notes |
|---|---|---|
| Customer | `customers` | Name and phone. Optional for a vehicle. Becomes a **member** when enrolled (`member_code`, `joined_at`). |
| Vehicle | `vehicles` | Plate number (normalised: upper case, no spaces), make, model. Unique plate per tenant. Optional `customer_id`; one customer can own several vehicles. |
| Mechanic | `mechanics` | Name, active flag. Not a login user. |
| Open service note | `service_orders`, `service_order_items` | One note per vehicle visit: mechanic, complaint, odometer, items. Status `open → paid` or `open → cancelled`. |
| Loyalty program | `loyalty_programs` | Per tenant, several can be active. `type` + `config` (jsonb). |
| Loyalty ledger | `loyalty_ledger` | Every stamp or point earned, reversed, or adjusted. A balance is the sum of its rows. |
| Member voucher | `member_vouchers` | Belongs to one customer, single use, expiry. Issued by a reward or by an admin. |

`transactions` gains nullable `customer_id`, `vehicle_id`, `service_order_id`, and `voucher_id`.

## Open service notes ("nota terbuka")

1. **Open:** the cashier types a plate. A known vehicle fills in its owner, member status, stamp progress
   (e.g. 7/10), available vouchers, and recent services. An unknown plate creates the vehicle, optionally with a
   customer or a new member.
2. **Fill:** parts are scanned into the note and labour items added. A mechanic, complaint, and odometer are set.
3. **List:** both cashiers see every open note for the outlet, newest first, plate shown large.
4. **Pay:** opening the note moves its items to checkout. Payment goes through the existing
   `transactions.create` path, so stock is deducted **at payment**, as today. Items in open notes are shown as
   reserved so they are not sold twice.
5. **Cancel:** needs a reason and writes an audit log entry. No stock change, because nothing was deducted.

Rules:
- At most one open note per vehicle (partial unique index on `vehicle_id where status = 'open'`).
- Not tied to a shift: a motor left overnight is paid the next day, and the money counts in the paying shift.
- Non-members use exactly the same flow. Their vehicle and service history are kept; they just earn no stamps.
- The paid note **is** the service history entry for that motor: date, mechanic, odometer, labour, parts.

## Loyalty

The engine is generic; phase 1 ships the **stamp card**, which is what Mr Bengkel asked for.

### Stamp card (phase 1)

"Service 10 times, get 1 service free."

| Setting | Default | Meaning |
|---|---|---|
| `requiredStamps` | 10 | Stamps needed for one reward |
| `qualifying` | paid transaction with at least one SERVICE item | What earns a stamp. Optional `minSpend`. |
| `stampsPerVisit` | 1 | One stamp per qualifying paid transaction, not per item |
| `reward` | free labour of one service, capped at `maxValue` | Parts are still paid. Alternatives: fixed amount, percent with cap. |
| `voucherValidDays` | 90 | Voucher expiry after issue |
| `stampExpiryDays` | none | Optional: stamps older than this stop counting |

- Stamps go to the **member**, not the vehicle, so a member with two motors fills one card.
- When the balance reaches `requiredStamps`, a voucher is issued in the same database transaction and the stamps
  are spent (`-requiredStamps` ledger row); extra stamps carry over.
- Enrolment is not retroactive: visits before joining do not count.
- The receipt shows the member's name, stamp progress ("Servis ke-7 dari 10"), and any voucher just issued. This
  replaces a paper stamp card, so nothing physical needs printing.

### Later mechanisms (schema ready, not built yet)

- `points`: earn X points per Rp Y, redeem as a voucher or a discount.
- `member_discount`: a percentage on labour, parts, or both.

### Vouchers

- Validated and applied **on the server** inside `transactions.create`, never trusted from the client.
  (The existing `promotions` feature computes discounts in the browser; vouchers must not.)
- Single use: redeeming locks the row and records `redeemed_transaction_id`.
- Voiding or refunding a transaction reverses the stamps it earned, and voids the voucher it triggered if that
  voucher is still unused. Restores a voucher it redeemed.

## Manual discounts (diskon manual)

Asked for in the client pitch: when a cashier lowers a price or gives a member a discount by owner policy, the
reason is recorded. Rules live in `src/domain/sales/manualDiscount.ts`; migration 058 adds the columns.

- **Two kinds, both on the service note and the quick cashier:** a line below its list price (the price button on
  a line), and an amount off the whole sale or note, in rupiah or percent (the "Diskon" button).
- **A reason is required** for both: owner policy / member, rounding, damaged item or box, complaint
  compensation, or other (other needs a note). The server checks it again (`DISCOUNT_REASON_REQUIRED`,
  `DISCOUNT_NOTE_REQUIRED`) and refuses an amount larger than what is due (`DISCOUNT_TOO_LARGE`).
- A price above the list price needs no reason (agreed labour for a bigger job).
- **Receipt:** shows the normal price and the saving under a lowered line, and the total discount. The reason is
  not printed.
- **Recorded on the sale:** `transaction_items.list_price`, `discount_reason`, `discount_note`;
  `transactions.manual_discount` (part of `discount_amount`, next to promo or voucher), `discount_reason`,
  `discount_note`. While a note is open the same lives on `service_order_items` and `service_orders`.
- **Report:** Laporan → "Diskon Manual" (`transactions.manualDiscounts`): total, per cashier, per reason, and every
  discount with the sale number. Voided and refunded sales are listed but not counted. Visible to admins and anyone
  with `report.outlet.view`.
- Works offline on the service note (`note.setItem` carries the reason, `note.setDiscount`, `note.payCash` pins
  both) and on the quick cashier (stored with the offline sale and sent by the sync manager).
- No limit per cashier for now (decided 25 Nov): the reason and the report are the control. A "max discount
  without the store manager's PIN" setting can be added later.

## Voids

The cashier asks for a void on Transaksi with a reason (min. 10 characters), so the approver knows what happened.
An owner, admin, area manager or store manager (Kepala Toko) approves or rejects it on Persetujuan with their PIN
only; no note is needed from them. Approving restores stock and daily sales and reverses the workshop sale (stamps,
voucher, note cancelled). The Void and Refund buttons follow the same role permissions the server checks
(`transactions.myActions`); they used to read the older `users.permissions` flags, which are empty for owners, so
nobody saw the buttons.

## Security and data

- Every table has `tenant_id` and the same tenant-isolation RLS as the rest of the schema.
- Customers' names, phone numbers, and plates are personal data under UU 27/2022 (contract Pasal 13): no exports
  to third parties, and deletion on request must be possible.
- Writes go through tRPC procedures; loyalty and voucher changes are audit logged.

## Phases

1. **Schema + domain:** migration 054, entities, repositories, use cases, tRPC routers, unit tests.
2. **Notes UI:** open-notes list and note editor in POS, plate search, vehicle and member forms, mechanics in
   settings.
3. **Payment:** `transactions.create` accepts the note, customer, and voucher; server-side voucher; stamp
   earning, reversal on void/refund; receipt changes.
4. **Loyalty settings and member page:** program settings, member detail with vehicles, stamp card, vouchers,
   and service history.
5. **SKU and barcode:** automatic SKU, barcode generation, A4 sticker labels.
6. **E2E tests** for the whole workshop flow.

## Decisions still needed from the client

Defaults above are used until they answer: number of stamps, what counts as a "service", the reward's cap,
voucher expiry, and whether stamps expire.
