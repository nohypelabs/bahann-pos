# Audit & Hasil Riset Scope POS Multi-Tenant: Tenant 28 Outlet

**Konteks:** Sistem POS multi-tenant untuk 1 tenant yang memiliki 28 outlet.  
**Fokus audit:** Struktur akun, role, outlet scoping, akses laporan, flow operasional kasir/kepala toko/admin tenant, keamanan, audit log, dan rekomendasi schema awal.  
**Tanggal penyusunan:** 17 Juni 2026  
**Status:** Rekomendasi desain operasional v1 yang siap dijadikan acuan pengembangan.

---

## 1. Executive Summary

Desain yang disarankan adalah:

```txt
1 tenant = 1 bisnis / perusahaan / brand
1 tenant bisa punya banyak outlet, contoh: 28 outlet
1 manusia = 1 akun unik
Admin tenant = akses semua outlet dalam tenant
Kepala toko = akses outlet yang ditugaskan
Kasir = akses outlet dan shift kerja sendiri
Device POS = terikat ke outlet tertentu
Report global = hanya admin tenant / owner
Report outlet = kepala toko / store manager
Transaksi harian = kasir
Approval sensitif = kepala toko / admin tenant
```

Model ini lebih aman dibanding memakai akun bersama, karena semua aksi penting bisa ditelusuri ke user, outlet, device, shift, waktu, dan approval. Dalam POS nyata, ini krusial untuk kasus seperti refund mencurigakan, void transaksi, cash discrepancy, stok minus, dan perbedaan laporan antar outlet.

Kesimpulan paling penting:

```txt
Jangan buat 1 akun bersama yang dipakai semua outlet.
Buat 1 akun personal admin tenant yang punya scope TENANT.
Buat akun unik untuk setiap kepala toko dan kasir dengan scope OUTLET.
```

---

## 2. Hasil Riset Ringkas

### 2.1 Shopify POS

Shopify POS menggunakan konsep staff management, POS role, permissions, dan manager approval. Untuk tindakan sensitif seperti return/exchange, staff junior bisa diwajibkan meminta approval dari manager atau senior staff dengan PIN.

Implikasi untuk sistem ini:

- Kasir tidak perlu punya semua akses.
- Return, refund, exchange, void, dan aksi sensitif sebaiknya bisa dikunci dengan approval.
- Kepala toko atau manager harus punya permission khusus untuk approval.
- User bisa di-suspend/deactivate tanpa menghapus historinya.

Referensi:
- Shopify POS staff management: https://help.shopify.com/en/manual/sell-in-person/shopify-pos/staff-management/understanding-pos-staff-management
- Shopify POS permissions: https://help.shopify.com/en/manual/your-account/users/roles/permissions/pos-permissions

---

### 2.2 Lightspeed POS

Lightspeed POS memakai role seperti Cashier, Manager, Admin, dan custom role. Setiap staff memiliki akun sendiri dan role menentukan permission yang sesuai dengan tugas harian. Lightspeed juga mendukung filter outlet pada dashboard: admin bisa melihat semua outlet, sedangkan manager/kasir hanya melihat outlet yang tersedia untuk mereka.

Implikasi untuk sistem ini:

- Role Cashier, Manager, Admin adalah baseline yang valid.
- Outlet scoping adalah pola yang umum dalam POS multi-outlet.
- Admin boleh melihat semua outlet.
- Manager dan cashier dibatasi pada outlet yang diizinkan.
- Custom role seperti Area Manager bisa ditambahkan nanti.

Referensi:
- Lightspeed user roles and permissions: https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534171377819-Setting-user-roles-and-permissions
- Lightspeed employee roles and access: https://retail-support.lightspeedhq.com/hc/en-us/articles/229129608-Setting-up-employee-roles-and-access
- Lightspeed dashboard outlet filtering: https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534030080795-Using-the-home-dashboard

---

### 2.3 Square POS

Square mendukung multi-location management. Lokasi/outlet dibuat dalam dashboard, dan device POS bisa dikaitkan ke lokasi. Ini penting karena device kasir harus tahu outlet mana yang sedang dipakai, bukan sekadar user login tanpa konteks lokasi.

Implikasi untuk sistem ini:

