-- 054_workshop_module.sql
--
-- Workshop (bengkel) module: customers and members, vehicles, mechanics, open
-- service notes, and a loyalty engine (stamp card first). Design: docs/BENGKEL_MODULE.md.
--
-- Every table is tenant-scoped. The app reaches them with the service role from
-- tRPC; the RLS policies below keep authenticated sessions inside their tenant
-- and deny anon, matching 041_rls_policies.sql.
--
-- Loyalty and voucher changes go through the functions at the end, which lock
-- the rows they touch so two cashiers cannot double-award a stamp or redeem one
-- voucher twice.

-- ─── Customers and members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  phone       TEXT CHECK (phone IS NULL OR phone ~ '^[0-9]{8,15}$'),
  is_member   BOOLEAN NOT NULL DEFAULT false,
  member_code TEXT,
  joined_at   TIMESTAMPTZ,
  notes       TEXT,
  created_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_member_has_code
    CHECK (NOT is_member OR (member_code IS NOT NULL AND joined_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_member_code_key
  ON public.customers (tenant_id, member_code) WHERE member_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS customers_tenant_phone_idx ON public.customers (tenant_id, phone);
CREATE INDEX IF NOT EXISTS customers_tenant_name_idx ON public.customers (tenant_id, lower(name));

-- ─── Vehicles ───────────────────────────────────────────────────────────────
-- plate_number is normalised by the app: upper case, letters and digits only.
CREATE TABLE IF NOT EXISTS public.vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL CHECK (plate_number ~ '^[A-Z0-9]{2,12}$'),
  brand        TEXT,
  model        TEXT,
  customer_id  UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_tenant_plate_key UNIQUE (tenant_id, plate_number)
);

CREATE INDEX IF NOT EXISTS vehicles_customer_idx ON public.vehicles (customer_id);

-- ─── Mechanics ──────────────────────────────────────────────────────────────
-- Not login users: a workshop names who did the job.
CREATE TABLE IF NOT EXISTS public.mechanics (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  phone      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mechanics_tenant_idx ON public.mechanics (tenant_id, is_active);

-- ─── Transactions: who and what a sale was for ──────────────────────────────
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_id  UUID REFERENCES public.vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_customer_idx ON public.transactions (customer_id) WHERE customer_id IS NOT NULL;

-- ─── Open service notes ─────────────────────────────────────────────────────
-- One note per vehicle visit. Stock is deducted when the note is paid, through
-- the normal transaction path; a paid note is the motor's service history entry.
CREATE TABLE IF NOT EXISTS public.service_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  outlet_id      UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  vehicle_id     UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  customer_id    UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  mechanic_id    UUID REFERENCES public.mechanics(id) ON DELETE SET NULL,
  complaint      TEXT,
  odometer_km    INTEGER CHECK (odometer_km IS NULL OR odometer_km >= 0),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  opened_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at      TIMESTAMPTZ,
  cancelled_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cancel_reason  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_orders_cancel_has_reason
    CHECK (status <> 'cancelled' OR (cancel_reason IS NOT NULL AND length(btrim(cancel_reason)) > 0)),
  CONSTRAINT service_orders_closed_has_time
    CHECK (status = 'open' OR closed_at IS NOT NULL)
);

-- At most one open note per vehicle.
CREATE UNIQUE INDEX IF NOT EXISTS service_orders_one_open_per_vehicle
  ON public.service_orders (vehicle_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS service_orders_outlet_status_idx
  ON public.service_orders (tenant_id, outlet_id, status, opened_at DESC);
CREATE INDEX IF NOT EXISTS service_orders_vehicle_history_idx
  ON public.service_orders (vehicle_id, closed_at DESC);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.service_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  -- NULL: charge the product's price at payment. Set: an agreed price for this job.
  unit_price       NUMERIC(15,2) CHECK (unit_price IS NULL OR unit_price >= 0),
  added_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_order_items_one_line_per_product UNIQUE (service_order_id, product_id)
);

-- Items in open notes are shown as reserved stock.
CREATE INDEX IF NOT EXISTS service_order_items_product_idx ON public.service_order_items (product_id);

-- ─── Loyalty ────────────────────────────────────────────────────────────────
-- One program per type per tenant. config shape per type (validated by the app):
--   stamp: { requiredStamps, minSpend, reward: {type, maxValue|amount|percent}, voucherValidDays }
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('stamp', 'points', 'member_discount')),
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_programs_tenant_type_key UNIQUE (tenant_id, type)
);

