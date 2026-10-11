-- 049_shift_expected_cash.sql
--
-- shifts.cash_sales was never filled: the trigger meant to maintain it (037) was
-- left commented out because it referenced a transaction_payments table that does
-- not exist. compute_expected_cash therefore returned only the opening cash, so
-- every shift with a cash sale closed with a false shortfall and needed approval.
--
-- Cash totals are now derived from the shift's own transactions when needed:
--   cash_sales   = cash sales that completed (including ones later refunded)
--   cash_refunds = cash handed back for refunded sales
-- Voided sales never took money and count for neither. submit_shift stores both
-- figures on the shift so the closing record shows how expected cash was reached
-- (cash_difference is a generated column and follows on its own).
--
-- These SECURITY DEFINER functions were executable by anon, so anyone could close
-- or approve any shift by id. The app calls them only with the service role.

CREATE OR REPLACE FUNCTION public.shift_cash_sales(p_shift_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(SUM(t.total_amount), 0)
  FROM public.transactions t
  WHERE t.shift_id = p_shift_id
    AND t.payment_method = 'cash'
    AND t.status IN ('completed', 'refunded');
$function$;

CREATE OR REPLACE FUNCTION public.shift_cash_refunds(p_shift_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(SUM(COALESCE(t.refund_amount, t.total_amount)), 0)
  FROM public.transactions t
  WHERE t.shift_id = p_shift_id
    AND t.payment_method = 'cash'
    AND t.status = 'refunded';
$function$;

CREATE OR REPLACE FUNCTION public.compute_expected_cash(p_shift_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT
    s.opening_cash
    + public.shift_cash_sales(s.id)
    - public.shift_cash_refunds(s.id)
    + COALESCE(s.cash_in, 0)
    - COALESCE(s.cash_out, 0)
  FROM public.shifts s
  WHERE s.id = p_shift_id;
$function$;

CREATE OR REPLACE FUNCTION public.submit_shift(p_shift_id uuid, p_actual_cash numeric, p_cashier_note text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_sales numeric := public.shift_cash_sales(p_shift_id);
  v_refunds numeric := public.shift_cash_refunds(p_shift_id);
  v_expected numeric := public.compute_expected_cash(p_shift_id);
  v_diff numeric := p_actual_cash - v_expected;
BEGIN
  UPDATE public.shifts
  SET
    status = CASE WHEN v_diff = 0 THEN 'closed' ELSE 'pending_approval' END,
    cash_sales = v_sales,
    cash_refunds = v_refunds,
    expected_cash = v_expected,
    actual_cash = p_actual_cash,
    cashier_note = p_cashier_note,
    submitted_at = now(),
    closed_at = CASE WHEN v_diff = 0 THEN now() ELSE closed_at END
  WHERE id = p_shift_id AND status = 'open';
END;
$function$;

REVOKE ALL ON FUNCTION public.shift_cash_sales(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_cash_refunds(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_cash_sales(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.shift_cash_refunds(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.compute_expected_cash(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_shift(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_shift(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_expected_cash(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_shift(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_shift(uuid, uuid, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