- Outlet harus menjadi entitas inti.
- Device POS sebaiknya terikat ke outlet.
- Admin tenant bisa mengelola banyak outlet dari dashboard.
- Transaksi harus menyimpan `outlet_id` dan `device_id`.

Referensi:
- Square manage multiple locations: https://squareup.com/help/us/en/article/5580-manage-multiple-locations-with-square

---

### 2.4 PCI DSS: Unique User ID

PCI DSS menekankan bahwa setiap user yang punya akses ke environment pembayaran harus memiliki unique ID. Tujuannya agar setiap tindakan bisa ditelusuri ke orang tertentu.

Implikasi untuk sistem ini:

- Jangan pakai akun bersama seperti `kasir01` yang dipakai semua orang dalam satu outlet.
- Setiap kasir harus punya user/PIN sendiri.
- Shared account melemahkan audit, accountability, dan investigasi fraud.
- Minimal simpan `user_id`, `role_at_action`, dan timestamp pada transaksi/audit log.

Referensi:
- PCI DSS Quick Reference Guide: https://www.pcisecuritystandards.org/documents/PCI_DSS-QRG-v3_2_1.pdf

---

### 2.5 Cash Handling Internal Control

Beberapa panduan cash handling menekankan pemisahan tugas, rekonsiliasi harian, pencatatan over/short, dan bukti reconciliation yang ditandatangani/tercatat. Cash register dan mesin pembayaran idealnya diseimbangkan harian.

Implikasi untuk sistem ini:

- Kasir boleh menghitung dan submit closing shift.
- Kepala toko harus review/approve jika ada selisih kas.
- Sistem harus menyimpan expected cash, actual cash, difference, notes, dan approver.
- Jangan biarkan satu orang menguasai seluruh proses menerima kas, mencatat, dan merekonsiliasi tanpa kontrol tambahan.

Referensi:
- Syracuse University Internal Controls for Cash Receipts and Revenue: https://finance.syr.edu/audit/general-internal-controls/internal-controls-for-cash-receipts-and-revenue/
- University of Washington Cash Management and Controls: https://policy.uw.edu/directory/aps/section-30-fiscal-management/aps-38-3-cash-management-and-controls/
- Texas A&M Cash Handling Procedures: https://fmo.tamu.edu/sales-receivables/docs/cash-handling.html

---

### 2.6 Microsoft Dynamics 365 Commerce: Shift & Cash Drawer

Microsoft Dynamics 365 Commerce memiliki konsep shift dan cash drawer management di POS. Ini memperkuat bahwa shift bukan fitur sampingan, tapi bagian inti dari sistem POS operasional.

Implikasi untuk sistem ini:

- Shift harus menjadi entitas utama.
- Setiap transaksi harus terkait dengan shift.
- Cash drawer harus terkait dengan shift dan device/outlet.
- Closing shift harus menghasilkan data reconciliation.

Referensi:
- Microsoft Dynamics 365 Commerce Shift and Cash Drawer Management: https://learn.microsoft.com/en-us/dynamics365/commerce/shift-drawer-management

---

### 2.7 Odoo POS

Odoo POS mendukung multi-shop/multi-employee management, employee login, statistik real-time, dan konsolidasi data lintas toko. Ini relevan dengan kebutuhan 1 tenant yang punya banyak outlet.

Implikasi untuk sistem ini:

- Employee login di POS adalah pola valid.
- Multi-outlet harus mendukung data consolidated view.
- Sistem harus bisa menampilkan data all outlets dan data per outlet.
- Stock movement otomatis dari POS penting jika sistem memiliki inventory.

Referensi:
- Odoo POS documentation: https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale.html
- Odoo multi-employee management: https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/extra/employee_login.html

---

## 3. Rekomendasi Arsitektur Akun & Scope

### 3.1 Struktur Bisnis

```txt
Tenant: PT ABC Retail
├── Outlet 01
├── Outlet 02
├── Outlet 03
├── ...
└── Outlet 28
```

Setiap data inti harus menyimpan `tenant_id`. Setiap data operasional outlet harus menyimpan `outlet_id`.

Contoh:

```txt
transactions:
- tenant_id
- outlet_id
- cashier_user_id
- shift_id
- device_id

inventory_movements:
- tenant_id
- outlet_id
- product_id
- movement_type
- qty
- created_by

cash_shifts:
- tenant_id
- outlet_id
- cashier_user_id
- opened_at
- closed_at
```

