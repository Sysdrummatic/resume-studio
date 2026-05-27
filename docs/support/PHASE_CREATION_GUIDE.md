# Phase Creation Guide

> How to create a new phase document following OpenCiVera standards.

---

## Quick Start

1. Copy [PHASE_TEMPLATE.md](PHASE_TEMPLATE.md) → `docs/phases/phase-[letter]-[name].md`
2. Fill in section-by-section (see breakdown below)
3. Link from [../PHASES.md](../PHASES.md) and [../guides/README.md](../guides/README.md)
4. Create supporting guides as needed (policies, tests, checklists)
5. Run `npm test` to verify guides are referenced correctly

---

## Section-by-Section Guide

### Header Block

```markdown
**Status**: ⬡ **[% COMPLETE]** / ✓ **COMPLETE** / ◯ **PLANNED** / ◐ **IN PROGRESS**
**ETA**: [Month Year]
**Started**: [YYYY-MM-DD]
**Core Delivered**: [YYYY-MM-DD]
```

- **Status**: Current phase completion state
  - ✓ COMPLETE: All deliverables shipped and tested
  - ◐ IN PROGRESS: Currently being worked on (include %)
  - ⬡ PARTIAL: Core delivery complete, minor work remains (separate from launch prep)
  - ◯ PLANNED: Scheduled but not started
  - ✦ VISION: Long-term goal, no current timeline

- **ETA**: Target completion month/year from original plan
- **Started**: Actual start date (YYYY-MM-DD)
- **Core Delivered**: When core technical work was completed (before launch prep/minor tasks)

### Hook/Tagline

One-sentence summary. Example:
> Making CVs publicly shareable with SEO/AEO support and backward compatibility.

### Overview

2–3 sentences explaining:
- What this phase delivers
- Why it matters for the product
- How it builds on the previous phase

### Key Theme

**[Concept shift.]** Brief statement of the major transformation.

Examples:
- "From open access → authenticated, role-aware control"
- "From internal tool → public platform"
- "From data tables → interactive editing canvas"

### Delivered Scope

Organize deliverables into **logical subsections** (not just a flat list):

Example subsections:
- Authentication & Session Management
- Role-Based Access Control (RBAC)
- Admin Panel & Auditing
- Public Route & URL Model
- SEO & AEO (Search Engine Optimization)

For each subsection, list items with checkmarks:
```markdown
- ✓ **[Feature name]**: [Brief description]
  - [Key detail/deliverable]
  - [Key detail/deliverable]
```

✅ **DO**: Group related features, explain trade-offs
❌ **DON'T**: Create subsections with only 1 item; use generic names like "Features"

### Architecture Decision Records (ADRs)

List ALL ADRs that define contracts for this phase:

```markdown
- [ADR XXXX: [Decision Name]](../adr/XXXX-decision-name.md) — [Why/what brief]
- [ADR YYYY: [Decision Name]](../adr/YYYY-another-decision.md) — [Why/what brief]
```

Link directly to the ADR file. Include the ADR number and full title.

### Implementation Details

3 subsections (expand as needed):

**Database Schema**:
```sql
-- Show key tables, fields, relationships, constraints
```

**API Routes**:
```
- [METHOD] /api/[resource] — [Purpose]
- [METHOD] /api/[resource]/[action] — [Purpose]
```

**Key Components/Files**:
```
- app/[feature]/[component].tsx — [Purpose]
- app/lib/[utility].ts — [Purpose]
```

Focus on what changed, not everything. Readers can explore the code for details.

### Testing & QA Checklist

Use a checkbox list. Mark completed items with `[x]`:

```markdown
- [x] Feature renders without errors
- [x] Edge cases handled (empty, error, null)
- [ ] Performance validated
```

Include:
- Unit test coverage
- Integration test coverage
- Manual validation steps
- Performance/security checks
- Compatibility checks (browser, device, locale)

**Include test command at the end**:
```markdown
**Test Command**: `npm test` (includes Phase [X] contract tests)
```

### Known Risks & Mitigations

For each significant risk, include:
1. **Risk [N]**: [Short description]
2. **Scenario**: Concrete example of when/how this could fail
3. **Mitigation**: Specific preventive measures, monitoring, rollback plan

Example:
```markdown
### Risk 1: Data Loss During Migration

**Scenario**: Legacy data doesn't map cleanly to YAML schema, fields are dropped.

**Mitigation**:
- Dry-run mode shows all transformations
- Migration report highlights warnings
- Validation tests catch schema violations
- Can roll back to previous state
```

### Related Documentation

Organize into logical groups:

```markdown
### Architecture Decisions
- [ADR XXXX: ...](../adr/...)

### Guides
- [Guide name](../guides/policies/...)

### Testing
- [Test contracts](../guides/testing/...)

### Execution
- [action-plan.md § Phase X](../action-plan.md#phase-x-...)
```

### Transition to Next Phase

Explain:
1. What this phase enables for the next one
2. What dependencies the next phase has
3. Status of those dependencies (ready, blocked, in progress)

### Success Criteria

List concrete, verifiable criteria. Examples:
- ✓ All deliverables shipped and tested
- ✓ Zero data loss in migration
- ✓ Performance benchmarks met (< X ms response time)
- ✓ Ready to begin [next phase]

