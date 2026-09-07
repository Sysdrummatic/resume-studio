-- Only profiles created after this migration are enrolled. Existing accounts
-- deliberately have no row, even when their Master Resume is still empty.
create table public.resume_onboarding (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'completed')),
  step integer not null default 0 check (step between 0 and 14),
  locale text not null default 'en' check (locale ~ '^[a-z]{2}$'),
  method text not null default 'scratch' check (method in ('scratch', 'import')),
  imported boolean not null default false,
  ui_language text not null default 'en' check (ui_language in ('en', 'pl')),
  first_preset_id uuid references public.resume_presets(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.resume_onboarding enable row level security;
revoke all on public.resume_onboarding from anon, authenticated;
grant select, update on public.resume_onboarding to authenticated;
grant all on public.resume_onboarding to service_role;

create policy resume_onboarding_read_own on public.resume_onboarding
  for select to authenticated using (user_id = (select auth.uid()));
create policy resume_onboarding_update_own on public.resume_onboarding
  for update to authenticated using (user_id = (select auth.uid()) and status <> 'completed')
  with check (user_id = (select auth.uid()) and (
    first_preset_id is null or exists (
      select 1 from public.resume_presets p where p.id = first_preset_id and p.user_id = (select auth.uid())
    )
  ));

create trigger resume_onboarding_updated_at before update on public.resume_onboarding
  for each row execute function public.touch_updated_at();

create function public.enroll_resume_onboarding() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.resume_onboarding(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function public.enroll_resume_onboarding() from public, anon, authenticated;
create trigger enroll_resume_onboarding after insert on public.profiles
  for each row execute function public.enroll_resume_onboarding();

-- The row lock makes retries and concurrent tabs reserve the same CV version.
-- SECURITY INVOKER preserves the existing document/preset RLS boundaries.
create function public.reserve_onboarding_preset(input_locale text, input_selection jsonb, input_title text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  onboarding public.resume_onboarding%rowtype;
  document_id uuid;
  preset_id uuid;
  already_public boolean;
begin
  select * into onboarding from public.resume_onboarding where user_id = auth.uid() for update;
  if not found then raise exception 'Onboarding is unavailable'; end if;
  if onboarding.first_preset_id is not null then
    select p.is_public into already_public from public.resume_presets p
      where p.id = onboarding.first_preset_id and p.user_id = auth.uid() for update;
    if not already_public then
      if input_locale <> onboarding.locale then raise exception 'CV language cannot change during publication'; end if;
      update public.resume_presets set selection = input_selection where id = onboarding.first_preset_id;
      update public.resume_preset_variants set selection = input_selection
        where resume_preset_variants.preset_id = onboarding.first_preset_id and locale = input_locale;
    end if;
    return onboarding.first_preset_id;
  end if;
  if onboarding.status = 'completed' then raise exception 'Onboarding is complete'; end if;
  select d.id into document_id from public.resume_documents d where d.user_id = auth.uid() and d.locale = input_locale;
  if document_id is null then raise exception 'Master Resume is unavailable'; end if;
  insert into public.resume_presets(document_id, user_id, title, selection, default_locale, is_public, allow_indexing)
    values (document_id, auth.uid(), input_title, input_selection, input_locale, false, false)
    returning id into preset_id;
  update public.resume_onboarding set first_preset_id = preset_id, locale = input_locale where user_id = auth.uid();
  return preset_id;
end;
$$;
revoke all on function public.reserve_onboarding_preset(text, jsonb, text) from public, anon;
grant execute on function public.reserve_onboarding_preset(text, jsonb, text) to authenticated;
