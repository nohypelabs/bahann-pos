-- 046_dashboard_revenue_and_expenses.sql
--
-- 1. get_sales_summary and get_sales_trend summed transactions.total_amount after
--    a LEFT JOIN to transaction_items, so a sale with N line items counted its
--    total N times and dashboard revenue was inflated. Items are now aggregated
--    per transaction before joining.
-- 2. get_expense_summary totals non-voided operational expenses for a date range,
--    so the dashboard can show operating profit (revenue - expenses).
-- 3. These SECURITY DEFINER functions take arbitrary outlet ids, and anon could
--    call them to read any tenant's sales. The app only calls them with the
--    service role, so execution is restricted to it.

CREATE OR REPLACE FUNCTION public.get_sales_summary(
  p_outlet_ids uuid[],
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(total_revenue numeric, transaction_count bigint, total_items_sold bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT
    COALESCE(SUM(t.total_amount), 0)     AS total_revenue,
    COUNT(t.id)                           AS transaction_count,
    COALESCE(SUM(ti.qty), 0)::bigint      AS total_items_sold
  FROM transactions t
  LEFT JOIN (
    SELECT transaction_id, SUM(quantity) AS qty
    FROM transaction_items
    GROUP BY transaction_id
  ) ti ON ti.transaction_id = t.id
  WHERE t.status     = 'completed'
    AND t.outlet_id  = ANY(p_outlet_ids)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date;
$function$;

CREATE OR REPLACE FUNCTION public.get_sales_trend(
  p_outlet_ids uuid[],
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(sale_date date, revenue numeric, items_sold bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT
    (t.created_at AT TIME ZONE 'UTC')::date  AS sale_date,
    COALESCE(SUM(t.total_amount), 0)          AS revenue,
    COALESCE(SUM(ti.qty), 0)::bigint          AS items_sold
  FROM transactions t
  LEFT JOIN (
    SELECT transaction_id, SUM(quantity) AS qty
    FROM transaction_items
    GROUP BY transaction_id
  ) ti ON ti.transaction_id = t.id
  WHERE t.status     = 'completed'
    AND t.outlet_id  = ANY(p_outlet_ids)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
  GROUP BY (t.created_at AT TIME ZONE 'UTC')::date
  ORDER BY sale_date ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_expense_summary(
  p_outlet_ids uuid[],
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(total_expenses numeric, expense_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT
    COALESCE(SUM(e.amount), 0) AS total_expenses,
    COUNT(e.id)                AS expense_count
  FROM operational_expenses e
  WHERE e.is_voided    = false
    AND e.outlet_id    = ANY(p_outlet_ids)
    AND e.expense_date >= p_start_date
    AND e.expense_date <= p_end_date;
$function$;

REVOKE ALL ON FUNCTION public.get_sales_summary(uuid[], timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_sales_trend(uuid[], timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_top_products(uuid[], timestamptz, timestamptz, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_expense_summary(uuid[], date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_summary(uuid[], timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_sales_trend(uuid[], timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_top_products(uuid[], timestamptz, timestamptz, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expense_summary(uuid[], date, date) TO service_role;

NOTIFY pgrst, 'reload schema';
