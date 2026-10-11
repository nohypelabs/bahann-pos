-- 048_sales_trend_business_day.sql
--
-- get_sales_trend grouped sales by UTC date, so anything sold between 00:00 and
-- 07:00 WIB appeared on the previous day in the dashboard chart. Group by the
-- business (Asia/Jakarta) day instead; see src/lib/business/timezone.ts.

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
    (t.created_at AT TIME ZONE 'Asia/Jakarta')::date  AS sale_date,
    COALESCE(SUM(t.total_amount), 0)                   AS revenue,
    COALESCE(SUM(ti.qty), 0)::bigint                   AS items_sold
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
  GROUP BY (t.created_at AT TIME ZONE 'Asia/Jakarta')::date
  ORDER BY sale_date ASC;
$function$;

NOTIFY pgrst, 'reload schema';