---

### 3.2 Prinsip Akun

```txt
1 manusia = 1 akun unik
1 akun bisa diberi akses ke 1 outlet, beberapa outlet, atau semua outlet
Scope menentukan batas data
Role menentukan aksi yang boleh dilakukan
```

Contoh benar:

```txt
Admin Tenant:
- email: owner@tenant.com
- role: ADMIN_TENANT
- scope: TENANT
- access: semua outlet dalam tenant

Kepala Toko 01:
- username/email: kepala.toko01
- role: STORE_MANAGER
- scope: OUTLET
- access: Outlet 01

Kasir 01:
- username/employee_code: KSR-001
- role: CASHIER
- scope: OUTLET
- access: Outlet 01
```

Contoh salah:

```txt
Akun: kasir_outlet01
Dipakai 8 orang kasir bergantian
```

Masalah dari shared account:

- Tidak tahu siapa yang melakukan refund.
- Tidak tahu siapa yang void transaksi.
- Tidak tahu siapa yang melakukan cash out.
- Tidak bisa evaluasi performa kasir per orang.
- Staff resign tapi histori aktivitas tidak bisa dipisahkan.
- Investigasi fraud jadi lemah.

---

## 4. Role Utama yang Disarankan

### 4.1 OWNER / TENANT OWNER

Scope: `TENANT`  
Akses: semua outlet dalam tenant.

Fungsi:

- Melihat report global semua outlet.
- Mengelola admin tenant.
- Mengelola subscription/billing tenant jika SaaS.
- Melihat audit log seluruh tenant.
- Full control dalam tenant, tapi tetap tidak bisa melihat tenant lain.

---

### 4.2 ADMIN_TENANT

Scope: `TENANT`  
Akses: semua outlet dalam tenant.

Fungsi:

- Kelola outlet.
- Kelola produk.
- Kelola harga.
- Kelola kategori.
- Kelola user.
- Assign role.
- Lihat laporan semua outlet.
- Lihat laporan per outlet.
- Lihat refund/void/diskon/cash discrepancy semua outlet.
- Kelola inventory global tenant.
- Export laporan.
- Lihat audit log tenant.

Batasan:

- Tidak boleh melihat data tenant lain.
- Tidak boleh bypass audit log.
- Tidak boleh hard delete transaksi.

---

### 4.3 AREA_MANAGER — Opsional tapi penting untuk 28 outlet

Scope: `MULTI_OUTLET` atau `OUTLET_GROUP`  
Akses: beberapa outlet yang ditugaskan.

Fungsi:

- Pantau beberapa outlet.
- Lihat report area.
- Review performa store manager.
- Review cash discrepancy area.
- Approve aksi tertentu jika store manager tidak tersedia.

Catatan:

Untuk v1 boleh belum dibuat, tapi schema sebaiknya disiapkan agar tidak bongkar ulang ketika tenant bertambah besar.

---

### 4.4 STORE_MANAGER / Kepala Toko

Scope: `OUTLET`  
Akses: outlet yang ditugaskan.

Fungsi:

- Melihat transaksi outlet.
- Melihat laporan outlet.
- Melihat shift kasir outlet.
- Approve closing shift.
- Approve refund.
- Approve void transaksi paid.
- Approve diskon besar.
- Review cash discrepancy.
- Review stok outlet.
- Melakukan stock adjustment terbatas dengan alasan.
- Mengelola kasir outlet, jika diberi permission.

Batasan:

- Tidak boleh melihat semua outlet.
- Tidak boleh mengubah harga global.
- Tidak boleh mengubah role permission global.
- Tidak boleh export seluruh data tenant.
- Tidak boleh hard delete transaksi.

---

### 4.5 CASHIER / Kasir

Scope: `OUTLET`  
Akses: outlet tempat kerja.

Fungsi:

- Login POS.
- Buka shift.
- Input modal awal.
- Buat transaksi penjualan.
- Terima pembayaran.
- Cetak struk.
- Reprint struk terbatas.
- Tutup shift sendiri.
- Input actual cash saat closing.
- Melihat transaksi milik shift sendiri.

Batasan:

- Tidak boleh refund sendiri.
- Tidak boleh void transaksi paid sendiri.
- Tidak boleh edit transaksi yang sudah paid.
- Tidak boleh ubah harga master.
- Tidak boleh ubah stok.
- Tidak boleh lihat report global.
- Tidak boleh export data.
- Tidak boleh akses outlet lain.

