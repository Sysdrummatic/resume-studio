# Phase Creation — Quick Reference Card

**TL;DR**: Copy template → Fill sections → Link from PHASES.md → Create guides → Test

---

## The 5-Minute Process

### 1. Copy Template
```bash
cp docs/support/PHASE_TEMPLATE.md docs/phases/phase-X-[name].md
```

### 2. Fill Key Sections (in order)
```
✓ Header: Status, ETA, Started, Core Delivered
✓ Hook: One-sentence summary
✓ Overview: 2–3 sentence explanation
✓ Key Theme: [Concept shift.] Brief transformation statement
✓ Delivered Scope: Organize into 3+ subsections with checkmarks
✓ ADRs: List all related Architecture Decision Records
✓ Implementation Details: Database schema, API routes, key files
✓ Testing & QA: 12+ concrete checklist items + test command
✓ Known Risks: 2–4 risks with mitigations
✓ Related Documentation: Link to guides, ADRs, action items
✓ Success Criteria: 3–5 verifiable criteria
✓ Completion Checklist: Tasks from STATUS.md
✓ Timeline: Table with dates and status
```

### 3. Link from PHASES.md
Add to `docs/PHASES.md` main content area with all sections.

### 4. Create Supporting Guides (if needed)
| Need | Location | Naming |
|------|----------|--------|
| Policy/Contract | `guides/policies/` | `[topic]-policy.md` |
| Test Contract | `guides/testing/` | `[topic]-test-contracts.md` |
| QA Checklist | `guides/testing/` | `[topic]-qa-checklist.md` |
| Dev Pattern | `guides/development/` | `[topic]-pattern.md` |
| Feature Plan | `guides/features/` | `[feature]-plan.md` |

### 5. Verify
```bash
npm test  # Should show 187 passing
```

---

## Section Quick-Reference

### Status Values
```
✓ COMPLETE        All deliverables shipped and tested
⬡ 50% / 75%       Core done, minor work remains (separate percentages)
◐ IN PROGRESS     Currently being worked on (specify %)
◯ PLANNED         Scheduled but not started
✦ VISION          Long-term goal, no current timeline
```

### Key Theme Examples
```
"From blank slate → functional platform"
"From open access → authenticated, role-aware control"
"From data tables → interactive editing canvas"
"From internal tool → public platform"
```

### Delivered Scope Organization
```
### [Major Feature Group 1]
- ✓ Feature A
- ✓ Feature B

### [Major Feature Group 2]
- ✓ Feature C
- ✓ Feature D

### [Quality/Non-Functional]
- ✓ Testing coverage
- ✓ Performance optimization
```

### Testing Checklist Template
```
- [ ] Feature renders without errors
- [ ] Edge cases handled (empty, error, null)
- [ ] API returns correct status codes
- [ ] Database changes migrated successfully
- [ ] RLS policies enforced
- [ ] Integration works end-to-end
- [ ] Performance benchmarks met
- [ ] Security checks pass (no injection, XSS, CSRF)
- [ ] Compatibility verified
- [ ] Documentation updated
- [ ] Test coverage >80%

**Test Command**: npm test
```

### Risk Template
```
### Risk 1: [Description]

**Scenario**: [Concrete example]

**Mitigation**:
- [Preventive measure]
- [Monitoring approach]
- [Rollback plan]
```

---

## Common Links (Copy/Paste Ready)

### ADR References
```markdown
- [ADR XXXX: [Name]](../adr/XXXX-name.md) — [Brief why]
```

### Guide References
```markdown
- [Guide Name](../guides/policies/guide-name.md)
- [Guide Name](../guides/testing/guide-name.md)
```

### Execution Plan Link
```markdown
[STATUS.md](../STATUS.md)
```

### Next Phase Transition
```markdown
## Transition to Phase [X+1]

Phase [X] delivers [core capability]; Phase [X+1] adds [next capability].

**Phase [X+1] Dependencies** (status):
- ✓ [Dependency 1]
- ✓ [Dependency 2]
```

---

## Avoid These Mistakes

| ❌ Wrong | ✅ Right |
|---------|----------|
| "Feature implemented" | "Publish creates immutable snapshot in resume_revisions" |
| Mixing [x] and [ ] without explanation | "- [x] Task done" and "- [ ] Task pending" |
| Creating guides not linked from phases | Link guides in "Related Documentation" section |
| Duplicating phase description in guides | Phase = what/when; Guide = how/why/contracts |
| No risk assessment | 2–4 realistic risks with concrete mitigations |
| Using generic subsection names | "Features" → "Public Route & URL Model", "SEO & AEO" |

---

## Example Structure (Copy This Layout)

```markdown
# Phase X: [Name]

**Status**: ✓ **COMPLETE** / ◐ **50% IN PROGRESS**
**ETA**: [Month Year]
**Started**: [YYYY-MM-DD]
**Core Delivered**: [YYYY-MM-DD]

> [One-sentence description]

---

## Overview

[2–3 sentences]

### Key Theme

**[Concept shift.]** Brief transformation.

---

## Delivered Scope

### [Group 1]
- ✓ **Feature**: [Description]

### [Group 2]
- ✓ **Feature**: [Description]

---

## Architecture Decision Records

- [ADR XXXX: Name](../adr/XXXX-name.md)

---

## Implementation Details

### Database Schema
### API Routes
### Key Components

---

## Testing & QA Checklist

- [x] Item 1
- [x] Item 2

**Test Command**: npm test

---

## Known Risks & Mitigations

### Risk 1
**Scenario**: ...
**Mitigation**: ...

---

## Related Documentation

### Architecture Decisions
- [ADR XXXX: Name](../adr/XXXX-name.md)

### Guides
- [Guide Name](../guides/category/guide.md)

### Execution
- [STATUS.md](../STATUS.md)

---

## Success Criteria

✓ All deliverables shipped and tested
✓ Ready to begin Phase [X+1]

---

## Phase X Completion Checklist

- [x] Task 1
- [x] Task 2

**Overall**: ✓ **100% COMPLETE**

---

## Timeline

| Date | Event | Status |
|------|-------|--------|
| YYYY-MM-DD | Starts | ✓ |
| YYYY-MM-DD | Complete | ✓ |

**Duration**: N days
```

---

## Helpful Commands

```bash
# Run tests
npm test

# Find phase files
ls docs/phases/

# Check guide references
grep -r "docs/guides/" docs/phases/

# Find broken links
grep -r "guides/" docs/phases/ | grep -v "guides/policies" | grep -v "guides/testing"
```

---

## Files to Reference While Creating

- **Template**: [PHASE_TEMPLATE.md](PHASE_TEMPLATE.md)
- **Full Guide**: [PHASE_CREATION_GUIDE.md](PHASE_CREATION_GUIDE.md)
- **Phase Registry**: [../PHASES.md](../PHASES.md)
- **Completed Example**: [../phases/phase-e-ux-community.md](../phases/phase-e-ux-community.md)

---

**Start here → Fill template → Run npm test → Link from PHASES.md → Done! ✅**
