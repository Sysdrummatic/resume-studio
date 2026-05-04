# Phase C: Supabase schema setup (legacy foundation guide)

This guide documents the older Phase C foundation and completion migrations that introduced `profiles`, `resumes`, and `public_links`.

For the active YAML-first model now used by the Next.js app, treat this guide as historical setup context and follow:

- `docs/guides/phase-b-yaml-data-layer.md`
- `docs/guides/phase-c-auth-rbac-admin.md`
- `docs/guides/local-development.md`

## Historical Checklist

- [x] Legacy Phase C foundation migration exists
- [x] Legacy Phase C completion migration exists
- [x] Recursion fix migration exists
- [x] This guide is retained as historical setup context
- [ ] This guide should be used as the primary setup guide for the current YAML-first app

Use this guide right after your Auth + Netlify connection is already working.

## Goal

After this setup, your project will have:

- `profiles` (with `user`/`admin` roles),
- `resumes` (single master resume per user),
- `resume_configurations` (visibility presets),
- `public_links` (multiple share links per resume),
- `uploaded_files` (resume uploads and generated files),
- RLS policies for user isolation and admin access.

---

## 1) Run migrations in Supabase UI

1. Open Supabase project dashboard.
2. In the left menu, click **SQL Editor**.
3. Click **New query**.
4. Open local file: `supabase/migrations/20260405_phase_c_foundation.sql`.
5. Paste the full SQL into the query editor and click **Run**.
6. Create a second query tab.
7. Open local file: `supabase/migrations/20260405_phase_c_completion.sql`.
8. Paste the full SQL and click **Run**.
9. Confirm both queries finish without errors.

If any statement fails, stop and fix the failing line before re-running.

If your dashboard shows `infinite recursion detected in policy for relation "profiles"`, run:

1. `supabase/migrations/20260406_fix_profiles_policy_recursion.sql`
2. Reload `dashboard.html` and test sign-in again.

---

## 2) Verify tables were created

1. In the left menu, click **Table Editor**.
2. Confirm the following tables exist under `public` schema:
   - `profiles`
   - `resumes`
   - `resume_configurations`
   - `public_links`
   - `uploaded_files`
3. Open each table and verify columns match the migration.

---

## 3) Verify trigger for automatic profile creation

1. Go to **Database** → **Triggers**.
2. Confirm trigger `on_auth_user_created` exists on `auth.users`.
3. Confirm function `public.handle_new_auth_user` exists under **Database** → **Functions**.

Result expected: new signup in `auth.users` auto-creates `public.profiles` row.

---

## 4) Set first admin user

Run in **SQL Editor** (replace email):

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'your-email@example.com'
);
```

Then verify in **Table Editor** → `profiles` that role is `admin`.

---

## 5) Validate RLS quickly

1. Go to **Authentication** → **Users** and ensure at least 2 test users exist.
2. In the app, sign in as user A and create sample data when Phase C UI is ready.
3. Sign in as user B and verify user B cannot access user A rows.
4. Sign in as admin user and verify admin can read all rows.

---

## 6) Verify Phase C completion RPC functions

1. In Supabase, open **Database** → **Functions**.
2. Confirm these functions exist:
   - `get_admin_platform_stats`
   - `get_admin_user_overview`
   - `set_user_active`
   - `get_public_resume_by_slug`
   - `increment_public_link_view`
3. In the app, sign in as an admin and open `dashboard.html`.
4. Confirm stats and user list are visible.
5. Deactivate a test user and verify that user cannot access `dashboard.html` after sign in.

---

## 7) Create storage buckets

1. Left menu → **Storage**.
2. Create buckets:
   - `user-uploads` (private)
   - `profile-images` (public)
   - `generated-pdfs` (private)
   - `qr-codes` (public)
3. Do not upload sensitive production files yet.

---

## 8) Manual smoke test checklist

- [x] New signup creates `auth.users` row.
- [x] New signup creates `profiles` row automatically.
- [x] New signup also creates one seeded master resume + default link.
- [x] Admin role can be assigned and persists.
- [x] RLS blocks cross-user access.
- [x] Public links can be queried only when active.
- [ ] `/r/{slug}` sets robots meta to `noindex,nofollow` by default.
- [ ] Turning `allow_indexing=true` on both `resumes` and `public_links` changes robots meta to `index,follow`.
- [ ] Buckets exist with correct public/private mode.

---

## Notes

- This migration intentionally adds `allow_indexing` on both `resumes` and `public_links` to support your product decision that users choose SEO indexing.
- Phase C completion enforces one master resume per user with a unique index on `resumes.user_id`.
- If you need rollback, create a dedicated rollback migration instead of deleting tables manually.
- The recursion fix migration replaces admin RLS policies to use `public.is_admin_user()` instead of direct `profiles` subqueries.


## Future React client note

Phase C schema/RLS decisions are frontend-framework agnostic.
During React migration, reuse the same tables, policies, and RPC contracts to avoid backend drift between static and React clients.
