-- G-P0-05: distributed rate limiting (Phase G security gate).
--
-- Replaces the in-process Map limiter (app/lib/rate-limit.ts), which keeps a
-- separate counter per serverless instance and resets on every cold start.
-- Backed by Postgres rather than a new Redis/Upstash service: Supabase is
-- already an approved processor, so this needs no new env vars, no new
-- external dependency, and no processor/privacy review.
--
-- check_rate_limit() is a single atomic UPSERT — no read-then-write race
-- between concurrent requests hitting the same key from different instances.
-- Only the service role may call it (server-side route handlers only, via
-- callRpc({ useServiceRole: true }) in app/lib/supabase-http.ts); RLS denies
-- anon/authenticated access to the table directly.

begin;

create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_counters_reset_at_idx on public.rate_limit_counters(reset_at);

alter table public.rate_limit_counters enable row level security;

-- No policies: RLS defaults to deny for anon/authenticated. Only the
-- service-role key (which bypasses RLS) reads or writes this table, and only
-- through check_rate_limit() below.

create or replace function public.check_rate_limit(
  p_key text,
  p_interval_ms bigint,
  p_limit integer
)
returns table(allowed boolean, count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.rate_limit_counters as t (key, count, reset_at, updated_at)
  values (p_key, 1, v_now + make_interval(secs => p_interval_ms / 1000.0), v_now)
  on conflict (key) do update
    set count = case when t.reset_at <= v_now then 1 else t.count + 1 end,
        reset_at = case
          when t.reset_at <= v_now then v_now + make_interval(secs => p_interval_ms / 1000.0)
          else t.reset_at
        end,
        updated_at = v_now
  returning t.count, t.reset_at into v_count, v_reset;

  return query select (v_count <= p_limit), v_count, v_reset;
end;
$$;

revoke all on function public.check_rate_limit(text, bigint, integer) from public;
grant execute on function public.check_rate_limit(text, bigint, integer) to service_role;

commit;
