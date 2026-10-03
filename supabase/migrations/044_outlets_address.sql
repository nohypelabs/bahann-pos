-- 044_outlets_address.sql
-- Restore the outlets.address column that the application already expects.
--
-- Six queries selected `outlets.address` while the column never existed, and
-- PostgREST answers a missing column with error 42703 instead of ignoring it — so
-- those queries failed outright rather than returning partial data:
--
--   * getTenantDetail        → the platform tenant page showed 0 outlets, 0 users,
--                              0 transactions and Rp 0 for every tenant
--   * transactions list      → no outlet name on any row
--   * cash sessions/shifts   → the joined outlet was dropped
--   * stock alerts           → outlet names missing
--   * outlet name search     → `address.ilike` made the filter error
--
-- The column is also read by the POS outlet picker, the warehouse pages and the
-- printed receipt, so the intent was clearly for outlets to have an address; it
-- was simply never created. Adding it fixes all of those call sites at once.
--
-- Nothing writes a value yet, so existing rows are NULL and the UI — which guards
-- every render with `{outlet.address && ...}` — stays unchanged until addresses
-- are captured.

BEGIN;

ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS address text;

COMMENT ON COLUMN public.outlets.address IS
  'Street address shown on outlet pickers, warehouse pages and printed receipts.';

COMMIT;
