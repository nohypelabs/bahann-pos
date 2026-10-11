-- 050_lock_remaining_definer_functions.sql
--
-- The last SECURITY DEFINER functions still executable by anon:
--
-- get_user_outlet_ids / user_has_permission take an arbitrary user id, so anon
--   could probe any user's outlets and permissions. RLS policies call them, but
--   every such policy is scoped TO authenticated, so they keep authenticated and
--   only lose anon/PUBLIC.
-- cleanup_expired_refresh_tokens deletes rows; the app calls it with the service
--   role only, so nothing else needs it.

REVOKE ALL ON FUNCTION public.get_user_outlet_ids(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_permission(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_outlet_ids(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, uuid, text, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_refresh_tokens() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_refresh_tokens() TO service_role;
