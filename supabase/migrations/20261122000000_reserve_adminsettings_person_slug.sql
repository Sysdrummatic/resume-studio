-- /adminsettings (#291) is a new top-level route, so its name joins the reserved person slugs:
-- a profile with that slug would have its LiveCV link /{slug}/{publicId} shadowed by the route.
-- Same function as 20261016000000_reserve_route_person_slugs.sql, list extended; no data changes
-- (checked: no profile on test holds the slug).
-- Keep the list in step with RESERVED_PERSON_SLUGS in app/lib/ai-bots.ts
-- (tests/ai-bots-policy.test.mjs fails on drift).

create or replace function public.assign_profile_person_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_slugs constant text[] := array[
    'admin', 'adminsettings', 'animations', 'api', 'components', 'cv-templates', 'dashboard', 'data',
    'docs', 'fonts', 'i18n', 'images', 'lib', 'login', 'master-resume', 'onboarding',
    'privacy', 'resume', 'settings', 'terms', 'user', 'vendor'
  ];
  base_slug text;
  candidate_slug text;
  suffix integer := 0;
begin
  if new.person_slug is not null and (
    tg_op = 'INSERT'
    or old.person_slug is null
    or new.person_slug is distinct from old.person_slug
  ) then
    base_slug := public.normalize_person_slug(new.person_slug);
  elsif tg_op = 'UPDATE' and old.person_slug is not null then
    base_slug := old.person_slug;
  else
    base_slug := public.profile_compact_person_slug(new.first_name, new.last_name, coalesce(new.display_name, new.id::text));
  end if;

  candidate_slug := left(base_slug, 80);

  while candidate_slug = any(reserved_slugs) or exists (
    select 1
    from public.profiles p
    where p.person_slug = candidate_slug
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate_slug := concat(left(base_slug, greatest(3, 79 - char_length(suffix::text))), '-', suffix::text);
  end loop;

  new.person_slug := candidate_slug;
  return new;
end;
$$;