---

## 5. Permission Matrix

| Modul / Aksi | Cashier | Store Manager | Area Manager | Admin Tenant | Owner |
|---|---:|---:|---:|---:|---:|
| Login POS | Yes | Yes | Optional | Optional | Optional |
| Login Dashboard | Limited | Yes | Yes | Yes | Yes |
| Buat transaksi | Yes | Yes | Optional | Optional | Optional |
| Edit cart sebelum bayar | Yes | Yes | Yes | Yes | Yes |
| Void transaksi paid | Request only | Approve | Approve | Yes | Yes |
| Refund | Request only | Approve | Approve | Yes | Yes |
| Return barang | Request only | Approve | Approve | Yes | Yes |
| Diskon kecil | Limited | Yes | Yes | Yes | Yes |
| Diskon besar | Request only | Approve | Approve | Yes | Yes |
| Reprint struk | Limited | Yes | Yes | Yes | Yes |
| Buka cash drawer manual | Request only | Yes | Yes | Yes | Yes |
| Open shift | Own only | Yes | Optional | Optional | Optional |
| Close shift | Own only | Review/approve | Review | Yes | Yes |
| Approve closing shift | No | Yes | Yes | Yes | Yes |
| Lihat transaksi shift sendiri | Yes | Yes | Yes | Yes | Yes |
| Lihat transaksi outlet | No / limited | Yes | Assigned outlets | All outlets | All outlets |
| Lihat report outlet | No | Yes | Assigned outlets | All outlets | All outlets |
| Lihat report global | No | No | Optional area only | Yes | Yes |
| Lihat profit/margin | No | Optional | Optional | Yes | Yes |
| Kelola produk | No | No / request | No / request | Yes | Yes |
| Ubah harga produk | No | No | No | Yes | Yes |
| Stock opname input | Optional | Yes | Yes | Yes | Yes |
| Stock adjustment | No | Limited + reason | Limited + reason | Yes | Yes |
| Transfer stok | No | Request/limited | Approve | Yes | Yes |
| Purchase order | No | Optional | Optional | Yes | Yes |
| Kelola user kasir outlet | No | Optional | Optional | Yes | Yes |
| Kelola role permission | No | No | No | Yes | Yes |
| Export data | No | Optional outlet | Optional area | Yes | Yes |
| Lihat audit log | No | Outlet only | Assigned outlets | Tenant | Tenant |
| Tenant settings | No | No | No | Yes | Yes |

---

## 6. Flow Operasional yang Disarankan

### 6.1 Flow Admin Tenant

```txt
Login dashboard
→ default view: All outlets
→ bisa filter outlet / tanggal / cashier / payment method / product
→ review report global
→ review anomaly: refund, void, discount, cash discrepancy, stock minus
→ kelola produk, harga, outlet, user, role
→ export laporan jika diperlukan
```

Admin tenant harus bisa memilih:

```txt
All Outlets
Outlet tertentu
Outlet group / area, jika fitur area sudah ada
```

---

### 6.2 Flow Kepala Toko

```txt
Login dashboard / POS manager mode
→ sistem membaca outlet assignment
→ masuk ke outlet yang ditugaskan
→ review shift aktif
→ approve refund/void jika ada request
→ review closing shift
→ cek laporan outlet
→ cek stok outlet
→ cek cash discrepancy
```

Jika kepala toko memegang lebih dari satu outlet:

```txt
Login
→ tampil outlet switcher khusus outlet yang diizinkan
```

Tidak boleh melihat outlet lain di luar assignment.

---

### 6.3 Flow Kasir

```txt
Buka POS device outlet
→ input employee code / username
→ input PIN/password
→ buka shift
→ input modal awal
→ transaksi
→ cetak struk
→ tutup shift
→ input actual cash
→ submit closing
→ tunggu review kepala toko jika ada selisih
```

Kasir tidak perlu memilih dari 28 outlet. Device POS sudah terikat ke outlet, dan user kasir juga hanya punya akses outlet tertentu.

---

### 6.4 Flow Refund / Void

