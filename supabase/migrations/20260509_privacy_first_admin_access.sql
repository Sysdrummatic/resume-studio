-- ADR 0003: privacy-first admin/staff access hardening.
-- Content tables become owner-only; admin/staff keep metadata-only access through dedicated surfaces.

begin;

alter table public.resume_documents enable row level security;
alter table public.resume_revisions enable row level security;
alter table public.resume_presets enable row level security;
alter table public.resume_preset_variants enable row level security;
alter table public.resume_public_links enable row level security;

drop policy if exists "resume_documents_select_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_select_public" on public.resume_documents;
drop policy if exists "resume_documents_insert_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_update_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_delete_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_select_owner" on public.resume_documents;
drop policy if exists "resume_documents_insert_owner" on public.resume_documents;
drop policy if exists "resume_documents_update_owner" on public.resume_documents;
drop policy if exists "resume_documents_delete_owner" on public.resume_documents;

create policy "resume_documents_select_owner"
on public.resume_documents
for select
using (auth.uid() = user_id);

create policy "resume_documents_insert_owner"
on public.resume_documents
for insert
with check (auth.uid() = user_id);

create policy "resume_documents_update_owner"
on public.resume_documents
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "resume_documents_delete_owner"
on public.resume_documents
for delete
using (auth.uid() = user_id);

drop policy if exists "resume_revisions_select_own_or_staff" on public.resume_revisions;
drop policy if exists "resume_revisions_insert_own_or_staff" on public.resume_revisions;
drop policy if exists "resume_revisions_select_owner" on public.resume_revisions;
drop policy if exists "resume_revisions_insert_owner" on public.resume_revisions;

create policy "resume_revisions_select_owner"
on public.resume_revisions
for select
using (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_revisions.document_id
      and d.user_id = auth.uid()
  )
);

create policy "resume_revisions_insert_owner"
on public.resume_revisions
for insert
with check (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_revisions.document_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "resume_presets_select_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_select_public" on public.resume_presets;
drop policy if exists "resume_presets_insert_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_update_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_delete_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_select_owner" on public.resume_presets;
drop policy if exists "resume_presets_insert_owner" on public.resume_presets;
drop policy if exists "resume_presets_update_owner" on public.resume_presets;
drop policy if exists "resume_presets_delete_owner" on public.resume_presets;

create policy "resume_presets_select_owner"
on public.resume_presets
for select
using (auth.uid() = user_id);

create policy "resume_presets_insert_owner"
on public.resume_presets
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.resume_documents d
    where d.id = resume_presets.document_id
      and d.user_id = resume_presets.user_id
  )
);

create policy "resume_presets_update_owner"
on public.resume_presets
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.resume_documents d
    where d.id = resume_presets.document_id
      and d.user_id = resume_presets.user_id
  )
);

create policy "resume_presets_delete_owner"
on public.resume_presets
for delete
using (auth.uid() = user_id);

drop policy if exists "resume_preset_variants_select_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_insert_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_update_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_delete_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_select_owner" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_insert_owner" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_update_owner" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_delete_owner" on public.resume_preset_variants;

create policy "resume_preset_variants_select_owner"
on public.resume_preset_variants
for select
using (auth.uid() = user_id);

create policy "resume_preset_variants_insert_owner"
on public.resume_preset_variants
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.resume_presets p
    where p.id = resume_preset_variants.preset_id
      and p.user_id = resume_preset_variants.user_id
  )
  and exists (
    select 1
    from public.resume_documents d
    where d.id = resume_preset_variants.document_id
      and d.user_id = resume_preset_variants.user_id
      and d.locale = resume_preset_variants.locale
  )
);

create policy "resume_preset_variants_update_owner"
on public.resume_preset_variants
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.resume_presets p
    where p.id = resume_preset_variants.preset_id
      and p.user_id = resume_preset_variants.user_id
  )
  and exists (
    select 1
    from public.resume_documents d
    where d.id = resume_preset_variants.document_id
      and d.user_id = resume_preset_variants.user_id
      and d.locale = resume_preset_variants.locale
  )
);

create policy "resume_preset_variants_delete_owner"
on public.resume_preset_variants
for delete
using (auth.uid() = user_id);

drop policy if exists "resume_public_links_select_owner_by_user" on public.resume_public_links;
create policy "resume_public_links_select_owner_by_user"
on public.resume_public_links
for select
using (auth.uid() = user_id);

drop policy if exists "resume_public_links_update_owner_by_user" on public.resume_public_links;
create policy "resume_public_links_update_owner_by_user"
on public.resume_public_links
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    document_id is null
    or exists (
      select 1
      from public.resume_documents d
      where d.id = resume_public_links.document_id
        and d.user_id = resume_public_links.user_id
    )
  )
  and (
    active_published_cv_id is null
    or exists (
      select 1
      from public.resume_published_cvs pcv
      where pcv.id = resume_public_links.active_published_cv_id
        and pcv.user_id = resume_public_links.user_id
    )
  )
);

commit;
