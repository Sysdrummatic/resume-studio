-- ADR 0023 addendum / ocv-0211: one-off, content-preserving rewrite of
-- resume_published_cv_locales.yaml_content (tech_stack/interests string lists ->
-- { entry_id, name } rows, __ocv removed).
--
-- Published snapshots are immutable (prevent_published_cv_mutation). This opens
-- a deliberately narrow door for the duration of the migration only:
--   * only yaml_content of resume_published_cv_locales may change, every other
--     column (selection, locale, title, ...) stays immutable;
--   * only through rewrite_published_snapshot_yaml(), which sets a
--     transaction-local flag, and only for service_role;
--   * 20261010010000_snapshot_shape_migration_close.sql removes both again.
-- The migration script refuses to write a snapshot whose public export would
-- differ from the old one by a single byte.

create or replace function public.prevent_published_cv_mutation()
returns trigger
language plpgsql
as $$
declare
  detach_cols text[] := array['preset_id', 'source_variant_id', 'source_document_id', 'source_revision_id', 'created_by'];
  new_j jsonb := to_jsonb(new);
  old_j jsonb := to_jsonb(old);
  col text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  foreach col in array detach_cols loop
    if new_j -> col is distinct from old_j -> col and new_j ->> col is not null then
      raise exception 'Published CV snapshots are immutable. Create a new snapshot instead.';
    end if;
    new_j := new_j - col;
    old_j := old_j - col;
  end loop;

  if tg_table_name = 'resume_published_cv_locales'
     and coalesce(current_setting('app.snapshot_shape_migration', true), '') = 'on' then
    new_j := new_j - 'yaml_content';
    old_j := old_j - 'yaml_content';
  end if;

  if new_j = old_j then
    return new;
  end if;

  raise exception 'Published CV snapshots are immutable. Create a new snapshot instead.';
end;
$$;

create or replace function public.rewrite_published_snapshot_yaml(p_id uuid, p_yaml text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), current_user) <> 'service_role' then
    raise exception 'Only the service role may rewrite snapshot YAML.';
  end if;
  if p_yaml is null or btrim(p_yaml) = '' then
    raise exception 'Snapshot YAML must not be blank.';
  end if;

  perform set_config('app.snapshot_shape_migration', 'on', true);
  update public.resume_published_cv_locales set yaml_content = p_yaml where id = p_id;
  perform set_config('app.snapshot_shape_migration', 'off', true);
end;
$$;

revoke all on function public.rewrite_published_snapshot_yaml(uuid, text) from public, anon, authenticated;
grant execute on function public.rewrite_published_snapshot_yaml(uuid, text) to service_role;
