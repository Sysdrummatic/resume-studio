-- Records server-side detections of likely script-injection attempts in CV content
-- (see app/lib/content-safety.ts), surfaced to staff in /admin.
--
-- Deliberately NOT a row in admin_audit_logs: that table's actor_user_id is
-- `not null references profiles(id) on delete restrict`, which would permanently
-- block DELETE /api/user/account self-service deletion (GDPR Art. 17) for any
-- user who ever triggers a detection (including a false positive). This table
-- uses `on delete cascade` on user_id instead, matching every other content
-- table per ADR 0016's cascade map, so a flagged user can still delete their
-- own account and this table's rows cascade cleanly with the rest of their data.

begin;

create table if not exists public.content_safety_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid references public.resume_documents(id) on delete set null,
  locale text,
  rule text not null,
  -- Hash only, never the raw matched text: staff (admin/manager) have
  -- metadata-only visibility per ADR 0003 — CV content stays owner-private.
  match_hash text not null,
  source text not null default 'resume_draft_save',
  created_at timestamptz not null default now()
);

create index if not exists content_safety_flags_user_id_idx on public.content_safety_flags(user_id);
create index if not exists content_safety_flags_created_at_idx on public.content_safety_flags(created_at desc);

alter table public.content_safety_flags enable row level security;

drop policy if exists "content_safety_flags_select_staff" on public.content_safety_flags;
create policy "content_safety_flags_select_staff"
on public.content_safety_flags
for select
using (public.is_staff_user());

-- No insert policy for authenticated/anon roles: rows are written only by the
-- server-side detection hook using the service-role key, which bypasses RLS.
-- RLS defaults to deny, so no direct client insert path exists.

commit;
