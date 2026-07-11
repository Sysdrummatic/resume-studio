# Phase J: AI & Ecosystem

**Status**: ◯ **PLANNED, NOT STARTED**  
**ETA**: Jul–Sep 2026 (post-launch)  
**Depends On**: Phase I completion & production launch  

> AI-assisted CV generation, community style themes, LinkedIn import, GitHub enrichment, and first integrations from the open standard.

---

## Overview

Phase J is a post-core-delivery workstream. After Phase I launches the product, Phase J adds AI features and ecosystem integrations. These are not blocking launch; they're high-value additions based on user feedback and feature requests.

### Key Theme
**From platform → ecosystem.** OpenCV YAML becomes a standard; third-party tools adopt it.

### Why After Launch?

- **No launch blockers**: AI features are nice-to-have, not must-have
- **User feedback first**: Beta users guide feature priorities
- **Parallel workstream**: Can start Phase J planning during Phase I
- **Risk mitigation**: De-couples AI provider decisions from core launch

---

## Planned Scope

### AI Demo CV Generation

**Feature**: Generate a realistic fictional CV instantly, for demo/testing purposes.

**Use Case**: New user wants to see what a polished CV looks like before investing time editing.

**Implementation**:
- [ ] `POST /api/resume/generate-demo` endpoint
- [ ] Claude API integration (or another LLM provider)
- [ ] Prompt builder for fictional CV schema
- [ ] Validation that generated CV matches OpenCV YAML contract
- [ ] Usage quota tracking (`ai_resume_generations` table)
- [ ] Editor UI with loading state and error handling
- [ ] "Generated with AI" badge on preview
- [ ] Tests for unauthorized access, quota exhaustion, schema validation
- [ ] Create first login user profile creator

**Timeline**: 3–4 weeks (after Phase I)  
**Implementation Plan**: [docs/guides/ai-demo-resume-generation-plan.md](../guides/features/ai-demo-resume-generation-plan.md)

### Job Description Tailoring

**Feature**: User provides job description; AI suggests CV modifications to align with the role.

**Use Case**: Applicant tailors CV to specific job posting without manually editing.

**Implementation** (Phase 2):
- [ ] Accept job description as input
- [ ] AI analyzes CV and JD for skill gaps
- [ ] Generate tailored fictional variant
- [ ] Show side-by-side comparison
- [ ] One-click apply to draft

**Timeline**: 2–3 weeks (after demo generation)  
**Status**: Future; design phase only

### Community Themes

**Feature**: Open-source styling contributions; users choose from curated CV themes.

**Use Case**: User wants their CV to stand out visually without hiring a designer.

**Implementation**:
- [ ] Theme system in `app/lib/cv-themes.ts`
- [ ] Tailwind/CSS variable-based theming
- [ ] Community submission guidelines
- [ ] Theme gallery on landing page
- [ ] One-click apply theme to CV

**Timeline**: 4–5 weeks  
**Status**: Design phase; community involvement needed

### LinkedIn Import

**Feature**: Seed Master Resume from LinkedIn profile.

**Use Case**: User doesn't want to manually type everything; LinkedIn has most of their history.

**Implementation**:
- [ ] LinkedIn OAuth integration
- [ ] Permission requests (profile read-only)
- [ ] Scrape education, experience, skills from profile
- [ ] Map to OpenCV YAML schema
- [ ] Manual review/cleanup by user before saving

**Timeline**: 3–4 weeks  
**Status**: API research phase

### GitHub Enrichment

**Feature**: Auto-populate tech stack and recent projects from GitHub activity.

**Use Case**: Developer's CV automatically reflects their latest work without manual updates.

**Implementation**:
- [ ] GitHub OAuth integration
- [ ] Fetch user's repositories (public)
- [ ] Extract technologies from repository topics/languages
- [ ] Extract recent commits and projects
- [ ] Suggest additions to "Tech Stack" and "Projects" sections
- [ ] User approves before adding to CV

**Timeline**: 3–4 weeks  
**Status**: API research phase

### Third-Party Integrations