CREATE TABLE IF NOT EXISTS public.member_vouchers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id             UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  program_id              UUID REFERENCES public.loyalty_programs(id) ON DELETE SET NULL,
  code                    TEXT NOT NULL,
  -- {type: 'free_service', maxValue} | {type: 'fixed', amount} | {type: 'percent', percent, maxValue}
  reward                  JSONB NOT NULL,
  source                  TEXT NOT NULL CHECK (source IN ('stamp_reward', 'manual')),
  source_transaction_id   UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  status                  TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'redeemed', 'void')),
  issued_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at              TIMESTAMPTZ,
  redeemed_at             TIMESTAMPTZ,
  redeemed_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  voided_at               TIMESTAMPTZ,
  void_reason             TEXT,
  created_by              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT member_vouchers_tenant_code_key UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS member_vouchers_customer_idx ON public.member_vouchers (customer_id, status);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS voucher_id       UUID REFERENCES public.member_vouchers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_discount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (voucher_discount >= 0);

-- Balance = SUM(delta) per (program, customer).
CREATE TABLE IF NOT EXISTS public.loyalty_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  program_id     UUID NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  customer_id    UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  voucher_id     UUID REFERENCES public.member_vouchers(id) ON DELETE SET NULL,
  delta          INTEGER NOT NULL CHECK (delta <> 0),
  -- earn: a paid sale; reverse: that sale voided/refunded; reward: spent on a voucher;
  -- restore: a reward voucher voided before use; adjust: manual correction.
  reason         TEXT NOT NULL CHECK (reason IN ('earn', 'reverse', 'reward', 'restore', 'adjust')),
  note           TEXT,
  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A sale earns, and is reversed, at most once per program.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_ledger_once_per_sale
  ON public.loyalty_ledger (program_id, transaction_id, reason)
  WHERE transaction_id IS NOT NULL AND reason IN ('earn', 'reverse');
CREATE INDEX IF NOT EXISTS loyalty_ledger_balance_idx ON public.loyalty_ledger (program_id, customer_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers', 'vehicles', 'mechanics', 'service_orders', 'service_order_items', 'loyalty_programs']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ─── RLS ────────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers', 'vehicles', 'mechanics', 'service_orders', 'service_order_items', 'loyalty_programs', 'member_vouchers', 'loyalty_ledger']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_tenant_isolation', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (tenant_id = (auth.jwt() ->> ''tenant_id'')::uuid) WITH CHECK (tenant_id = (auth.jwt() ->> ''tenant_id'')::uuid)', t || '_tenant_isolation', t);
  END LOOP;
END $$;

-- ─── Loyalty functions ──────────────────────────────────────────────────────

