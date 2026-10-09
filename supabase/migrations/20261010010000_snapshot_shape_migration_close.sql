-- ocv-0211: closes the door opened by 20261010000000_snapshot_shape_migration_open.sql.
-- Apply only after the snapshot rewrite has finished on this environment.
-- Restores prevent_published_cv_mutation() to its 20260717000000 definition:
-- snapshot content is immutable again, source pointers may still be detached.

drop function if exists public.rewrite_published_snapshot_yaml(uuid, text);

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
