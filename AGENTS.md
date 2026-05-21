# OpenCVHub Agent Team

Instrukcje nadrzędne i definicje agentów znajdują się w `file://.agent/agents.md`. Ten plik służy jako przewodnik po zasadach współpracy.

## Priorytety projektu

1. Bezpieczeństwo i integralność danych (RLS Security First).
2. Poprawność funkcjonalna.
3. Utrzymywalność i czytelność kodu.
4. Wydajność.
5. Szybkość dostarczania.

## Hierarchia modeli

- **Tier 1: Planning & Architecture** (High reasoning) - **Gemini 2.0 Pro**. Strategia, dekompozycja, migracje.
- **Tier 2: Real Implementation** (Medium reasoning) - **Gemini 2.0 Flash**. Implementacja featuerów, UI/UX, logika.
- **Tier 3: Operational Tasking** (Low reasoning) - **Gemini 1.5 Flash**. Testy, lint, walidacja, zadania powtarzalne.

## Zasady Routingu

Szczegółowe reguły routingu znajdują się w `file://.agent/agents.md`. W skrócie:
- `backend_engineer`: `app/api/**`, Supabase, Auth, RLS, Migracje.
- `frontend_engineer`: `app/**/*.tsx`, CSS, React, UI/UX implementation.
- `ui_ux_designer`: Review wizualny, doradztwo projektowe.
- `test_engineer`: `tests/**`, CI/CD, Walidacja.
- `software_architect`: Kontrakty, granice systemu, analizy ryzyka.
- `senior_system_engineer`: Design System, Design Tokens, Atomic Design.
- `project_manager`: Planowanie, DoD, koordynacja epików.

## Współpraca (SMI Manifest)

Agenci komunikują się przez manifesty YAML w `task-checklists.md` (Shared Context Pool).

### Format SMI
```yaml
REQ: <AgentName>
CMD: <Action>
CTX: 
  ref: <TaskID or FilePath>
  scope: [file1.ts, file2.tsx]
LMT: [Constraint1, Constraint2]
```

### Shared Context Pool
- **Stan zadania**: `file://task-checklists.md`.
- **Logika biznesowa**: `file://docs/action-plan.md`.
- **Kontekst techniczny**: `file://site-map-and-dependencies.md`.

## Walidacja

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run ci
```

