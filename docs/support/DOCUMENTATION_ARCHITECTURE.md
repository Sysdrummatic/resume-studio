# Documentation Architecture

Visual guide to how all documentation pieces fit together.

---

## The Documentation Hierarchy

```
📚 DOCUMENTATION SYSTEM
│
├─ 📋 ROADMAP.md (High-level timeline)
│  └─ Directs to: PHASES.md
│
├─ 📍 PHASES.md (Canonical phase registry)
│  │
│  ├─→ 📄 Phase A–H documents (docs/phases/)
│  │   └─ Each phase has:
│  │      • Status, ETA, timeline
│  │      • Delivered Scope (organized by subsection)
│  │      • ADR links
│  │      • Implementation Details
│  │      • Testing & QA Checklist
│  │      • Risk assessment
│  │      • Related Documentation links
│  │
│  └─→ 🏗️ ADRs (docs/adr/)
│      └─ Linked from phases they establish contracts for
│
├─ 📘 docs/README.md (Navigation hub)
│  └─ Directs to:
│      • PHASES.md (phase definitions)
│      • Phase guides (detailed implementation)
│      • ADRs (architecture decisions)
│      • Guides directory (by category)
│      • action-plan.md (execution checklist)
│
├─ 🎯 docs/guides/README.md (Guides organization)
│  │
│  ├─ 📋 guides/policies/ (ADR implementation contracts)
│  │  └─ Linked from: ADRs and phases
│  │
│  ├─ ✅ guides/testing/ (QA checklists and test contracts)
│  │  └─ Linked from: Phase docs and test files
│  │
│  ├─ 🛠️ guides/development/ (Setup and patterns)
│  │  └─ Linked from: Docs README
│  │
│  ├─ 📚 guides/features/ (Feature plans for future phases)
│  │  └─ Linked from: Phase documents
│  │
│  └─ 📦 guides/archive/ (Historical/unused documentation)
│     └─ Referenced for context only
│
└─ 📝 Creation Templates
   ├─ PHASE_CREATION_QUICKSTART.md ← START HERE (5 min)
   ├─ PHASE_CREATION_GUIDE.md (Detailed instructions)
   └─ PHASE_TEMPLATE.md (Copy and fill)
```

---

## Data Flow: Creating a New Phase

```
START: Need to add Phase X
  │
  ├─→ Read: PHASE_CREATION_QUICKSTART.md (5 minutes overview)
  │   ✓ Understand the 5-step process
  │
  ├─→ Copy: PHASE_TEMPLATE.md
  │   └─ Save as: docs/phases/phase-x-[name].md
  │
  ├─→ Fill: Using PHASE_CREATION_GUIDE.md as reference
  │   ├─ Overview + Key Theme
  │   ├─ Delivered Scope (3+ subsections)
  │   ├─ ADRs (link to docs/adr/)
  │   ├─ Implementation Details
  │   ├─ Testing & QA (10+ items)
  │   ├─ Known Risks (2–4 risks)
  │   ├─ Related Documentation
  │   ├─ Success Criteria
  │   ├─ Completion Checklist
  │   └─ Timeline table
  │
  ├─→ Create supporting guides (if needed)
  │   ├─ Policy? → docs/guides/policies/[topic]-policy.md
  │   ├─ Test contract? → docs/guides/testing/[topic]-test-contracts.md
  │   ├─ Dev pattern? → docs/guides/development/[topic]-pattern.md
  │   └─ Feature plan? → docs/guides/features/[feature]-plan.md
  │
  ├─→ Link in PHASES.md
  │   └─ Add phase section with all content
  │
  ├─→ Link in guides/README.md (if guides created)
  │   └─ Add guide entries to appropriate category
  │
  ├─→ Run: npm test
  │   └─ Verify all guides referenced correctly
  │
  └─→ DONE! Phase is live and discoverable
```

---

## Document Relationships

### Phase ↔ Guide Linking

```
📄 Phase E Document
│
├─ Related Documentation
│  ├─ ADRs
│  │  ├─ [ADR 0001: CV Publication Model](../adr/0001-...)
│  │  ├─ [ADR 0004: Public Route Compatibility](../adr/0004-...)
│  │  ├─ [ADR 0005: SEO/AEO Structured Data](../adr/0005-...)
│  │  └─ [ADR 0007: Publication Analytics](../adr/0007-...)
│  │
│  ├─ Test Contracts
│  │  ├─ [CV Publication Test Contracts](../guides/testing/cv-publication-test-contracts.md)
│  │  └─ [SEO/AEO QA Checklist](../guides/testing/seo-aeo-preview-qa-checklist.md)
│  │
│  ├─ Guides
│  │  ├─ [Public Route Compatibility Rollout](../guides/policies/public-route-compatibility-rollout.md)
│  │  └─ [Deployment QA Checklist](../guides/testing/deployment-qa.md)
│  │
│  └─ Execution
│     └─ [action-plan.md § Phase E](../action-plan.md#phase-e-...)
│
└─ ✅ Test File Verification
   └─ tests/adr-0005-seo-aeo-policy.test.mjs
      └─ Verifies guide content matches implementation
```

---

## Navigation Paths

### "I want to understand Phase X"
```
ROADMAP.md
  ↓
docs/README.md
  ↓
docs/PHASES.md
  ↓
docs/phases/phase-x-name.md ← You are here
  ↓
Linked guides, ADRs, and tests
```

### "I need to implement Phase X"
```
docs/PHASES.md
  ↓
docs/phases/phase-x-name.md (Implementation Details section)
  ↓
Linked guides:
  • guides/policies/ (contracts)
  • guides/testing/ (QA checklist)
  • guides/development/ (setup patterns)
  ↓
docs/adr/ (for architectural decisions)
```

