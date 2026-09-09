# Dashboard workspace

The Dashboard follows the Master Resume editor's `--ed-*` theme tokens and the
[approved combined mockup](../../../../OpenCiVera-Project/mocks/dashboard/combined.html). It retains the
application's top navigation. The left-hand CV library belongs to the Dashboard
content, not to a new application sidebar.

## Layout and behavior

- Master Resume shows the existing editor completion score, save timestamp and
  counts of professional profiles, experience entries, skills, courses and CV
  languages. Blank placeholder rows do not inflate content counts. Counts use the
  displayed Master Resume locale; translations are listed separately. Completion
  uses the editor's weighted calculation, not a publication requirement or a CV
  quality rating.
- The library filters versions by title and public/private status. Selecting a
  version shows its current selected Master Resume content. Saving, publishing or
  unpublishing a version selects it and clears filters, so the acted-on version
  stays visible instead of silently falling back to a different one if the active
  filter would otherwise hide it. Deleting a selected version falls back to a
  remaining visible version — the one exception where a fallback is intended,
  since the selected row no longer exists.
- Both inline and expanded previews use `BasicResumeDocument`, including the
  saved style settings of the selected language. Selection is applied to raw YAML
  before normalization, using the existing per-locale clamping rules. The preview
  scrolls internally and uses the renderer's responsive layout on mobile.
- Actions under the preview retain selection editing, publication, republication,
  copying the canonical link, export and confirmed deletion. Export/import of
  account data remains in the Master Resume panel. Existing feature gates apply.
- Published links and exports still use the last immutable publication snapshot;
  the inline preview is explicitly labeled as current selected content. Publication
  status does not claim that there are no unpublished edits.
- Onboarding test versions open their separate test CV route. They never render
  the owner's real Master Resume as a fallback.
- Shared breadcrumbs show Home → Dashboard and Home → Dashboard → Master Resume.
  They do not appear in the onboarding flow. Editor locale buffers and controls
  retain their existing behavior.

The application shell's existing English UI labels are preserved. CV language
selection and localized CV labels continue to support EN/PL. No API, database,
authentication, role or snapshot contract changes are required.

**Known limitation:** `app/dashboard/dashboard.css` hand-duplicates the `.button`
and `.dashboard-modal__body` chrome that `globals.css` defines for
`.resume-editor-shell`, instead of sharing the selector — see the `ponytail:`
comment at the top of `dashboard.css`. Low-risk deferral, not tracked as a phase
item; revisit only if a third `.editor-theme` surface appears or the two drift.

## Validation

Run the normal project suite:

```powershell
npm.cmd run verify
```

The focused model tests cover completion, content counts, filtering and selection:

```powershell
node --test tests/dashboard-workspace.test.mjs
```

The opt-in browser regression bundles the real Dashboard, editor and CV renderer
with installed Next webpack and Playwright. It uses synthetic documents and mocked
API responses; it does not sign in or access Supabase. Chromium must be installed
for the repository's Playwright version.

```powershell
$env:DASHBOARD_BROWSER_TEST = '1'
node --test tests/dashboard-browser.test.mjs
Remove-Item Env:DASHBOARD_BROWSER_TEST
```

It exercises EN/PL previews and saved styles, excluded private content, search,
keyboard filter activation and focus, create/edit, publication failure and retry,
copying, TXT export URL, unpublish, delete cancellation/confirmation, import
confirmation cancellation, feature gates and onboarding test isolation. It checks
desktop/mobile in both themes, navigation/breadcrumb placement and page overflow.
The editor check covers breadcrumbs and preserving an unsaved field across locale
switches. Screenshots are written to ignored `tmp/dashboard-browser/`.

The fixture uses a small static header to represent the shell. This isolated check
does not establish authenticated navigation or real persistence/publication.
Before rollout, use a test account against the target environment to check:

1. Existing top navigation, account menu and theme toggle, including returning to
   Dashboard after editing Master Resume.
2. Draft save/reload and EN/PL preview, revision rollback and import/export roundtrip.
3. Create, publish/retry, public snapshot contents, PDF/TXT downloads, unpublish,
   republish with a stable URL and confirmed deletion.
4. Normal user feature gates and the admin-only onboarding test draft route.

See [publication contracts](../testing/cv-publication-test-contracts.md) for the
existing public-data guarantees. This UI change needs no migration; rollout and
rollback use the usual application deployment process.