```txt
Kasir menemukan transaksi yang perlu refund/void
→ kasir membuat request refund/void
→ wajib isi reason
→ kepala toko input PIN / approve
→ sistem membuat reversal/refund record
→ transaksi lama tidak dihapus
→ audit log menyimpan cashier, approver, reason, timestamp, outlet, device
```

Data yang wajib disimpan:

```txt
transaction_id
requested_by_user_id
approved_by_user_id
reason
amount
created_at
outlet_id
device_id
shift_id
```

---

### 6.5 Flow Closing Shift

```txt
Kasir klik close shift
→ sistem menghitung expected cash
→ kasir input actual cash
→ sistem menghitung difference
→ jika selisih = 0, shift bisa closed normal
→ jika selisih != 0, wajib reason
→ kepala toko review dan approve/reject
→ shift dikunci setelah approved
```

Data closing shift:

```txt
opening_cash
cash_sales
cash_refunds
cash_in
cash_out
expected_cash
actual_cash
difference
cashier_note
manager_note
approved_by
approved_at
status
```

---

## 7. Rekomendasi Database Schema v1

### 7.1 tenants

```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

### 7.2 outlets

```sql
create table outlets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  code text,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
```

---

### 7.3 users

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  email text,
  username text,
  employee_code text,
  pin_hash text,
  password_hash text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email),
  unique (tenant_id, username),
  unique (tenant_id, employee_code)
);
```

Catatan:

- Admin tenant sebaiknya pakai email.
- Kepala toko idealnya email/username.
- Kasir bisa pakai employee_code + PIN.
- Jangan simpan PIN plaintext.

---

### 7.4 roles

```sql
create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);
```

Role default:

```txt
OWNER
ADMIN_TENANT
AREA_MANAGER
STORE_MANAGER
CASHIER
AUDITOR
```

---

### 7.5 permissions

```sql
create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text
);
```

Contoh permission key:

```txt
pos.transaction.create
pos.transaction.void.request
pos.transaction.void.approve
pos.refund.request
pos.refund.approve
pos.discount.apply_small
pos.discount.apply_large
pos.receipt.reprint
shift.open
shift.close
shift.approve
report.outlet.view
report.tenant.view
inventory.view
inventory.adjust
inventory.transfer
product.view
product.manage
price.manage
user.manage
role.manage
audit.view
settings.manage
export.report
```

---

### 7.6 role_permissions

```sql
create table role_permissions (
  role_id uuid not null references roles(id),
  permission_id uuid not null references permissions(id),
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);
```

---

### 7.7 user_role_assignments

```sql
create table user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  user_id uuid not null references users(id),
  role_id uuid not null references roles(id),
  scope_type text not null check (scope_type in ('TENANT', 'OUTLET', 'OUTLET_GROUP')),
  outlet_id uuid references outlets(id),
  outlet_group_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role_id, scope_type, outlet_id)
);
```

Contoh assignment:

```txt
Admin Tenant:
scope_type = TENANT
outlet_id = null

Kepala Toko 01:
scope_type = OUTLET
outlet_id = outlet_01

Kasir 01:
scope_type = OUTLET
outlet_id = outlet_01
```

---

### 7.8 pos_devices

```sql
create table pos_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  outlet_id uuid not null references outlets(id),
  name text not null,
  device_code text not null,
  status text not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, device_code)
);
```

Tujuan:

- Device kasir terikat outlet.
- Transaksi bisa dilacak dari device mana.
- Kasir tidak perlu memilih dari 28 outlet.

---

### 7.9 shifts

```sql
create table shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  outlet_id uuid not null references outlets(id),
  device_id uuid references pos_devices(id),
  cashier_user_id uuid not null references users(id),
  status text not null check (status in ('open', 'pending_approval', 'closed', 'rejected')),
  opening_cash numeric(14,2) not null default 0,
  expected_cash numeric(14,2),
  actual_cash numeric(14,2),
  cash_difference numeric(14,2),
  cashier_note text,
  manager_note text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  approved_by uuid references users(id),
  approved_at timestamptz
);
```

---

