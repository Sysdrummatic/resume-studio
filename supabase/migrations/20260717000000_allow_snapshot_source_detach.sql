-- Allow source-pointer detach on immutable published CV snapshots.
--
-- prevent_published_cv_mutation() rejected every UPDATE on
-- resume_published_cvs / resume_published_cv_locales. Deleting a resume preset
-- fires ON DELETE SET NULL foreign-key actions against those tables
-- (resume_published_cvs.preset_id directly, and
-- resume_published_cv_locales.source_variant_id via the resume_preset_variants
-- cascade), so the trigger aborted the whole preset DELETE with
-- "Published CV snapshots are immutable" — any preset that had ever been
-- published could not be deleted. The same class of failure applies to the
-- other SET NULL source pointers (source_document_id, source_revision_id,
-- created_by) when their referenced rows are deleted, including the ADR 0016
-- account-deletion cascade.
--
-- The replacement permits an UPDATE only when it does nothing except set one
-- or more source-pointer columns to null; snapshot content (yaml_content,
-- selection, locale, title, ...) stays immutable.

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

  if new_j = old_j then
    return new;
  end if;

  raise exception 'Published CV snapshots are immutable. Create a new snapshot instead.';
end;
$$;
