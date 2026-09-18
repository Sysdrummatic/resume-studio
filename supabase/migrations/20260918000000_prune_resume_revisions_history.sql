-- resume_revisions has no retention policy: every draft save and every
-- publish inserts a full copy of the YAML forever (unlike resume_documents,
-- which is a single overwritten row per user+locale). The revision history
-- UI/API (fetchRevisions in app/lib/resume-server.ts) already only ever reads
-- the most recent 40 rows per document (order by revision_number desc limit
-- 40) - anything older is already unreachable through the product, so
-- keeping it costs storage for zero user-facing benefit. This adds an
-- AFTER INSERT trigger that prunes each document down to its most recent 40
-- revisions, plus a one-time backfill for any document that already exceeds
-- that window.
begin;

delete from public.resume_revisions rr
using (
  select id, row_number() over (partition by document_id order by revision_number desc) as rn
  from public.resume_revisions
) ranked
where rr.id = ranked.id
  and ranked.rn > 40;

create or replace function public.prune_resume_revisions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.resume_revisions
  where document_id = new.document_id
    and revision_number <= (
      select revision_number
      from public.resume_revisions
      where document_id = new.document_id
      order by revision_number desc
      offset 40 limit 1
    );
  return null;
end;
$$;

drop trigger if exists resume_revisions_prune_trigger on public.resume_revisions;
create trigger resume_revisions_prune_trigger
after insert on public.resume_revisions
for each row
execute procedure public.prune_resume_revisions();

commit;
