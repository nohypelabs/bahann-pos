-- Phase 3: POS Hardening
-- pos_devices, shifts, transaction_approvals, device_id/shift_id on transactions

BEGIN;

-- ============================================================
-- 1. POS Devices table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pos_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id),
  name text NOT NULL,
  device_code text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'maintenance')),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, device_code)
);

CREATE INDEX idx_pos_devices_tenant_outlet ON public.pos_devices(tenant_id, outlet_id);
ALTER TABLE public.pos_devices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Shifts table (replaces/supplements cash_sessions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id),
  device_id uuid REFERENCES public.pos_devices(id),
  cashier_user_id uuid NOT NULL REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending_approval', 'closed', 'rejected')),
  opening_cash numeric(14,2) NOT NULL DEFAULT 0,
  cash_sales numeric(14,2) NOT NULL DEFAULT 0,
  cash_refunds numeric(14,2) NOT NULL DEFAULT 0,
  cash_in numeric(14,2) NOT NULL DEFAULT 0,
  cash_out numeric(14,2) NOT NULL DEFAULT 0,
  expected_cash numeric(14,2),
  actual_cash numeric(14,2),
  cash_difference numeric(14,2)
    GENERATED ALWAYS AS (
      CASE
        WHEN actual_cash IS NOT NULL AND expected_cash IS NOT NULL
        THEN actual_cash - expected_cash
        ELSE NULL
      END
    ) STORED,
  cashier_note text,
  manager_note text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.users(id),
  approved_at timestamptz,
  -- Prevent duplicate open shifts per cashier per outlet
  CONSTRAINT uq_shift_active UNIQUE NULLS NOT DISTINCT (cashier_user_id, outlet_id, closed_at)
);

CREATE INDEX idx_shifts_tenant_outlet ON public.shifts(tenant_id, outlet_id);
CREATE INDEX idx_shifts_cashier ON public.shifts(cashier_user_id);
CREATE INDEX idx_shifts_status ON public.shifts(status) WHERE status IN ('open', 'pending_approval');

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Add device_id and shift_id to transactions
-- ============================================================
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.pos_devices(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id);

CREATE INDEX IF NOT EXISTS idx_transactions_device_id ON public.transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id ON public.transactions(shift_id);

-- ============================================================
-- 4. Transaction approvals table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transaction_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id),
  transaction_id uuid REFERENCES public.transactions(id),
  shift_id uuid REFERENCES public.shifts(id),
  action_type text NOT NULL
    CHECK (action_type IN ('void', 'refund', 'discount_override', 'cash_drawer_open', 'payment_correction', 'shift_close')),
  requested_by uuid NOT NULL REFERENCES public.users(id),
  approved_by uuid REFERENCES public.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reason text NOT NULL,
  amount numeric(14,2),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ta_tenant_outlet ON public.transaction_approvals(tenant_id, outlet_id);
CREATE INDEX idx_ta_status ON public.transaction_approvals(status) WHERE status = 'pending';
CREATE INDEX idx_ta_transaction ON public.transaction_approvals(transaction_id);

ALTER TABLE public.transaction_approvals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Add approval-related columns to transactions
-- ============================================================
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES public.users(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS refund_reason text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS refund_amount numeric(14,2);

-- ============================================================
-- 6. Migrate existing cash_sessions → shifts (if any)
-- ============================================================
INSERT INTO public.shifts (
  id, tenant_id, outlet_id, cashier_user_id, status,
  opening_cash, opened_at, closed_at, approved_by, approved_at
)
SELECT
  cs.id, cs.tenant_id, cs.outlet_id, cs.opened_by,
  CASE
    WHEN cs.status = 'open' THEN 'open'
    WHEN cs.status = 'closed' THEN 'closed'
    ELSE 'closed'
  END,
  COALESCE(cs.opening_cash, 0), cs.opened_at, cs.closed_at,
  cs.closed_by, cs.closed_at
FROM public.cash_sessions cs
WHERE NOT EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = cs.id)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. RLS policies for new tables
-- ============================================================

-- pos_devices: tenant-scoped
CREATE POLICY "pos_devices_tenant_select" ON public.pos_devices
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- shifts: tenant-scoped, outlet-filtered for non-admins
CREATE POLICY "shifts_tenant_select" ON public.shifts
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

-- transaction_approvals: tenant-scoped
CREATE POLICY "transaction_approvals_tenant_select" ON public.transaction_approvals
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()));

COMMIT;
