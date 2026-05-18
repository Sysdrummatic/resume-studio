# Task Checklists

Oto lista zadań i ich status w ramach projektu OpenCVHub. Ten plik służy jako Shared Context Pool dla zespołu agentów.

## Aktywne zadania

- [x] Pełna migracja na natywny standard Antigravity (2026-05-16)
  - [x] Architektura folderów .agent/skills/
  - [x] Konsolidacja zespołu w .agent/agents.md
  - [x] Konfiguracja główna GEMINI.md
  - [x] Czyszczenie środowiska (usunięcie .codex)

## Logi SMI Manifest (Ostatnie)

- [ ] Implementacja nowego eksportu PDF (Bento-style)
  - [ ] software_architect: Zaprojektowanie kontraktu i planu
  - [ ] backend_engineer: Aktualizacja endpointu PDF i usunięcie starego kodu
  - [ ] frontend_engineer: Wdrożenie CvPdfTemplate.tsx i modyfikacja UI

## Logi SMI Manifest (Ostatnie)

```yaml
REQ: software_architect
CMD: plan_pdf_migration
CTX: 
  ref: "Wdrożenie nowego eksportu PDF (bento-style) i usunięcie starej implementacji"
  scope: [app/lib/resume-pdf.tsx, app/api/resume/export/pdf/route.ts, app/lib/CvPdfTemplate.tsx, app/resume/resume-view-client.tsx, app/master-resume/resume-live-preview.tsx]
```

## Walidacja systemu

- **Lint**: OK
- **Typecheck**: OK
- **Tests**: OK
