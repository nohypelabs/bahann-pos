-- Phase 0: Emergency Security Patch
-- Enable RLS + Revoke public grants on sensitive tables
-- These tables are accessed via service role (backend only), not via Supabase client.
--
-- Affected tables:
--   bank_accounts, payment_confirmations, payment_methods, payments,
--   qris_config, wa_templates, password_reset_tokens, refresh_tokens
--
-- Risk: anon/authenticated roles have FULL CRUD+TRUNCATE grants.
-- If anon key is exposed, anyone can read/write payment config, QRIS data,
-- bank accounts, passwords tokens, and refresh tokens.
--
-- Fix: Enable RLS, revoke all grants, add deny-all policies.
-- Backend uses supabaseAdmin (service role key) which bypasses RLS.

BEGIN;

-- ============================================================
-- 1. Enable RLS on 6 tables that currently have it disabled
-- ============================================================
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qris_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Revoke ALL grants from anon and authenticated on all 8 tables
-- ============================================================
REVOKE ALL ON public.bank_accounts FROM anon, authenticated;
REVOKE ALL ON public.payment_confirmations FROM anon, authenticated;
REVOKE ALL ON public.payment_methods FROM anon, authenticated;
REVOKE ALL ON public.payments FROM anon, authenticated;
REVOKE ALL ON public.qris_config FROM anon, authenticated;
REVOKE ALL ON public.wa_templates FROM anon, authenticated;
REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated;
REVOKE ALL ON public.refresh_tokens FROM anon, authenticated;

-- ============================================================
-- 3. Add deny-all policies (defense in depth)
-- Even though grants are revoked, RLS policies provide second layer.
-- ============================================================

-- bank_accounts: backend-only
CREATE POLICY "bank_accounts_deny_all" ON public.bank_accounts
  FOR ALL TO public
  USING (false);

-- payment_confirmations: backend-only
CREATE POLICY "payment_confirmations_deny_all" ON public.payment_confirmations
  FOR ALL TO public
  USING (false);

-- payment_methods: allow read for authenticated (needed for POS)
-- but deny write from client
CREATE POLICY "payment_methods_read_only" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "payment_methods_deny_write" ON public.payment_methods
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);

-- payments: backend-only
CREATE POLICY "payments_deny_all" ON public.payments
  FOR ALL TO public
  USING (false);

-- qris_config: backend-only
CREATE POLICY "qris_config_deny_all" ON public.qris_config
  FOR ALL TO public
  USING (false);

-- wa_templates: backend-only
CREATE POLICY "wa_templates_deny_all" ON public.wa_templates
  FOR ALL TO public
  USING (false);

-- password_reset_tokens: backend-only (REVOKE already done above)
-- No policy needed since grants are revoked, but add for defense-in-depth
CREATE POLICY "password_reset_tokens_deny_all" ON public.password_reset_tokens
  FOR ALL TO public
  USING (false);

-- refresh_tokens: allow read/delete own tokens only
-- (needed for logout flow if client-side, otherwise revoke is enough)
-- Since we already revoked all grants, this is defense-in-depth
CREATE POLICY "refresh_tokens_deny_all" ON public.refresh_tokens
  FOR ALL TO public
  USING (false);

-- ============================================================
-- 4. Verify: grant SELECT back to authenticated for read-only tables
-- These tables need to be readable by the app via client if needed.
-- payment_methods is the only one that might need client-side read.
-- ============================================================
-- Note: We already revoked ALL. If any table needs authenticated read,
-- grant it back here. For now, all these tables are backend-only.

COMMIT;
