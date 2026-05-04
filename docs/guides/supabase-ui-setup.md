# Supabase UI Setup (Legacy Static Auth Setup)

This guide is primarily relevant to the older static auth flow under `public/login.html` and `public/dashboard.html`.

For the active Next.js app deployment on Netlify, prefer:

- `docs/guides/environment-matrix.md`
- `docs/guides/local-development.md`
- `docs/guides/phase-c-auth-rbac-admin.md`

This guide is a click-by-click checklist for configuring Supabase for Phase B authentication.

## Prerequisites

- You have a Supabase account.
- You have access to this repository running locally.
- You know your target URLs:
  - Local: `http://localhost:8000`
  - Production (GitHub Pages): `https://<username>.github.io/<repo>`

---

## 1) Create a Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Choose your organization.
4. Fill in:
   - **Project name**: e.g. `OpenCVHub`.
   - **Database Password**: generate and save securely.
   - **Region**: choose nearest to your primary users.
5. Click **Create new project**.
6. Wait until the project status is ready.

---

## 2) Get project URL and anon key

1. In the left menu, click **Project Settings** (gear icon).
2. Click **API**.
3. Copy:
   - **Project URL**
   - **anon public** key
4. Open `scripts/auth-config.js` in your repo.
5. Paste values into:

```js
supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
supabaseAnonKey: 'YOUR_PUBLIC_ANON_KEY'
```

> Do not use the service role key in browser code.

---

## 3) Configure authentication URLs

1. In the left menu, click **Authentication**.
2. Open **URL Configuration**.
3. Set **Site URL**:
   - Local dev: `http://localhost:8000`
   - For production later, change to your Pages/Netlify primary URL.
4. In **Redirect URLs**, add each required URL as a separate entry:
   - `http://localhost:8000/dashboard.html`
   - `http://localhost:8000/login.html`
   - `https://<username>.github.io/<repo>/dashboard.html`
   - `https://<username>.github.io/<repo>/login.html`
5. Save changes.

---

## 4) Enforce email verification

1. In **Authentication**, open **Providers**.
2. Select **Email** provider.
3. Ensure **Enable Email provider** is ON.
4. Ensure **Confirm email** (or equivalent setting requiring email confirmation) is ON.
5. Save changes.

Expected behavior:

- User signs up.
- User receives verification email.
- User can sign in only after email confirmation.

---

## 5) Configure password recovery behavior

1. In **Authentication** → **URL Configuration**, confirm `login.html` is allowed in Redirect URLs.
2. In this repo, ensure `passwordResetRedirectUrl` points to `login.html` in `scripts/auth-config.js`.
3. Save file and reload the app.

---

## 6) Optional: customize auth emails

1. In **Authentication** → **Email Templates**.
2. Edit templates:
   - Confirm signup
   - Reset password
3. Update branding (app name, support email, wording).
4. Save.

Optional but recommended before public launch.

---

## 7) Optional: set custom SMTP (production)

1. In **Authentication** → **SMTP Settings**.
2. Add provider credentials (SendGrid, Postmark, etc.).
3. Save and send a test email.

Use default Supabase email for early testing; switch to custom SMTP before wider rollout.

---

## 8) Verify Phase B flows in the app

1. Start local server (example):
   - `python3 -m http.server 8000`
2. Open `http://localhost:8000/login.html`.
3. Test **Sign up** with a real email.
4. Confirm verification email arrives.
5. Verify sign-in before confirmation is blocked.
6. Confirm email, then sign in.
7. Verify redirect to `dashboard.html` works.
8. Click **Sign out** and verify redirect back to login.
9. Test **Reset password** flow.

---

## 9) Configure disposable email blocking in app flow

Current implementation in this project checks:

- `https://www.disify.com/api/email/<email>`

Validation occurs in `scripts/auth.js` before `signUp`.

Notes:

- Disify is a free external API and may have limits/availability constraints.
- Keep a fallback plan for API downtime (e.g., allow signup with extra monitoring or switch provider).

---

## 10) Troubleshooting quick map

- **"Supabase config missing" on login page**
  - `scripts/auth-config.js` is empty or incorrect.
- **No verification email**
  - Check Email provider is enabled and confirmation is required.
  - Check spam folder.
  - Validate Site URL + Redirect URLs.
- **Redirect mismatch errors**
  - Add exact URL (including path) to Redirect URLs.
- **Dashboard keeps redirecting to login**
  - Session missing/expired, or wrong project keys.

---

## 11) What can wait until Phase C

You do **not** need these yet for basic Phase B auth:

- Full SQL schema migrations.
- RLS policies for business tables.
- Admin data model and moderation tables.

Phase B is successful once auth, verification, reset, and protected-route behavior are working.


---

## 12) Future React route note

When auth pages move to React routes (for example `/app/login` and `/app/dashboard`), add those exact URLs to Supabase Redirect URLs in addition to legacy static paths during migration.
Remove legacy URLs only after static pages are fully retired.
