# Supabase Schema Audit - Current DB vs POS Multi-Tenant Target

Generated from uploaded `db-audit.zip` on 2026-06-17.

## Executive Verdict

Current schema is **not ready** for the target multi-tenant POS with 28 outlets, RBAC, outlet scoping, Area Manager, device-bound POS, manager approvals, and immutable audit trail.

Current shape is closer to:

- single-owner / owner-scoped POS
- simple outlet model
- role stored directly on `users`
- basic transaction and cash session tables
- partial RLS implementation
- several public tables without RLS

Target shape requires:

- explicit `tenants` table and `tenant_id` on all operational tables
- normalized RBAC: `roles`, `permissions`, `role_permissions`, `user_role_assignments`
- outlet scoping: `TENANT`, `OUTLET`, `OUTLET_GROUP`
- `AREA_MANAGER` via outlet groups
- POS devices bound to outlets
- approval workflow for refund, void, discount override, cash drawer
- cash shift reconciliation with server-calculated snapshots
- immutable, tenant-scoped audit logs

Current readiness score: **3.8 / 10** for production multi-tenant POS.

---

## Critical Findings

### 1. RLS disabled on payment/config tables

RLS is disabled for:

- `bank_accounts`
- `payment_confirmations`
- `payment_methods`
- `payments`
- `qris_config`
- `wa_templates`

The grants report shows `anon` and `authenticated` have broad privileges including `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on those RLS-disabled tables.

**Impact:** If exposed through Supabase API, payment configuration, QRIS data, bank account config, payment records, and WA templates can be publicly readable or writable. This is the most urgent security risk.

**Immediate patch:** enable RLS and remove public write grants.

```sql
alter table public.bank_accounts enable row level security;
alter table public.payment_confirmations enable row level security;
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
alter table public.qris_config enable row level security;
alter table public.wa_templates enable row level security;

revoke all on public.bank_accounts from anon, authenticated;
revoke all on public.payment_confirmations from anon, authenticated;
revoke all on public.payment_methods from anon, authenticated;
revoke all on public.payments from anon, authenticated;
revoke all on public.qris_config from anon, authenticated;
revoke all on public.wa_templates from anon, authenticated;
```

---

### 2. Many RLS-enabled tables have no policies

RLS is enabled but no policies exist for:

- `_migrations`
- `billing_history`
- `business_profiles`
- `cash_sessions`
- `daily_sales`
- `daily_stock`
- `outlets`
- `payment_requests`
- `platform_settings`
- `products`
- `promotions`
- `stock_alerts`
- `transaction_items`
- `transactions`
- `users`

**Impact:** From Supabase client, these tables are likely inaccessible to `anon`/`authenticated` unless accessed through service role/backend. This can break app behavior. Security-wise, deny-by-default is not terrible, but it is incomplete architecture.

**Fix:** after adding `tenant_id`, define explicit policies per table and per operation.

---

### 3. Dangerous RLS policies: password reset and refresh tokens

Current policies include:

- `password_reset_tokens`: `ALL` policy with `true` / `true`
- `refresh_tokens`: insert `true`, update `true`
- `audit_logs`: insert `true`

**Impact:** Public roles may be able to create/manage sensitive security rows via PostgREST depending on grants and exposure. That is not an acceptable auth-security posture.

**Fix:** move token operations fully backend-only, revoke client access, and use service role only.

```sql
revoke all on public.password_reset_tokens from anon, authenticated;
revoke all on public.refresh_tokens from anon, authenticated;

