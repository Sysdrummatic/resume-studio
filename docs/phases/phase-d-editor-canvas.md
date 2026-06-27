# Phase D: Resume Editor Canvas

**Status**: ✓ **COMPLETE**  
**ETA**: May 2026  
**Started**: 2026-04-30  
**Core Delivered**: 2026-05-11

> Building an interactive YAML editor with live preview, drafts, and version control.

---

## Overview

Phase D delivers the Master Resume Editor—a React-based canvas where authenticated users draft, edit, preview, and publish their CVs in YAML format. The editor supports per-locale documents, draft management with browser storage, version snapshots, and rollback to previous revisions. Live preview renders the CV as it will appear publicly.

### Key Theme
**From data tables → interactive editing canvas.** Authors gain control.

---

## Delivered Scope

### Editor Canvas

- ✓ **Split-view editor at `/master-resume`**
  - Left side: editable form with YAML sections
  - Right side: live CV preview (real-time sync)
  - Responsive layout adapts to mobile

- ✓ **Per-locale document handling**
  - Each locale (EN, PL) is a separate `resume_documents` row
  - Language switcher in editor header
  - Independent draft state per locale
  - New language versions start as private drafts

- ✓ **Draft workflow**
  - Save draft to browser local storage
  - Restore previously saved draft
  - Clear draft (reset to last published version)
  - Unsaved changes indicator

### YAML Operations

- ✓ **Form ↔ YAML synchronization**
  - Form fields auto-sync to YAML representation
  - Edit YAML directly, form updates
  - Validation on sync (schema enforcement)

- ✓ **YAML import/export**
  - Export CV to `.yaml` file download
  - Import YAML from file (overwrites current draft)
  - Paste YAML content directly

- ✓ **Schema validation**
  - Runtime validation using `validate_resume_document_yaml` RPC
  - Error messages highlight schema violations
  - Prevents invalid YAML publish

### Publication & Versioning

- ✓ **Publish workflow**
  - Saves YAML to `resume_documents` table
  - Records `ai_generated` flag for AI-assisted drafts
  - Creates immutable snapshot in `resume_revisions`
  - Generates or updates `resume_public_links`

- ✓ **Revision history**
  - List all published revisions with timestamps
  - View any revision snapshot
  - Rollback to previous revision (replaces current document)
  - Revision numbers track publication sequence

- ✓ **Status badges**
  - "Public" — revision has live public link
  - "Draft" — unpublished changes in editor
  - "AI Generated" — document created via AI

### Multi-Language Support

- ✓ **Language version management**
  - Create new language version (en → pl)
  - Each language has independent YAML
  - Publish separately per locale
  - Language switching in editor

---

## Architecture Decision Records

- [ADR 0006: Draft and Publish Semantics](../adr/0006-draft-and-publish-semantics.md) — version control, publication immutability
- [ADR 0009: Master Resume Document Canonicalization](../adr/0009-master-resume-document-canonicalization.md) — YAML as source of truth

---

## Implementation Details

### Editor Routes & Pages

- `/master-resume` — Main editor canvas (protected, authenticated only)
- `/master-resume/revisions` — Revision history browser
- `/api/resume/document?locale=<locale>` — Fetch current document YAML
- `/api/resume/publish` — Publish current draft as revision
- `/api/resume/rollback?revisionId=<id>` — Restore previous revision
- `/api/resume/languages` — Manage language versions

### Database Integration

**`resume_documents` table** (from Phase B):
```sql
id (uuid, pk)
user_id (uuid, fk → profiles)
locale (varchar: 'en', 'pl')
content (text, YAML)
ai_generated (boolean)
created_at (timestamp)
updated_at (timestamp)
```

**`resume_revisions` table** (from Phase B):
```sql
id (uuid, pk)
document_id (uuid, fk → resume_documents)
snapshot (text, YAML)
created_at (timestamp)
revision_number (integer)
```

### API Routes Implementation

**`GET /api/resume/document?locale=<locale>`**:
- Returns current YAML for user's locale
- Falls back to draft if document unpublished

**`POST /api/resume/publish`**:
- Validates YAML schema server-side
- Saves to `resume_documents`
- Creates snapshot in `resume_revisions`
- Returns revision ID and public link info

**`POST /api/resume/rollback?revisionId=<id>`**:
- Fetches revision snapshot
- Replaces current `resume_documents` content
- Creates new revision (copy of rolled-back content)
- Returns updated document

**`GET|POST|PATCH /api/resume/languages`**:
- GET: List available locales for user
- POST: Create new language version
- PATCH: Update locale preferences

### Client-Side YAML Runtime

- `/public/vendor/js-yaml.min.js` — Browser-side YAML parsing
- Validates form-to-YAML sync without server round-trip
- Allows direct YAML editing in text area

### Validation Flow

