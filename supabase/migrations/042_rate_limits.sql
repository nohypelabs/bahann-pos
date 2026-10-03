-- 042_rate_limits.sql
-- Postgres-backed rate limiting.
--
-- Replaces the Redis (Upstash) implementation. That version failed open whenever
-- the cache was unreachable, which silently disabled brute-force protection on
-- login: a dead Redis meant unlimited password guesses. Postgres is already a
-- hard dependency of this application, so it cannot fail unnoticed in the same
-- way — and login already requires a database read to verify credentials.
--
-- One row per key, updated in place, so table growth is bounded by the number of
-- distinct keys (email addresses, IPs) rather than by request volume.

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text        PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        integer     NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rate_limits IS
  'Sliding-window counters for API rate limiting. One row per key, updated in place.';

-- Supports periodic cleanup of keys whose window expired long ago.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

-- RLS is enabled with no policies on purpose: only the service role (which has
-- BYPASSRLS) may touch these counters, so anon/authenticated clients can neither
-- read nor forge them.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically increment the counter for a key and report whether the caller is
-- still within the window. Safe under concurrent requests: the ON CONFLICT
-- update locks the single row for the key before evaluating the CASE.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key            text,
  p_window_seconds integer,
  p_max_requests   integer
)
RETURNS TABLE (allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now    timestamptz := now();
  v_window interval    := make_interval(secs => p_window_seconds);
  v_row    public.rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limits AS rl (key, window_start, count, updated_at)
  VALUES (p_key, v_now, 1, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN rl.window_start <= v_now - v_window THEN 1
          ELSE rl.count + 1
        END,
        window_start = CASE
          WHEN rl.window_start <= v_now - v_window THEN v_now
          ELSE rl.window_start
        END,
        updated_at = v_now
  RETURNING * INTO v_row;

  RETURN QUERY
    SELECT v_row.count <= p_max_requests,
           GREATEST(p_max_requests - v_row.count, 0),
           v_row.window_start + v_window;
END;
$$;

-- Supabase grants EXECUTE/table privileges to anon and authenticated by default
-- (via ALTER DEFAULT PRIVILEGES), so revoking from PUBLIC alone is not enough.
-- Without this, any client holding the public anon key could call the function
-- over PostgREST and inflate counters to lock other users out of login.
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;

COMMIT;