-- Optional: keep read/delete own token only if truly needed, but never broad insert/update true.
```

---

### 4. No explicit tenant model

There is no `tenants` table and no `tenant_id` on core operational tables. Current scoping is mostly `owner_id` on `outlets` and `products`, plus `outlet_id` on transaction tables.

**Impact:** This does not support the target model:

- 1 tenant = 1 business/brand
- tenant admin sees 28 outlets
- head office report across outlets
- Area Manager sees outlet group
- cashier restricted to outlet/shift

**Fix:** create `tenants`, add `tenant_id` everywhere, backfill existing data into one default tenant, then enforce `tenant_id` in RLS and server-side guards.

---

### 5. RBAC is still legacy

`users` currently has:

- `role varchar`
- `permissions jsonb`
- `outlet_id uuid`

There is no normalized RBAC:

- no `roles`
- no `permissions`
- no `role_permissions`
- no `user_role_assignments`
- no scoped assignment model

**Impact:** Cannot cleanly model `ADMIN_TENANT`, `AREA_MANAGER`, `STORE_MANAGER`, `CASHIER`, `AUDITOR` with scope types.

**Fix:** add RBAC tables and migrate current `users.role` into assignments.

---

### 6. No Area Manager/outlet group support

There is no:

- `outlet_groups`
- `outlet_group_members`
- `OUTLET_GROUP` scope assignment

**Impact:** For 28 outlets, assigning an Area Manager to 5-10 outlets will require hacks or repeated manual outlet assignments.

---

### 7. Transactions are missing audit-critical context

`transactions` has `outlet_id`, `cashier_id`, void/refund fields, and amounts, but is missing:

- `tenant_id`
- `shift_id` / `cash_session_id`
- `device_id`
- `role_at_transaction`
- `refund_status`
- `original_transaction_id`
- approval linkage

**Impact:** Weak audit trail for multi-outlet operations.

---

### 8. Cash sessions are mutable and not approval-ready

`cash_sessions` has `expected_cash`, `actual_cash`, `difference`, and sales totals as regular writable columns. It lacks:

- `tenant_id`
- `device_id`
- `submitted_at`
- `approved_by`, `approved_at`
- `rejected_by`, `rejected_at`
- `cash_in`, `cash_out`
- `expected_cash_snapshot`
- generated/safe `cash_difference`

**Impact:** Closing cash values can be supplied or mutated by application logic. For POS audit, expected cash must be computed server-side.

---

### 9. No transaction approval workflow

There is no `transaction_approvals` table.

**Impact:** Refund/void can be recorded as final state, but request/approval/rejection workflow is not auditable.

---

### 10. Audit logs are not immutable and not tenant scoped

`audit_logs` exists, which is good, but it lacks:

- `tenant_id`
- `outlet_id`
- `device_id`
- `shift_id`
- immutable trigger preventing update/delete

**Impact:** Audit trail is not strong enough for multi-outlet POS.

---

### 11. Stale/broken functions exist

Functions appear to reference non-existing or outdated structures:

- `create_income_from_sale()` references `financial_transactions`, `NEW.transaction_number`, and `sales_transaction_seq` style logic, while current `transactions` schema uses `transaction_id`.
- `update_product_stock()` references `NEW.type`, `products.stock`, and `products.updated_at`, but current `stock_movements` uses `movement_type`, and `products` DDL does not show `stock` or `updated_at`.

They are not attached by current triggers, but stale functions should be removed or rewritten before they become production landmines.

---

## Migration Priority

### Phase 0: Emergency security patch

1. Enable RLS on RLS-disabled payment/config tables.
2. Revoke public grants from sensitive tables.
3. Lock down `password_reset_tokens` and `refresh_tokens`.
4. Confirm Supabase API cannot read/write these tables using anon key.

### Phase 1: Tenant foundation

1. Create `tenants`.
2. Add `tenant_id` to outlets, users, products, transactions, transaction_items, payments, cash_sessions, stock tables, audit_logs.
3. Backfill all current data to one default tenant.
4. Add indexes on `(tenant_id, ...)`.

### Phase 2: RBAC and outlet scope

1. Create `roles`, `permissions`, `role_permissions`, `user_role_assignments`.
2. Add scope types: `TENANT`, `OUTLET`, `OUTLET_GROUP`.
3. Add `outlet_groups` and `outlet_group_members`.
4. Build `get_user_outlet_ids()` and `user_has_permission()`.

### Phase 3: POS operation hardening

1. Add `pos_devices` and `pos_device_assignments`.
2. Add `device_id` and `shift_id` to transactions.
3. Add `transaction_approvals`.
4. Make refund/void request -> approve/reject.

### Phase 4: Cash shift hardening

1. Add `cash_in`, `cash_out`.
2. Add `expected_cash_snapshot`.
3. Make `cash_difference` generated from `actual_cash - expected_cash_snapshot`.
4. Add submit/approve/reject status flow.
5. Add active shift unique index.

### Phase 5: Audit and inventory hardening

1. Make `audit_logs` tenant/outlet/device/shift scoped.
2. Add immutable trigger.
3. Upgrade `stock_movements` to tenant-aware inventory ledger.
4. Keep `daily_stock` as reporting summary only.

---

## Final Recommendation

Do not build the new 28-outlet tenant workflow on top of the current schema as-is.

Use the current schema only as a legacy base, then migrate in controlled phases. The first non-negotiable fix is RLS and grants on payment/config tables. After that, add tenant foundation, RBAC assignments, outlet groups, POS devices, approvals, and cash reconciliation.