1. User edits form or YAML in browser
2. JS-YAML parses YAML syntax
3. Client validates against schema (basic checks)
4. On publish, server calls `validate_resume_document_yaml` RPC
5. If invalid, error message returned; draft not overwritten
6. If valid, snapshot created and revision incremented

---

## Testing & QA Checklist

- [x] Editor route `/master-resume` accessible when authenticated
- [x] Editor route blocked when unauthenticated
- [x] Left form and right preview render side-by-side
- [x] Form fields sync to live preview in real-time
- [x] Locale switcher changes document context (EN/PL)
- [x] Save draft persists to browser storage
- [x] Restore draft retrieves saved data
- [x] Clear draft resets to last published version
- [x] YAML export downloads valid `.yaml` file
- [x] YAML import loads file and updates form
- [x] Paste YAML directly into editor works
- [x] Publish creates revision snapshot
- [x] Revision history shows all published versions
- [x] Rollback updates document and creates new revision
- [x] Status badges (Public/Draft/AI) render correctly
- [x] New language version starts as draft
- [x] Schema validation prevents invalid YAML publish
- [x] Error messages highlight validation failures
- [x] AI-generated flag stored on publish
- [x] Revision numbers increment on each publish
- [x] API routes return correct HTTP status codes
- [x] Concurrent draft saves don't conflict

**Test Command**: `npm test` (includes Phase D editor contract tests)

---

## Known Risks & Mitigations

### Risk 1: Draft Data Loss

**Scenario**: Browser storage cleared or session lost, draft unsaved changes lost.

**Mitigation**:
- Auto-save draft every 30 seconds (configured)
- Unsaved changes indicator warns before navigation
- Restore draft button recovers most recent save
- Server always has last published version as fallback

### Risk 2: Concurrent Publish Conflicts

**Scenario**: User publishes from two browser tabs simultaneously, causing version mismatch.

**Mitigation**:
- Document update timestamp checked before publish
- Optimistic locking prevents overwrite
- UI refetches document on conflict
- User prompted to resolve (use server version or retry local)

### Risk 3: Invalid YAML in Database

**Scenario**: Legacy data or migration error introduces malformed YAML, editor fails to load.

**Mitigation**:
- `validate_resume_document_yaml` RPC catches on publish
- Server stores snapshots, can't overwrite with invalid data
- If document unloadable, fallback to empty template
- Audit log tracks which user/document caused issue

### Risk 4: Browser Storage Quota Exceeded

**Scenario**: User's browser storage full, draft save fails silently.

**Mitigation**:
- Check available storage before save
- Show warning if storage low (<5% remaining)
- Prompt user to clear browser cache if save fails
- Server-side publish always works regardless of local storage

---

## Related Documentation

### Architecture Decisions
- [ADR 0006: Draft and Publish Semantics](../adr/0006-draft-and-publish-semantics.md)
- [ADR 0009: Master Resume Document Canonicalization](../adr/0009-master-resume-document-canonicalization.md)

### Guides
- [YAML Schema Validation](../guides/development/local-development.md#yaml-validation)

### Execution
- [STATUS.md](../STATUS.md)

---

## Transition to Phases E & F

Phase D enables editing; Phases E and F add user-facing features and public sharing.

**Phase E & F Dependencies** (all ready):
- ✓ Editor canvas complete and tested
- ✓ YAML document storage working
- ✓ Revision history functional
- ✓ Publication workflow tested

---

## Success Criteria

✓ **All editor deliverables shipped**:
- Master Resume Editor fully functional
- Per-locale document editing working
- Draft workflow (save/restore/clear) complete
- YAML import/export implemented
- Publish and revision history operational
- Multi-language support working
- Status badges rendering correctly
- Tests passing for all editor contracts

✓ **Ready to begin Phases E & F** (Public surface and UX/Analytics)

---

## Phase D Completion Checklist

Tracked in [STATUS.md](../STATUS.md):

- [x] Editor route `/master-resume` created and accessible
- [x] Split-view layout with form and preview implemented
- [x] Per-locale document support (EN, PL) working
- [x] Draft save/restore/clear workflow complete
- [x] YAML import/export/sync implemented
- [x] Publish creates immutable revision snapshots
- [x] Revision history with rollback functional
- [x] Status badges (Public/Draft/AI) render
- [x] Language version management implemented
- [x] API routes created and tested
- [x] JS-YAML vendor library integrated
- [x] Server-side validation using RPC working
- [x] Phase D tests passing

**Overall**: ✓ **100% COMPLETE**

---

## Timeline

| Date | Event | Status |
|------|-------|--------|
| 2026-04-30 | Phase D starts | ✓ |
| 2026-05-11 | Core delivery complete | ✓ |
| 2026-05-12 | Phases E & F begin | ✓ |

**Duration**: 12 days (on schedule)
