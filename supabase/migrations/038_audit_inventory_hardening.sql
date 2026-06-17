-- Phase 5: Audit + Inventory Hardening
-- Immutable audit logs, tenant-scoped RLS, stock_movements upgrade

BEGIN;

-- ============================================================
-- 1. Add missing columns to audit_logs FIRST (before trigger)
-- ============================================================
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES public.outlets(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS device_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS shift_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role_key text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_user_id uuid;

-- Backfill actor_user_id BEFORE creating immutable trigger
UPDATE public.audit_logs SET actor_user_id = user_id WHERE actor_user_id IS NULL;

-- ============================================================
-- 2. NOW create immutable trigger (after backfill is done)
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ============================================================
-- 3. RLS policies for audit_logs (tenant-scoped read)
-- ============================================================
CREATE POLICY "audit_logs_tenant_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT ura.tenant_id FROM user_role_assignments ura
    JOIN role_permissions rp ON rp.role_id = ura.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ura.user_id = auth.uid() AND p.key = 'audit.view'
  ));

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 4. Indexes for audit_logs
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_outlet_id ON public.audit_logs(outlet_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);

-- ============================================================
-- 5. RLS policies for operational tables (tenant-scoped)
-- ============================================================

-- transactions
CREATE POLICY "transactions_tenant_select" ON public.transactions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- transaction_items
CREATE POLICY "transaction_items_tenant_select" ON public.transaction_items
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "transaction_items_insert" ON public.transaction_items
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- products
CREATE POLICY "products_tenant_select" ON public.products
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- outlets
CREATE POLICY "outlets_tenant_select" ON public.outlets
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- users
CREATE POLICY "users_tenant_select" ON public.users
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- daily_sales
CREATE POLICY "daily_sales_tenant_select" ON public.daily_sales
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- daily_stock
CREATE POLICY "daily_stock_tenant_select" ON public.daily_stock
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- stock_movements: tenant-scoped (drop old non-tenant policies first)
DROP POLICY IF EXISTS stock_movements_select ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_insert ON public.stock_movements;
CREATE POLICY "stock_movements_tenant_select" ON public.stock_movements
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- stock_alerts
CREATE POLICY "stock_alerts_tenant_select" ON public.stock_alerts
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- cash_sessions (legacy)
CREATE POLICY "cash_sessions_tenant_select" ON public.cash_sessions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- operational_expenses (drop old policies first)
DROP POLICY IF EXISTS expenses_select ON public.operational_expenses;
DROP POLICY IF EXISTS expenses_insert ON public.operational_expenses;
DROP POLICY IF EXISTS expenses_update ON public.operational_expenses;
CREATE POLICY "operational_expenses_tenant_select" ON public.operational_expenses
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

CREATE POLICY "operational_expenses_insert" ON public.operational_expenses
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- promotions
CREATE POLICY "promotions_tenant_select" ON public.promotions
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- billing_history
CREATE POLICY "billing_history_tenant_select" ON public.billing_history
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- business_profiles
CREATE POLICY "business_profiles_tenant_select" ON public.business_profiles
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- ============================================================
-- 6. Stock movements: add tenant-aware columns
-- ============================================================
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS movement_type text;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS reference_type text;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS reference_id uuid;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS notes text;

COMMIT;
