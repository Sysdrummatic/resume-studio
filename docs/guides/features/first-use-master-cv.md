# First-use Master CV guide

The `/onboarding` guide takes a newly registered account through a welcome,
scratch/import choice, the eleven existing Master Resume sections, a preview,
and an explicit choice to create a published CV. Both English and Polish guide
copy are available; the document language is selected independently.

## Enrollment and resumption

Migration `20260907000000_resume_onboarding.sql` enrolls profiles inserted after
the migration. It does not backfill existing profiles, including accounts with
empty or automatically seeded documents. All existing resume-capable roles
(`user`, `recruiter`, `manager`, `admin`) retain their existing capabilities.

- `pending`: `/dashboard` and `/master-resume` redirect to `/onboarding`.
- `active`: the user has moved through the guide. Dashboard offers resumption.
- `paused`: “Finish later” saves the current edited document and progress, then
  opens the dashboard, where the guide can be resumed.
- `completed`: the guide does not reopen. Its route returns to the dashboard.

The account owns the state in `resume_onboarding`: step, method, imported flag,
document locale, guide language and first CV ID. RLS permits reading and updating
only one's own progress; an admin or manager cannot read another user's progress
through these policies. Completed rows cannot be reset through authenticated
updates. API authorization still requires an active, verified account.

The guide reuses `EditorCanvasClient`, its form fields, multi-language buffers,
import parsing and import review. Field updates remain in memory until the user
changes steps or selects “Finish later”; those actions save via the existing
Master Resume revision API before advancing the persisted step. A failed save
keeps the current form open. Browser unload protection warns about unsaved edits.
The guide does not read the ordinary editor's legacy browser-local recovery keys,
which are not scoped to an account. Closing the browser without saving can lose
changes on the current card; previously saved cards remain on the account.

Import remains additive and requires reviewing the parsed content. It does not
publish anything. Once applied, users review the same section cards, with fields
prepopulated. Optional sections can be skipped without adding blank CV entries.

## Publication

`PATCH /api/resume/onboarding` validates and stores progress. It accepts no owner
or preset ID from the client. `POST /api/resume/onboarding` requires an explicit
boolean `publish` choice. Missing or string-valued choices are rejected.

Choosing “Not now” completes the guide with the Master CV saved and no public
version created. Choosing publication requires a name and a professional summary.
The server derives the selection from saved YAML: one filled summary (preferring
the default) and meaningful entries from the remaining selectable sections.
The preview uses the same selection rule.

`reserve_onboarding_preset` locks the account's onboarding row and reserves one
CV version. Retries use that ID. Retrying an unpublished draft refreshes its
selection; an already published CV is not changed back to a draft. The function
is `SECURITY INVOKER`, keeping the existing document and preset RLS in force.
The existing `publishResumePreset` function creates variants, snapshots, audit
records and the canonical public link. The guide publishes only the chosen
document language, with indexing disabled. It marks completion after receiving
the link, and shows “Copy link”, “Open CV” and “Go to dashboard”.

If publication fails, the reserved draft can already appear in the dashboard;
the guide stays resumable and a retry uses the same CV. If only the final progress
write or response fails, retrying recovers the existing link. Disabling indexing
does not make the published CV private: anyone possessing its link can view it.

## Repeatable admin testing

Verified, active administrators can open the account menu, select **Settings /
Ustawienia**, and use **Testing tools / Narzędzia testowe → Onboarding** at
`/settings`. Other roles (`manager`, `user`, `recruiter`) cannot access these tools
or their API. Every operation is scoped to the administrator's own account.

- The checkbox schedules the guide for the next dashboard visit. Unchecking it
  cancels automatic launch without deleting the test draft.
- **Start now** resumes the unfinished test or creates a blank run if the previous
  one is complete. **Start a new blank test** archives an unfinished run and starts
  another. Earlier drafts and published CVs are retained.
- The guide, import review, section forms, progress, pause and explicit publication
  choice are reused. Test drafts support English and Polish independently of the
  account's enabled CV languages.
- Publication creates **Test onboardingu** in the dashboard, with an immediately
  usable public link and indexing disabled. Declining completes the test without
  creating a public CV. A completed test can be repeated from settings.

Migration `20260907010000_admin_onboarding_tests.sql` adds
`resume_onboarding_test_runs` and a preset marker. Drafts and progress live in this
separate table; tests never reset real onboarding, save Master Resume revisions,
change account languages, or synchronize profile names. The API is
`/api/admin/onboarding-test` (settings) and `/api/admin/onboarding-test/[runId]`
(draft/progress/completion). RLS allows reading only one's own admin test runs;
writes use audited RPCs that independently check active, verified admin status.

A test preset references an existing owned resume document only to satisfy the
existing mandatory ownership foreign key. Its content comes exclusively from the
test run. The dedicated publication RPC creates ordinary immutable publication
snapshots and canonical links without reading or updating Master CV content or
the profile slug. Row locking prevents duplicate first CVs on retries. The normal
preset editor and publication RPC reject test presets; dashboard republishing uses
the retained test draft and dedicated RPC. Unpublishing, opening, exporting and
deleting the published test CV use existing controls. Private test previews remain
admin-only. Test presets are excluded from normal Master CV backup bundles.

## Rollout and rollback

Apply both new migrations in filename order before deploying the application change. Profiles created
between migration and deployment are eligible for the guide. No production
migration is applied by the implementation task itself.

Roll back by restoring the previous application release. The additive state table
and enrollment trigger can remain; they do not alter resume YAML or publication
contracts. The admin test migration and publication guard should also remain:
older application releases must not republish test presets from Master CV data.
Keep published CVs and account progress. Do not edit applied migrations
or delete user data to roll back this feature.

## Validation

Manual User and Admin acceptance scenarios (Polish):
[Onboarding test scenarios](../test-scenarios/ONBOARDING_TEST_SCENARIOS.md).

- Default checks: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test`.
- Behavioral tests: `tests/resume-onboarding.test.mjs` covers enrollment decisions,
  input validation, owner scoping, role capabilities, publication consent, summary
  selection, failures, and retries without duplicate CVs.
- Admin API tests: `tests/admin-onboarding-test.test.mjs` covers role boundaries,
  own-account actions, isolated draft validation, missing runs and explicit consent.
- `scripts/qa/admin-onboarding-test-db.cjs` applies the actual admin migration to
  an isolated minimal PostgreSQL schema using PGlite. Set `PGLITE_MODULE_PATH` to
  a separately installed `@electric-sql/pglite` module and run the script with Node.
  It checks role/verification/activity boundaries, isolation between admins,
  scheduling, restart, publication retries and republishing, preserved Master CV
  and profile, audit records, and account-deletion cascade.
- Isolated PostgreSQL/PGlite check: apply the actual migration to a minimal schema,
  then exercise new-only enrollment, own-row updates, cross-user/anonymous denial,
  repeated reservation, published retries and completed-state protection.
- Browser QA with simulated Supabase/API responses: new account redirect, all
  scratch steps, import/review, EN/PL guide copy, failed-save blocking, refresh
  resumption, preview, publication/decline, and desktop/mobile layout.

Before rollout, also run real Supabase staging signup/verification/signin and
resume both paths on a second device. Confirm that the resulting dashboard entry
opens its live canonical link and can be unpublished/republished using the
existing controls. The isolated SQL and simulated browser checks do not replace
that end-to-end staging publication check.
For admin testing, also verify the account-menu link, checkbox cancellation,
repeat/restart, and unchanged Master CV/profile/languages against real Supabase.
