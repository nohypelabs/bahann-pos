-- Phase 6: Post-Audit Hotfix
-- Fixes all 9 findings from post-migration audit
-- Run in staging first, then production

BEGIN;

-- ============================================================
-- FIX 1: Token tables — drop permissive policies, revoke grants
-- ============================================================

-- password_reset_tokens: drop ALL old policies
DROP POLICY IF EXISTS "Backend can manage password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_deny_all" ON public.password_reset_tokens;
CREATE POLICY "password_reset_tokens_deny_all" ON public.password_reset_tokens
  FOR ALL TO public USING (false) WITH CHECK (false);

-- refresh_tokens: drop ALL old policies
DROP POLICY IF EXISTS "System can insert refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "System can update refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Users can delete own refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "Users can read own refresh tokens" ON public.refresh_tokens;
DROP POLICY IF EXISTS "refresh_tokens_deny_all" ON public.refresh_tokens;
CREATE POLICY "refresh_tokens_deny_all" ON public.refresh_tokens
  FOR ALL TO public USING (false) WITH CHECK (false);

-- Revoke any remaining grants
REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated;
REVOKE ALL ON public.refresh_tokens FROM anon, authenticated;

-- ============================================================
-- FIX 2: Audit logs — lockdown INSERT
-- ============================================================

-- Drop broad insert policies
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- Revoke INSERT/UPDATE/DELETE from client roles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;

-- Keep only the tenant-scoped SELECT policy (already exists from Phase 5)
-- audit_logs_tenant_select remains

-- ============================================================
-- FIX 3: payment_methods — safe public view
-- ============================================================

-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "payment_methods_read_only" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_deny_write" ON public.payment_methods;
DROP POLICY IF EXISTS "payment_methods_deny_all" ON public.payment_methods;

-- Deny all direct access
CREATE POLICY "payment_methods_deny_all" ON public.payment_methods
  FOR ALL TO public USING (false) WITH CHECK (false);

-- Create safe public view (no account_details)
CREATE OR REPLACE VIEW public.payment_methods_public AS
SELECT id, code, name, type, icon, display_order, is_active
FROM public.payment_methods
WHERE is_active = true;

-- Grant SELECT on view to authenticated
GRANT SELECT ON public.payment_methods_public TO authenticated;

-- ============================================================
-- FIX 4: RLS rewrite — outlet-scoped using helper functions
-- ============================================================

-- First, update get_user_outlet_ids to be SECURITY DEFINER
-- (already is, but let's make sure it bypasses RLS)

-- Rewrite transactions policy: outlet-scoped
DROP POLICY IF EXISTS "transactions_tenant_select" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update" ON public.transactions;

CREATE POLICY "transactions_select_scoped" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "transactions_insert_scoped" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "transactions_update_scoped" ON public.transactions
  FOR UPDATE TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- transaction_items: follow transaction outlet
DROP POLICY IF EXISTS "transaction_items_tenant_select" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert" ON public.transaction_items;

CREATE POLICY "transaction_items_select_scoped" ON public.transaction_items
  FOR SELECT TO authenticated
  USING (
    transaction_id IN (
      SELECT t.id FROM public.transactions t
      WHERE t.outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), t.tenant_id))
    )
  );

CREATE POLICY "transaction_items_insert_scoped" ON public.transaction_items
  FOR INSERT TO authenticated
  WITH CHECK (
    transaction_id IN (
      SELECT t.id FROM public.transactions t
      WHERE t.outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), t.tenant_id))
    )
  );

-- shifts: outlet-scoped
DROP POLICY IF EXISTS "shifts_tenant_select" ON public.shifts;
DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update" ON public.shifts;

CREATE POLICY "shifts_select_scoped" ON public.shifts
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "shifts_insert_scoped" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "shifts_update_scoped" ON public.shifts
  FOR UPDATE TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- stock_movements: outlet-scoped
DROP POLICY IF EXISTS "stock_movements_tenant_select" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;

CREATE POLICY "stock_movements_select_scoped" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "stock_movements_insert_scoped" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- stock_alerts: outlet-scoped
DROP POLICY IF EXISTS "stock_alerts_tenant_select" ON public.stock_alerts;

CREATE POLICY "stock_alerts_select_scoped" ON public.stock_alerts
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- daily_sales: outlet-scoped
DROP POLICY IF EXISTS "daily_sales_tenant_select" ON public.daily_sales;

CREATE POLICY "daily_sales_select_scoped" ON public.daily_sales
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- daily_stock: outlet-scoped
DROP POLICY IF EXISTS "daily_stock_tenant_select" ON public.daily_stock;

CREATE POLICY "daily_stock_select_scoped" ON public.daily_stock
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- cash_sessions: outlet-scoped
DROP POLICY IF EXISTS "cash_sessions_tenant_select" ON public.cash_sessions;

CREATE POLICY "cash_sessions_select_scoped" ON public.cash_sessions
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- operational_expenses: outlet-scoped
DROP POLICY IF EXISTS "operational_expenses_tenant_select" ON public.operational_expenses;
DROP POLICY IF EXISTS "operational_expenses_insert" ON public.operational_expenses;

