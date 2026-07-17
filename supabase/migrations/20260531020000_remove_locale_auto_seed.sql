-- Remove automatic locale seeding on account creation.
-- Previously, every new profile triggered creation of 'en' and 'pl' documents
-- with default YAML content. Users will now configure their own locales explicitly
-- through the UI after registration.
--
-- The trigger itself is kept in place but the function is replaced with a no-op
-- so the infrastructure remains consistent with the existing migration chain.

create or replace function public.seed_user_resume_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Locale documents are no longer seeded automatically on account creation.
  -- Users configure their locales explicitly after registration.
  return new;
end;
$$;
