-- Phase M / #119: enforce signup policy at the Supabase Auth boundary.
-- 1. before_user_created hook rejects disposable email domains for ANY caller of /auth/v1/signup
--    (the Next.js route is not an authoritative boundary).
-- 2. staff_mfa_required rollout flag (off): see app/lib/staff-mfa.ts.
-- The hook must also be enabled per project (Auth > Hooks); see
-- docs/runbooks/supabase-auth-production-checklist.md.
begin;

create table if not exists public.disposable_email_domains (
  domain text primary key check (domain = lower(domain))
);

-- RLS on, no policies: only the definer function below (and service role) can read it.
alter table public.disposable_email_domains enable row level security;

insert into public.disposable_email_domains (domain) values
  ('10minutemail.com'), ('10minutemail.net'), ('burnermail.io'), ('discard.email'), ('dispostable.com'),
  ('dropmail.me'), ('emailfake.com'), ('emailondeck.com'), ('fakeinbox.com'), ('fakemail.net'),
  ('getnada.com'), ('grr.la'), ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'),
  ('guerrillamailblock.com'), ('harakirimail.com'), ('inboxkitten.com'), ('jetable.org'), ('mail.tm'),
  ('mailcatch.com'), ('maildrop.cc'), ('mailinator.com'), ('mailnesia.com'), ('minuteinbox.com'),
  ('mintemail.com'), ('moakt.com'), ('mohmal.com'), ('mytemp.email'), ('nada.email'),
  ('owlymail.com'), ('sharklasers.com'), ('spambox.us'), ('spamgourmet.com'), ('temp-mail.io'),
  ('temp-mail.org'), ('tempinbox.com'), ('tempmail.com'), ('tempmailo.com'), ('tempr.email'),
  ('throwawaymail.com'), ('tmpmail.net'), ('tmpmail.org'), ('trashmail.com'), ('trashmail.net'),
  ('yopmail.com'), ('yopmail.fr'),
  ('1secmail.com'), ('33mail.com'), ('mail7.io'), ('mailsac.com'), ('pokemail.net'), ('spam4.me')
on conflict (domain) do nothing;

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_domain text := lower(split_part(coalesce(event -> 'user' ->> 'email', ''), '@', 2));
  restricted boolean;
begin
  select f.enabled into restricted from public.platform_feature_flags f where f.key = 'login_restricted';
  if coalesce(restricted, false) then
    return jsonb_build_object(
      'error', jsonb_build_object('message', 'Sign-ups are temporarily unavailable.', 'http_code', 403)
    );
  end if;

  -- A listed domain, or any subdomain of one, is rejected. A missing/empty domain
  -- matches nothing; sign-up without an email is already disabled in Auth config.
  if email_domain <> '' and exists (
    select 1 from public.disposable_email_domains d
    where email_domain = d.domain or email_domain like '%.' || d.domain
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Disposable email addresses are blocked. Use a permanent address.',
        'http_code', 400
      )
    );
  end if;
  return '{}'::jsonb;
end;
$$;

revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;

insert into public.platform_feature_flags (key, enabled, description)
values ('staff_mfa_required', false, 'Require AAL2 (verified TOTP) for admin/manager sessions. Enable only after staff have enrolled a factor.')
on conflict (key) do nothing;

commit;