### 7.10 transactions

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  outlet_id uuid not null references outlets(id),
  shift_id uuid references shifts(id),
  device_id uuid references pos_devices(id),
  cashier_user_id uuid not null references users(id),
  transaction_number text not null,
  status text not null check (status in ('draft', 'paid', 'voided', 'refunded', 'partially_refunded')),
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, transaction_number)
);
```

---

### 7.11 transaction_approvals

```sql
create table transaction_approvals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  outlet_id uuid not null references outlets(id),
  transaction_id uuid not null references transactions(id),
  action_type text not null check (action_type in ('void', 'refund', 'discount_override', 'cash_drawer_open', 'payment_correction')),
  requested_by uuid not null references users(id),
  approved_by uuid references users(id),
  status text not null check (status in ('pending', 'approved', 'rejected')),
  reason text not null,
  amount numeric(14,2),
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
```

---

### 7.12 audit_logs

```sql
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  outlet_id uuid references outlets(id),
  actor_user_id uuid references users(id),
  actor_role_key text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
```

Audit log wajib untuk:

```txt
login
logout
failed_login
create_transaction
void_transaction
refund_transaction
discount_override
open_shift
close_shift
approve_shift
stock_adjustment
price_change
product_update
user_create
user_update
role_change
export_report
settings_update
```

---

## 8. Query Scoping Rule

### 8.1 Admin Tenant

```sql
where tenant_id = current_user.tenant_id
```

Admin tenant boleh melihat semua outlet dalam tenant.

---

### 8.2 Store Manager / Cashier

```sql
where tenant_id = current_user.tenant_id
and outlet_id in (allowed_outlet_ids)
```

Kepala toko dan kasir hanya boleh melihat outlet yang ditugaskan.

---

### 8.3 Super Admin Platform

```sql
-- platform support mode only
-- harus memakai explicit tenant selection + audit log
```

Super admin platform tidak boleh diam-diam masuk data tenant tanpa jejak.

Jika ada support mode:

```txt
Support impersonation harus tercatat:
- super_admin_user_id
- tenant_id
- reason
- started_at
- ended_at
- actions performed
```

---

## 9. Report yang Dibutuhkan

### 9.1 Admin Tenant / Owner

Wajib bisa lihat:

```txt
Sales global semua outlet
Sales per outlet
Sales per area, jika ada area
Sales per tanggal
Sales per cashier
Payment method report
Refund report
Void report
Discount report
Cash discrepancy report
Shift closing report
Product sales ranking
Inventory movement
Stock discrepancy
Low stock report
Profit/margin report, jika HPP tersedia
Audit log
```

Filter minimal:

```txt
Tanggal
Outlet
Area
Kasir
Payment method
Produk/kategori
Status transaksi
Shift
```

---

### 9.2 Kepala Toko

Wajib bisa lihat:

```txt
Sales outlet hari ini
Sales outlet per tanggal
Transaksi outlet
Shift aktif
Closing shift
Cash discrepancy outlet
Refund/void outlet
Performa kasir outlet
Stok outlet
Low stock outlet
```

Tidak wajib lihat:

```txt
Profit/margin global
Outlet lain
Data tenant penuh
Role global
User tenant global
```

---

### 9.3 Kasir

Cukup lihat:

```txt
Shift sendiri
Transaksi shift sendiri
Total sales shift sendiri
Cash expected shift sendiri
Status closing shift sendiri
```

Kasir tidak perlu report besar. Semakin banyak report di kasir, semakin banyak permukaan masalah.

---

## 10. Red Flags yang Harus Dihindari

### 10.1 Shared account

```txt
Salah:
1 akun kasir dipakai seluruh shift.
```

Dampak:

- Audit lemah.
- Fraud susah dilacak.
- Performa staff tidak akurat.
- Password leakage berbahaya.

---

### 10.2 Hard delete transaksi

```txt
Salah:
DELETE FROM transactions WHERE id = ...
```

Yang benar:

```txt
voided_at
voided_by
void_reason
reversal_transaction_id
```

Transaksi paid tidak boleh hilang dari histori.

---

### 10.3 Refund tanpa approval

Refund harus:

```txt
request
reason
approval
audit log
reversal record
```

---

### 10.4 Kasir bisa ubah harga

Kasir boleh kasih diskon kecil jika memang policy toko mengizinkan, tapi edit harga master harus admin tenant.

---

### 10.5 Stock adjustment tanpa reason

Stock adjustment wajib:

```txt
reason
qty before
qty after
actor
approver, jika perlu
timestamp
outlet_id
```

---

### 10.6 Tenant isolation lemah

Setiap query tenant harus scoped by `tenant_id`. Jangan mengandalkan frontend filter saja.

---

### 10.7 Admin tenant transaksi sebagai kasir tanpa jejak

Kalau admin tenant boleh masuk POS, harus dicatat sebagai admin yang melakukan transaksi di outlet tertentu.

```txt
cashier_user_id = admin_user_id
role_at_transaction = ADMIN_TENANT
outlet_id = selected_outlet_id
```

---

## 11. Rekomendasi Implementasi v1

### 11.1 Minimum Role v1

```txt
OWNER
ADMIN_TENANT
STORE_MANAGER
CASHIER
```

Area Manager bisa disiapkan di schema, tapi tidak harus aktif di UI v1.

---

### 11.2 Minimum Scope v1

```txt
TENANT
OUTLET
```

`OUTLET_GROUP` disiapkan sebagai future-ready.

---

### 11.3 Minimum Modul v1

```txt
Tenant management
Outlet management
User management
Role assignment
Product management
Price management
POS transaction
Payment method
Shift open/close
Refund/void approval
Report tenant
Report outlet
Audit log
```

---

### 11.4 Minimum Data yang Harus Ada di Semua Transaksi

```txt
tenant_id
outlet_id
transaction_number
cashier_user_id
shift_id
device_id
status
subtotal
discount_total
tax_total
grand_total
paid_at
created_at
```

---

### 11.5 Minimum Data yang Harus Ada di Audit Log

```txt
tenant_id
outlet_id nullable
actor_user_id
actor_role_key
action
entity_type
entity_id
before_data
after_data
metadata
created_at
```

---

## 12. Acceptance Criteria untuk Developer / AI CLI

Gunakan checklist ini untuk audit implementasi.

### 12.1 Tenant & Outlet

```txt
[ ] Semua outlet punya tenant_id.
[ ] Semua transaksi punya tenant_id dan outlet_id.
[ ] Admin tenant hanya bisa melihat data tenant miliknya.
[ ] User outlet tidak bisa melihat outlet lain.
[ ] Tidak ada query transaksi tanpa tenant scope.
```

---

### 12.2 User & Role

```txt
[ ] Setiap user punya akun unik.
[ ] Tidak ada shared account untuk kasir.
[ ] Role disimpan terpisah dari user.
[ ] Permission bisa dikaitkan ke role.
[ ] Role assignment memiliki scope TENANT atau OUTLET.
[ ] Admin tenant bisa scope TENANT.
[ ] Store manager/kasir bisa scope OUTLET.
```

---

### 12.3 POS & Shift

```txt
[ ] Kasir harus open shift sebelum transaksi.
[ ] Setiap transaksi terkait shift.
[ ] Kasir bisa close shift sendiri.
[ ] Closing shift menyimpan expected_cash dan actual_cash.
[ ] Cash difference dihitung otomatis.
[ ] Selisih kas wajib reason.
[ ] Kepala toko bisa approve closing shift.
```

---

### 12.4 Refund / Void

```txt
[ ] Kasir tidak bisa void transaksi paid tanpa approval.
[ ] Kasir tidak bisa refund tanpa approval.
[ ] Refund/void wajib reason.
[ ] Approver tercatat.
[ ] Transaksi paid tidak dihapus.
[ ] Reversal/refund record dibuat.
[ ] Audit log dibuat untuk semua aksi sensitif.
```

---

### 12.5 Report

```txt
[ ] Admin tenant bisa lihat all outlets.
[ ] Admin tenant bisa filter per outlet.
[ ] Kepala toko hanya bisa lihat outlet assigned.
[ ] Kasir hanya bisa lihat shift/transaksi sendiri.
[ ] Export report hanya role tertentu.
```

---

### 12.6 Security & Audit

```txt
[ ] PIN/password tidak disimpan plaintext.
[ ] Login gagal dicatat.
[ ] User suspend tidak menghapus histori transaksi.
[ ] Role change dicatat di audit log.
[ ] Price change dicatat di audit log.
[ ] Stock adjustment dicatat di audit log.
[ ] Export report dicatat di audit log.
[ ] Support/superadmin access dicatat dengan reason.
```

---

## 13. Prompt Teknis untuk AI CLI / Claude Code

```txt
Implement a multi-tenant POS RBAC and outlet scoping system.

