-- Route own profile edits through a narrow RPC to avoid recursive profiles RLS policies.
begin;

create or replace function public.update_own_profile(input_updates jsonb)
returns table (
  id uuid,
  display_name text,
  first_name text,
  last_name text,
  person_slug text,
  name_sync_mode text,
  avatar_url text,
  bio text,
  role text,
  is_active boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  normalized_first_name text;
  normalized_last_name text;
  normalized_display_name text;
  normalized_bio text;
  normalized_avatar_url text;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if input_updates is null or jsonb_typeof(input_updates) <> 'object' then
    raise exception 'Invalid profile update payload.';
  end if;

  if input_updates ? 'firstName' or input_updates ? 'lastName' then
    normalized_first_name := nullif(btrim(coalesce(input_updates ->> 'firstName', '')), '');
    normalized_last_name := nullif(btrim(coalesce(input_updates ->> 'lastName', '')), '');

    if char_length(coalesce(normalized_first_name, '')) > 120 then
      raise exception 'First name must be 120 characters or fewer.';
    end if;

    if char_length(coalesce(normalized_last_name, '')) > 120 then
      raise exception 'Last name must be 120 characters or fewer.';
    end if;

    normalized_display_name := nullif(btrim(concat_ws(' ', normalized_first_name, normalized_last_name)), '');
    if normalized_display_name is null then
      raise exception 'First name or last name is required.';
    end if;
  elsif input_updates ? 'displayName' then
    normalized_display_name := nullif(btrim(input_updates ->> 'displayName'), '');
  end if;

  if input_updates ? 'bio' then
    normalized_bio := input_updates ->> 'bio';
  end if;

  if input_updates ? 'avatarUrl' then
    normalized_avatar_url := input_updates ->> 'avatarUrl';
    if normalized_avatar_url is not null and (
      char_length(normalized_avatar_url) > 500000
      or normalized_avatar_url !~ '^data:image/'
    ) then
      raise exception 'Avatar image payload is invalid.';
    end if;
  end if;

  return query
  update public.profiles p
  set
    first_name = case when input_updates ? 'firstName' or input_updates ? 'lastName' then normalized_first_name else p.first_name end,
    last_name = case when input_updates ? 'firstName' or input_updates ? 'lastName' then normalized_last_name else p.last_name end,
    display_name = coalesce(normalized_display_name, p.display_name),
    name_sync_mode = case when input_updates ? 'firstName' or input_updates ? 'lastName' then 'manual' else p.name_sync_mode end,
    bio = case when input_updates ? 'bio' then normalized_bio else p.bio end,
    avatar_url = case when input_updates ? 'avatarUrl' then normalized_avatar_url else p.avatar_url end,
    updated_at = now()
  where p.id = actor_id
  returning
    p.id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.person_slug,
    p.name_sync_mode,
    p.avatar_url,
    p.bio,
    p.role,
    p.is_active,
    p.updated_at;
end;
$$;

grant execute on function public.update_own_profile(jsonb) to authenticated;

commit;
