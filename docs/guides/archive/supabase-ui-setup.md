# Supabase UI Setup Archive

This guide used to describe the retired static auth flow. The active app now uses Next.js routes and server-backed auth handlers.

Use these current guides instead:

- `docs/guides/environment-matrix.md`
- `docs/guides/local-development.md`
- `docs/guides/phase-c-auth-rbac-admin.md`

## Current Redirect URLs

Configure Supabase Authentication redirect URLs for the active React routes:

- Local: `http://localhost:3000/login`
- Local dashboard: `http://localhost:3000/dashboard`
- Production login: `https://<your-domain>/login`
- Production dashboard: `https://<your-domain>/dashboard`

Historical `.html` URLs are preserved only by Netlify redirects such as `/login.html` -> `/login`; they are not backed by static files anymore.
