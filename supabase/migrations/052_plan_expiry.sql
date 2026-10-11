-- 052_plan_expiry.sql
--
-- Paid plans had no end date: approving a payment wrote users.plan and it stayed
-- forever, so a monthly subscription was effectively a one-off lifetime purchase.
-- Trials ended only when a daily cron rewrote users.plan, so access outlived the
-- trial by up to a day, and indefinitely if the cron failed.
--
-- Access is now decided in the database:
--   * users.plan_expires_at   end of the paid period (NULL for free/trial).
--   * effective_plan(users)   the plan a user may use right now. It falls back to
--                             'free' once the trial or paid period plus a 3-day
--                             grace period has passed. PostgREST exposes it as a
--                             computed column, so the app selects `effective_plan`.
--   * grant_plan(...)         the only way to grant or renew a plan: 30 days per
--                             payment, added to the remaining time when renewing
--                             the same plan early.
-- The cron keeps users.plan tidy and sends expiry emails, but no longer guards
-- access.

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.plan_grace_period()
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$ SELECT interval '3 days' $$;

CREATE OR REPLACE FUNCTION public.effective_plan(u public.users)
RETURNS text
LANGUAGE sql
STABLE
AS $function$
  SELECT CASE
    WHEN u.plan IS NULL OR u.plan = 'free' THEN 'free'
    WHEN u.is_trial AND u.trial_ends_at IS NOT NULL
         AND now() > u.trial_ends_at + public.plan_grace_period() THEN 'free'
    WHEN NOT COALESCE(u.is_trial, false) AND u.plan_expires_at IS NOT NULL
         AND now() > u.plan_expires_at + public.plan_grace_period() THEN 'free'
    ELSE u.plan
  END;
$function$;

-- When the user's current period (trial or paid) ends, before any grace.
CREATE OR REPLACE FUNCTION public.plan_period_ends_at(u public.users)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $function$
  SELECT CASE WHEN u.is_trial THEN u.trial_ends_at ELSE u.plan_expires_at END;
$function$;

-- Grants or renews a plan and returns the new expiry. Renewing the same, still
-- valid paid plan extends from its current expiry (remaining days are kept);
-- anything else starts a fresh period now. 'free' clears the period.
CREATE OR REPLACE FUNCTION public.grant_plan(p_user_id uuid, p_plan text, p_days integer DEFAULT 30)
RETURNS timestamptz
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user public.users;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  IF p_plan = 'free' THEN
    v_expires := NULL;
  ELSIF v_user.plan = p_plan
        AND NOT COALESCE(v_user.is_trial, false)
        AND v_user.plan_expires_at IS NOT NULL
        AND v_user.plan_expires_at > now() THEN
    v_expires := v_user.plan_expires_at + make_interval(days => p_days);
  ELSE
    v_expires := now() + make_interval(days => p_days);
  END IF;

  UPDATE public.users
  SET plan = p_plan,
      is_trial = false,
      trial_ends_at = NULL,
      plan_expires_at = v_expires
  WHERE id = p_user_id;

  -- Keep the tenant's copy in step for the tenant this user owns.
  UPDATE public.tenants SET plan = p_plan WHERE owner_user_id = p_user_id;

  RETURN v_expires;
END;
$function$;

REVOKE ALL ON FUNCTION public.grant_plan(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_plan(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.effective_plan(public.users) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plan_period_ends_at(public.users) TO authenticated, service_role;

-- Paid plans granted before this migration never had a period; start one now so
-- they cannot stay paid forever.
UPDATE public.users
SET plan_expires_at = now() + interval '30 days'
WHERE plan IS NOT NULL AND plan <> 'free'
  AND NOT COALESCE(is_trial, false)
  AND plan_expires_at IS NULL;

-- Bring tenants.plan in line with the owner's plan.
UPDATE public.tenants t SET plan = u.plan
FROM public.users u
WHERE u.id = t.owner_user_id AND t.plan IS DISTINCT FROM u.plan;

NOTIFY pgrst, 'reload schema';
