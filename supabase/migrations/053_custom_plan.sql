-- 053_custom_plan.sql
--
-- Adds the 'custom' plan for contract clients (first: Mr Bengkel). Their terms,
-- price and period live in a signed contract, not in the website's plans, so:
--   * both plan CHECK constraints accept 'custom';
--   * grant_plan('custom') sets no end date, so effective_plan() never drops the
--     client to 'free' on its own. Late payment is handled by hand under the
--     contract (14-day grace and a written reminder), not by the 3-day plan grace.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE public.users ADD CONSTRAINT valid_plan
  CHECK (plan IN ('free', 'warung', 'starter', 'professional', 'business', 'enterprise', 'custom'));

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free', 'warung', 'starter', 'professional', 'business', 'enterprise', 'custom'));

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

  -- 'free' never ends; 'custom' ends only when the contract does, by hand.
  IF p_plan IN ('free', 'custom') THEN
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

-- CREATE OR REPLACE keeps existing grants; restate them so this file stands alone.
REVOKE ALL ON FUNCTION public.grant_plan(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_plan(uuid, text, integer) TO service_role;
