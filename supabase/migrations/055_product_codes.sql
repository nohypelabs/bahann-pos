-- 055_product_codes.sql
--
-- Generated SKUs and barcodes for products that have none (a workshop's loose
-- parts), printed on A4 sticker labels.
--
--   * product_code_counters: one running number per tenant and kind; numbers are
--     handed out by next_product_codes, which locks the counter row, so two
--     people generating codes at once never get the same number.
--   * barcodes are unique per tenant (blank ones excepted). A scan must find one
--     product; production had no duplicates when this was added.

CREATE TABLE IF NOT EXISTS public.product_code_counters (
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('sku', 'barcode')),
  last_value BIGINT NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, kind)
);

ALTER TABLE public.product_code_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_code_counters_tenant_isolation ON public.product_code_counters;
CREATE POLICY product_code_counters_tenant_isolation ON public.product_code_counters
  FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Reserves p_count consecutive numbers and returns them. Unused numbers are
-- simply skipped; gaps are harmless.
CREATE OR REPLACE FUNCTION public.next_product_codes(p_tenant_id UUID, p_kind TEXT, p_count INTEGER DEFAULT 1)
RETURNS SETOF BIGINT
LANGUAGE plpgsql
AS $function$
DECLARE
  v_last BIGINT;
BEGIN
  IF p_count < 1 OR p_count > 5000 THEN
    RAISE EXCEPTION 'p_count must be 1..5000';
  END IF;

  INSERT INTO public.product_code_counters (tenant_id, kind, last_value)
    VALUES (p_tenant_id, p_kind, p_count)
    ON CONFLICT (tenant_id, kind)
    DO UPDATE SET last_value = public.product_code_counters.last_value + p_count, updated_at = now()
    RETURNING last_value INTO v_last;

  RETURN QUERY SELECT generate_series(v_last - p_count + 1, v_last);
END;
$function$;

REVOKE ALL ON FUNCTION public.next_product_codes(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_product_codes(UUID, TEXT, INTEGER) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_barcode_key
  ON public.products (tenant_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

-- In-store EAN-13 for a running number: "20" + 10 digits + check digit.
-- Must match internalBarcode() in src/domain/catalog/productCodes.ts.
CREATE OR REPLACE FUNCTION public.internal_ean13(p_n BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_body TEXT;
  v_sum  INTEGER := 0;
  i      INTEGER;
BEGIN
  IF p_n < 1 OR p_n > 9999999999 THEN
    RAISE EXCEPTION 'barcode number out of range: %', p_n;
  END IF;
  v_body := '20' || lpad(p_n::TEXT, 10, '0');
  FOR i IN 1..12 LOOP
    v_sum := v_sum + substr(v_body, i, 1)::INTEGER * CASE WHEN i % 2 = 1 THEN 1 ELSE 3 END;
  END LOOP;
  RETURN v_body || ((10 - v_sum % 10) % 10)::TEXT;
END;
$function$;

-- Gives every product without a barcode (optionally only the listed ones) an
-- in-store barcode, in one transaction. A number already used as some product's
-- barcode (a manufacturer code that happens to look like ours) is skipped.
CREATE OR REPLACE FUNCTION public.assign_missing_barcodes(p_tenant_id UUID, p_product_ids UUID[] DEFAULT NULL)
RETURNS TABLE (product_id UUID, barcode TEXT)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_product UUID;
  v_code    TEXT;
BEGIN
  FOR v_product IN
    SELECT p.id FROM public.products p
    WHERE p.tenant_id = p_tenant_id
      AND (p.barcode IS NULL OR p.barcode = '')
      AND (p_product_ids IS NULL OR p.id = ANY (p_product_ids))
    ORDER BY p.name
    FOR UPDATE
  LOOP
    LOOP
      SELECT public.internal_ean13(n) INTO v_code FROM public.next_product_codes(p_tenant_id, 'barcode', 1) AS n;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.products x WHERE x.tenant_id = p_tenant_id AND x.barcode = v_code
      );
    END LOOP;
    UPDATE public.products SET barcode = v_code WHERE id = v_product;
    product_id := v_product;
    barcode := v_code;
    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.internal_ean13(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_missing_barcodes(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_ean13(BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_missing_barcodes(UUID, UUID[]) TO service_role;