CREATE POLICY "operational_expenses_select_scoped" ON public.operational_expenses
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "operational_expenses_insert_scoped" ON public.operational_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- transaction_approvals: outlet-scoped
DROP POLICY IF EXISTS "transaction_approvals_tenant_select" ON public.transaction_approvals;
DROP POLICY IF EXISTS "ta_insert" ON public.transaction_approvals;
DROP POLICY IF EXISTS "ta_update" ON public.transaction_approvals;

CREATE POLICY "transaction_approvals_select_scoped" ON public.transaction_approvals
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "transaction_approvals_insert_scoped" ON public.transaction_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

CREATE POLICY "transaction_approvals_update_scoped" ON public.transaction_approvals
  FOR UPDATE TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- pos_devices: outlet-scoped
DROP POLICY IF EXISTS "pos_devices_tenant_select" ON public.pos_devices;

CREATE POLICY "pos_devices_select_scoped" ON public.pos_devices
  FOR SELECT TO authenticated
  USING (
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- outlets: tenant-scoped (admin sees all, others see assigned)
DROP POLICY IF EXISTS "outlets_tenant_select" ON public.outlets;

CREATE POLICY "outlets_select_scoped" ON public.outlets
  FOR SELECT TO authenticated
  USING (
    -- Admin/owner: all outlets in tenant
    public.user_has_permission(auth.uid(), tenant_id, 'report.tenant.view')
    OR
    -- Others: only assigned outlets
    id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
  );

-- users: tenant-scoped (admin sees all, others see same outlet)
DROP POLICY IF EXISTS "users_tenant_select" ON public.users;

CREATE POLICY "users_select_scoped" ON public.users
  FOR SELECT TO authenticated
  USING (
    public.user_has_permission(auth.uid(), tenant_id, 'user.view')
    OR
    outlet_id = ANY(public.get_user_outlet_ids(auth.uid(), tenant_id))
    OR
    id = auth.uid()  -- always see yourself
  );

-- products: tenant-scoped (all users in tenant can see products)
DROP POLICY IF EXISTS "products_tenant_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;

CREATE POLICY "products_select_scoped" ON public.products
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid())
  );

CREATE POLICY "products_insert_scoped" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_permission(auth.uid(), tenant_id, 'product.manage')
  );

CREATE POLICY "products_update_scoped" ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.user_has_permission(auth.uid(), tenant_id, 'product.manage')
  );

-- promotions: tenant-scoped
DROP POLICY IF EXISTS "promotions_tenant_select" ON public.promotions;

CREATE POLICY "promotions_select_scoped" ON public.promotions
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid())
  );

-- billing_history: tenant-scoped (admin only)
DROP POLICY IF EXISTS "billing_history_tenant_select" ON public.billing_history;

CREATE POLICY "billing_history_select_scoped" ON public.billing_history
  FOR SELECT TO authenticated
  USING (
    public.user_has_permission(auth.uid(), tenant_id, 'report.tenant.view')
  );

-- business_profiles: tenant-scoped
DROP POLICY IF EXISTS "business_profiles_tenant_select" ON public.business_profiles;

CREATE POLICY "business_profiles_select_scoped" ON public.business_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_has_permission(auth.uid(), tenant_id, 'settings.manage')
  );

-- ============================================================
-- FIX 5: Drop stale functions
-- ============================================================
DROP FUNCTION IF EXISTS public.create_income_from_sale() CASCADE;
DROP FUNCTION IF EXISTS public.generate_transaction_number() CASCADE;
DROP FUNCTION IF EXISTS public.update_product_stock() CASCADE;
DROP FUNCTION IF EXISTS public.update_shift_cash_totals() CASCADE;

-- ============================================================
-- FIX 6: Active shift index fix
-- FIX 6: Active shift index fix
-- Drop constraint first (it owns the index)
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS uq_shift_active;
DROP INDEX IF EXISTS public.uq_shift_active;

-- Better: partial unique index based on status
CREATE UNIQUE INDEX idx_shifts_one_active_per_cashier_outlet
  ON public.shifts(cashier_user_id, outlet_id)
  WHERE status IN ('open', 'pending_approval');

-- ============================================================
-- FIX 7: Tenant-scoped unique constraints
-- ============================================================

-- outlets: name → tenant-scoped
ALTER TABLE public.outlets DROP CONSTRAINT IF EXISTS outlets_name_key;
CREATE UNIQUE INDEX idx_outlets_tenant_name ON public.outlets(tenant_id, name);

-- products: sku → tenant-scoped
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
CREATE UNIQUE INDEX idx_products_tenant_sku ON public.products(tenant_id, sku);

-- promotions: code → tenant-scoped
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_code_key;
CREATE UNIQUE INDEX idx_promotions_tenant_code ON public.promotions(tenant_id, code);

-- transactions: transaction_id → tenant-scoped
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_transaction_id_key;
CREATE UNIQUE INDEX idx_transactions_tenant_txn_id ON public.transactions(tenant_id, transaction_id);

-- ============================================================
-- FIX 8: payment_methods — add tenant_id if missing
-- ============================================================
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Also revoke remaining grants on payment_methods
REVOKE ALL ON public.payment_methods FROM anon, authenticated;

COMMIT;
