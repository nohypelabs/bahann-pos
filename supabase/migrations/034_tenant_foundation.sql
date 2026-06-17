-- Phase 1: Tenant Foundation
-- Create tenants table + add tenant_id to all operational tables + backfill

BEGIN;

-- ============================================================
-- 1. Create tenants table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'cancelled')),
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'warung', 'starter', 'professional', 'business', 'enterprise')),
  owner_user_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Backfill tenants from existing outlet owners
-- ============================================================
INSERT INTO public.tenants (id, name, owner_user_id, created_at)
SELECT gen_random_uuid(),
  COALESCE(u.name, u.email, 'Tenant ' || o.owner_id::text),
  o.owner_id, MIN(o.created_at)
FROM public.outlets o
LEFT JOIN public.users u ON u.id = o.owner_id
WHERE o.owner_id IS NOT NULL
GROUP BY o.owner_id, u.name, u.email
ON CONFLICT DO NOTHING;

-- Admin users without outlets → create tenant
INSERT INTO public.tenants (id, name, owner_user_id, created_at)
SELECT gen_random_uuid(),
  COALESCE(u.name, u.email, 'Tenant ' || u.id::text),
  u.id, u.created_at
FROM public.users u
WHERE u.role = 'admin'
  AND u.id NOT IN (SELECT owner_user_id FROM public.tenants WHERE owner_user_id IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Default tenant for orphaned users
INSERT INTO public.tenants (id, name, status)
VALUES (gen_random_uuid(), 'Default Tenant', 'active');

-- ============================================================
-- 3. Add tenant_id columns (nullable first)
-- ============================================================
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.transaction_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.cash_sessions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.daily_sales ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.daily_stock ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.stock_alerts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payment_confirmations ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.payment_requests ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.billing_history ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.business_profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.qris_config ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.wa_templates ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- ============================================================
-- 4. Backfill tenant_id — USERS FIRST (needed by everything else)
-- ============================================================

-- outlets: owner_id → tenant
UPDATE public.outlets o SET tenant_id = t.id
FROM public.tenants t
WHERE t.owner_user_id = o.owner_id AND o.tenant_id IS NULL;

-- users: outlet→tenant, then owned tenant, then default tenant
UPDATE public.users u SET tenant_id = COALESCE(
  (SELECT o.tenant_id FROM public.outlets o WHERE o.id = u.outlet_id),
  (SELECT t.id FROM public.tenants t WHERE t.owner_user_id = u.id),
  (SELECT t.id FROM public.tenants t WHERE t.name = 'Default Tenant' LIMIT 1)
)
WHERE u.tenant_id IS NULL;

-- products: owner_id → tenant
UPDATE public.products p SET tenant_id = t.id
FROM public.tenants t
WHERE t.owner_user_id = p.owner_id AND p.tenant_id IS NULL;

-- transactions: outlet → tenant
UPDATE public.transactions tx SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = tx.outlet_id AND tx.tenant_id IS NULL;

-- transaction_items: transaction → tenant
UPDATE public.transaction_items ti SET tenant_id = tx.tenant_id
FROM public.transactions tx
WHERE tx.id = ti.transaction_id AND ti.tenant_id IS NULL;

-- cash_sessions: outlet → tenant
UPDATE public.cash_sessions cs SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = cs.outlet_id AND cs.tenant_id IS NULL;

-- daily_sales: outlet → tenant
UPDATE public.daily_sales ds SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = ds.outlet_id AND ds.tenant_id IS NULL;

-- daily_stock: outlet → tenant
UPDATE public.daily_stock ds SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = ds.outlet_id AND ds.tenant_id IS NULL;

-- stock_movements: outlet → tenant
UPDATE public.stock_movements sm SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = sm.outlet_id AND sm.tenant_id IS NULL;

-- stock_alerts: outlet → tenant
UPDATE public.stock_alerts sa SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = sa.outlet_id AND sa.tenant_id IS NULL;

-- audit_logs: user → tenant (users already have tenant_id)
UPDATE public.audit_logs al SET tenant_id = u.tenant_id
FROM public.users u
WHERE u.id = al.user_id AND al.tenant_id IS NULL;

-- For audit_logs with NULL user_id, use default tenant
UPDATE public.audit_logs al SET tenant_id = (
  SELECT id FROM public.tenants WHERE name = 'Default Tenant' LIMIT 1
)
WHERE al.tenant_id IS NULL;

-- payments: transaction → tenant
UPDATE public.payments pm SET tenant_id = tx.tenant_id
FROM public.transactions tx
WHERE tx.id = pm.transaction_id AND pm.tenant_id IS NULL;

-- payment_requests: user → tenant
UPDATE public.payment_requests pr SET tenant_id = u.tenant_id
FROM public.users u
WHERE u.id = pr.user_id AND pr.tenant_id IS NULL;

-- promotions: created_by → tenant
UPDATE public.promotions pr SET tenant_id = u.tenant_id
FROM public.users u
WHERE u.id = pr.created_by AND pr.tenant_id IS NULL;

-- operational_expenses: outlet → tenant
UPDATE public.operational_expenses oe SET tenant_id = o.tenant_id
FROM public.outlets o
WHERE o.id = oe.outlet_id AND oe.tenant_id IS NULL;

-- billing_history: user → tenant
UPDATE public.billing_history bh SET tenant_id = u.tenant_id
FROM public.users u
WHERE u.id = bh.user_id AND bh.tenant_id IS NULL;

-- business_profiles: user → tenant
UPDATE public.business_profiles bp SET tenant_id = u.tenant_id
FROM public.users u
WHERE u.id = bp.user_id AND bp.tenant_id IS NULL;

-- Catch-all: any remaining NULL tenant_id → default tenant
UPDATE public.transactions SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.transaction_items SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.cash_sessions SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.daily_sales SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.daily_stock SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.stock_movements SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.stock_alerts SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;
UPDATE public.operational_expenses SET tenant_id = (SELECT id FROM tenants WHERE name = 'Default Tenant') WHERE tenant_id IS NULL;

-- ============================================================
-- 5. Set NOT NULL on core tables
-- ============================================================
ALTER TABLE public.outlets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.transaction_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cash_sessions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.daily_sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.daily_stock ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.stock_movements ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.operational_expenses ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================
-- 6. Add indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_outlets_tenant_id ON public.outlets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_outlet ON public.transactions(tenant_id, outlet_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_tenant_id ON public.transaction_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_tenant_id ON public.cash_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_sales_tenant_id ON public.daily_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_tenant_id ON public.daily_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_tenant_id ON public.stock_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operational_expenses_tenant_id ON public.operational_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promotions_tenant_id ON public.promotions(tenant_id);

-- ============================================================
-- 7. RLS policy for tenants
-- ============================================================
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

COMMIT;
