-- 059: tenant isolation hardening (audit of 25 Nov 2026).
--
-- 1. stock_sales_monitor was a view (made by hand, never in a migration, unused by
--    the app) joining daily_stock, products, outlets and daily_sales of EVERY tenant.
--    Views run with their owner's rights, so it skipped RLS, and the anon role could
--    read it with the public anon key. Dropped.
-- 2. One on-chain transfer pays for one plan request: crypto_tx_hash is unique.
--
-- Safe to re-run.

DROP VIEW IF EXISTS public.stock_sales_monitor;

CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_crypto_tx_hash_key
  ON public.payment_requests (crypto_tx_hash)
  WHERE crypto_tx_hash IS NOT NULL;