**Feature**: OpenCV YAML standard becomes a published spec; other tools integrate with it.

**Use Case**: ATS system imports CV from OpenCiVera; blog platform pulls resume data for author bio.

**Implementation**:
- [ ] Publish OpenCV YAML specification as open repo
- [ ] Create SDK/client libraries (JavaScript, Python)
- [ ] Document integration examples
- [ ] Provide public API endpoints (authenticated)
- [ ] First integration partner onboarded

**Timeline**: 5–6 weeks (ongoing)  
**Status**: Community engagement phase

---

## Key Decisions & Constraints

### AI Provider Selection

**Options**:
1. **Claude API** (Anthropic) — reasoning, document context, safe outputs
2. **OpenAI GPT-4** — general purpose, widely supported
3. **Open-source (Llama)** — self-hosted, cost control

**Decision Needed**: Phase J planning session with team

**Factors**:
- Cost per generation
- Rate limiting and quotas
- Output quality and determinism
- User privacy (data retention)
- Latency and reliability

### Community Contribution Model

**Governance**:
- Pull requests reviewed by maintainers
- Style guidelines documented
- Accessibility and performance standards

**Licensing**:
- Contributions licensed under project license (MIT?)
- Credit given to theme creators
- Optional revenue sharing model?

---

## Testing & Safety

### LLM Output Validation

- [ ] Generated CV matches OpenCV YAML schema
- [ ] No personal data hallucination (real names, addresses, etc.)
- [ ] Realistic content (no lorem ipsum, no placeholder text)
- [ ] Reasonable diversity in CV styles
- [ ] No harmful, discriminatory, or offensive content

### Safety Testing

- [ ] Quota limits prevent abuse (max 5 generations/user/day)
- [ ] User must consent before generation
- [ ] Generated CVs clearly marked as fictional
- [ ] No training on real user CVs (privacy)

---

## Related Documentation

### Implementation Plans
- [AI Demo Resume Generation Workstream](../guides/features/ai-demo-resume-generation-plan.md)

### Architecture (Future ADRs)
- ADR 0016 (TBD): AI Generation Model and Safety (to be created)
- ADR 0017 (TBD): Third-Party Integration API (to be created)

### Execution
- [STATUS.md](../STATUS.md)

---

## Dependency Graph

```
Phase I Launch
│
├─→ AI Demo Generation (3-4w)
│   └─→ Job Description Tailoring (2-3w)
│
├─→ Community Themes (4-5w, parallel)
│
├─→ LinkedIn/GitHub Integration (3-4w each, parallel)
│
└─→ Third-Party Integrations (5-6w, ongoing)
```

---

## Success Criteria

✓ **At least one AI feature shipped** (demo generation minimum)  
✓ **Community contributions started** (1+ theme)  
✓ **OpenCV YAML spec published** (first third-party integration)  
✓ **Zero safety/privacy incidents**  

---

## Phase J Planning Checklist

Before starting Phase J implementation:

- [ ] Team meeting on AI provider selection
- [ ] Budget approval for API costs
- [ ] Privacy and safety guidelines finalized
- [ ] Community engagement plan documented
- [ ] Phase J ADRs drafted (AI generation, integrations)
- [ ] First feature design doc (likely: demo generation)

---

## Transition to Phase N (Vision)

Phase J success sets up Phase N (Professional Identity Platform):
- Recruiter access powered by AI-discovered insights
- Community themes become verified visual standards
- Third-party integrations drive adoption
- Open standard ecosystem matures

---

## Non-Scope (Phase N or Later)

- **Recruiter recruiting/matching**: Requires verified identity (Phase N)
- **Salary insights**: Requires external data partnerships (Phase N)
- **Course recommendations**: Requires external education integrations (Phase N)
- **Verified badge system**: Requires identity verification (Phase N)

---

## Current Status

**Planning Phase**: Architecture decisions pending. Implementation blocked until Phase I launch (target: end of June 2026).

**Next Steps**:
1. Final Phase I launch confirmation
2. Schedule Phase J kickoff meeting
3. Prioritize features based on beta user feedback
4. Begin AI provider evaluation
