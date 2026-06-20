-- Phase 4: Cash Shift Hardening
-- expected_cash computation, shift approval flow, active shift guard

BEGIN;

-- ============================================================
-- 1. Function: compute expected_cash for a shift
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_expected_cash(p_shift_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.opening_cash
    + COALESCE(s.cash_sales, 0)
    - COALESCE(s.cash_refunds, 0)
    + COALESCE(s.cash_in, 0)
    - COALESCE(s.cash_out, 0)
  FROM public.shifts s
  WHERE s.id = p_shift_id;
$$;

-- ============================================================
-- 2. Function: update shift cash totals from transactions
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_shift_cash_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.shift_id IS NOT NULL AND NEW.status = 'paid' THEN
    UPDATE public.shifts
    SET
      cash_sales = (
        SELECT COALESCE(SUM(tp.amount), 0)
        FROM public.transaction_payments tp
        JOIN public.transactions t ON t.id = tp.transaction_id
        WHERE t.shift_id = NEW.shift_id
          AND t.status = 'paid'
          AND tp.payment_method = 'cash'
      ),
      expected_cash = public.compute_expected_cash(NEW.shift_id)
    WHERE id = NEW.shift_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Trigger: auto-update shift totals when transaction is paid
-- ============================================================
-- Note: This trigger fires on transactions INSERT/UPDATE
-- It assumes transaction_payments exists. If not, skip for now.
-- CREATE TRIGGER trg_update_shift_cash_totals
--   AFTER INSERT OR UPDATE OF status ON public.transactions
--   FOR EACH ROW
--   WHEN (NEW.status = 'paid')
--   EXECUTE FUNCTION public.update_shift_cash_totals();

-- ============================================================
-- 4. Function: approve/reject shift closing
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_shift(
  p_shift_id uuid,
  p_approver_id uuid,
  p_manager_note text DEFAULT NULL,
  p_action text DEFAULT 'approve'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shift RECORD;
BEGIN
  SELECT * INTO v_shift FROM public.shifts WHERE id = p_shift_id;
  
  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  
  IF v_shift.status != 'pending_approval' THEN
    RAISE EXCEPTION 'Shift is not pending approval (current status: %)', v_shift.status;
  END IF;
  
  IF p_action = 'approve' THEN
    UPDATE public.shifts
    SET
      status = 'closed',
      approved_by = p_approver_id,
      approved_at = now(),
      closed_at = now(),
      manager_note = p_manager_note,
      expected_cash = public.compute_expected_cash(p_shift_id)
    WHERE id = p_shift_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.shifts
    SET
      status = 'rejected',
      manager_note = p_manager_note
    WHERE id = p_shift_id;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
END;
$$;

-- ============================================================
-- 5. Function: submit shift for approval
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_shift(
  p_shift_id uuid,
  p_actual_cash numeric,
  p_cashier_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expected numeric;
  v_diff numeric;
BEGIN
  -- Compute expected cash
  v_expected := public.compute_expected_cash(p_shift_id);
  v_diff := p_actual_cash - v_expected;
  
  -- If no difference, auto-close
  IF v_diff = 0 THEN
    UPDATE public.shifts
    SET
      status = 'closed',
      actual_cash = p_actual_cash,
      expected_cash = v_expected,
      cashier_note = p_cashier_note,
      closed_at = now(),
      submitted_at = now()
    WHERE id = p_shift_id AND status = 'open';
  ELSE
    -- Has difference → needs approval
    UPDATE public.shifts
    SET
      status = 'pending_approval',
      actual_cash = p_actual_cash,
      expected_cash = v_expected,
      cashier_note = p_cashier_note,
      submitted_at = now()
    WHERE id = p_shift_id AND status = 'open';
  END IF;
END;
$$;

-- ============================================================
-- 6. RLS policies for shifts (insert/update for authenticated)
-- ============================================================
DROP POLICY IF EXISTS "shifts_insert" ON public.shifts;
CREATE POLICY "shifts_insert" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "shifts_update" ON public.shifts;
CREATE POLICY "shifts_update" ON public.shifts
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()
  ));

-- transaction_approvals insert/update
DROP POLICY IF EXISTS "ta_insert" ON public.transaction_approvals;
CREATE POLICY "ta_insert" ON public.transaction_approvals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "ta_update" ON public.transaction_approvals;
CREATE POLICY "ta_update" ON public.transaction_approvals
  FOR UPDATE TO authenticated
  USING (tenant_id IN (
    SELECT ura.tenant_id FROM user_role_assignments ura WHERE ura.user_id = auth.uid()
  ));

COMMIT;
