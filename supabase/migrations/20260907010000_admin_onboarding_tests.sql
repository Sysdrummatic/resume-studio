create table public.resume_onboarding_test_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('pending','active','paused','completed')),
  auto_start boolean not null default false,
  step integer not null default 0 check (step between 0 and 14),
  locale text not null default 'en' check (locale in ('en','pl')),
  method text not null default 'scratch' check (method in ('scratch','import')),
  ui_language text not null default 'en' check (ui_language in ('en','pl')),
  imported boolean not null default false,
  drafts jsonb not null default '{}'::jsonb check (jsonb_typeof(drafts) = 'object' and octet_length(drafts::text) <= 600000),
  selections jsonb not null default '{}'::jsonb check (jsonb_typeof(selections) = 'object'),
  first_preset_id uuid references public.resume_presets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index resume_onboarding_test_one_open_run on public.resume_onboarding_test_runs(user_id) where status <> 'completed';
alter table public.resume_presets add column onboarding_test_run_id uuid references public.resume_onboarding_test_runs(id) on delete cascade;
create unique index resume_presets_one_per_onboarding_test on public.resume_presets(onboarding_test_run_id) where onboarding_test_run_id is not null;

alter table public.resume_onboarding_test_runs enable row level security;
revoke all on public.resume_onboarding_test_runs from anon, authenticated;
grant select on public.resume_onboarding_test_runs to authenticated;
grant all on public.resume_onboarding_test_runs to service_role;
create policy onboarding_test_read_own_admin on public.resume_onboarding_test_runs for select to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role::text = 'admin' and p.is_active));
create trigger onboarding_test_updated_at before update on public.resume_onboarding_test_runs
for each row execute function public.touch_updated_at();

create function public.require_onboarding_test_admin() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := auth.uid();
begin
  if actor_id is null or not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = actor_id and p.role::text = 'admin' and p.is_active and u.email_confirmed_at is not null
  ) then raise exception 'Active verified administrator required' using errcode = '42501'; end if;
  return actor_id;
end;
$$;
revoke all on function public.require_onboarding_test_admin() from public, anon;
grant execute on function public.require_onboarding_test_admin() to authenticated;

create function public.configure_onboarding_test(input_action text, input_expected_run_id uuid default null)
returns public.resume_onboarding_test_runs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := public.require_onboarding_test_admin(); run public.resume_onboarding_test_runs%rowtype;
begin
  if input_action not in ('arm','start','disarm','restart') then raise exception 'Invalid action'; end if;
  perform 1 from public.profiles where id = actor_id for update;
  select * into run from public.resume_onboarding_test_runs where user_id = actor_id order by created_at desc limit 1 for update;
  if input_action in ('restart','disarm') and run.id is distinct from input_expected_run_id then
    raise exception 'Test changed; reload settings';
  end if;
  if input_action = 'restart' and run.id is not null then
    update public.resume_onboarding_test_runs set status = 'completed', auto_start = false where id = run.id;
    run.status := 'completed';
  end if;
  if input_action = 'disarm' then
    if run.id is not null then
      update public.resume_onboarding_test_runs set auto_start = false,
        status = case when status = 'pending' then 'paused' else status end where id = run.id returning * into run;
    end if;
  elsif run.id is null or run.status = 'completed' then
    insert into public.resume_onboarding_test_runs(user_id, status, auto_start)
    values (actor_id, case when input_action = 'arm' then 'pending' else 'active' end, input_action = 'arm') returning * into run;
  else
    update public.resume_onboarding_test_runs set auto_start = input_action = 'arm',
      status = case when input_action = 'arm' then 'pending' else 'active' end where id = run.id returning * into run;
  end if;
  insert into public.admin_audit_logs(actor_user_id, action, target_user_id, metadata)
  values(actor_id, 'onboarding_test.' || input_action, actor_id, jsonb_build_object('run_id',run.id));
  return run;
end;
$$;

create function public.save_onboarding_test(input_run_id uuid, input_progress jsonb default null,
  input_locale text default null, input_yaml text default null, input_selection jsonb default null)
returns public.resume_onboarding_test_runs language plpgsql security definer set search_path = '' as $$
declare actor_id uuid := public.require_onboarding_test_admin(); run public.resume_onboarding_test_runs%rowtype;
begin
  select * into run from public.resume_onboarding_test_runs where id = input_run_id and user_id = actor_id for update;
  if not found then raise exception 'Test not found'; end if;
  if run.status = 'completed' then raise exception 'Test is complete'; end if;
  if input_yaml is not null then
    if input_locale not in ('en','pl') or input_locale is null or length(input_yaml) > 250000 or btrim(input_yaml) = ''
      or input_selection is null or jsonb_typeof(input_selection) <> 'object' then raise exception 'Invalid test draft'; end if;
    run.drafts := jsonb_set(run.drafts, array[input_locale], to_jsonb(input_yaml));
    run.selections := jsonb_set(run.selections, array[input_locale], input_selection);
  end if;
  if input_progress is not null then
    if input_progress->>'status' not in ('active','paused') then raise exception 'Invalid status'; end if;
    run.status := input_progress->>'status'; run.step := (input_progress->>'step')::integer;
    run.locale := input_progress->>'locale'; run.method := input_progress->>'method';
    run.ui_language := input_progress->>'ui_language'; run.imported := (input_progress->>'imported')::boolean;
  end if;
  update public.resume_onboarding_test_runs set status=run.status, step=run.step, locale=run.locale,
    method=run.method, ui_language=run.ui_language, imported=run.imported, drafts=run.drafts, selections=run.selections,
    auto_start=false where id=run.id returning * into run;
  return run;