### Phase Completion Checklist

Specific tasks from [action-plan.md](action-plan.md). Use checkboxes:

```markdown
- [x] Task 1 completed
- [x] Task 2 completed
- [x] Integration test 1 passing
- [ ] Task 3 (in progress)
```

End with overall completion percentage:
```markdown
**Overall**: ✓ **100% COMPLETE** / ⏳ **75% COMPLETE**
```

### Timeline

Table format:

| Date | Event | Status |
|------|-------|--------|
| YYYY-MM-DD | Phase [X] starts | ✓ |
| YYYY-MM-DD | Core delivery | ✓ |
| YYYY-MM-DD | Phase [X+1] begins | ✓ |

Include **Duration** at the end:
```markdown
**Duration**: [N] days (on/off schedule)
```

---

## Creating Supporting Guides

When to create guides:

| Situation | Create Guide | Location | Link From |
|-----------|--------------|----------|-----------|
| New policy/contract for ADR | Yes | `guides/policies/` | Phase + ADR |
| New QA checklist | Yes | `guides/testing/` | Phase doc |
| New development pattern | Yes | `guides/development/` | Phase doc |
| Multi-month feature workstream | Yes | `guides/features/` | Phase doc |
| Simple implementation detail | No | N/A | Describe in Implementation Details |

### Guide Naming Convention

- `guides/policies/[adr-topic]-policy.md` — ADR implementation contracts
- `guides/testing/[feature]-test-contracts.md` — QA/test contracts
- `guides/testing/[feature]-qa-checklist.md` — QA validation steps
- `guides/development/[topic]-[pattern].md` — Setup/patterns
- `guides/features/[feature]-plan.md` — Detailed feature plans

### Guide Header

Every guide should include phase + ADR context:

```markdown
# [Guide Title]

**Phase**: [Phase X]  
**Related ADR(s)**: [ADR XXXX](../../adr/XXXX-name.md)  
**Linked From**: [Phase document](../phases/phase-x-name.md)
```

---

## Linking Everything Together

### Phase → Guides
In phase "Related Documentation" section:
```markdown
### Guides
- [Guide Name](../guides/policies/guide-name.md) — [Purpose]
```

### Guides → Tests
In guide header or end of guide:
```markdown
**Test Contract**: [path to test file]
```

### Tests → Guides
In test file, import guide and verify it exists/content matches:
```javascript
const guide = read("docs/guides/policies/guide-name.md");
assert(guide.includes("Key term"), "Guide missing key requirement");
```

---

## Common Mistakes to Avoid

❌ **Too vague**: "Feature X is implemented" (what feature? what does it do?)  
✅ **Specific**: "Publish creates immutable snapshot in resume_revisions table with revision_number increment"

❌ **No status indication**: Mixing completed and in-progress items without marking  
✅ **Clear status**: "- [x] Feature A (complete)" and "- [ ] Feature B (in progress)"

❌ **Orphaned guides**: Creating guides that aren't linked from any phase  
✅ **Connected**: Every guide has "Related To Phase X" and is linked from phase doc

❌ **Duplicate info**: Repeating phase description in every guide  
✅ **Complementary**: Phase doc is "what/when"; guide is "how/why/contracts"

❌ **No risk assessment**: Glossing over potential issues  
✅ **Realistic**: 2–4 significant risks with concrete mitigations

---

## Checklist for New Phase Document

Before submitting PR:

- [ ] Status, ETA, Started, Core Delivered fields filled in
- [ ] Overview + Key Theme provided (2–3 sentences)
- [ ] Delivered Scope organized into logical subsections (3+)
- [ ] All checkmarks (✓) for completed items
- [ ] ADRs listed with links (if applicable)
- [ ] Implementation Details covers database, API routes, key files
- [ ] Testing & QA Checklist includes >10 concrete items
- [ ] Known Risks & Mitigations includes 2–4 risks
- [ ] Related Documentation section complete (ADRs, guides, execution)
- [ ] Success Criteria clearly defined and verifiable
- [ ] Phase Completion Checklist with [x] marks for done items
- [ ] Timeline table with dates and status
- [ ] Linked from [PHASES.md](PHASES.md) and [guides/README.md](guides/README.md)
- [ ] All referenced guides exist and link back
- [ ] `npm test` passes (no broken guide references)

---

## Examples

For reference, review these completed phases:

- **Phase A**: [phase-a-platform-foundation.md](../phases/phase-a-platform-foundation.md) — Foundational with infrastructure focus
- **Phase C**: [phase-c-auth-rbac-admin.md](../phases/phase-c-auth-rbac-admin.md) — Complex RBAC model
- **Phase E**: [phase-e-public-surface.md](../phases/phase-e-public-surface.md) — Large scope with multiple ADRs
- **Phase F**: [phase-f-ux-community.md](../phases/phase-f-ux-community.md) — Feature-rich with analytics

---

## Questions?

Refer to:
- [../PHASES.md](../PHASES.md) — Canonical phase registry
- [../guides/README.md](../guides/README.md) — Guide organization and purpose
- [../README.md](../README.md) — Overall documentation navigation
