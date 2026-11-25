-- 058_manual_discounts.sql
--
-- Discounts a cashier gives by hand, each with a reason (src/domain/sales/manualDiscount.ts):
--
--   * a line sold below its list price: transaction_items keeps the list price at the
--     time of sale and the reason; service_order_items keeps the reason while the note
--     is open.
--   * an amount off the whole sale or service note: transactions.manual_discount (part of
--     discount_amount, next to promo and voucher discounts) and service_orders.manual_discount
--     while the note is open.
--
-- The manual discount report reads these columns.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS manual_discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS discount_note   TEXT;

ALTER TABLE public.transaction_items
  ADD COLUMN IF NOT EXISTS list_price      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS discount_note   TEXT;

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS manual_discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason TEXT,
  ADD COLUMN IF NOT EXISTS discount_note   TEXT;

ALTER TABLE public.service_order_items
  ADD COLUMN IF NOT EXISTS price_reason TEXT,
  ADD COLUMN IF NOT EXISTS price_note   TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_manual_discount_check') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_manual_discount_check
      CHECK (manual_discount >= 0 AND (manual_discount = 0 OR discount_reason IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_discount_reason_check') THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_discount_reason_check
      CHECK (discount_reason IS NULL OR discount_reason IN ('OWNER_POLICY', 'ROUNDING', 'DAMAGED', 'COMPLAINT', 'OTHER'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transaction_items_discount_reason_check') THEN
    ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_discount_reason_check
      CHECK (discount_reason IS NULL OR discount_reason IN ('OWNER_POLICY', 'ROUNDING', 'DAMAGED', 'COMPLAINT', 'OTHER'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_manual_discount_check') THEN
    ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_manual_discount_check
      CHECK (manual_discount >= 0 AND (manual_discount = 0 OR discount_reason IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_orders_discount_reason_check') THEN
    ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_discount_reason_check
      CHECK (discount_reason IS NULL OR discount_reason IN ('OWNER_POLICY', 'ROUNDING', 'DAMAGED', 'COMPLAINT', 'OTHER'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_order_items_price_reason_check') THEN
    ALTER TABLE public.service_order_items ADD CONSTRAINT service_order_items_price_reason_check
      CHECK (price_reason IS NULL OR price_reason IN ('OWNER_POLICY', 'ROUNDING', 'DAMAGED', 'COMPLAINT', 'OTHER'));
  END IF;
END $$;

-- The report looks up sales with a manual discount by tenant and time.
CREATE INDEX IF NOT EXISTS transactions_manual_discount_idx
  ON public.transactions (tenant_id, created_at DESC) WHERE manual_discount > 0;
CREATE INDEX IF NOT EXISTS transaction_items_discounted_idx
  ON public.transaction_items (tenant_id, transaction_id) WHERE discount_reason IS NOT NULL;