end;
$$;

create function public.finish_onboarding_test(input_run_id uuid, input_publish boolean, input_republish boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := public.require_onboarding_test_admin(); run public.resume_onboarding_test_runs%rowtype;
  link public.resume_public_links%rowtype; anchor_id uuid; preset_id uuid; snapshot_id uuid;
  person_slug text; public_id text; legacy_slug text; content text; selected jsonb;
begin
  if input_publish is null then raise exception 'Publication choice required'; end if;
  select * into run from public.resume_onboarding_test_runs where id=input_run_id and user_id=actor_id for update;
  if not found then raise exception 'Test not found'; end if;
  select * into link from public.resume_public_links l where l.preset_id=run.first_preset_id and l.user_id=actor_id order by l.updated_at desc limit 1 for update;
  if run.status='completed' and not input_republish then
    return jsonb_build_object('publicPath',case when link.is_active and link.status='active' then '/'||link.person_slug||'/'||link.public_id else null end);
  end if;
  if input_publish then
    content := run.drafts->>run.locale; selected := run.selections->run.locale;
    if content is null or not public.validate_resume_document_yaml(content)
      or selected is null or coalesce(jsonb_array_length(selected->'summary'),0) <> 1 then raise exception 'Valid test CV required'; end if;
    -- The existing document is only an ownership anchor required by presets.
    -- Snapshot content comes exclusively from the test run; Master CV is never written.
    select id into anchor_id from public.resume_documents where user_id=actor_id order by created_at limit 1;
    if anchor_id is null then raise exception 'Account document is unavailable'; end if;
    preset_id := run.first_preset_id;
    if preset_id is null then
      insert into public.resume_presets(document_id,user_id,title,selection,default_locale,is_public,allow_indexing,onboarding_test_run_id)
      values(anchor_id,actor_id,'Test onboardingu',selected,run.locale,false,false,run.id) returning id into preset_id;
    end if;
    insert into public.resume_published_cvs(user_id,preset_id,source_document_id,title,schema_version,open_cv_yaml_contract_version,
      default_locale,published_locales,available_locales,selection,allow_indexing,created_by,snapshot_metadata)
    values(actor_id,preset_id,null,'Test onboardingu',1,'1',run.locale,array[run.locale],array[run.locale],selected,false,actor_id,
      jsonb_build_object('source','onboarding-test','run_id',run.id)) returning id into snapshot_id;
    insert into public.resume_published_cv_locales(published_cv_id,user_id,locale,title,yaml_content,schema_version,selection,labels,ai_generated,style_settings)
    values(snapshot_id,actor_id,run.locale,'Test onboardingu',content,1,selected,'{}',false,'{}');
    select coalesce(link.person_slug,p.person_slug,'onboarding-test-'||substr(replace(actor_id::text,'-',''),1,12)) into person_slug from public.profiles p where p.id=actor_id;
    public_id := coalesce(link.public_id,public.generate_public_id());
    legacy_slug := coalesce(link.slug,'test-'||replace(preset_id::text,'-',''));
    if link.id is null then
      insert into public.resume_public_links(document_id,user_id,preset_id,slug,legacy_slug,person_slug,public_id,active_published_cv_id,
        default_locale,available_locales,allow_indexing,is_active,status,published_at)
      values(anchor_id,actor_id,preset_id,legacy_slug,legacy_slug,person_slug,public_id,snapshot_id,run.locale,array[run.locale],false,true,'active',now());
    else
      update public.resume_public_links set active_published_cv_id=snapshot_id,is_active=true,status='active',revoked_at=null,published_at=now(),
        allow_indexing=false where id=link.id;
    end if;
    update public.resume_presets set is_public=true,allow_indexing=false,published_at=now(),slug=legacy_slug where id=preset_id;
  end if;
  update public.resume_onboarding_test_runs set status='completed',auto_start=false,first_preset_id=coalesce(preset_id,first_preset_id) where id=run.id;
  insert into public.admin_audit_logs(actor_user_id,action,target_user_id,metadata)
  values(actor_id,case when input_publish then 'onboarding_test.publish' else 'onboarding_test.complete' end,actor_id,jsonb_build_object('run_id',run.id,'preset_id',preset_id));
  return jsonb_build_object('publicPath',case when input_publish then '/'||person_slug||'/'||public_id else null end);
end;
$$;

revoke all on function public.configure_onboarding_test(text,uuid) from public,anon;
revoke all on function public.save_onboarding_test(uuid,jsonb,text,text,jsonb) from public,anon;
revoke all on function public.finish_onboarding_test(uuid,boolean,boolean) from public,anon;
grant execute on function public.configure_onboarding_test(text,uuid) to authenticated;
grant execute on function public.save_onboarding_test(uuid,jsonb,text,text,jsonb) to authenticated;
grant execute on function public.finish_onboarding_test(uuid,boolean,boolean) to authenticated;

-- Protect the test/source distinction even when an owner calls PostgREST directly.
create function public.guard_onboarding_test_preset() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated','anon') and (new.onboarding_test_run_id is not null
    or (tg_op='UPDATE' and old.onboarding_test_run_id is not null)) then
    raise exception 'Test CVs are managed through onboarding test operations';
  end if;
  return new;
