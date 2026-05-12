create table if not exists public.resume_languages (
  code text primary key,
  label text not null,
  short_label text not null,
  labels jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_languages_code_format check (code ~ '^[a-z]{2}$'),
  constraint resume_languages_short_label_format check (short_label ~ '^[A-Z]{2}$'),
  constraint resume_languages_labels_object check (jsonb_typeof(labels) = 'object')
);

insert into public.resume_languages (code, label, short_label, labels, sort_order)
values
  (
    'en',
    'English',
    'EN',
    '{
      "language_switcher": "Language",
      "summary_heading": "Summary",
      "experience_heading": "Experience",
      "education_heading": "Education",
      "courses_heading": "Courses",
      "personal_info_heading": "Personal Info",
      "skills_heading": "Skills",
      "tech_stack_heading": "Tech stack",
      "languages_heading": "Languages",
      "interests_heading": "Interests",
      "public_view_badge": "Public view",
      "private_view_badge": "Private view",
      "draft_view_badge": "Draft",
      "ai_generated_badge": "AI generated"
    }'::jsonb,
    10
  ),
  (
    'pl',
    'Polski',
    'PL',
    '{
      "language_switcher": "Jezyk",
      "summary_heading": "Podsumowanie",
      "experience_heading": "Doswiadczenie",
      "education_heading": "Wyksztalcenie",
      "courses_heading": "Kursy",
      "personal_info_heading": "Informacje osobiste",
      "skills_heading": "Umiejetnosci",
      "tech_stack_heading": "Stos technologiczny",
      "languages_heading": "Jezyki",
      "interests_heading": "Zainteresowania",
      "public_view_badge": "Widok publiczny",
      "private_view_badge": "Widok prywatny",
      "draft_view_badge": "Wersja robocza",
      "ai_generated_badge": "Wygenerowane przez AI"
    }'::jsonb,
    20
  )
on conflict (code) do update
set
  label = excluded.label,
  short_label = excluded.short_label,
  labels = excluded.labels,
  sort_order = excluded.sort_order,
  updated_at = now();

drop trigger if exists resume_languages_updated_at on public.resume_languages;
create trigger resume_languages_updated_at
before update on public.resume_languages
for each row execute procedure public.touch_updated_at();

alter table public.resume_documents
add column if not exists ai_generated boolean not null default false;

alter table public.resume_presets
add column if not exists ai_generated boolean not null default false,
add column if not exists default_locale text not null default 'en';

alter table public.resume_presets
drop constraint if exists resume_presets_default_locale_supported;

alter table public.resume_presets
add constraint resume_presets_default_locale_supported
check (default_locale ~ '^[a-z]{2}$');

create table if not exists public.resume_preset_variants (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.resume_presets(id) on delete cascade,
  document_id uuid not null references public.resume_documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale text not null references public.resume_languages(code),
  selection jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_preset_variants_selection_object check (jsonb_typeof(selection) = 'object'),
  constraint resume_preset_variants_unique_locale unique (preset_id, locale)
);

create index if not exists resume_preset_variants_preset_id_idx on public.resume_preset_variants(preset_id);
create index if not exists resume_preset_variants_document_id_idx on public.resume_preset_variants(document_id);
create index if not exists resume_preset_variants_user_id_idx on public.resume_preset_variants(user_id);

drop trigger if exists resume_preset_variants_updated_at on public.resume_preset_variants;
create trigger resume_preset_variants_updated_at
before update on public.resume_preset_variants
for each row execute procedure public.touch_updated_at();

alter table public.resume_languages enable row level security;
alter table public.resume_preset_variants enable row level security;

drop policy if exists "resume_languages_select_enabled" on public.resume_languages;
create policy "resume_languages_select_enabled"
on public.resume_languages
for select
using (is_enabled = true);

drop policy if exists "resume_preset_variants_select_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_insert_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_update_own_or_staff" on public.resume_preset_variants;
drop policy if exists "resume_preset_variants_delete_own_or_staff" on public.resume_preset_variants;

create policy "resume_preset_variants_select_own_or_staff"
on public.resume_preset_variants
for select
using (public.can_access_target_user(user_id));

create policy "resume_preset_variants_insert_own_or_staff"
on public.resume_preset_variants
for insert
with check (
  public.can_manage_target_user(user_id)
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

create policy "resume_preset_variants_update_own_or_staff"
on public.resume_preset_variants
for update
using (public.can_access_target_user(user_id))
with check (
  public.can_manage_target_user(user_id)
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

create policy "resume_preset_variants_delete_own_or_staff"
on public.resume_preset_variants
for delete
using (public.can_manage_target_user(user_id));
