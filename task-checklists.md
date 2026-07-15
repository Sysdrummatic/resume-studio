# Task Checklists

Oto lista zadań i ich status w ramach projektu OpenCiVera. Ten plik służy jako Shared Context Pool dla zespołu agentów.

## Aktywne zadania

- [x] G-P0-03 — Ochrona uprzywilejowanych pól profilu
  - [x] software_architect: przegląd granicy RLS/RPC i modelu zagrożeń
  - [x] backend_engineer: append-only migracja allowlist + chronione RPC
  - [x] test_engineer: kontrakty, harness PostgREST oraz walidacja lint/typecheck/test/CI
  - [ ] Uruchomienie live matrix: wymaga dedykowanych zmiennych Supabase; lokalny Docker był niedostępny

- [x] Pełna migracja na natywny standard Antigravity (2026-05-16)
  - [x] Architektura folderów .agent/skills/
  - [x] Konsolidacja zespołu w .agent/agents.md
  - [x] Konfiguracja główna GEMINI.md
  - [x] Czyszczenie środowiska (usunięcie .codex)

## Logi SMI Manifest (Ostatnie)

```yaml
REQ: test_engineer
CMD: validate_profile_privileged_boundary
CTX:
  ref: "G-P0-03"
  scope: [supabase/migrations/20260714_profile_privileged_update_boundary.sql, tests/guard-profile-update-contract.test.mjs, tests/profile-privileged-fields-postgrest.test.mjs]
LMT: ["lint: pass", "typecheck: pass", "tests: 307 pass / 1 live skip", "ci: pass", "live PostgREST: credentials unavailable"]
```

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
