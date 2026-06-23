-- Migration: RLS policies for tenant isolation
-- Defense-in-depth: these policies enforce tenant scoping at the database level.
-- Currently the app uses service role (bypasses RLS), but these policies protect
-- against service role key leaks and prepare for future user-scoped client migration.

-- ============================================================
-- SENSITIVE TABLES — deny all non-service-role access
-- ============================================================

-- Audit logs: no direct access (service role only)
CREATE POLICY "audit_logs_deny_anon" ON audit_logs
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "audit_logs_deny_authenticated" ON audit_logs
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- Password reset tokens: no direct access
CREATE POLICY "password_reset_tokens_deny_anon" ON password_reset_tokens
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "password_reset_tokens_deny_authenticated" ON password_reset_tokens
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- Refresh tokens: no direct access
CREATE POLICY "refresh_tokens_deny_anon" ON refresh_tokens
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "refresh_tokens_deny_authenticated" ON refresh_tokens
  AS RESTRICTIVE FOR ALL TO authenticated USING (false);

-- ============================================================
-- CORE TABLES — tenant-scoped access for authenticated users
-- These prepare for future user-scoped Supabase client migration.
-- ============================================================

-- Users: can only see users in their own tenant
CREATE POLICY "users_tenant_isolation" ON users
  FOR SELECT TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Outlets: tenant-scoped
CREATE POLICY "outlets_tenant_isolation" ON outlets
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Products: tenant-scoped
CREATE POLICY "products_tenant_isolation" ON products
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Transactions: tenant-scoped
CREATE POLICY "transactions_tenant_isolation" ON transactions
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Transaction items: tenant-scoped (via transaction's tenant)
CREATE POLICY "transaction_items_tenant_isolation" ON transaction_items
  FOR ALL TO authenticated
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- Daily sales: tenant-scoped
CREATE POLICY "daily_sales_tenant_isolation" ON daily_sales
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Daily stock: tenant-scoped
CREATE POLICY "daily_stock_tenant_isolation" ON daily_stock
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Cash sessions: tenant-scoped
CREATE POLICY "cash_sessions_tenant_isolation" ON cash_sessions
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Promotions: tenant-scoped
CREATE POLICY "promotions_tenant_isolation" ON promotions
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Stock alerts: tenant-scoped
CREATE POLICY "stock_alerts_tenant_isolation" ON stock_alerts
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Payments: tenant-scoped
CREATE POLICY "payments_tenant_isolation" ON payments
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Operational expenses: tenant-scoped
CREATE POLICY "operational_expenses_tenant_isolation" ON operational_expenses
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Tenants: owner can see their own tenant
CREATE POLICY "tenants_owner_select" ON tenants
  FOR SELECT TO authenticated
  USING (owner_user_id = (auth.jwt() ->> 'sub')::uuid);
