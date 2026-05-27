# Phase B: YAML Data Layer

**Status**: ✓ **COMPLETE**  
**ETA**: Apr–May 2026  
**Started**: 2026-04-08  
**Core Delivered**: 2026-04-17  

> Establishing YAML as the canonical CV format, designing the database schema, and building migration tooling for consuming YAML data.

---

## Overview

Phase B transforms the data model from generic JSON to a structured YAML-first approach. This establishes a clear contract for resume data, enables validation, and creates the foundation for all downstream features (editor, publication, analytics).

### Key Theme
**From generic JSON → structured YAML-first model.** Data becomes AI-friendly and validation-ready.

---

## Delivered Scope

### Data Model Foundation

- ✓ **`resume_documents` table**: One row per user + locale (EN/PL)
  - Stores YAML content as text
  - Tracks modification timestamp
  - Links to user profile
  
- ✓ **`resume_revisions` table**: Immutable snapshots
  - Created when user publishes
  - References `resume_documents` + timestamp
  - Enables rollback to any published version
  
- ✓ **`resume_public_links` table**: Public sharing
  - Maps published revisions to public URLs
  - Tracks canonical and compatibility paths
  - Supports multi-language publication

### YAML Schema & Validation

- ✓ **OpenCV YAML Schema**: Structured CV format
  - Profile (name, email, location, etc.)
  - Summary/objective section
  - Experience (with dates, descriptions)
  - Education (degree, institution, dates)
  - Skills (categories, proficiency levels)
  - Languages, certifications, projects
  - Validation rules for each section

- ✓ **Validation tooling**: Runtime and build-time checks
  - YAML → JSON parsing
  - Schema validation (required fields, types)
  - Coercion from legacy JSON
  - Error messages for invalid data

### Migration Tooling

- ✓ **Legacy JSON → YAML migrator** script
  - Dry-run mode with detailed reports
  - SQL generation for backfill
  - Handles missing fields and defaults
  - Tracks migration warnings

- ✓ **Test coverage** for migrations
  - Validates schema consistency
  - Tests coercion edge cases
  - Ensures no data loss

### Database Changes

- ✓ **Migration file**: `20260410_phase_b_yaml_data_layer.sql`
  - Creates `resume_documents` table
  - Creates `resume_revisions` table
  - Creates `resume_public_links` table
  - Sets up RLS foundation (security policies added in Phase C)
  - Creates helper functions for queries

---

## Architecture Decision Records

- [ADR 0002: OpenCV YAML Public Contract And Schema Evolution](../adr/0002-opencv-yaml-public-contract.md) — YAML schema, versioning, evolution strategy
- [ADR 0008: OpenCV Public API And Export Surface](../adr/0008-opencv-public-api-and-export-surface.md) — API contracts for YAML export

---

## Implementation Details

### Database Schema

**`resume_documents`**:
```sql
id (uuid, pk)
user_id (uuid, fk → profiles)
locale (varchar: 'en', 'pl')
content (text, YAML)
ai_generated (boolean)
created_at (timestamp)
updated_at (timestamp)
```

**`resume_revisions`**:
```sql
id (uuid, pk)
document_id (uuid, fk → resume_documents)
snapshot (text, YAML)
created_at (timestamp)
revision_number (integer)
```

**`resume_public_links`**:
```sql
id (uuid, pk)
revision_id (uuid, fk → resume_revisions)
canonical_path (text)
compatibility_path (text)
indexed (boolean)
enabled (boolean)
created_at (timestamp)
```

### YAML Structure Example

```yaml
profile:
  name: John Doe
  email: john@example.com
  location: San Francisco, CA
  summary: |
    Full-stack engineer with 5+ years experience

experience:
  - company: Tech Corp
    position: Senior Engineer
    start_date: 2022-01
    end_date: present
    description: Led team of 3 engineers...
  
education:
  - institution: University of California
    degree: BS Computer Science
    graduation: 2018

skills:
  - category: Languages
    items: [JavaScript, TypeScript, Python]
  - category: Frameworks
    items: [React, Next.js, Node.js]
```

