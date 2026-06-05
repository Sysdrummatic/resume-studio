-- Fix: assert_published_cv_locale_snapshot trigger used `<> ANY` instead of `<> ALL`.
-- `x <> ANY(arr)` is true when x differs from at least one element — almost always true.
-- `x <> ALL(arr)` is true only when x is absent from the entire array, which is the intended check.

create or replace function public.assert_published_cv_locale_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_row public.resume_published_cvs%rowtype;
begin
  select *
  into parent_row
  from public.resume_published_cvs pcv
  where pcv.id = new.published_cv_id;

  if parent_row.id is null then
    raise exception 'Published CV snapshot does not exist.';
  end if;

  if parent_row.user_id <> new.user_id then
    raise exception 'Published CV locale owner does not match snapshot owner.';
  end if;

  if new.locale <> all(parent_row.available_locales) then
    raise exception 'Published CV locale is not listed in available_locales.';
  end if;

  return new;
end;
$$;