Business context:
- One tenant can own multiple outlets, example: 28 outlets.
- Tenant admin must have tenant-wide access to all outlets and global reports.
- Store managers and cashiers must be restricted to assigned outlets only.
- One human must have one unique account. Do not support shared cashier accounts.
- POS devices should be assigned to a specific outlet.
- Every transaction must store tenant_id, outlet_id, cashier_user_id, shift_id, and device_id.
- Sensitive actions such as refund, void paid transaction, large discount, cash drawer open, stock adjustment, and shift approval must create audit logs.

Required roles:
- OWNER
- ADMIN_TENANT
- STORE_MANAGER
- CASHIER

Future-ready optional role:
- AREA_MANAGER with multi-outlet or outlet-group scope.

Required scopes:
- TENANT: user can access all outlets under their tenant.
- OUTLET: user can access only assigned outlet.
- OUTLET_GROUP: future-ready for area manager.

Rules:
- Admin tenant can view global reports and filter by outlet.
- Store manager can view and manage only assigned outlet.
- Cashier can create transactions only for assigned outlet and active shift.
- Cashier cannot refund or void paid transactions without manager/admin approval.
- Paid transactions must never be hard deleted. Use void/refund/reversal records.
- Closing shift must reconcile expected cash vs actual cash and require notes for discrepancies.
- All sensitive actions must write audit_logs.
- All queries must enforce tenant_id and outlet scope server-side, not only in frontend.