### Migration Process

1. **Export legacy JSON** from old system
2. **Run dry-run migrator**:
   ```bash
   node scripts/phase-b/legacy-data-migrator.js \
     --input legacy-export.json \
     --report migration-report.json
   ```
3. **Review report** for warnings/errors
4. **Generate SQL backfill** (optional):
   ```bash
   node scripts/phase-b/legacy-data-migrator.js \
     --input legacy-export.json \
     --sql backfill.sql
   ```
5. **Apply migration** in Supabase

---

## Testing & QA Checklist

- [x] YAML schema validates correctly
- [x] Legacy JSON → YAML coercion works
- [x] Migration script generates correct SQL
- [x] All required YAML sections enforced
- [x] Optional fields handled correctly
- [x] Duplicate documents not created
- [x] Revision snapshots immutable
- [x] Public links mapped correctly
- [x] No data loss in migration
- [x] RLS policies foundation set (tightened in Phase C)
- [x] Database queries performant
- [x] Test coverage >90% for migration logic

**Test Command**: `npm test` (includes Phase B contract tests)

---

## Known Risks & Mitigations

### Risk 1: Data Loss During Migration

**Scenario**: Legacy data doesn't map cleanly to YAML schema, fields are dropped.

**Mitigation**:
- Dry-run mode shows all transformations
- Migration report highlights warnings
- Validation tests catch schema violations
- Can roll back to previous state

### Risk 2: Schema Incompatibility

**Scenario**: Legacy resume structure doesn't fit YAML schema, requires manual fixes.

**Mitigation**:
- Schema designed with common resume formats in mind
- Coercion rules handle common variations
- Custom field support for edge cases
- Manual audit of migration report before applying

### Risk 3: Performance Issues

**Scenario**: Large YAML documents slow down queries or parsing.

**Mitigation**:
- YAML stored as text (database handles efficiently)
- Indexes on user_id, locale for fast lookups
- Parsed in memory only when needed
- Test suite includes performance benchmarks

---

## Related Documentation

### Architecture Decisions
- [ADR 0002: OpenCV YAML Public Contract](../adr/0002-opencv-yaml-public-contract.md)
- [ADR 0008: OpenCV Public API and Export Surface](../adr/0008-opencv-public-api-and-export-surface.md)

### Guides
- [YAML Schema Validation](../guides/development/local-development.md#yaml-validation)

### Execution
- [action-plan.md § Phase B](../action-plan.md#phase-b---yaml-first-data-layer-complete)

---

## Transition to Phase C

Phase B establishes the data model; Phase C adds authentication and access control.

**Phase C Dependencies** (all ready):
- ✓ YAML data model in place
- ✓ Validation tooling tested
- ✓ Migration completed successfully
- ✓ Database queries working

---

## Success Criteria

✓ **All data model deliverables shipped**:
- YAML schema defined and validated
- Database tables created with RLS foundation
- Legacy data migrated successfully
- Zero data loss in migration
- Tests passing for all schema transformations

✓ **Ready to begin Phase C** (Auth & RBAC)

---

## Phase B Completion Checklist

From [action-plan.md § Phase B](../action-plan.md#phase-b---yaml-first-data-layer-complete):

- [x] `resume_documents` is the active source of truth
- [x] `resume_revisions` is active and queryable
- [x] `resume_public_links` is present in the active model
- [x] YAML validation and coercion tests exist
- [x] Legacy JSON to YAML migration logic exists
- [x] RLS rules for the active role model exist (foundation)
- [x] Phase B tests pass in the current repo
- [x] Next.js consumption of YAML via API working (`/r/[slug]`)
- [x] Migration completed without data loss

**Overall**: ✓ **100% COMPLETE**

---

## Timeline

| Date | Event | Status |
|------|-------|--------|
| 2026-04-08 | Phase B starts | ✓ |
| 2026-04-17 | Core delivery complete | ✓ |
| 2026-04-18 | Phase C begins | ✓ |

**Duration**: 10 days (on schedule)