### "I'm creating a new phase"
```
docs/PHASE_CREATION_QUICKSTART.md (Start here, 5 min)
  ↓
docs/PHASE_CREATION_GUIDE.md (Detailed how-to)
  ↓
Copy docs/PHASE_TEMPLATE.md
  ↓
docs/phases/phase-x-name.md (Fill in sections)
  ↓
Create guides (if needed)
  ↓
npm test (Verify)
  ↓
Done!
```

### "I need to find a specific guide"
```
docs/guides/README.md
  ↓
Choose category:
  • policies/ (ADR contracts)
  • testing/ (QA, test contracts)
  • development/ (setup, patterns)
  • features/ (feature plans)
  • archive/ (historical)
```

---

## File Organization

### Core Documentation
```
docs/
├── PHASES.md                          ← Canonical phase registry
├── README.md                          ← Documentation hub
├── ROADMAP.md                         ← Timeline view
├── ROADMAP_STRUCTURE.json             ← Machine-readable roadmap
├── action-plan.md                     ← Execution checklist
│
├── PHASE_CREATION_QUICKSTART.md       ← 5-minute guide (START HERE)
├── PHASE_CREATION_GUIDE.md            ← Detailed how-to
├── PHASE_TEMPLATE.md                  ← Template for new phases
├── IMPROVEMENTS_SUMMARY.md            ← What changed
├── DOCUMENTATION_ARCHITECTURE.md      ← This file
│
├── adr/
│   ├── README.md                      ← ADR index
│   ├── 0001-cv-publication-model.md
│   ├── 0002-opencv-yaml-public-contract.md
│   └─ ... (ADR 0003–0012)
│
├── phases/
│   ├── phase-a-platform-foundation.md
│   ├── phase-b-yaml-data-layer.md
│   ├── phase-c-auth-rbac-admin.md
│   ├── phase-d-editor-canvas.md
│   ├── phase-e-public-surface.md
│   ├── phase-f-ux-community.md
│   ├── phase-g-hardening-qa.md
│   └── phase-h-ai-ecosystem.md
│
└── guides/
    ├── README.md                      ← Guides index by category
    ├── codex-custom-instruction.md    ← Codex behavior guide
    │
    ├── policies/
    │   ├── privacy-first-admin-access-policy.md
    │   ├── public-route-compatibility-rollout.md
    │   ├── opencv-yaml-public-contract-policy.md
    │   └─ ... (policy documents)
    │
    ├── testing/
    │   ├── cv-publication-test-contracts.md
    │   ├── seo-aeo-preview-qa-checklist.md
    │   ├── deployment-qa.md
    │   └─ ... (test contracts & QA checklists)
    │
    ├── development/
    │   ├── local-development.md
    │   ├── environment-matrix.md
    │   ├── responsive-ui-and-drawer-patterns.md
    │   └─ ... (setup & patterns)
    │
    ├── features/
    │   ├── ai-demo-resume-generation-plan.md
    │   └─ ... (feature workstreams)
    │
    └── archive/
        ├── phase-i-features-backlog.md
        ├── saas-transition-work-plan.md
        ├── react-frontend-transition-plan.md
        └─ ... (historical documents)
```

---

## Key Principles

### 1️⃣ Single Source of Truth
- **PHASES.md** = Canonical phase definitions
- **Individual phase files** = Comprehensive implementation details
- All other docs link back to these

### 2️⃣ Hierarchical Navigation
```
High-level (ROADMAP) → Medium-level (PHASES) → Details (Phase docs) → Implementation (Guides)
```

### 3️⃣ Bidirectional Linking
```
Phase doc
  ↔ Related Guides
  ↔ ADRs
  ↔ Action items
  ↔ Tests (verify guide content)
```

### 4️⃣ Separation of Concerns
| Document | Purpose | Who Reads |
|----------|---------|-----------|
| Phase | What, when, why | Product managers, project leads |
| Guide | How, detailed contracts | Engineers, QA |
| ADR | Why (architecture), decision context | Architects, senior engineers |
| Test | Verification of contracts | QA, CI/CD |

### 5️⃣ No Duplication
- Phase = high-level what/when/why
- Guide = detailed how/process/contracts
- Don't repeat; link instead

---

## Quick Access (Bookmarks)

📍 **Phase Registry**
- [../PHASES.md](../PHASES.md) — All phases A–I

📄 **Phase Documents**
- [Phase A: Platform Foundation](../phases/phase-a-platform-foundation.md)
- [Phase B: YAML Data Layer](../phases/phase-b-yaml-data-layer.md)
- [Phase C: Auth, RBAC & Admin](../phases/phase-c-auth-rbac-admin.md)
- [Phase D: Editor Canvas](../phases/phase-d-editor-canvas.md)
- [Phase E: Public Surface](../phases/phase-e-public-surface.md)
- [Phase F: UX & Community](../phases/phase-f-ux-community.md)
- [Phase G: Hardening & QA](../phases/phase-g-hardening-qa.md)
- [Phase H: AI & Ecosystem](../phases/phase-h-ai-ecosystem.md)

📝 **Create New Phases**
- [Quick Start (5 min)](PHASE_CREATION_QUICKSTART.md)
- [Full Guide](PHASE_CREATION_GUIDE.md)
- [Template](PHASE_TEMPLATE.md)

🗺️ **Navigation**
- [Docs Hub](../README.md)
- [Guides Index](../guides/README.md)
- [ADRs](../adr/README.md)
- [Roadmap](../../ROADMAP.md)

---

**This architecture supports creating, organizing, and understanding product phases at any scale.**
