-- Adds a per-user storage-footprint figure to the staff user overview, so
-- admins/managers can see who is filling the database (Users tab, admin
-- panel). Sums pg_column_size across every table that carries a full CV
-- payload for that user, not just resume_documents (revisions and published
-- snapshots duplicate the YAML on every save/publish).
begin;

drop function if exists public.get_staff_user_overview();

create or replace function public.get_staff_user_overview()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  bio text,
  is_active boolean,
  is_test_user boolean,
  is_ocv_staff boolean,
  created_at timestamptz,
  updated_at timestamptz,
  storage_bytes bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.bio,
    p.is_active,
    p.is_test_user,
    p.is_ocv_staff,
    p.created_at,
    p.updated_at,
    coalesce((select sum(pg_column_size(rd.*)) from public.resume_documents rd where rd.user_id = p.id), 0)
      + coalesce(
          (select sum(pg_column_size(rr.*))
           from public.resume_revisions rr
           join public.resume_documents rd2 on rd2.id = rr.document_id
           where rd2.user_id = p.id),
          0
        )
      + coalesce((select sum(pg_column_size(rp.*)) from public.resume_presets rp where rp.user_id = p.id), 0)
      + coalesce((select sum(pg_column_size(rpv.*)) from public.resume_preset_variants rpv where rpv.user_id = p.id), 0)
      + coalesce((select sum(pg_column_size(rpc.*)) from public.resume_published_cvs rpc where rpc.user_id = p.id), 0)
      + coalesce((select sum(pg_column_size(rpcl.*)) from public.resume_published_cv_locales rpcl where rpcl.user_id = p.id), 0)
      + coalesce((select sum(pg_column_size(rpl.*)) from public.resume_public_links rpl where rpl.user_id = p.id), 0)
      as storage_bytes
  from public.profiles p
  left join auth.users u on u.id = p.id
  where
    (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'manager'
        and (p.id = auth.uid() or p.role in ('user', 'recruiter'))
      )
    )
  order by p.created_at desc;
$$;

grant execute on function public.get_staff_user_overview() to authenticated;

commit;
