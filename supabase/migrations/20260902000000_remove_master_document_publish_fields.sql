-- The Master Resume (resume_documents/resume_revisions) is never published or
-- indexed directly -- only a CV Version (resume_presets -> resume_published_cvs
-- -> resume_public_links) is. is_public/allow_indexing/ai_generated on these two
-- tables were write-only/self-referential: set by the editor's now-removed
-- Publishing tab and propagated document<->revision on save/rollback, but never
-- read by the public route or the CV-version creation flow. Drop them.

create or replace function public.seed_user_resume_documents()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into public.resume_user_locales (
    user_id,
    locale,
    label_override,
    short_label_override,
    is_default,
    sort_order
  )
  values (
    new.id,
    'en',
    null,
    null,
    true,
    10
  )
  on conflict (user_id, locale) do nothing;

  insert into public.resume_documents (
    user_id,
    locale,
    title,
    yaml_content,
    schema_version,
    created_by
  )
  values (
    new.id,
    'en',
    'Master resume',
    public.default_resume_yaml(coalesce(new.display_name, 'New User')),
    1,
    new.id
  )
  on conflict (user_id, locale) do nothing;

  insert into public.resume_revisions (
    document_id,
    revision_number,
    locale,
    title,
    yaml_content,
    schema_version,
    created_by,
    change_note
  )
  select
    d.id,
    1,
    d.locale,
    d.title,
    d.yaml_content,
    d.schema_version,
    new.id,
    'Initial seed'
  from public.resume_documents d
  where d.user_id = new.id
    and d.locale = 'en'
    and not exists (
      select 1
      from public.resume_revisions r
      where r.document_id = d.id
    );

  return new;
end;
$function$;

create or replace function public.create_resume_revision(input_document_id uuid, input_change_note text default null::text, input_created_by uuid default auth.uid())
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  new_revision_number bigint;
begin
  if not exists (
    select 1
    from public.resume_documents d
    where d.id = input_document_id
      and public.can_access_target_user(d.user_id)
  ) then
    raise exception 'Permission denied for revision creation.';
  end if;

  insert into public.resume_revisions (
    document_id,
    revision_number,
    locale,
    title,
    yaml_content,
    schema_version,
    created_by,
    change_note
  )
  select
    d.id,
    coalesce((select max(rr.revision_number) from public.resume_revisions rr where rr.document_id = d.id), 0) + 1,
    d.locale,
    d.title,
    d.yaml_content,
    d.schema_version,
    coalesce(input_created_by, auth.uid()),
    input_change_note
  from public.resume_documents d
  where d.id = input_document_id
  returning revision_number into new_revision_number;

  return new_revision_number;
end;
$function$;

create or replace function public.rollback_resume_document(input_document_id uuid, input_revision_number bigint, input_change_note text default 'Rollback'::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  revision_row public.resume_revisions%rowtype;
  target_user_id uuid;
begin
  select d.user_id
  into target_user_id
  from public.resume_documents d
  where d.id = input_document_id;

  if target_user_id is null then
    raise exception 'Resume document not found.';
  end if;

  if not public.can_access_target_user(target_user_id) then
    raise exception 'Permission denied for rollback.';
  end if;

  select *
  into revision_row
  from public.resume_revisions rr
  where rr.document_id = input_document_id
    and rr.revision_number = input_revision_number
  limit 1;

  if revision_row.id is null then
    raise exception 'Revision % does not exist for document %.', input_revision_number, input_document_id;
  end if;

  update public.resume_documents d
  set locale = revision_row.locale,
      title = revision_row.title,
      yaml_content = revision_row.yaml_content,
      schema_version = revision_row.schema_version,
      updated_at = now()
  where d.id = input_document_id;

  perform public.create_resume_revision(input_document_id, coalesce(input_change_note, 'Rollback'));
  return input_document_id;
end;
$function$;

alter table public.resume_documents
  drop column is_public,
  drop column allow_indexing,
  drop column ai_generated;

alter table public.resume_revisions
  drop column is_public,
  drop column allow_indexing;
