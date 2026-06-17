# POS Multi-Tenant: Desain Operasional & Implementasi v1

**Konteks:** Sistem POS untuk 1 tenant dengan 28 outlet  
**Versi:** 1.0 — Production Ready  
**DB:** PostgreSQL 15+  
**Date:** 2026-06-17

---

## Daftar Isi

1. [Prinsip Utama](#1-prinsip-utama)
2. [Struktur Entitas](#2-struktur-entitas)
3. [Role & Scope](#3-role--scope)
4. [Permission Matrix](#4-permission-matrix)
5. [Flow Operasional](#5-flow-operasional)
6. [Aturan Schema (Bug Fixes dari v0)](#6-aturan-schema-bug-fixes-dari-v0)
7. [Aturan Wajib Server-Side](#7-aturan-wajib-server-side)
8. [Audit Log — Aksi Wajib](#8-audit-log--aksi-wajib)
9. [Red Flags yang Harus Dihindari](#9-red-flags-yang-harus-dihindari)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Prompt untuk AI CLI / Claude Code](#11-prompt-untuk-ai-cli--claude-code)

---

## 1. Prinsip Utama

```
1 tenant    = 1 bisnis / brand (contoh: PT ABC Retail)
1 outlet    = 1 toko fisik dalam tenant (contoh: 28 outlet)
1 manusia   = 1 akun unik — TIDAK ADA shared account
Scope       = batas DATA yang bisa diakses
Role        = batas AKSI yang bisa dilakukan
Device POS  = terikat ke 1 outlet secara permanen
Transaksi   = TIDAK PERNAH dihapus (soft delete only)
Audit log   = TIDAK PERNAH diupdate atau dihapus
```

---

## 2. Struktur Entitas

```
Tenant (PT ABC Retail)
├── Outlet 01 ─── Device POS ─── Shift ─── Transaksi
├── Outlet 02       │
├── ...             └── Kasir (user + employee_code + PIN)
└── Outlet 28
```

### Field wajib di semua transaksi

| Field | Keterangan |
|---|---|
| `tenant_id` | Isolasi tenant |
| `outlet_id` | Lokasi transaksi |
| `cashier_user_id` | Siapa yang kasir |
| `shift_id` | Shift mana |
| `device_id` | Device mana |
| `status` | draft / paid / voided / refunded |

---

## 3. Role & Scope

### Tabel Role

| Role | Scope | Akses |
|---|---|---|
| `OWNER` | TENANT | Full tenant, termasuk billing |
| `ADMIN_TENANT` | TENANT | Full operasional semua outlet |
| `AREA_MANAGER` | OUTLET_GROUP | Beberapa outlet (future-ready) |
| `STORE_MANAGER` | OUTLET | Outlet yang di-assign |
| `CASHIER` | OUTLET | Outlet + shift sendiri |
| `AUDITOR` | TENANT | Read-only: laporan & audit log |

### Prinsip Assignment

```
Admin Tenant:
  scope_type = TENANT
  outlet_id  = null
  → akses semua outlet dalam tenant

Kepala Toko:
  scope_type = OUTLET
  outlet_id  = outlet_01
  → hanya outlet yang ditugaskan

Kasir:
  scope_type = OUTLET
  outlet_id  = outlet_01
  → hanya outlet + shift sendiri
```

> **Satu user bisa punya beberapa assignment.**  
> Contoh: seorang manager yang merangkap 2 outlet, assign 2 baris dengan `outlet_id` berbeda.

---

## 4. Permission Matrix

| Aksi | Cashier | Store Manager | Area Manager | Admin Tenant | Owner |
|---|:---:|:---:|:---:|:---:|:---:|
| Login POS | ✅ | ✅ | Optional | Optional | Optional |
| Buat transaksi | ✅ | ✅ | — | ✅ | ✅ |
| Void transaksi paid | Request | Approve | Approve | Direct | Direct |
| Refund | Request | Approve | Approve | Direct | Direct |
| Diskon kecil | ✅ | ✅ | ✅ | ✅ | ✅ |
| Diskon besar | Request | Approve | Approve | Direct | Direct |
| Buka cash drawer manual | Request | ✅ | ✅ | ✅ | ✅ |
| Open shift | Own | ✅ | — | ✅ | ✅ |
| Close shift | Own | Any di outlet | — | Any | Any |
| Approve closing shift | ❌ | ✅ | ✅ | ✅ | ✅ |
| Lihat transaksi | Own shift | Outlet | Assigned | All | All |
| Lihat laporan | ❌ | Outlet | Assigned | All | All |
| Lihat laporan global | ❌ | ❌ | Optional area | ✅ | ✅ |
| Lihat profit/margin | ❌ | ❌ | ❌ | ✅ | ✅ |
| Kelola produk | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ubah harga | ❌ | ❌ | ❌ | ✅ | ✅ |
| Stock adjustment | ❌ | Limited+reason | Approve | Direct | Direct |
| Transfer stok | ❌ | Request | Approve | ✅ | ✅ |
| Stock opname | Optional | ✅ | ✅ | ✅ | ✅ |
| Kelola user | ❌ | View only | View only | ✅ | ✅ |
| Kelola role | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export data | ❌ | Outlet | Assigned | All | All |
| Lihat audit log | ❌ | Outlet | Assigned | Tenant | Tenant |

---

## 5. Flow Operasional

### 5.1 Flow Kasir (harian)

```
1. Buka device POS (device sudah terikat ke outlet)
2. Input employee_code + PIN
3. Open shift → input modal awal
4. Transaksi:
   a. Scan/pilih produk
   b. Apply diskon (jika ada, dalam batas policy)
   c. Pilih metode bayar
   d. Hitung kembalian (untuk cash)
   e. Print struk
5. Close shift:
   a. Hitung uang fisik
   b. Input actual_cash
   c. Submit → status: pending_approval
   d. Tunggu review kepala toko jika ada selisih
```

> Kasir TIDAK perlu memilih outlet. Device POS sudah menentukan outlet.

---

### 5.2 Flow Kepala Toko (harian)

```
1. Login dashboard / POS manager mode
2. Sistem load outlet assignment
3. Review shift aktif → lihat kasir yang sedang buka shift
4. Queue approval:
   - Pending refund request
   - Pending void request
   - Pending diskon besar
5. Review closing shift → approve/reject + catatan manager
6. Cek laporan outlet (penjualan, selisih kas, stok)
7. Review anomaly (refund tinggi, void banyak, stok minus)
```

---

### 5.3 Flow Refund / Void

```
Kasir → request (wajib isi reason)
       ↓
System → buat record di transaction_approvals (status: pending)
       ↓
Kepala Toko → approve/reject (wajib isi note)
       ↓
System (jika approved):
  - UPDATE transactions.status = 'voided'/'refunded'
  - Simpan voided_by, voided_at, void_reason
  - Buat reversal record jika refund partial
  - TIDAK menghapus transaksi asli
  - Tulis audit_log

Data wajib yang disimpan:
  transaction_id, shift_id, outlet_id, device_id,
  requested_by, approved_by, reason, amount, timestamp
```

---

### 5.4 Flow Closing Shift

```
Kasir submit close:
  → system hitung expected_cash:
     opening_cash + cash_sales - cash_refunds + cash_in - cash_out
  → kasir input actual_cash (fisik dihitung)
  → system simpan cash_difference (computed column — tidak bisa dimanipulasi)
  → jika difference = 0 → approved otomatis (bisa dikonfigurasi)
  → jika difference ≠ 0 → wajib reason → pending_approval

Kepala Toko review:
  → approve → shift.status = 'approved', closed_at = now()
  → reject → shift.status = 'rejected', kasir buka ulang dan recount
```

> `expected_cash` tidak disimpan sebagai kolom — dikalkulasi dari data transaksi.  
> `cash_difference` adalah **generated column**: `actual_cash - expected_cash`.  
> Tidak bisa dimanipulasi secara langsung.

---

### 5.5 Flow Admin Tenant (dashboard global)

```
Login dashboard → default view: All Outlets
  ↓
Filter: Outlet / Tanggal / Kasir / Payment Method / Produk / Status
  ↓
Review:
  - Sales global semua outlet
  - Anomaly: refund tinggi, void banyak, cash discrepancy, stok minus
  - Performa kasir per outlet
  - Product sales ranking
  - Shift closing report
  - Export jika diperlukan → dicatat di audit_log
```

---

## 6. Aturan Schema (Bug Fixes dari v0)

### 6.1 `cash_difference` — Generated Column

```sql
-- BENAR: pakai GENERATED ALWAYS AS ... STORED
cash_difference numeric(14,2)
  generated always as (
    case
      when actual_cash is not null and cash_sales is not null
      then actual_cash
        - (opening_cash
          + coalesce(cash_sales, 0)
          - coalesce(cash_refunds, 0)
          + coalesce(cash_in, 0)
          - coalesce(cash_out, 0))
      else null
    end
  ) stored,
```

Kenapa: kalau disimpan manual bisa dimanipulasi. Generated column tidak bisa di-UPDATE langsung.

---

### 6.2 `user_role_assignments` — NULL-safe Unique Index

```sql
-- SALAH: unique constraint biasa gagal untuk NULL (NULL != NULL di PostgreSQL)
constraint uq unique (user_id, role_id, scope_type, outlet_id)

-- BENAR: pakai partial unique index per scope type
create unique index idx_ura_unique_tenant_scope
  on user_role_assignments(user_id, role_id, scope_type)
  where scope_type = 'TENANT';

create unique index idx_ura_unique_outlet_scope
  on user_role_assignments(user_id, role_id, scope_type, outlet_id)
  where scope_type = 'OUTLET';
```

Kenapa: admin tenant bisa insert duplikat karena `outlet_id = NULL` — PostgreSQL menganggap `NULL != NULL`.

---

### 6.3 `roles` — NULL-safe Unique untuk System Roles

```sql
-- Partial unique index untuk system roles (tenant_id IS NULL)
create unique index idx_roles_system_key
  on roles(key) where tenant_id is null;

-- Gabungan untuk tenant-specific roles
constraint uq_role_key unique nulls not distinct (tenant_id, key)
```

---

### 6.4 `shifts` — Tambah `cash_in`, `cash_out`, `submitted_at`

Field yang hilang di schema v0:

```sql
cash_in     numeric(14,2) default 0,   -- manual cash in ke laci
cash_out    numeric(14,2) default 0,   -- manual cash out dari laci
submitted_at timestamptz,              -- kapan kasir submit closing
```

Tanpa `cash_in`/`cash_out`, reconciliation tidak bisa akurat. Uang masuk/keluar di luar transaksi (contoh: pengisian kembalian, penarikan petty cash) tidak tercatat.

---

### 6.5 `transaction_approvals` — Tambah `shift_id`

```sql
-- Tambahkan kolom ini
shift_id uuid references shifts(id),
```

Kenapa: approval request perlu konteks shift agar bisa difilter per shift di laporan.

---

### 6.6 `users` — Unique Constraint Pakai `nulls not distinct`

```sql
-- PostgreSQL 15+
constraint uq_user_email unique nulls not distinct (tenant_id, email),
constraint uq_user_username unique nulls not distinct (tenant_id, username),
constraint uq_user_employee_code unique nulls not distinct (tenant_id, employee_code)
```

Kalau pakai PostgreSQL < 15, ganti dengan partial unique index:

```sql
create unique index idx_user_email on users(tenant_id, email) where email is not null;
create unique index idx_user_username on users(tenant_id, username) where username is not null;
create unique index idx_user_emp_code on users(tenant_id, employee_code) where employee_code is not null;
```

---

### 6.7 Active Shift Guard — Prevent Duplicate Open Shifts

```sql
-- Partial unique index: hanya 1 shift aktif per cashier per outlet
constraint uq_shift_active unique nulls not distinct (cashier_user_id, outlet_id, closed_at)
-- closed_at = NULL berarti shift masih aktif
-- karena NULL only matches NULL in nulls not distinct, ini mencegah 2 shift aktif sekaligus
```

---

## 7. Aturan Wajib Server-Side

### 7.1 Semua Query WAJIB Scoped by `tenant_id`

```typescript
// BENAR
const transactions = await db.query(
  'SELECT * FROM transactions WHERE tenant_id = $1 AND outlet_id = ANY($2)',
  [tenantId, allowedOutletIds]
);

// SALAH — tidak ada tenant scope
const transactions = await db.query(
  'SELECT * FROM transactions WHERE outlet_id = $1',
  [outletId]
);
```

---

### 7.2 Outlet Access harus Divalidasi Server-Side

```typescript
// Di middleware / guard
const allowedOutletIds = await getUserOutletIds(userId, tenantId);

if (!allowedOutletIds.includes(requestedOutletId)) {
  throw new ForbiddenError('Outlet not accessible');
}
```

Jangan mengandalkan frontend untuk filter outlet.

---

### 7.3 Permission Check Pattern

```typescript
// Sebelum aksi sensitif
const canApprove = await db.queryOne<{allowed: boolean}>(
  `SELECT user_has_permission($1, $2, $3, $4) as allowed`,
  [userId, tenantId, 'pos.refund.approve', outletId]
);

if (!canApprove.allowed) throw new ForbiddenError();
```

---

### 7.4 Tidak Boleh Hard Delete Transaksi

```typescript
// SALAH
await db.query('DELETE FROM transactions WHERE id = $1', [id]);

// BENAR: set status voided, simpan alasan
await db.query(`
  UPDATE transactions
  SET status = 'voided',
      voided_at = now(),
      voided_by = $1,
      void_reason = $2
  WHERE id = $3 AND tenant_id = $4
`, [approverId, reason, transactionId, tenantId]);
```

---

### 7.5 PIN / Password Wajib Di-Hash

```typescript
import bcrypt from 'bcrypt';

// Simpan
const pinHash = await bcrypt.hash(pin, 12);
await db.query('UPDATE users SET pin_hash = $1 WHERE id = $2', [pinHash, userId]);

// Verifikasi
const valid = await bcrypt.compare(inputPin, user.pin_hash);
```

Tidak pernah simpan PIN atau password plaintext.

---

### 7.6 `expected_cash` Dihitung dari DB, Bukan dari Client

```typescript
// BENAR: hitung dari transaksi yang sudah tersimpan
const { expected_cash } = await db.queryOne(`
  SELECT
    s.opening_cash
    + COALESCE(SUM(tp.amount) FILTER (WHERE tp.payment_method = 'cash'), 0)
    - COALESCE(SUM(tp.amount) FILTER (
        WHERE t.status IN ('refunded') AND tp.payment_method = 'cash'
      ), 0)
    + s.cash_in - s.cash_out as expected_cash
  FROM shifts s
  LEFT JOIN transactions t ON t.shift_id = s.id
  LEFT JOIN transaction_payments tp ON tp.transaction_id = t.id
  WHERE s.id = $1 AND s.tenant_id = $2
  GROUP BY s.id, s.opening_cash, s.cash_in, s.cash_out
`, [shiftId, tenantId]);
```

Tidak pernah terima `expected_cash` dari request body client.

---

## 8. Audit Log — Aksi Wajib

Semua aksi berikut WAJIB tulis ke `audit_logs` dalam satu transaksi database yang sama:

| Aksi | `action` key | `entity_type` |
|---|---|---|
| Login sukses | `login_success` | `user` |
| Login gagal | `login_failed` | `user` |
| Logout | `logout` | `user` |
| Buat transaksi | `create_transaction` | `transaction` |
| Void transaksi (request) | `void_requested` | `transaction` |
| Void transaksi (approved) | `void_approved` | `transaction` |
| Refund (request) | `refund_requested` | `transaction` |
| Refund (approved) | `refund_approved` | `transaction` |
| Diskon override | `discount_override` | `transaction` |
| Buka shift | `open_shift` | `shift` |
| Tutup shift (submit) | `close_shift_submitted` | `shift` |
| Approve shift | `shift_approved` | `shift` |
| Reject shift | `shift_rejected` | `shift` |
| Stock adjustment | `stock_adjustment` | `inventory` |
| Transfer stok | `stock_transfer` | `inventory` |
| Ubah harga produk | `price_change` | `product` |
| Buat/ubah produk | `product_update` | `product` |
| Buat user | `user_created` | `user` |
| Suspend user | `user_suspended` | `user` |
| Ubah role | `role_assignment_changed` | `user_role_assignment` |
| Export laporan | `report_exported` | `report` |
| Ubah tenant settings | `settings_updated` | `tenant` |
| Support impersonation | `support_access` | `tenant` |

### Format metadata yang disarankan

```json
{
  "device_id": "uuid",
  "shift_id": "uuid",
  "ip_address": "10.0.0.1",
  "session_id": "uuid"
}
```

---

## 9. Red Flags yang Harus Dihindari

| Red Flag | Dampak | Solusi |
|---|---|---|
| Shared account kasir | Audit lemah, fraud tidak bisa dilacak | 1 user = 1 akun unik |
| Hard delete transaksi | Data hilang, laporan tidak konsisten | Soft delete: voided_at, void_reason |
| Refund tanpa approval | Fraud mudah dilakukan kasir | Request → Approve flow |
| Kasir bisa ubah harga | Price manipulation | Harga hanya admin tenant |
| Stock adjustment tanpa reason | Stock loss tidak bisa diinvestigasi | Reason wajib |
| Query tanpa tenant_id | Data bocor antar tenant | Selalu scope by tenant_id |
| expected_cash dari client | Bisa dimanipulasi | Hitung server-side dari DB |
| PIN disimpan plaintext | Security breach | bcrypt hash minimal cost 12 |
| Frontend-only outlet filter | Bisa di-bypass | Server-side enforcement wajib |
| Admin bisa masuk POS tanpa jejak | Akuntabilitas hilang | Catat role_at_transaction di audit |

---

## 10. Acceptance Criteria

### Tenant & Outlet

- [ ] Semua outlet punya `tenant_id`
- [ ] Semua transaksi punya `tenant_id`, `outlet_id`, `shift_id`, `device_id`
- [ ] Admin tenant hanya bisa lihat data tenantnya sendiri
- [ ] User outlet tidak bisa lihat outlet lain
- [ ] Tidak ada query transaksi tanpa tenant scope

### User & Role

- [ ] Setiap user punya akun unik (tidak ada shared account)
- [ ] PIN/password tidak disimpan plaintext (bcrypt)
- [ ] Role disimpan terpisah dari user
- [ ] Permission dikaitkan ke role, bukan ke user langsung
- [ ] Role assignment memiliki scope (TENANT atau OUTLET)
- [ ] Admin tenant bisa scope TENANT
- [ ] Store manager/kasir bisa scope OUTLET

### POS & Shift

- [ ] Kasir wajib open shift sebelum transaksi
- [ ] Setiap transaksi terkait shift aktif
- [ ] Satu kasir hanya bisa punya 1 shift aktif per outlet
- [ ] Closing shift menyimpan `opening_cash`, `cash_in`, `cash_out`, `actual_cash`
- [ ] `cash_difference` adalah generated column (tidak bisa dimanipulasi)
- [ ] `expected_cash` dihitung dari data transaksi server-side
- [ ] Selisih kas wajib ada reason sebelum submit
- [ ] Kepala toko bisa approve/reject closing shift

### Refund / Void

- [ ] Kasir tidak bisa void transaksi paid tanpa approval
- [ ] Kasir tidak bisa refund tanpa approval
- [ ] Refund/void wajib reason
- [ ] Approver tercatat di `transaction_approvals`
- [ ] Transaksi paid tidak pernah dihapus (soft delete only)
- [ ] Reversal/refund record dibuat untuk setiap refund
- [ ] Audit log dibuat untuk semua aksi refund/void

### Report & Export

- [ ] Admin tenant bisa lihat all outlets
- [ ] Admin tenant bisa filter per outlet
- [ ] Kepala toko hanya bisa lihat outlet yang di-assign
- [ ] Kasir hanya bisa lihat shift/transaksi sendiri
- [ ] Export report hanya role tertentu
- [ ] Setiap export dicatat di audit_log

### Security

- [ ] PIN/password tidak plaintext
- [ ] Login gagal dicatat di `login_attempts`
- [ ] Lockout setelah 5 gagal dalam 15 menit
- [ ] User suspend tidak menghapus histori transaksi
- [ ] Role change dicatat di audit_log
- [ ] Harga produk change dicatat di audit_log
- [ ] Stock adjustment dicatat di audit_log
- [ ] Export report dicatat di audit_log
- [ ] Support/superadmin access dicatat dengan reason di `support_sessions`

---

## 11. Prompt untuk AI CLI / Claude Code

```
Implement a multi-tenant POS system with RBAC and outlet scoping.

CONTEXT:
- One tenant can own multiple outlets (example: 28 outlets).
- One human must have one unique account. No shared cashier accounts.
- POS devices are bound to a specific outlet at registration time.
- Cashier does not need to select outlet; the device determines outlet context.
- Every transaction must store: tenant_id, outlet_id, cashier_user_id, shift_id, device_id.
- expected_cash must always be computed server-side from transaction records, never accepted from client input.
- cash_difference in shifts is a generated column (actual_cash - expected_cash), not manually stored.

ROLES:
- OWNER: full tenant control including settings.
- ADMIN_TENANT: full operational control, all outlets, no billing.
- STORE_MANAGER: assigned outlet only, can approve sensitive actions (void, refund, closing shift, large discount).
- CASHIER: own outlet and own shift only. Cannot void/refund without approval.
- AUDITOR: read-only, all reports and audit logs.
- AREA_MANAGER: future-ready, outlet group scope.

SCOPES:
- TENANT: user accesses all outlets under their tenant.
- OUTLET: user accesses only assigned outlet(s).
- OUTLET_GROUP: future-ready, for area manager.

CRITICAL RULES:
1. Every DB query must include WHERE tenant_id = :tenant_id. No exceptions.
2. Outlet access must be validated server-side via get_user_outlet_ids(user_id, tenant_id).
3. Permission check must use user_has_permission(user_id, tenant_id, permission_key, outlet_id).
4. Paid transactions must never be hard deleted. Use voided_at, voided_by, void_reason.
5. Every sensitive action must write to audit_logs in the same DB transaction.
6. PIN and passwords must be bcrypt hashed (cost ≥ 12). Never store plaintext.
7. Cashier can open shift → create transactions → close shift.
8. Void and refund require manager/admin approval and reason. Create transaction_approvals record first.
9. Closing shift with cash_difference ≠ 0 requires reason and manager approval.
10. Null unique constraints: use partial unique indexes or NULLS NOT DISTINCT (PG 15+) for nullable unique columns.

SCHEMA FILES:
- 01_schema.sql: all tables, enums, indexes, functions
- 02_seed.sql: system roles, permissions, role-permission matrix
- 03_query_patterns.sql: reference implementation patterns

BUILD ORDER:
1. Schema (tables, enums, functions)
2. Seed data (roles, permissions, role-permission assignments)
3. Auth middleware (JWT/session + permission guard + outlet scope guard)
4. Shift management (open, close, approve)
5. Transaction flow (create, pay, void request, refund request)
6. Approval flow (void approve, refund approve, discount approve)
7. Inventory (view, adjustment, transfer, opname)
8. Reports (outlet report, global report, audit log viewer)
9. User management (create, assign role, suspend)
10. Admin panel (product, pricing, outlet, tenant settings)
```

---

*Dokumen ini adalah acuan teknis untuk implementasi LakuPOS / sistem POS multi-tenant.*  
*Selalu update dokumen ini ketika ada perubahan schema atau rule bisnis.*
