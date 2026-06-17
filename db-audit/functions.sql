CREATE OR REPLACE FUNCTION public.approve_shift(p_shift_id uuid, p_approver_id uuid, p_manager_note text DEFAULT NULL::text, p_action text DEFAULT 'approve'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$



CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW()
    OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days')
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days');
END;
$function$



CREATE OR REPLACE FUNCTION public.compute_expected_cash(p_shift_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    s.opening_cash
    + COALESCE(s.cash_sales, 0)
    - COALESCE(s.cash_refunds, 0)
    + COALESCE(s.cash_in, 0)
    - COALESCE(s.cash_out, 0)
  FROM public.shifts s
  WHERE s.id = p_shift_id;
$function$



CREATE OR REPLACE FUNCTION public.create_income_from_sale()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO financial_transactions (
    type, 
    category, 
    description, 
    amount, 
    payment_method, 
    sales_transaction_id, 
    created_by, 
    outlet_id,
    transaction_date,
    transaction_time
  ) VALUES (
    'income', 
    'Penjualan', 
    'Penjualan - ' || NEW.transaction_number,
    NEW.total_amount, 
    NEW.payment_method, 
    NEW.id,
    NEW.cashier_id, 
    NEW.outlet_id,
    CURRENT_DATE,
    CURRENT_TIME
  );
  RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.generate_transaction_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.transaction_number := 'TRX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                            LPAD(nextval('sales_transaction_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.get_daily_expense_summary(p_outlet_id uuid, p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(category text, total numeric, count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    oe.category,
    SUM(oe.amount) as total,
    COUNT(*) as count
  FROM operational_expenses oe
  WHERE oe.outlet_id = p_outlet_id
    AND oe.expense_date = p_date
    AND oe.is_voided = false
  GROUP BY oe.category
  ORDER BY total DESC;
END;
$function$



CREATE OR REPLACE FUNCTION public.get_sales_summary(p_outlet_ids uuid[], p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(total_revenue numeric, transaction_count bigint, total_items_sold bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
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
$function$



CREATE OR REPLACE FUNCTION public.get_sales_trend(p_outlet_ids uuid[], p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS TABLE(sale_date date, revenue numeric, items_sold bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
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
$function$



CREATE OR REPLACE FUNCTION public.get_top_products(p_outlet_ids uuid[], p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_limit integer DEFAULT 5)
 RETURNS TABLE(product_id uuid, product_name text, product_sku text, total_quantity bigint, total_revenue numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
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
$function$



CREATE OR REPLACE FUNCTION public.get_user_outlet_ids(p_user_id uuid, p_tenant_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(
    -- If user has TENANT scope, return ALL outlets in tenant
    (SELECT array_agg(DISTINCT o.id)
     FROM public.user_role_assignments ura
     JOIN public.roles r ON r.id = ura.role_id
     CROSS JOIN public.outlets o
     WHERE ura.user_id = p_user_id
       AND ura.tenant_id = p_tenant_id
       AND ura.scope_type = 'TENANT'
       AND o.tenant_id = p_tenant_id
    ),
    -- Otherwise return only assigned outlets
    (SELECT array_agg(DISTINCT
      CASE
        WHEN ura.scope_type = 'OUTLET' THEN ura.outlet_id
        WHEN ura.scope_type = 'OUTLET_GROUP' THEN ogm.outlet_id
      END
     )
     FROM public.user_role_assignments ura
     LEFT JOIN public.outlet_group_members ogm ON ogm.outlet_group_id = ura.outlet_group_id
     WHERE ura.user_id = p_user_id
       AND ura.tenant_id = p_tenant_id
       AND ura.scope_type IN ('OUTLET', 'OUTLET_GROUP')
    ),
    ARRAY[]::uuid[]
  );
$function$



CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$



CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$



CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$



CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$



CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$



CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$



CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$



CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$



CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$



CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$



CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$



CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$



CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$



CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$



CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$



CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted';
  RETURN NULL;
END;
$function$



CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$



CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$



CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$



CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$



CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$



CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$



CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$



CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$



CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$



CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$



CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$



CREATE OR REPLACE FUNCTION public.submit_shift(p_shift_id uuid, p_actual_cash numeric, p_cashier_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$



CREATE OR REPLACE FUNCTION public.update_expenses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.update_password_reset_tokens_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.update_product_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE products SET stock = stock + NEW.quantity, updated_at = NOW() WHERE id = NEW.product_id;
  ELSE
    UPDATE products SET stock = stock - NEW.quantity, updated_at = NOW() WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.update_shift_cash_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$



CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$



CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_tenant_id uuid, p_permission_key text, p_outlet_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON rp.role_id = ura.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ura.user_id = p_user_id
      AND ura.tenant_id = p_tenant_id
      AND p.key = p_permission_key
      AND (
        -- TENANT scope: always allowed
        ura.scope_type = 'TENANT'
        -- OUTLET scope: must match outlet
        OR (ura.scope_type = 'OUTLET' AND (p_outlet_id IS NULL OR ura.outlet_id = p_outlet_id))
        -- OUTLET_GROUP scope: outlet must be in group
        OR (ura.scope_type = 'OUTLET_GROUP' AND EXISTS (
          SELECT 1 FROM public.outlet_group_members ogm
          WHERE ogm.outlet_group_id = ura.outlet_group_id
            AND (p_outlet_id IS NULL OR ogm.outlet_id = p_outlet_id)
        ))
      )
  );
$function$



CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$



CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$



CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$



CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$



CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$



