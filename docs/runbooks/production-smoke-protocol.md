# Production smoke test protocol

Run right after every production deploy and after every production rollback (see the
[release and rollback runbook](release-and-rollback.md)). It proves the deploy is alive and
the critical paths work; it is not a regression suite. Target: under 15 minutes.

**Production origin:** `https://opencivera.com`. Never run the smoke against production with
a real user's account, and never create content under an account that is not a test account
(`profiles.is_test_user`, ADR 0019).

## 1. Automated, anonymous (about 2 minutes)

```powershell
npm.cmd run smoke:preview -- --base=https://opencivera.com --output=tmp/production-smoke
npm.cmd run test:production
```

- `smoke:preview` checks `/`, `/login`, `/privacy`, `/terms`, `/resume` and that `/dashboard`,
  `/master-resume`, `/admin` redirect to `/login?reason=signed-out`. It writes `report.json`
  and screenshots to the output directory.
- `test:production` checks HSTS (at least one year) and the http/www to https-apex redirects.
- Pass = both exit 0. Any failure means **stop and decide on rollback**.

## 2. Manual, authenticated (about 10 minutes)

Use the dedicated production test account (credentials in the team password manager, not in
the repo). Tick each step; note the time and what you saw.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Sign in with the test account | Lands on `/dashboard`, no error banner |
| 2 | Open `/master-resume`, switch EN/PL | Both languages load their own content |
| 3 | Edit one field, save the draft, reload | Edit persisted |
| 4 | Publish a Saved Version | Canonical `/{person-slug}/{public-id}` link is shown |
| 5 | Open the public link in a private window | CV renders the selected content only |
| 6 | Download PDF and one ATS export from that public CV | Files download, names follow `buildExportFilename()` |
| 7 | Unpublish | Public link returns 404 in the private window |
| 8 | Sign out | Session cleared; `/dashboard` redirects to `/login` |
| 9 | Sign in as the admin test account, open `/admin` and the audit page | User list and audit log load without error |

Skip nothing silently. If a step is not applicable to the release, write "n/a" and why.

Also confirm in Netlify that the published deploy is the intended commit, and that Supabase
`prod` advisors show no new security warning for tables touched by the release.

## 3. Pass / fail

- **Pass:** every automated check and every manual step passed. Record it and announce the release.
- **Fail:** any step fails. Do not retry more than once (to rule out a flake). Then follow the
  rollback decision table in the release and rollback runbook, and open an incident note.

## 4. Evidence

Paste into the release issue or PR; do not describe steps that were not executed.

```md
Production smoke, <YYYY-MM-DD HH:MM UTC>, commit <sha>, deploy <netlify id>
- Automated: smoke:preview <8/8>, test:production <pass/fail>
- Manual: steps 1-9 <pass / failed at N: details>
- Run by: <name>
- Evidence: tmp/production-smoke/report.json (attach)
```

## Cleanup

Leave the test account with no published version (step 7) so the smoke leaves no public
content behind. Do not commit `tmp/`.
