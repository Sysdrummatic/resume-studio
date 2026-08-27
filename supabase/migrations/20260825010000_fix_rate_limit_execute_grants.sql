-- Fixes an execute-grant gap in 20260825000000_distributed_rate_limiting.sql.
--
-- `revoke all on function ... from public` only revokes the implicit PUBLIC
-- grant. It does NOT touch role-specific grants, and Supabase provisions
-- every project with an ALTER DEFAULT PRIVILEGES rule that auto-grants
-- EXECUTE on newly created public-schema functions to anon, authenticated,
-- AND service_role at creation time — independent of any explicit grant in
-- the migration. Confirmed live on prod: anon/authenticated had EXECUTE on
-- check_rate_limit despite the previous migration's revoke/grant pair.
--
-- Since check_rate_limit is SECURITY DEFINER, anon/authenticated execute
-- access is an RLS bypass: a client could call it directly via PostgREST to
-- read or poison any rate_limit_counters row by key (e.g. pre-exhausting
-- another user's `signin-email:*` counter as a denial-of-service, or probing
-- counts for other users/IPs) even though RLS blocks direct table access.

begin;

revoke execute on function public.check_rate_limit(text, bigint, integer) from anon, authenticated, public;
grant execute on function public.check_rate_limit(text, bigint, integer) to service_role;

commit;
