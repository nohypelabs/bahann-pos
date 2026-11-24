-- 057_offline_ops.sql
--
-- Offline mode for the workshop cashier station.
--
--   * offline_ops: every operation an offline client sends is recorded once by its
--     client-generated op_id. A replay (lost response, retry, a second tab) gets the
--     stored outcome instead of running again. 'processing' rows older than two
--     minutes are taken over, so a crash mid-operation does not block it forever.
--   * current_stock_levels: the latest daily_stock row per product and outlet, the
--     stock the station shows while offline, in one query.

CREATE TABLE IF NOT EXISTS public.offline_ops (
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  op_id       UUID NOT NULL,
  kind        TEXT NOT NULL,
  user_id     UUID,
  device_id   TEXT,
  status      TEXT NOT NULL CHECK (status IN ('processing', 'done', 'failed')),
  result      JSONB,
  error       TEXT,
  occurred_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, op_id)
);

CREATE INDEX IF NOT EXISTS offline_ops_tenant_created ON public.offline_ops (tenant_id, created_at DESC);

ALTER TABLE public.offline_ops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS offline_ops_tenant_isolation ON public.offline_ops;
CREATE POLICY offline_ops_tenant_isolation ON public.offline_ops
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Claims an operation for processing. Returns the row as it stands after the
-- claim: status 'processing' with claimed = true means the caller runs it;
-- otherwise it was done, failed, or is being run elsewhere.
CREATE OR REPLACE FUNCTION public.claim_offline_op(
  p_tenant_id UUID, p_op_id UUID, p_kind TEXT, p_user_id UUID, p_device_id TEXT, p_occurred_at TIMESTAMPTZ
)
RETURNS TABLE (claimed BOOLEAN, status TEXT, result JSONB, error TEXT)
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.offline_ops (tenant_id, op_id, kind, user_id, device_id, status, occurred_at)
    VALUES (p_tenant_id, p_op_id, p_kind, p_user_id, p_device_id, 'processing', p_occurred_at)
    ON CONFLICT (tenant_id, op_id) DO NOTHING;
  IF FOUND THEN
    RETURN QUERY SELECT true, 'processing'::TEXT, NULL::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  -- Take over a claim abandoned by a crashed request.
  UPDATE public.offline_ops o SET updated_at = now()
    WHERE o.tenant_id = p_tenant_id AND o.op_id = p_op_id
      AND o.status = 'processing' AND o.updated_at < now() - interval '2 minutes';
  IF FOUND THEN
    RETURN QUERY SELECT true, 'processing'::TEXT, NULL::JSONB, NULL::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, o.status, o.result, o.error
    FROM public.offline_ops o WHERE o.tenant_id = p_tenant_id AND o.op_id = p_op_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_stock_levels(p_tenant_id UUID)
RETURNS TABLE (product_id UUID, outlet_id UUID, stock INTEGER, stock_date DATE)
LANGUAGE sql
STABLE
AS $function$
  SELECT DISTINCT ON (d.product_id, d.outlet_id) d.product_id, d.outlet_id, d.stock_akhir, d.stock_date
  FROM public.daily_stock d
  WHERE d.tenant_id = p_tenant_id
  ORDER BY d.product_id, d.outlet_id, d.stock_date DESC;
$function$;

REVOKE ALL ON FUNCTION public.claim_offline_op(UUID, UUID, TEXT, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_stock_levels(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_offline_op(UUID, UUID, TEXT, UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_stock_levels(UUID) TO service_role;
