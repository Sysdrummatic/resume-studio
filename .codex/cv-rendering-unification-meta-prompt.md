# [IMPLEMENTATION] CV Rendering Unification

## Task
Przeprowadzić kompletne, bezpieczne i odwracalne ujednolicenie systemu renderowania CV w repo `plm-resume`, bez udziału użytkownika w trakcie wdrożenia.

Docelowy model systemu:

- `template: sample-two-column`
- `theme: cv-basic-dot`
- `modes: public | editor | preview | pdf`

Wspólny `resume chrome`:

- language switcher
- badges: `public | draft | ai-generated`
- actions: `PDF | ATS Ready`

## Product Intent
Bazowym wzorcem layoutu i estetyki jest Sample CV Arianny.

Bazowym wzorcem zachowań operacyjnych są rozwiązania z obecnego preview:

- language switcher dla 2 języków
- language switcher dla 3+ języków
- badges statusowe
- akcje eksportowe `PDF` i `ATS Ready`

Celem nie jest kosmetyczny refactor. Celem jest zbudowanie jednego kanonicznego systemu renderowania CV, który zastąpi równoległe ścieżki `sample/public/editor/preview/pdf`.

## Non-Negotiable Target State
Po zakończeniu prac system musi spełniać wszystkie warunki:

1. Jeden bazowy renderer HTML CV.
2. Jeden docelowy template: `sample-two-column`.
3. Jeden docelowy theme: `cv-basic-dot`.
4. Wspólny `resume chrome` dla `public/editor/preview`.
5. Spójny kontrakt danych dla `sample/public/private/editor`.
6. PDF oparty o ten sam model renderowania albo jawnie zgodny adapter PDF do tego modelu.
7. Brak utrzymywania równoległych implementacji tego samego layoutu.
8. Zachowane obecne bezpieczeństwo, `public route behavior` i kontrakty eksportu.
9. Całość wdrożona end-to-end bez pytania użytkownika o decyzje pośrednie, chyba że wykryty zostanie realny konflikt danych lub ryzyko naruszenia istniejących kontraktów produkcyjnych.

## Rules Of Collaboration
Wszyscy agenci pracują jak jeden zespół wykonawczy. Nie działają jako niezależni konsultanci, tylko jako wspólny task force.

Każdy agent musi:

- raportować ustalenia do wspólnego kontekstu zadania
- czytać ustalenia innych agentów przed zmianą architektury lub implementacji
- aktualizować plan, ryzyka i decyzje
- unikać duplikacji pracy
- nie nadpisywać cudzych ustaleń bez uzasadnienia
- przy konflikcie propozycji eskalować do `software_architect`, a nie do użytkownika

## Shared Context Protocol
Używajcie wspólnego kontekstu zadania w formie krótkich manifestów SMI.

Każdy istotny wniosek, decyzja i blokada musi być zapisana w stylu:

```yaml
REQ: <AgentName>
CMD: <ShareDecision|ShareFinding|ShareRisk|RequestReview|RequestInput>
CTX:
  ref: <TaskID or file/module>
  scope: [file1, file2]
LMT: [constraint1, constraint2]
BODY:
  summary: "<krótki opis>"
  impact: "<na co wpływa>"
  proposed_action: "<co dalej>"
```

Minimalne obowiązki komunikacyjne:

- `software_architect` publikuje kontrakt docelowy i granice systemu
- `ui_ux_designer` publikuje decyzje dot. visual baseline i chrome behavior
- `frontend_engineer` publikuje plan migracji rendererów i CSS
- `backend_engineer` publikuje decyzje dot. persistence/mapping/export
- `test_engineer` publikuje macierz regresji i coverage plan

## Agent Roster And Ownership

### 1. `software_architect`
Owner:

- model `template/theme/mode/chrome`
- strategia migracji
- granice komponentów
- decyzje dot. source of truth

Responsibilities:

- zdefiniować ostateczny kontrakt architektury renderowania CV
- rozstrzygnąć co należy do `template`, `theme`, `mode`, `chrome`
- wskazać jeden bazowy renderer
- wskazać które obecne ścieżki są do migracji, a które do usunięcia
- zatwierdzić plan integracji PDF i ATS

Deliverables:

- krótki dokument architektury
- mapa komponentów źródłowych i docelowych
- lista ryzyk migracyjnych
- decyzje wiążące dla pozostałych agentów

### 2. `ui_ux_designer`
Owner:

- wizualna i interakcyjna spójność systemu

Responsibilities:

- traktować Sample CV jako bazę layoutu i estetyki
- przenieść zachowania z preview do docelowego chrome
- opisać zachowanie language switchera dla 2 języków
- opisać zachowanie language switchera dla 3+ języków
- opisać status badges
- opisać zachowanie `PDF` i `ATS Ready` w `public/editor/preview`
- pilnować, by integracja nie degradowała jakości Sample CV

Deliverables:

- spec chrome
- zasady zachowania per mode
- rekomendacje accessibility i hierarchy

### 3. `frontend_engineer`
Owner:

- implementacja docelowego systemu renderowania

Responsibilities:

- wdrożyć bazowy renderer oparty na Sample CV
- wydzielić `sample-two-column`
- wydzielić `cv-basic-dot`
- wydzielić wspólny `resume chrome`
- przepiąć sample route, editor preview, dashboard preview, public routes
- ograniczyć lub usunąć duplikację CSS
- zachować małe, odwracalne commity

Deliverables:

- działający unified renderer
- migracja tras/render paths
- cleanup zduplikowanych warstw stylów

### 4. `backend_engineer`
Owner:

- warstwa kontraktów domenowych i eksportu

Responsibilities:

- sprawdzić czy potrzebne jest trwałe mapowanie `templateId/themeId` dla preset/publication
- jeśli konieczne, wdrożyć minimalne bezpieczne rozszerzenie kontraktu
- utrzymać zgodność public routes i export APIs
- dopilnować, żeby PDF/ATS konsumowały nowy model bez łamania kontraktów
- nie osłabiać auth, RLS, publication semantics

Deliverables:

- bezpieczny model danych dla render configuration
- zgodne API/export flow

### 5. `test_engineer`
Owner:

- regresja, walidacja, contract safety

Responsibilities:

- zbudować plan testów dla `public | editor | preview | pdf`
- dopisać lub zaktualizować testy renderu, labeli, chrome i eksportu
- sprawdzić language switcher dla 2 i 3+ języków
- sprawdzić badges i akcje exportu
- uruchomić wymagane walidacje repo

Deliverables:

- test matrix
- test updates
- wynik końcowej walidacji

## Execution Sequence

### Phase 1: Architecture Freeze
Lead: `software_architect`

Support:

- `ui_ux_designer`
- `frontend_engineer`

Tasks:

- potwierdzić definicje `template/theme/mode/chrome`
- zatwierdzić `sample-two-column` jako canonical template
- zatwierdzić `cv-basic-dot` jako canonical theme
- opisać source mapping:
  - Sample CV -> layout baseline
  - Preview -> chrome behavior baseline

Exit criteria:

- architektura opisana
- brak niejasności odpowiedzialności
- reszta agentów ma wiążące granice pracy

### Phase 2: UX And Behavior Spec
Lead: `ui_ux_designer`

Support:

- `software_architect`

Tasks:

- doprecyzować:
  - switcher 2 języki
  - switcher 3+ języki
  - badges
  - PDF button
  - ATS Ready button
  - różnice per mode

Exit criteria:

- gotowa spec zachowań chrome
- frontend może implementować bez zgadywania

### Phase 3: Renderer Unification
Lead: `frontend_engineer`

Support:

- `software_architect`

Tasks:

- zbudować bazowy renderer na bazie Sample CV
- odseparować go od specyfiki sample-only i editor-only
- wpiąć wspólny kontrakt propsów

Exit criteria:

- jeden renderer HTML obsługuje `sample/public/editor/preview`

### Phase 4: Data And Export Alignment
Lead: `backend_engineer`

Support:

- `frontend_engineer`

Tasks:

- dopasować domenę i export routes do nowego modelu
- ustalić status `ATS Ready`
- spiąć PDF z nową architekturą

Exit criteria:

- eksport i publication flow zgodne z nowym systemem

### Phase 5: Route Migration
Lead: `frontend_engineer`

Support:

- `backend_engineer`

Tasks:

- przepiąć:
  - sample route
  - editor preview
  - dashboard preview
  - public routes
  - compat public route
- pozostawić rollback-safe ścieżkę aż do zakończenia testów

Exit criteria:

- wszystkie główne ścieżki idą przez jeden system

### Phase 6: Cleanup And Hardening
Lead: `frontend_engineer`

Support:

- `test_engineer`
- `ui_ux_designer`

Tasks:

- usunąć martwy CSS i martwe local rules
- usunąć duplikację labels i parserów gdzie możliwe
- naprawić encoding/visual defects
- domknąć a11y

Exit criteria:

- system uproszczony i stabilny

### Phase 7: Validation
Lead: `test_engineer`

Tasks:

- uruchomić minimalne walidacje po każdej istotnej zmianie
- finalnie uruchomić:
  - `npm.cmd run lint`
  - `npm.cmd run typecheck`
  - `npm.cmd test`

Dodatkowo jeśli adekwatne:

- `npm.cmd run verify`
- `npm.cmd run ci`

Exit criteria:

- walidacja przechodzi albo są jasno opisane znane odstępstwa

## Technical Constraints

- Preserve current contracts unless explicitly migrated in a controlled way.
- Do not weaken Supabase auth/RLS/publication behavior.
- Keep changes incremental and reversible.
- Prefer additive refactor over rewrite-in-place when risk is high.
- Never create a second temporary final renderer.
- Avoid introducing a new parallel theme path.
- If a migration shim is required, mark it explicitly and remove it before completion if feasible.

## Definition Of Done
Task is complete only when:

- `sample-two-column` is the canonical template
- `cv-basic-dot` is the canonical theme
- `resume chrome` is shared and consistent
- language switcher behavior is unified
- badges are unified
- `PDF` and `ATS Ready` are integrated into shared chrome
- `sample/public/editor/preview/pdf` use one render architecture
- obsolete duplicate styling/render paths are removed or clearly deprecated
- tests and validations are run and reported

## Final Reporting Format
Na końcu zespół ma zwrócić jeden wspólny raport:

1. plan zrealizowany
2. decyzje architektoniczne
3. zmiany wdrożone
4. ryzyka lub świadome kompromisy
5. walidacja
6. manual QA remaining

## Autonomy Clause
Nie pytajcie użytkownika o zgodę na kroki pośrednie. Podejmujcie rozsądne decyzje w ramach tego planu.

Pytanie do użytkownika jest dozwolone tylko jeśli:

- wykryto realny konflikt danych lub kontraktów
- wdrożenie wymaga nieodwracalnej migracji wysokiego ryzyka
- istnieją dwie równoważne drogi o dużych skutkach produktowych, których nie da się rozstrzygnąć na podstawie repo i tej specyfikacji
