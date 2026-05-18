# OpenCVHub Antigravity Configuration

Ten plik definiuje nadrzędne zasady pętli decyzyjnej Antigravity w projekcie OpenCVHub.

## Zasady nadrzędne

1. **Progressive Disclosure**: Zawsze priorytetyzuj instrukcje i narzędzia z katalogu `.agent/skills/` przy zadaniach technicznych. Nie wczytuj całego kontekstu na raz, jeśli nie jest to wymagane.
2. **Context First**: Przed każdą zmianą w kodzie przeanalizuj `file://project-brief.md` oraz `file://site-map-and-dependencies.md`. Musisz rozumieć "dlaczego" i "gdzie" zanim zrobisz "jak".
3. **Debug Source**: Twoim pierwszym źródłem prawdy przy debugowaniu błędów runtime są logi `file://next-dev-3001.log` (lub inne logi serwera w root).
4. **Autonomia i Raportowanie**: Działaj autonomicznie w ramach przyznanych uprawnień, ale raportuj postępy w `task-checklists.md` po każdym istotnym kroku.
5. **SMI Protocol**: W komunikacji z subagentami stosuj wyłącznie format YAML Manifest. W raportach dla użytkownika bądź zwięzły i techniczny.

## Struktura .agent/

- `agents.md`: Definicje person i ich odpowiedzialności.
- `skills/`: Specjalistyczne bazy wiedzy i standardy (np. UI/UX, Backend Patterns).

## Workflow

1. **Analyze**: Wczytaj `project-brief.md` i `GEMINI.md`.
2. **Plan**: Zdefiniuj kroki w `task-checklists.md`.
3. **Execute**: Użyj odpowiednich subagentów lub skilli.
4. **Validate**: Uruchom `npm.cmd run ci`.
5. **Finish**: Podsumuj zmiany w raporcie dla użytkownika.
