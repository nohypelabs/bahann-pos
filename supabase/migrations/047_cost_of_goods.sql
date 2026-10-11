-- 047_cost_of_goods.sql
--
-- Cost of goods sold (HPP), so the dashboard can show gross profit.
--
-- products.cost_price      what one unit costs the store; optional.
-- transaction_items.unit_cost  the cost at the moment of sale. Snapshotted so
--                          changing a product's cost later does not rewrite
--                          past profit. NULL means the cost was unknown.
--
-- get_sales_summary gains total_cogs and uncosted_lines (completed line items
-- with no known cost), so the UI can say when gross profit is incomplete.
-- Changing its return type requires dropping it first.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(14, 2)
  CHECK (cost_price IS NULL OR cost_price >= 0);

ALTER TABLE transaction_items
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(14, 2)
  CHECK (unit_cost IS NULL OR unit_cost >= 0);

DROP FUNCTION IF EXISTS public.get_sales_summary(uuid[], timestamptz, timestamptz);

CREATE FUNCTION public.get_sales_summary(
  p_outlet_ids uuid[],
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS TABLE(
  total_revenue numeric,
  transaction_count bigint,
  total_items_sold bigint,
  total_cogs numeric,
  uncosted_lines bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT
    COALESCE(SUM(t.total_amount), 0)        AS total_revenue,
    COUNT(t.id)                              AS transaction_count,
    COALESCE(SUM(ti.qty), 0)::bigint         AS total_items_sold,
    COALESCE(SUM(ti.cogs), 0)                AS total_cogs,
    COALESCE(SUM(ti.uncosted), 0)::bigint    AS uncosted_lines
  FROM transactions t
  LEFT JOIN (
    SELECT
      transaction_id,
      SUM(quantity)                                        AS qty,
      SUM(quantity * unit_cost)                            AS cogs,
      COUNT(*) FILTER (WHERE unit_cost IS NULL)            AS uncosted
    FROM transaction_items
    GROUP BY transaction_id
  ) ti ON ti.transaction_id = t.id
  WHERE t.status     = 'completed'
    AND t.outlet_id  = ANY(p_outlet_ids)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date;
$function$;

REVOKE ALL ON FUNCTION public.get_sales_summary(uuid[], timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_summary(uuid[], timestamptz, timestamptz) TO service_role;

NOTIFY pgrst, 'reload schema';
