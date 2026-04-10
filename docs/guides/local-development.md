# Local Development Setup

This guide describes local development for the Next.js rebuild.

## Prerequisites

- Node.js 22+.
- npm 10+.
- Supabase project with:
  - Auth enabled,
  - Phase B and Phase C SQL migrations applied.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from template:

```bash
cp .env.development.example .env.local
```

3. Fill required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Start app:

```bash
npm run dev
```

## Key routes

- `/login` - sign in/sign up/reset and verification resend.
- `/dashboard` - protected user panel.
- `/admin` - protected admin/manager user management.
- `/master-resume` - protected editor entry (Phase D target).

## Validation commands

```bash
npm run lint
npm run typecheck
npm test
```

If `npm test` fails in restricted shell environments with `spawn EPERM`, run critical suites directly:

```bash
node tests/phase-b-yaml-data-layer.test.js
```
