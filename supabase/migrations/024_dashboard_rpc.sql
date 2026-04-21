-- Dashboard RPC functions — move aggregation from Node.js to PostgreSQL
-- Prevents fetching millions of rows into memory; DB does SUM/GROUP BY instead.
-- All functions are SECURITY DEFINER so they run as the DB owner (bypasses RLS).
-- Caller must always pass validated outlet_ids scoped to the tenant.

-- ─── get_sales_summary ────────────────────────────────────────────────────────
-- Returns total_revenue, transaction_count, total_items_sold for a date range.
CREATE OR REPLACE FUNCTION get_sales_summary(
  p_outlet_ids  UUID[],
  p_start_date  TIMESTAMPTZ,
  p_end_date    TIMESTAMPTZ
)
RETURNS TABLE (
  total_revenue       NUMERIC,
  transaction_count   BIGINT,
  total_items_sold    BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(SUM(t.total_amount), 0)      AS total_revenue,
    COUNT(DISTINCT t.id)                   AS transaction_count,
    COALESCE(SUM(ti.quantity), 0)          AS total_items_sold
  FROM transactions t
  LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
  WHERE t.status     = 'completed'
    AND t.outlet_id  = ANY(p_outlet_ids)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date;
$$;

-- ─── get_sales_trend ──────────────────────────────────────────────────────────
-- Returns daily revenue + items_sold for charting.
CREATE OR REPLACE FUNCTION get_sales_trend(
  p_outlet_ids  UUID[],
  p_start_date  TIMESTAMPTZ,
  p_end_date    TIMESTAMPTZ
)
RETURNS TABLE (
  sale_date    DATE,
  revenue      NUMERIC,
  items_sold   BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    (t.created_at AT TIME ZONE 'UTC')::date           AS sale_date,
    COALESCE(SUM(t.total_amount), 0)                   AS revenue,
    COALESCE(SUM(ti.quantity), 0)                      AS items_sold
  FROM transactions t
  LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
  WHERE t.status     = 'completed'
    AND t.outlet_id  = ANY(p_outlet_ids)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
  GROUP BY (t.created_at AT TIME ZONE 'UTC')::date
  ORDER BY sale_date ASC;
$$;

-- ─── get_top_products ─────────────────────────────────────────────────────────
-- Returns top-N products by quantity sold within a date range.
CREATE OR REPLACE FUNCTION get_top_products(
  p_outlet_ids  UUID[],
  p_start_date  TIMESTAMPTZ,
  p_end_date    TIMESTAMPTZ,
  p_limit       INT DEFAULT 5
)
RETURNS TABLE (
  product_id      UUID,
  product_name    TEXT,
  product_sku     TEXT,
  total_quantity  BIGINT,
  total_revenue   NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    ti.product_id,
    ti.product_name,
    ti.product_sku,
    SUM(ti.quantity)   AS total_quantity,
    SUM(ti.line_total) AS total_revenue
  FROM transaction_items ti
  JOIN transactions t ON t.id = ti.transaction_id
  WHERE t.status     = 'completed'
    AND t.outlet_id  = ANY(p_outlet_ids)
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
  GROUP BY ti.product_id, ti.product_name, ti.product_sku
  ORDER BY total_quantity DESC
  LIMIT p_limit;
$$;

-- Revoke public execute, grant only to authenticated role (Supabase convention)
REVOKE EXECUTE ON FUNCTION get_sales_summary(UUID[], TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_sales_trend(UUID[], TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_top_products(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_sales_summary(UUID[], TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION get_sales_trend(UUID[], TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION get_top_products(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, INT) TO service_role;
