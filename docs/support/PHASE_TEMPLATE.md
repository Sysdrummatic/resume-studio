# Phase X: [Phase Name]

**Status**: ⬡ **[% COMPLETE]** / ✓ **COMPLETE** / ◯ **PLANNED** / ◐ **IN PROGRESS**  
**ETA**: [Month Year]  
**Started**: [YYYY-MM-DD]  
**Core Delivered**: [YYYY-MM-DD]

> [One-sentence description of phase purpose and outcome. What does the user/system gain?]

---

## Overview

[2–3 sentence explanation of what this phase delivers, why it matters, and how it builds on the previous phase.]

### Key Theme

**[Concept shift.]** Brief statement of the transformation this phase represents.

---

## Delivered Scope

### [Subsection 1: Major Feature Group]

- ✓ **[Feature name]**: [Brief description]
  - [Key detail]
  - [Key detail]

- ✓ **[Feature name]**: [Brief description]
  - [Deliverable 1]
  - [Deliverable 2]

### [Subsection 2: Supporting Feature Group]

- ✓ **[Database/Infrastructure change]**: [What changed]
  - [Impact]
  - [Validation method]

- ✓ **[API/Route addition]**: [What was added]
  - [Scope]
  - [Authentication/Authorization]

### [Subsection 3: Quality/Non-Functional]

- ✓ **[Testing coverage]**: [What was tested]
- ✓ **[Performance/Security consideration]**: [What was implemented]
- ✓ **[Documentation]**: [What was documented]

---

## Architecture Decision Records

Link to all ADRs that define contracts for this phase:

- [ADR XXXX: [Decision Name]](../adr/XXXX-decision-name.md) — [Brief summary of why/what]
- [ADR YYYY: [Decision Name]](../adr/YYYY-another-decision.md) — [Brief summary]

---

## Implementation Details

### Database Schema

**[Table name]**:
```sql
id (uuid, pk)
user_id (uuid, fk → profiles)
[field] ([type], [constraints])
[field] ([type], [constraints])
created_at (timestamp)
updated_at (timestamp)
```

**[Table name]**:
```sql
id (uuid, pk)
[relationship fields]
[data fields]
```

### API Routes

- `[METHOD] /api/[resource]` — [Purpose]
- `[METHOD] /api/[resource]/[action]` — [Purpose]
- `[METHOD] /api/[resource]?[param]=[value]` — [Purpose]

### Key Components/Files

- `app/[feature]/[component].tsx` — [Purpose]
- `app/lib/[utility].ts` — [Purpose]
- `app/api/[route]/route.ts` — [Purpose]

### Configuration/Env Vars

```
[ENV_VAR_NAME]=[value or description]
[ANOTHER_VAR]=[value or description]
```

---

## Testing & QA Checklist

- [ ] [Feature/component] renders without errors
- [ ] [Feature/component] handles edge cases (empty, error, null)
- [ ] [API endpoint] returns correct HTTP status codes
- [ ] [API endpoint] enforces authentication/authorization
- [ ] [Database changes] migrations run without errors
- [ ] [Database changes] RLS policies enforce access control
- [ ] [Integration] feature works end-to-end (user flow)
- [ ] [Performance] queries use indexes where needed
- [ ] [Security] no SQL injection / XSS / CSRF vulnerabilities
- [ ] [Compatibility] works across browser/device targets
- [ ] [Documentation] implementation matches documented behavior
- [ ] [Test coverage] >80% for critical paths
- [ ] [Manual validation] performed on [environment: preview/staging/prod]

**Test Command**: `npm test` (includes Phase [X] contract tests)

---

## Known Risks & Mitigations

### Risk 1: [Description of Risk Scenario]

**Scenario**: [Concrete example of when/how this could fail]

**Mitigation**:
- [Specific preventive measure]
- [Monitoring/alerting approach]
- [Rollback/recovery plan]

### Risk 2: [Description of Risk Scenario]

**Scenario**: [Concrete example]

**Mitigation**:
- [Preventive measure]
- [Monitoring approach]

---

## Related Documentation

### Architecture Decisions
- [ADR XXXX: [Name]](../adr/XXXX-name.md)

### Guides
- [Guide name](../guides/[category]/guide-name.md) — [purpose]

### Testing
- [Test contract/checklist](../guides/testing/test-contracts.md)

### Execution
- [action-plan.md § Phase X](../action-plan.md#phase-x---[phase-name-lowercase])

---

## Transition to Phase [X+1]

[Phase X] delivers [core capability]; Phase [X+1] adds [next capability].

**Phase [X+1] Dependencies** (status):
- ✓ [Dependency from this phase]
- ✓ [Dependency from this phase]
- ⏳ [Blocker or pending work]

---

## Success Criteria

✓ **All Phase [X] deliverables shipped**:
- [Deliverable 1 complete and tested]
- [Deliverable 2 complete and tested]
- [Deliverable 3 complete and tested]
- [Zero data loss/regressions]
- [Performance benchmarks met]

✓ **Ready to begin Phase [X+1]** ([next phase])

---

## Phase [X] Completion Checklist

From [action-plan.md § Phase X](../action-plan.md#phase-x---[phase-name-lowercase]):

- [ ] [Specific deliverable 1 implemented and tested]
- [ ] [Specific deliverable 2 implemented and tested]
- [ ] [Integration 1 working end-to-end]
- [ ] [Integration 2 working end-to-end]
- [ ] [Database migrations applied successfully]
- [ ] [RLS policies in place and enforced]
- [ ] [Phase [X] tests passing]
- [ ] [No regressions in Phase [X-1] features]
- [ ] [Documentation updated to match implementation]
- [ ] [Release notes prepared]

**Overall**: ⏳ **[X]% COMPLETE** / ✓ **100% COMPLETE**

---

## Timeline

| Date | Event | Status |
|------|-------|--------|
| YYYY-MM-DD | Phase [X] starts | ⏳ |
| YYYY-MM-DD | Milestone 1 achieved | ⏳ |
| YYYY-MM-DD | Core delivery complete | ⏳ |
| YYYY-MM-DD | Phase [X+1] begins | ⏳ |

**Duration**: [N] days (on/off schedule)

---

## Notes & Decisions

- **Key decision 1**: [Rationale for architectural choice]
- **Trade-off made**: [What was chosen and why]
- **Future consideration**: [Something to watch for next phase]