Build the data model, permission checks, and middleware/server helpers before UI.
```

---

## 14. Final Recommendation

Untuk tenant dengan 28 toko, struktur terbaik adalah:

```txt
1 tenant punya 28 outlet.
Admin tenant punya akun personal dengan scope TENANT dan akses semua outlet.
Setiap outlet punya kepala toko dan kasir dengan akun unik.
Kepala toko dan kasir dibatasi outlet assignment.
Device POS dikunci ke outlet tertentu.
Report global hanya untuk admin tenant/owner.
Report outlet untuk kepala toko.
Shift dan transaksi untuk kasir.
Refund, void, closing selisih, stock adjustment, dan diskon besar wajib approval + audit log.
```

Desain ini aman untuk operasional nyata karena memisahkan:

```txt
Who can login
Where they can operate
What action they can do
Who approved sensitive action
What data they can report/export
What audit trail exists after action
```

Jika sistem dibangun dengan struktur ini sejak awal, POS akan lebih siap untuk multi-outlet, laporan global, kontrol kas, kontrol stok, dan investigasi operasional ketika muncul selisih, refund aneh, atau stok hilang.

---

## 15. Source List

1. Shopify POS Staff Management  
   https://help.shopify.com/en/manual/sell-in-person/shopify-pos/staff-management/understanding-pos-staff-management

2. Shopify POS Permissions  
   https://help.shopify.com/en/manual/your-account/users/roles/permissions/pos-permissions

3. Lightspeed User Roles and Permissions  
   https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534171377819-Setting-user-roles-and-permissions

4. Lightspeed Employee Roles and Access  
   https://retail-support.lightspeedhq.com/hc/en-us/articles/229129608-Setting-up-employee-roles-and-access

5. Lightspeed Home Dashboard Outlet Filtering  
   https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534030080795-Using-the-home-dashboard

6. Square Multiple Locations  
   https://squareup.com/help/us/en/article/5580-manage-multiple-locations-with-square

7. PCI DSS Quick Reference Guide  
   https://www.pcisecuritystandards.org/documents/PCI_DSS-QRG-v3_2_1.pdf

8. Syracuse University Internal Controls for Cash Receipts and Revenue  
   https://finance.syr.edu/audit/general-internal-controls/internal-controls-for-cash-receipts-and-revenue/

9. University of Washington Cash Management and Controls  
   https://policy.uw.edu/directory/aps/section-30-fiscal-management/aps-38-3-cash-management-and-controls/

10. Texas A&M Cash Handling Procedures  
    https://fmo.tamu.edu/sales-receivables/docs/cash-handling.html

11. Microsoft Dynamics 365 Commerce Shift and Cash Drawer Management  
    https://learn.microsoft.com/en-us/dynamics365/commerce/shift-drawer-management

12. Odoo Point of Sale Documentation  
    https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale.html

13. Odoo Multi-Employee Management  
    https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/extra/employee_login.html
