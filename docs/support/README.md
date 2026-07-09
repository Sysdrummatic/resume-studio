# Support Documentation

Supporting documents for creating and maintaining product phases.

> **Note**: This folder's phase tables/diagrams reflect a historical A–H snapshot.
> For current phase status (A–M), see [docs/STATUS.md](../STATUS.md).

---

## 📚 Quick Navigation

### Creating a New Phase

Start with these documents in order:

1. **[PHASE_CREATION_QUICKSTART.md](PHASE_CREATION_QUICKSTART.md)** ⭐ **START HERE**
   - 5-minute overview of the process
   - Quick reference sections
   - Can be printed or bookmarked

2. **[PHASE_CREATION_GUIDE.md](PHASE_CREATION_GUIDE.md)**
   - Detailed step-by-step instructions
   - Section-by-section explanations with examples
   - Common mistakes to avoid
   - Completion checklist

3. **[PHASE_TEMPLATE.md](PHASE_TEMPLATE.md)**
   - Complete template to copy
   - All required sections with placeholders
   - Use as starting point for new phase documents

---

## 📁 Folder Structure

```
docs/
├── STATUS.md                          ← Phase status, active sprint, roadmap (read this first)
│
├── phases/                            ← Phase documents (A–M)
│   ├── phase-a-platform-foundation.md
│   ├── phase-b-yaml-data-layer.md
│   └─ ... (phase-c through phase-l)
│
├── adr/                               ← Architecture Decision Records
│   ├── README.md
│   └─ ... (0001–0018 decisions)
│
├── guides/                            ← Implementation guides (by category)
│   ├── README.md
│   ├── policies/                      (ADR contracts)
│   ├── testing/                       (QA & test contracts)
│   ├── development/                   (Setup & patterns)
│   └── features/                      (Feature plans)
│
└── support/                           ← This folder (creation templates)
    ├── README.md
    ├── PHASE_CREATION_QUICKSTART.md
    ├── PHASE_CREATION_GUIDE.md
    └── PHASE_TEMPLATE.md
```

---

## 🚀 Quick Process for New Phases

### In 5 Steps

```bash
# 1. Read quick start (5 minutes)
cat docs/support/PHASE_CREATION_QUICKSTART.md

# 2. Copy template
cp docs/support/PHASE_TEMPLATE.md docs/phases/phase-x-[name].md

# 3. Fill using guide as reference
# (Follow PHASE_CREATION_GUIDE.md section by section)

# 4. Link in STATUS.md and guides/README.md (if needed)

# 5. Verify
npm test
```

---

## 📖 Documentation Files Explained

| File | Purpose | Read When |
|------|---------|-----------|
| **PHASE_CREATION_QUICKSTART.md** | 5-minute quick reference | You're in a hurry |
| **PHASE_CREATION_GUIDE.md** | Detailed how-to with examples | Creating a new phase |
| **PHASE_TEMPLATE.md** | Copy-and-fill template | Starting phase document |

---

## 🎯 Common Tasks

### "I need to create Phase X"
→ Read [PHASE_CREATION_QUICKSTART.md](PHASE_CREATION_QUICKSTART.md) (5 min)  
→ Copy [PHASE_TEMPLATE.md](PHASE_TEMPLATE.md)  
→ Reference [PHASE_CREATION_GUIDE.md](PHASE_CREATION_GUIDE.md) while filling

### "I want to understand the documentation system"
→ Start with [docs/STATUS.md](../STATUS.md), then [docs/guides/README.md](../guides/README.md)

### "I need to see an example phase"
→ Look at [docs/phases/phase-e-ux-community.md](../phases/phase-e-ux-community.md) or [phase-f-public-surface.md](../phases/phase-f-public-surface.md) (most comprehensive)

---

## ✅ Before Creating a Phase

Make sure you have:
- [ ] Phase goal clearly defined
- [ ] Expected start and completion dates
- [ ] List of deliverables (3+ major items)
- [ ] Related ADRs identified (if applicable)
- [ ] Supporting guides planned (if needed)

---

## 🔗 Related Resources

**Main Navigation**
- [docs/STATUS.md](../STATUS.md) — Phase progress and status
- [docs/guides/README.md](../guides/README.md) — Guides by category

**Phase Documents**
- [Phase A: Platform Foundation](../phases/phase-a-platform-foundation.md)
- [Phase B: YAML Data Layer](../phases/phase-b-yaml-data-layer.md)
- [Phase C: Auth, RBAC & Admin](../phases/phase-c-auth-rbac-admin.md)
- [Phase D: Editor Canvas](../phases/phase-d-editor-canvas.md)
- [Phase E: UX & Community](../phases/phase-e-ux-community.md)
- [Phase F: Public Surface](../phases/phase-f-public-surface.md)
- [Phase G: Community Beta Testing](../phases/phase-g-community-beta-testing.md)
- [Phase H: PDF Visual Fidelity](../phases/phase-h-vercel-puppeteer-pdf.md)

**Project Documentation**
- [STATUS.md](../STATUS.md) — Project status and phase progress
- [adr/README.md](../adr/README.md) — Architecture decisions

---

**This folder contains templates and guides for creating and organizing product phases.**
