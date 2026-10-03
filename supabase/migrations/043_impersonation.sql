-- 043_impersonation.sql
-- Superadmin impersonation ("masuk sebagai tenant").
--
-- A platform superadmin can enter a tenant's context to support it, without
-- borrowing that tenant's credentials. The superadmin's own access token is never
-- replaced: it stays the immutable root identity in the `auth_token` cookie, and
-- this session row — referenced by an httpOnly overlay cookie — is applied as a
-- reversible projection on every request. Deleting the cookie restores the
-- superadmin instantly, so an operator can never be stranded mid-session, and the
-- refresh-token flow needs no special case.
--
-- The overlay cookie carries only this row's id. Tenant, target user and role are
-- resolved from the database on every request, so a tampered or stale cookie
-- cannot widen access.
--
-- The project's own multi-tenant audit (audit-pos-multi-tenant-28-outlet.md:900)
-- requires recording: super_admin_user_id, tenant_id, reason, started_at,
-- ended_at, and the actions performed. This table holds the first five;
-- audit_logs.impersonation_id carries the last.

BEGIN;

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  impersonator_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  target_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason          text NOT NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  ended_at        timestamptz,
  ended_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  end_reason      text,
  ip_address      varchar(45),
  user_agent      text,
  CONSTRAINT impersonation_sessions_reason_len CHECK (char_length(reason) <= 500)
);

COMMENT ON TABLE public.impersonation_sessions IS
  'Superadmin support sessions scoped to one tenant. A reversible overlay on top of the superadmin JWT.';

-- Hot path: every authenticated request while impersonating looks up the single
-- open session for the superadmin.
CREATE INDEX IF NOT EXISTS idx_impersonation_active
  ON public.impersonation_sessions (impersonator_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_impersonation_tenant
  ON public.impersonation_sessions (tenant_id, started_at DESC);

-- RLS enabled with no policies: only service_role (BYPASSRLS) may touch these
-- rows. Supabase grants privileges to anon/authenticated by default, so revoke
-- them explicitly — revoking from PUBLIC alone is not enough (see 042).
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.impersonation_sessions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.impersonation_sessions TO service_role;

-- audit_logs.actor_user_id / actor_role_key already exist (038_audit_inventory_hardening)
-- and already mean "the real actor, which may differ from user_id" — exactly the
-- field impersonation needs, so it is reused rather than duplicated. All that is
-- missing is the link back to the session, which lets the audit trail answer
-- "which actions were performed during this impersonation".
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS impersonation_id uuid;

COMMENT ON COLUMN public.audit_logs.impersonation_id IS
  'Set when the action was performed inside a superadmin impersonation session.';

CREATE INDEX IF NOT EXISTS idx_audit_logs_impersonation
  ON public.audit_logs (impersonation_id)
  WHERE impersonation_id IS NOT NULL;

-- audit_logs.tenant_id was NOT NULL while createAuditLog never populated it, so
-- every audit insert failed silently and the audit trail stayed completely empty
-- — including login and every privileged action. Widening the column means a
-- platform or system event is still recorded even when there is no tenant.
ALTER TABLE public.audit_logs ALTER COLUMN tenant_id DROP NOT NULL;

COMMIT;
