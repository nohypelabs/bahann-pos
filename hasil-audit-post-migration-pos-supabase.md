# Hasil Audit Post-Migration Supabase POS

**Tanggal:** 2026-06-17  
**Source:** `db-audit(1).zip`  
**Scope:** Audit setelah hasil audit sebelumnya diterapkan ke Supabase/PostgreSQL.  
**Tujuan:** Mengecek apakah patch urgent security, multi-tenant foundation, RBAC, RLS, policy, function, index, dan operational schema sudah aman untuk target POS multi-tenant 28 outlet.

---

## 1. Executive Verdict

Migrasi sudah jauh lebih maju dibanding schema v0. Struktur besar seperti tenant, RBAC, outlet group, device POS, shift, approval, dan stock movement sudah mulai masuk. Namun statusnya **belum production-safe** karena RLS masih belum sepenuhnya outlet-scoped dan permission-scoped.

**Score sebelum migrasi:** 3.8/10  
**Score setelah migrasi:** 6.8/10

Status saat ini:

```txt
✅ Struktur multi-tenant dan RBAC sudah mulai terbentuk
✅ Semua public tables sudah RLS enabled
✅ Audit logs sudah immutable untuk UPDATE/DELETE
⚠️ RLS policy masih terlalu tenant-level
⚠️ Beberapa policy token/audit masih permissive
⚠️ Payment method config masih berpotensi global readable
⚠️ Function lama/stale masih ada
❌ Belum production-ready
```

Kesimpulan singkat:

```txt
RBAC sudah ada,
tapi RLS belum sepenuhnya memakai RBAC dengan benar.
```

---

## 2. Yang Sudah Berhasil

Berikut poin yang sudah berhasil diterapkan dari audit sebelumnya:

```txt
✅ 36/36 public tables sudah RLS enabled
✅ tenants sudah ada
✅ roles sudah ada
✅ permissions sudah ada
✅ role_permissions sudah ada
✅ user_role_assignments sudah ada
✅ outlet_groups sudah ada
✅ outlet_group_members sudah ada
✅ pos_devices sudah ada
✅ shifts sudah ada
✅ transaction_approvals sudah ada
✅ stock_movements sudah ada
✅ tenant_id sudah masuk ke banyak tabel operasional
✅ audit_logs punya tenant_id, outlet_id, device_id, shift_id
✅ audit_logs punya trigger immutable untuk UPDATE/DELETE
✅ 6 system roles sudah ada:
   - OWNER
   - ADMIN_TENANT
   - AREA_MANAGER
   - STORE_MANAGER
   - CASHIER
   - AUDITOR
✅ 28 permissions sudah ada
✅ unique index untuk user_role_assignments per scope sudah ada
```

Ini berarti pondasi besar sudah benar arahnya. Schema sudah bukan lagi single-tenant sederhana. Tapi, seperti biasa, database bisa terlihat rapi sambil diam-diam menyimpan ranjau kecil di policy.

---

## 3. Critical / High Findings

### 3.1 RLS masih tenant-level, belum outlet-level

Banyak policy masih memakai pola seperti ini:

```sql
tenant_id IN (
  SELECT ura.tenant_id
  FROM user_role_assignments ura
  WHERE ura.user_id = auth.uid()
)
```

Masalahnya: pola ini hanya membuktikan user berada dalam tenant. Ini belum membatasi outlet yang boleh diakses.

Dampak:

```txt
Kasir yang hanya ditugaskan ke Outlet 01 berpotensi bisa membaca data tenant lebih luas
jika policy tabel hanya tenant-scoped dan akses client langsung terbuka.
```

Target yang benar:

```txt
CASHIER       → assigned outlet + own shift
STORE_MANAGER → assigned outlet
AREA_MANAGER  → assigned outlet group
ADMIN_TENANT  → all outlets in tenant
OWNER          → all tenant scope
AUDITOR        → read-only tenant scope
```

Rekomendasi:

```txt
Rewrite RLS untuk tabel operasional menggunakan helper function:
- get_user_outlet_ids(auth.uid(), tenant_id)
- user_has_permission(auth.uid(), tenant_id, permission_key, outlet_id)
```