-- Awards the stamp-card stamp for a completed sale, and issues reward vouchers
-- when the balance reaches the target. Safe to call more than once per sale.
-- Returns {awarded, balance, required, vouchers: [codes issued now]} or {awarded:false, reason}.
CREATE OR REPLACE FUNCTION public.loyalty_award_stamps(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tx        public.transactions;
  v_program   public.loyalty_programs;
  v_required  INTEGER;
  v_min_spend NUMERIC;
  v_valid     INTEGER;
  v_inserted  INTEGER;
  v_balance   INTEGER;
  v_voucher   UUID;
  v_code      TEXT;
  v_codes     TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id;
  IF NOT FOUND OR v_tx.status <> 'completed' OR v_tx.customer_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'not_eligible_sale');
  END IF;

  -- Serialise awards for this customer so concurrent sales cannot both cross the target.
  PERFORM 1 FROM public.customers
    WHERE id = v_tx.customer_id AND tenant_id = v_tx.tenant_id AND is_member
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'not_member');
  END IF;

  SELECT * INTO v_program FROM public.loyalty_programs
    WHERE tenant_id = v_tx.tenant_id AND type = 'stamp' AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'no_program');
  END IF;

  v_required  := GREATEST(COALESCE((v_program.config ->> 'requiredStamps')::INTEGER, 10), 1);
  v_min_spend := COALESCE((v_program.config ->> 'minSpend')::NUMERIC, 0);
  v_valid     := NULLIF((v_program.config ->> 'voucherValidDays')::INTEGER, 0);

  -- A visit counts when the sale has at least one labour (SERVICE) line.
  IF v_tx.total_amount < v_min_spend OR NOT EXISTS (
    SELECT 1 FROM public.transaction_items ti
    JOIN public.products p ON p.id = ti.product_id
    WHERE ti.transaction_id = v_tx.id AND p.item_type = 'SERVICE'
  ) THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'not_qualifying');
  END IF;

  INSERT INTO public.loyalty_ledger (tenant_id, program_id, customer_id, transaction_id, delta, reason)
    VALUES (v_tx.tenant_id, v_program.id, v_tx.customer_id, v_tx.id, 1, 'earn')
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM public.loyalty_ledger
    WHERE program_id = v_program.id AND customer_id = v_tx.customer_id;

  WHILE v_inserted > 0 AND v_balance >= v_required LOOP
    v_code := 'SRV-' || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    INSERT INTO public.member_vouchers
      (tenant_id, customer_id, program_id, code, reward, source, source_transaction_id, expires_at)
    VALUES
      (v_tx.tenant_id, v_tx.customer_id, v_program.id, v_code,
       COALESCE(v_program.config -> 'reward', '{"type": "free_service"}'::jsonb),
       'stamp_reward', v_tx.id,
       CASE WHEN v_valid IS NULL THEN NULL ELSE now() + make_interval(days => v_valid) END)
    RETURNING id INTO v_voucher;

    INSERT INTO public.loyalty_ledger (tenant_id, program_id, customer_id, transaction_id, voucher_id, delta, reason)
      VALUES (v_tx.tenant_id, v_program.id, v_tx.customer_id, NULL, v_voucher, -v_required, 'reward');

    v_balance := v_balance - v_required;
    v_codes := v_codes || v_code;
  END LOOP;

  RETURN jsonb_build_object(
    'awarded', v_inserted > 0, 'balance', v_balance, 'required', v_required, 'vouchers', to_jsonb(v_codes));
END;
$function$;

