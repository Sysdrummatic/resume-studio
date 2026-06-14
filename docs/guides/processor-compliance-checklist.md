# Processor Compliance Checklist

Tracks the third-party processors (sub-processors) that handle personal data on behalf
of OpenCiVera, as referenced in the Privacy Policy (`app/privacy/page.tsx`, Section 4).

| Processor | Purpose | Data Location | DPA / Transfer Mechanism | Status | Action Needed |
| --- | --- | --- | --- | --- | --- |
| Supabase | Database, auth, file storage | EU (Frankfurt) | Supabase Data Processing Agreement | To be confirmed in Supabase organization settings | Founder to verify DPA acceptance in the Supabase dashboard (manual, non-code action) |
| Netlify, Inc. | Application hosting | USA | DPA + Standard Contractual Clauses, incorporated by reference into Netlify's Terms (per Netlify's published GDPR/CCPA policy) | Covered, no action | None |
| Resend | Account-deletion confirmation email | TBD | TBD | Implemented, inactive (no `RESEND_API_KEY` configured) | Once enabled: add Resend as a processor in `app/privacy/page.tsx` Section 4 (Who We Share Your Data With) and bump "Last updated" |
| Vercel (planned, Puppeteer PDF migration per [ADR 0015](adr/0015-vercel-puppeteer-pdf-migration.md)) | PDF rendering | TBD | TBD | Not yet enabled | Repeat this checklist before enabling |
| AI provider for ATS scoring (Gemini Flash / Groq, Phase I, post-launch) | Keyword/gap analysis | TBD | TBD | Not yet enabled | Repeat this checklist before enabling; Privacy Policy will need an update at that point |

## Maintenance

- Re-run this checklist whenever a new external service that processes personal data is
  introduced.
- Any "Action Needed" item that changes the Privacy Policy's processor list (Section 4)
  requires updating `app/privacy/page.tsx` and bumping its "Last updated" date.
