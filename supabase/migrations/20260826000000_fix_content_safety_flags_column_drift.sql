-- Fixes live schema drift on public.content_safety_flags.
--
-- The original migration (20260713000000_content_safety_flags.sql) defines
-- `match_hash text not null`, matching both the write path
-- (app/lib/content-safety-audit.ts hashes the match before insert, per ADR
-- 0003 — staff get metadata only, never raw CV content) and the read path
-- (app/admin/audit/page.tsx selects and renders `match_hash`). The live
-- table on both prod and test somehow had a column named `matched_snippet`
-- instead — confirmed via information_schema on both projects, 0 rows on
-- both, so this was a pure rename with no data to migrate. Because
-- `insertTable` writes a payload keyed `match_hash`, PostgREST rejected
-- every insert with an unknown-column error, and
-- `flagSuspiciousResumeContent()` swallows that error by design (a
-- detection/logging failure must never block the user's own save) — so the
-- entire Content Safety Flags feature silently wrote nothing since it
-- shipped, on either project.
--
-- Conditional, not a bare rename: a database built fresh from this
-- migration history (CI's database-security job, any new environment)
-- never has `matched_snippet` in the first place — the original migration
-- already creates `match_hash` correctly. Only prod/test drifted, via
-- some out-of-band change outside the migration history. A bare
-- `rename column` fails on a fresh build with "column matched_snippet
-- does not exist"; this only acts when the drifted name is actually
-- present.

begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'content_safety_flags'
      and column_name = 'matched_snippet'
  ) then
    alter table public.content_safety_flags
      rename column matched_snippet to match_hash;
  end if;
end $$;

commit;
