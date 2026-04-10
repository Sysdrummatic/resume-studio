# Phase C Auth + RBAC + Admin Core

This phase implements authentication and role-aware administration in the Next.js app.

## Implemented scope

- Next.js auth API routes:
  - `POST /api/auth/signup`
  - `POST /api/auth/signin`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/resend-verification`
  - `POST /api/auth/signout`
  - `GET /api/auth/session`
- Email verification enforced before protected access.
- Disposable email blocking on sign-up (`disify` API, configurable timeout).
- Role-aware route protection:
  - middleware cookie gate for `/dashboard`, `/master-resume`, `/user`, `/admin`
  - server-side role checks in pages.
- Admin panel (`/admin`) for:
  - role assignment,
  - account activation/deactivation,
  - account deletion (with manager restrictions).
- Audit logging for privileged operations.

## Required migration

Run:

- `supabase/migrations/20260410_phase_c_auth_rbac_admin.sql`

This migration provides RPC helpers and constraints:

- `set_user_role`
- `set_user_active`
- `can_delete_user_account`
- `get_staff_user_overview`
- `log_admin_action`

## Role behavior

- `admin`:
  - full user management access, including deleting any user.
- `manager`:
  - can manage and delete only `user` and `recruiter`.
  - cannot manage `manager` or `admin`.
- `user` and `recruiter`:
  - no administrative user management permissions.

## Test checklist

1. Sign up with permanent email.
2. Verify email from inbox.
3. Sign in, confirm redirect to `/dashboard`.
4. Sign out and sign in again with same credentials.
5. Access `/admin` as admin/manager and verify user list loading.
6. As manager, verify inability to modify or delete admin/manager.
7. Perform role/status update and verify rows appear in `admin_audit_logs`.
