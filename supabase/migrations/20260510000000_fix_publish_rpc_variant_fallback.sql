-- Fix: Relax publish_resume_saved_version to allow missing variants (fallback to base selection).
-- Also improves error reporting by allowing exceptions to propagate (already standard behavior).

create or replace function public.publish_resume_saved_version(
  input_preset_id uuid,
  input_allow_indexing boolean default false,
  input_ai_generated boolean default false,
  input_default_locale text default null,
  input_selected_locales text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  preset_row public.resume_presets%rowtype;
  snapshot_id uuid;
  active_link public.resume_public_links%rowtype;
  revoked_link public.resume_public_links%rowtype;
  normalized_default_locale text;
  normalized_selected_locales text[];
  legacy_slug_value text;
  inserted_locales_count integer;
  open_cv_contract_version constant text := '1';
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if input_selected_locales is null or cardinality(input_selected_locales) = 0 then
    raise exception 'At least one selected locale is required for publish.';
  end if;

  select *
  into preset_row
  from public.resume_presets
  where id = input_preset_id
    and user_id = actor_id
  for update;

  if preset_row.id is null then
    raise exception 'Saved Version not found.';
  end if;

  -- Normalize selected locales
  normalized_selected_locales := array(
    select distinct lower(trim(code))
    from unnest(input_selected_locales) as locale_value(code)
    where code is not null
      and btrim(code) <> ''
      and public.is_resume_locale(lower(trim(code)))
    order by lower(trim(code))
  );

  if normalized_selected_locales is null or cardinality(normalized_selected_locales) = 0 then
    raise exception 'Selected locales are invalid.';
  end if;

  -- Normalize default locale
  normalized_default_locale := lower(trim(coalesce(input_default_locale, preset_row.default_locale, 'en')));
  if not public.is_resume_locale(normalized_default_locale) then
    raise exception 'Default locale is invalid.';
  end if;

  if not normalized_default_locale = any(normalized_selected_locales) then
    raise exception 'Default locale must be included in selected locales.';
  end if;

  -- Verification: Check if all selected locales have a document
  if exists (
    select 1
    from unnest(normalized_selected_locales) as locale_value(code)
    where not exists (
      select 1
      from public.resume_documents d
      where d.user_id = actor_id
        and lower(d.locale) = locale_value.code
    )
  ) then
    raise exception 'Each selected locale must map to an owned document.';
  end if;

  -- YAML Validation
  if exists (
    select 1
    from public.resume_documents d
    where d.user_id = actor_id
      and lower(d.locale) = any(normalized_selected_locales)
      and not public.validate_resume_document_yaml(d.yaml_content)
  ) then
    raise exception 'Publish failed: one or more selected YAML documents are invalid.';
  end if;

  -- Create Published CV (Snapshot)
  insert into public.resume_published_cvs (
    user_id,
    preset_id,
    source_document_id,
    title,
    schema_version,
    open_cv_yaml_contract_version,
    default_locale,
    published_locales,
    available_locales,
    selection,
    allow_indexing,
    published_at,
    created_by,
    snapshot_metadata
  )
  values (
    actor_id,
    preset_row.id,
    preset_row.document_id,
    preset_row.title,
    1,
    open_cv_contract_version,
    normalized_default_locale,
    normalized_selected_locales,
    normalized_selected_locales,
    preset_row.selection,
    coalesce(input_allow_indexing, false),
    now(),
    actor_id,
    jsonb_build_object('source', 'preset-publish-rpc', 'ai_generated', coalesce(input_ai_generated, false))
  )
  returning id into snapshot_id;

  -- Create Snapshots for each Locale (with Fallback to base selection if variant missing)
  insert into public.resume_published_cv_locales (
    published_cv_id,
    user_id,
    locale,
    source_document_id,
    source_variant_id,
    title,
    yaml_content,
    schema_version,
    selection,
    labels,
    ai_generated
  )
  select
    snapshot_id,
    actor_id,
    lower(d.locale),
    d.id,
    rpv.id, -- null if missing
    preset_row.title,
    d.yaml_content,
    coalesce(d.schema_version, 1),
    coalesce(rpv.selection, preset_row.selection), -- FALLBACK to base selection
    '{}'::jsonb,
    coalesce(input_ai_generated, false)
  from public.resume_documents d
  left join public.resume_preset_variants rpv on rpv.document_id = d.id and rpv.preset_id = preset_row.id
  where d.user_id = actor_id
    and lower(d.locale) = any(normalized_selected_locales);

  get diagnostics inserted_locales_count = row_count;
  if inserted_locales_count <> cardinality(normalized_selected_locales) then
    raise exception 'Snapshot locale row count mismatch (expected %, got %).', cardinality(normalized_selected_locales), inserted_locales_count;
  end if;

  -- Manage Public Link
  select *
  into active_link
  from public.resume_public_links
  where user_id = actor_id
    and preset_id = preset_row.id
    and is_active = true
    and status = 'active'
  order by updated_at desc
  limit 1
  for update;

  if active_link.id is not null then
    update public.resume_public_links
    set
      active_published_cv_id = snapshot_id,
      default_locale = normalized_default_locale,
      available_locales = normalized_selected_locales,
      allow_indexing = coalesce(input_allow_indexing, false),
      is_active = true,
      status = 'active',
      published_at = now(),
      revoked_at = null,
      updated_at = now()
    where id = active_link.id;
  else
    select *
    into revoked_link
    from public.resume_public_links
    where user_id = actor_id
      and preset_id = preset_row.id
      and status = 'revoked'
    order by updated_at desc
    limit 1;

    legacy_slug_value := coalesce(preset_row.slug, concat('p-', substring(replace(gen_random_uuid()::text, '-', ''), 1, 14)));

    insert into public.resume_public_links (
      document_id,
      user_id,
      preset_id,
      slug,
      legacy_slug,
      public_id,
      active_published_cv_id,
      default_locale,
      available_locales,
      allow_indexing,
      is_active,
      status,
      published_at,
      revoked_at
    )
    values (
      preset_row.document_id,
      actor_id,
      preset_row.id,
      legacy_slug_value,
      coalesce(revoked_link.legacy_slug, legacy_slug_value),
      null,
      snapshot_id,
      normalized_default_locale,
      normalized_selected_locales,
      coalesce(input_allow_indexing, false),
      true,
      'active',
      now(),
      null
    );
  end if;

  -- Update Preset Metadata
  update public.resume_presets
  set
    is_public = true,
    allow_indexing = coalesce(input_allow_indexing, false),
    ai_generated = coalesce(input_ai_generated, false),
    default_locale = normalized_default_locale,
    slug = coalesce(preset_row.slug, concat('p-', substring(replace(gen_random_uuid()::text, '-', ''), 1, 14))),
    published_at = now(),
    updated_at = now()
  where id = preset_row.id;

  update public.resume_preset_variants
  set
    is_default = (lower(locale) = normalized_default_locale),
    updated_at = now()
  where preset_id = preset_row.id
    and user_id = actor_id;

  return snapshot_id;
end;
$$;