-- Undoes a voided or refunded sale's loyalty effects. Safe to call more than once.
--   * its stamp is reversed;
--   * reward vouchers it triggered are voided if still unused, and their stamps restored;
--   * a voucher it redeemed is given back to the member.
CREATE OR REPLACE FUNCTION public.loyalty_reverse_sale(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tx       public.transactions;
  v_earn     public.loyalty_ledger;
  v_reward   RECORD;
  v_reversed INTEGER := 0;
  v_voided   INTEGER := 0;
  v_returned INTEGER := 0;
BEGIN
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('reversed', 0, 'voided', 0, 'returned', 0);
  END IF;

  IF v_tx.customer_id IS NOT NULL THEN
    PERFORM 1 FROM public.customers WHERE id = v_tx.customer_id FOR UPDATE;
  END IF;

  FOR v_earn IN
    SELECT * FROM public.loyalty_ledger WHERE transaction_id = v_tx.id AND reason = 'earn'
  LOOP
    INSERT INTO public.loyalty_ledger (tenant_id, program_id, customer_id, transaction_id, delta, reason)
      VALUES (v_earn.tenant_id, v_earn.program_id, v_earn.customer_id, v_tx.id, -v_earn.delta, 'reverse')
      ON CONFLICT DO NOTHING;
    IF FOUND THEN v_reversed := v_reversed + 1; END IF;
  END LOOP;

  FOR v_reward IN
    SELECT mv.id, mv.tenant_id, mv.program_id, mv.customer_id, l.delta
    FROM public.member_vouchers mv
    JOIN public.loyalty_ledger l ON l.voucher_id = mv.id AND l.reason = 'reward'
    WHERE mv.source_transaction_id = v_tx.id AND mv.status = 'issued'
    FOR UPDATE OF mv
  LOOP
    UPDATE public.member_vouchers
      SET status = 'void', voided_at = now(), void_reason = 'source sale voided or refunded'
      WHERE id = v_reward.id;
    INSERT INTO public.loyalty_ledger (tenant_id, program_id, customer_id, voucher_id, delta, reason)
      VALUES (v_reward.tenant_id, v_reward.program_id, v_reward.customer_id, v_reward.id, -v_reward.delta, 'restore');
    v_voided := v_voided + 1;
  END LOOP;

  UPDATE public.member_vouchers
    SET status = 'issued', redeemed_at = NULL, redeemed_transaction_id = NULL
    WHERE redeemed_transaction_id = v_tx.id AND status = 'redeemed';
  GET DIAGNOSTICS v_returned = ROW_COUNT;

  RETURN jsonb_build_object('reversed', v_reversed, 'voided', v_voided, 'returned', v_returned);
END;
$function$;

-- Claims a voucher for a sale about to be created. Locks the row, checks it is
-- the member's, unused, and unexpired, and marks it redeemed. The caller links
-- the sale with link_voucher_to_sale once it exists, or releases it with
-- release_member_voucher if the sale fails. Returns the voucher's reward.
CREATE OR REPLACE FUNCTION public.claim_member_voucher(p_tenant_id UUID, p_customer_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
  v public.member_vouchers;
BEGIN
  SELECT * INTO v FROM public.member_vouchers
    WHERE tenant_id = p_tenant_id AND code = upper(btrim(p_code))
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'VOUCHER_NOT_FOUND'; END IF;
  IF v.customer_id <> p_customer_id THEN RAISE EXCEPTION 'VOUCHER_OTHER_CUSTOMER'; END IF;
  IF v.status <> 'issued' THEN RAISE EXCEPTION 'VOUCHER_NOT_AVAILABLE'; END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN RAISE EXCEPTION 'VOUCHER_EXPIRED'; END IF;

  UPDATE public.member_vouchers SET status = 'redeemed', redeemed_at = now() WHERE id = v.id;
  RETURN jsonb_build_object('id', v.id, 'code', v.code, 'reward', v.reward);
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_voucher_to_sale(p_voucher_id UUID, p_transaction_id UUID)
RETURNS VOID
LANGUAGE sql
AS $function$
  UPDATE public.member_vouchers SET redeemed_transaction_id = p_transaction_id
    WHERE id = p_voucher_id AND status = 'redeemed' AND redeemed_transaction_id IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.release_member_voucher(p_voucher_id UUID)
RETURNS VOID
LANGUAGE sql
AS $function$
  UPDATE public.member_vouchers SET status = 'issued', redeemed_at = NULL
    WHERE id = p_voucher_id AND status = 'redeemed' AND redeemed_transaction_id IS NULL;
$function$;

-- Only the server (service role) may call these.
REVOKE ALL ON FUNCTION public.loyalty_award_stamps(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.loyalty_reverse_sale(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_member_voucher(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_voucher_to_sale(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_member_voucher(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_award_stamps(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.loyalty_reverse_sale(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_member_voucher(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_voucher_to_sale(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_member_voucher(UUID) TO service_role;