end;
$$;
create trigger guard_onboarding_test_preset before insert or update on public.resume_presets
for each row execute function public.guard_onboarding_test_preset();

-- Preserve the normal publisher verbatim, adding only a guard against test data
-- being replaced with content from its Master CV ownership anchor.
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
  actor_person_slug text;
  resolved_public_id text;
begin
  if actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if exists (select 1 from public.resume_presets p where p.id = input_preset_id and p.user_id = actor_id and p.onboarding_test_run_id is not null) then
    raise exception 'Use the dedicated onboarding test publication operation.';
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

  select person_slug
  into actor_person_slug
  from public.profiles
  where id = actor_id;

  if actor_person_slug is null then
    raise exception 'Profile person_slug is not set. Cannot publish without a public identity.';
  end if;

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

  normalized_default_locale := lower(trim(coalesce(input_default_locale, preset_row.default_locale, 'en')));
  if not public.is_resume_locale(normalized_default_locale) then
    raise exception 'Default locale is invalid.';
  end if;

  if not normalized_default_locale = any(normalized_selected_locales) then
    raise exception 'Default locale must be included in selected locales.';
  end if;

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

  if exists (
    select 1
    from public.resume_documents d
    where d.user_id = actor_id
      and lower(d.locale) = any(normalized_selected_locales)
      and not public.validate_resume_document_yaml(d.yaml_content)
  ) then
    raise exception 'Publish failed: one or more selected YAML documents are invalid.';
  end if;

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
    ai_generated,
    style_settings
  )
  select
    snapshot_id,
    actor_id,
    lower(d.locale),
    d.id,
    rpv.id,
    preset_row.title,
    d.yaml_content,
    coalesce(d.schema_version, 1),
    coalesce(rpv.selection, preset_row.selection),
    '{}'::jsonb,
    coalesce(input_ai_generated, false),
    coalesce(d.style_settings, '{}'::jsonb)
  from public.resume_documents d
  left join public.resume_preset_variants rpv on rpv.document_id = d.id and rpv.preset_id = preset_row.id
  where d.user_id = actor_id
    and lower(d.locale) = any(normalized_selected_locales);

  get diagnostics inserted_locales_count = row_count;
  if inserted_locales_count <> cardinality(normalized_selected_locales) then
    raise exception 'Snapshot locale row count mismatch (expected %, got %).', cardinality(normalized_selected_locales), inserted_locales_count;
  end if;

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
    resolved_public_id := coalesce(active_link.public_id, public.generate_public_id());

    update public.resume_public_links
    set
      document_id = preset_row.document_id,
      active_published_cv_id = snapshot_id,
      default_locale = normalized_default_locale,
      available_locales = normalized_selected_locales,
      allow_indexing = coalesce(input_allow_indexing, false),
      person_slug = actor_person_slug,
      public_id = resolved_public_id,
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
    limit 1
    for update;

    resolved_public_id := coalesce(revoked_link.public_id, public.generate_public_id());
    legacy_slug_value := coalesce(revoked_link.legacy_slug, revoked_link.slug, preset_row.slug, concat('p-', substring(replace(gen_random_uuid()::text, '-', ''), 1, 14)));

    if revoked_link.id is not null then
      update public.resume_public_links
      set
        document_id = preset_row.document_id,
        slug = coalesce(revoked_link.slug, legacy_slug_value),
        legacy_slug = legacy_slug_value,
        person_slug = actor_person_slug,
        public_id = resolved_public_id,
        active_published_cv_id = snapshot_id,
        default_locale = normalized_default_locale,
        available_locales = normalized_selected_locales,
        allow_indexing = coalesce(input_allow_indexing, false),
        is_active = true,
        status = 'active',
        published_at = now(),
        revoked_at = null,
        updated_at = now()
      where id = revoked_link.id;
    else
      insert into public.resume_public_links (
        document_id,
        user_id,
        preset_id,
        slug,
        legacy_slug,
        person_slug,
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
        legacy_slug_value,
        actor_person_slug,
        resolved_public_id,
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
  end if;

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

grant execute on function public.publish_resume_saved_version(uuid, boolean, boolean, text, text[]) to authenticated;