---

### 3.2 Policy masih refer langsung ke `user_role_assignments`

Beberapa RLS policy membaca `user_role_assignments` langsung. Ini berisiko karena `user_role_assignments` sendiri RLS-enabled.

Dampak:

```txt
1. Policy bisa deny semua karena subquery ke user_role_assignments tidak mengembalikan row.
2. Policy jadi sulit diprediksi.
3. Performance RLS bisa buruk.
4. Security model jadi rapuh.
```

Rekomendasi:

Gunakan function `SECURITY DEFINER` untuk akses RBAC internal, bukan inline subquery langsung di policy.

Contoh pola ideal:

```sql
CREATE POLICY transactions_select_scoped
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.user_has_permission(
    auth.uid(),
    tenant_id,
    'transactions.read',
    outlet_id
  )
);
```

---

### 3.3 `audit_logs` masih punya broad INSERT policy

Ditemukan policy seperti:

```txt
System can insert audit logs → INSERT TO public WITH CHECK true
audit_logs_insert → INSERT TO authenticated WITH CHECK true
```

Dampak:

```txt
Client berpotensi bisa membuat audit log palsu jika grant memungkinkan.
Audit log jadi tidak sepenuhnya terpercaya.
```

Audit log harus menjadi sumber kebenaran, bukan papan tulis yang bisa diisi siapa saja. Kalau semua orang bisa insert audit log, nanti kasir bisa menulis “tidak bersalah” dan berharap database tersentuh secara spiritual.

Rekomendasi:

```txt
1. Drop broad insert policies.
2. Revoke INSERT audit_logs dari anon/authenticated.
3. Audit log sebaiknya hanya dibuat dari backend/service role.
4. Kalau client harus insert, batasi sangat ketat dengan actor_user_id = auth.uid() + tenant assignment.
```

Patch awal sudah disiapkan di file:

```txt
next-hotfix-rls-cleanup.sql
```

---

### 3.4 Token tables masih punya stale permissive policies

Ditemukan policy lama:

```txt
password_reset_tokens:
- Backend can manage password reset tokens → ALL TO public USING true WITH CHECK true

refresh_tokens:
- System can insert refresh tokens → INSERT TO public WITH CHECK true
- System can update refresh tokens → UPDATE TO public USING true
```

Dampak:

```txt
Tabel token seharusnya backend-only.
Policy permissive seperti ini tidak boleh dibiarkan walaupun grants sudah direvoke.
```

Rekomendasi:

```txt
1. Drop semua policy permissive di password_reset_tokens.
2. Drop semua policy permissive di refresh_tokens.
3. Revoke ALL dari anon/authenticated.
4. Gunakan backend/service role untuk operasi token.
```

---

### 3.5 `payment_methods_read_only` terlalu terbuka

Policy saat ini:

```sql
payment_methods_read_only
FOR SELECT TO authenticated
USING true
```

Masalahnya, tabel `payment_methods` memiliki field:

```txt
account_details jsonb
```

Kalau `account_details` berisi nomor rekening, QRIS config, instruksi internal, merchant config, atau data sensitif, maka semua user authenticated bisa membaca data tersebut.

Rekomendasi:

```txt
1. Jangan expose payment_methods langsung jika ada account_details.
2. Buat safe public view untuk frontend:
   - id
   - code
   - name
   - type
   - icon
   - is_active
3. Simpan account_details hanya untuk admin/backend.
4. Tambahkan tenant_id jika payment methods berbeda per tenant.
```

Contoh view aman:

```sql
CREATE VIEW public.payment_methods_public AS
SELECT
  id,
  tenant_id,
  code,
  name,
  type,
  icon,
  display_order,
  is_active
FROM public.payment_methods
WHERE is_active = true;
```

---

### 3.6 Active shift unique index masih perlu diperbaiki

Current index:

```sql
CREATE UNIQUE INDEX uq_shift_active
ON public.shifts (cashier_user_id, outlet_id, closed_at) NULLS NOT DISTINCT;
```

Masalah:

```txt
Lebih aman memakai partial unique index berdasarkan status aktif.
Shift yang pending approval juga sebaiknya dianggap masih aktif.
```

Rekomendasi:

```sql
DROP INDEX IF EXISTS public.uq_shift_active;

CREATE UNIQUE INDEX idx_shifts_one_active_per_cashier_outlet
ON public.shifts(cashier_user_id, outlet_id)
WHERE status IN ('open', 'pending_approval', 'submitted');
```

---

### 3.7 Function stale masih ada

Ditemukan function lama/stale:

```txt
create_income_from_sale()
generate_transaction_number()
update_product_stock()
update_shift_cash_totals()
```

Temuan khusus:

```txt
update_shift_cash_totals() refer ke public.transaction_payments,
padahal schema sekarang memakai payments, bukan transaction_payments.
```

Dampak:

```txt
Function akan error jika dipanggil atau ditempel ke trigger.
Saat ini tidak tampak attached ke trigger aktif, tapi tetap risk.
```

Rekomendasi:

```txt
1. Audit apakah function dipakai.
2. Kalau tidak dipakai, drop.
3. Kalau dipakai, rewrite agar sesuai schema baru.
4. Jangan biarkan function stale tersisa.
```

---

### 3.8 TypeScript database types belum regenerate

`database.types.ts` masih versi lama dan belum mencakup tabel baru seperti:

```txt
tenants
roles
permissions
role_permissions
user_role_assignments
outlet_groups
pos_devices
shifts
transaction_approvals
stock_movements
```

Rekomendasi:

```bash
npx supabase@latest gen types typescript --linked --schema public > src/types/database.types.ts
```

Setelah regenerate:

```txt
1. Commit database.types.ts baru.
2. Fix error TypeScript yang muncul.
3. Pastikan frontend/backend tidak masih memakai field legacy tanpa sengaja.
```

---

### 3.9 Beberapa unique constraints masih global, belum tenant-scoped

Contoh yang perlu dicek:

```txt
outlets_name_key
products_sku_key
promotions_code_key
transactions_transaction_id_key
qris_config_merchant_id_key
```

Masalah:

```txt
Jika unique masih global, tenant berbeda tidak bisa memakai nama outlet/SKU/kode promo/transaction id yang sama.
```

Rekomendasi:

```txt
Gunakan unique index berbasis tenant_id.
```

Contoh:

```sql
CREATE UNIQUE INDEX idx_products_tenant_sku
ON public.products(tenant_id, sku);

CREATE UNIQUE INDEX idx_outlets_tenant_name
ON public.outlets(tenant_id, name);
```

---

## 4. Risk Matrix Ringkas

| Area | Status | Severity | Catatan |
|---|---:|---:|---|
| RLS enabled semua table | Pass | Low | 36/36 public tables RLS ON |
| Tenant foundation | Partial pass | Medium | tenant_id sudah banyak masuk, perlu validasi coverage |
| RBAC tables | Pass | Medium | Struktur ada, pemakaian policy belum matang |
| Outlet-scoped RLS | Fail/Partial | Critical | Policy masih dominan tenant-level |
| Token table policy | Fail | Critical | Masih ada policy permissive |
| Audit log immutability | Partial pass | High | UPDATE/DELETE blocked, INSERT masih terlalu longgar |
| Payment methods exposure | Risk | High | SELECT true ke authenticated + account_details |
| Shift active guard | Needs fix | Medium | Lebih aman status-based partial index |
| Stale functions | Needs cleanup | Medium | Ada function lama yang refer schema lama |
| TypeScript types | Stale | Medium | Harus regenerate |
| Tenant-scoped uniqueness | Needs review | Medium | Beberapa unique masih global |

---

## 5. Prioritas Fix Berikutnya

### Phase A — Hotfix RLS/Policy Cleanup

Wajib dilakukan dulu:

```txt
1. Drop stale permissive token policies.
2. Revoke token table access dari anon/authenticated.
3. Drop broad audit_logs insert policies.
4. Revoke audit_logs INSERT/UPDATE/DELETE/TRUNCATE dari anon/authenticated.
5. Review payment_methods_read_only.
```

File patch awal:

```txt
next-hotfix-rls-cleanup.sql
```

Jalankan di staging dulu. Jangan langsung production, kecuali lu ingin production database jadi tempat eksperimen sosial.

---

### Phase B — Rewrite RLS Pakai RBAC Helper

Target:

```txt
1. Semua tabel tenant-scoped pakai tenant_id.
2. Semua tabel outlet-scoped pakai get_user_outlet_ids().
3. Semua aksi sensitif pakai user_has_permission().
4. Hilangkan inline subquery langsung ke user_role_assignments di policy.
```

Tabel prioritas:

```txt
transactions
transaction_items
payments
shifts
stock_movements
transaction_approvals
products
promotions
audit_logs
outlets
users
```

---

### Phase C — Operational Hardening

```txt
1. Fix active shift unique index.
2. Clean/drop stale functions.
3. Regenerate database.types.ts.
4. Perbaiki unique index agar tenant-scoped.
5. Split payment method public view dari sensitive config.
```

---

## 6. Acceptance Checklist Setelah Hotfix

### Security

- [ ] `anon` tidak bisa SELECT/INSERT/UPDATE/DELETE token tables.
- [ ] `authenticated` tidak bisa SELECT/INSERT/UPDATE/DELETE token tables.
- [ ] `anon` tidak bisa insert audit_logs.
- [ ] `authenticated` tidak bisa insert audit_logs langsung jika backend-only logging dipilih.
- [ ] `audit_logs` tidak bisa UPDATE/DELETE.
- [ ] `payment_methods.account_details` tidak bocor ke user biasa.

### RLS / RBAC

- [ ] Cashier Outlet 01 tidak bisa membaca transaksi Outlet 02.
- [ ] Cashier hanya bisa melihat own shift / allowed outlet.
- [ ] Store Manager hanya bisa melihat assigned outlet.
- [ ] Area Manager hanya bisa melihat outlet dalam outlet group.
- [ ] Admin Tenant bisa melihat semua outlet dalam tenant.
- [ ] Admin Tenant tidak bisa melihat tenant lain.
- [ ] Auditor read-only, tidak bisa mutate data.

### POS Flow

- [ ] Kasir bisa login dengan outlet/device context.
- [ ] Kasir bisa open shift.
- [ ] Kasir bisa create transaction.
- [ ] Kasir tidak bisa void/refund langsung.
- [ ] Refund/void butuh approval.
- [ ] Closing shift dengan selisih butuh review.

### Developer Tooling

- [ ] `database.types.ts` sudah regenerate.
- [ ] TypeScript compile bersih.
- [ ] Tidak ada code masih tergantung field legacy tanpa guard.

---

## 7. Recommended Next Action

Urutan paling aman:

```txt
1. Jalankan next-hotfix-rls-cleanup.sql di staging.
2. Test anon/authenticated access.
3. Fix payment_methods exposure.
4. Rewrite RLS policy dengan helper functions.
5. Cleanup stale functions.
6. Fix active shift index.
7. Regenerate database.types.ts.
8. Audit ulang dengan dump baru.
```

---

## 8. Final Kesimpulan

Migrasi lu sudah berhasil mengubah schema dari POS basic menuju multi-tenant POS yang lebih proper. Tapi saat ini belum boleh dianggap production-safe karena RLS belum benar-benar outlet/permission scoped.

Status final:

```txt
Schema foundation: GOOD
RBAC tables: GOOD
RLS enabled: GOOD
RLS correctness: NOT YET
Audit log immutability: PARTIAL GOOD
Token security: NEEDS HOTFIX
Payment config exposure: NEEDS REVIEW
Production readiness: NOT YET
```

Kalimat teknisnya:

```txt
Post-migration schema is structurally improved, but RLS policies must be rewritten to use RBAC helper functions and outlet-level scoping before production use.
```

Kalau disederhanakan:

```txt
Tabelnya sudah mulai benar.
Role-nya sudah ada.
Scope-nya sudah ada.
Tapi policy-nya masih terlalu polos.
```

Dan policy polos di database itu seperti pintu rumah pakai gorden. Ada, tapi jangan pura-pura itu security.
