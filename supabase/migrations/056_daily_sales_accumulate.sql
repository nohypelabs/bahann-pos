-- 056_daily_sales_accumulate.sql
--
-- daily_sales holds one row per product, outlet and business day
-- (UNIQUE (product_id, outlet_id, sale_date)), but every sale inserted a new row,
-- so from the second sale of a product on a day the insert failed and the row kept
-- only the first sale. add_daily_sale adds to the day's row instead, atomically;
-- a voided sale calls it with negative amounts. The rows written so far are then
-- recomputed from the transactions.

CREATE OR REPLACE FUNCTION public.add_daily_sale(
  p_tenant_id  UUID,
  p_product_id UUID,
  p_outlet_id  UUID,
  p_sale_date  DATE,
  p_quantity   INTEGER,
  p_revenue    NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.daily_sales (tenant_id, product_id, outlet_id, sale_date, quantity_sold, revenue)
    VALUES (p_tenant_id, p_product_id, p_outlet_id, p_sale_date, GREATEST(p_quantity, 0), GREATEST(p_revenue, 0))
    ON CONFLICT (product_id, outlet_id, sale_date) DO UPDATE
      SET quantity_sold = GREATEST(public.daily_sales.quantity_sold + p_quantity, 0),
          revenue       = GREATEST(COALESCE(public.daily_sales.revenue, 0) + p_revenue, 0)
      WHERE public.daily_sales.tenant_id = p_tenant_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_daily_sale(UUID, UUID, UUID, DATE, INTEGER, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_daily_sale(UUID, UUID, UUID, DATE, INTEGER, NUMERIC) TO service_role;

-- Recompute every day that has POS transactions: completed sales count, voided
-- ones do not. Days without any transaction (manual entries) are left alone.
WITH sold AS (
  SELECT t.tenant_id, ti.product_id, t.outlet_id,
         (t.created_at AT TIME ZONE 'Asia/Jakarta')::date AS sale_date,
         SUM(ti.quantity) FILTER (WHERE t.status = 'completed') AS quantity,
         SUM(ti.line_total) FILTER (WHERE t.status = 'completed') AS revenue
  FROM public.transactions t
  JOIN public.transaction_items ti ON ti.transaction_id = t.id
  WHERE t.status IN ('completed', 'voided') AND ti.product_id IS NOT NULL AND t.outlet_id IS NOT NULL
  GROUP BY 1, 2, 3, 4
)
INSERT INTO public.daily_sales (tenant_id, product_id, outlet_id, sale_date, quantity_sold, revenue)
SELECT tenant_id, product_id, outlet_id, sale_date, COALESCE(quantity, 0), COALESCE(revenue, 0) FROM sold
ON CONFLICT (product_id, outlet_id, sale_date) DO UPDATE
  SET quantity_sold = EXCLUDED.quantity_sold, revenue = EXCLUDED.revenue;
