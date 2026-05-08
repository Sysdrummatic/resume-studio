# Schemat promptu dla subagentow

Uzywaj tego wzoru, gdy chcesz uruchomic kilku agentow w Codex CLI:

```text
Uzyj subagentow: <agent_1>, <agent_2>, <agent_3>.

Cel:
<co chcemy osiagnac>

Zakres:
<pliki, katalogi, route'y, funkcje albo obszary aplikacji>

Ograniczenia:
<czego nie ruszac, na co uwazac, jakie sa non-goals>

Podzial pracy:
<ktory agent odpowiada za ktory obszar>

Oczekiwany wynik:
<analiza / implementacja / testy / plan / rekomendacja>

Na koncu:
Poczekaj na wszystkich agentow, zintegruj wyniki, podaj decyzje, zmienione pliki, ryzyka i walidacje.
```

## Dostepni agenci

- `backend_engineer`: API, Supabase, auth, RBAC, migracje, logika serwerowa.
- `frontend_engineer`: React, komponenty, CSS, UX, responsywnosc, edytor CV.
- `ui_ux_designer`: ocena stylow, hierarchii wizualnej, UX, dostepnosci i responsywnosci; doradza `frontend_engineer`.
- `test_engineer`: testy, lint, typecheck, CI, regresje, walidacja.
- `software_architect`: architektura, kontrakty, granice odpowiedzialnosci, ryzyka.
- `project_manager`: planowanie, kolejnosc prac, DoD, rollout, rollback.
- `agent_optimizer`: analiza projektu i udoskonalanie konfiguracji subagentow.

## Przyklady promptow

### 1. Szybka analiza zmiany

```text
Uzyj subagentow: software_architect, backend_engineer, frontend_engineer.

Cel:
Przeanalizowac planowana zmiane przed implementacja.

Zakres:
Dotyczy przeplywu wersji jezykowych CV, endpointow resume i UI edytora.

Ograniczenia:
Nie edytujcie plikow. Nie proponujcie szerokiego refaktoru.

Podzial pracy:
software_architect ocenia granice i ryzyka kontraktow.
backend_engineer sprawdza API, Supabase i autoryzacje.
frontend_engineer sprawdza UI, stan klienta i responsywnosc.

Oczekiwany wynik:
Krotka rekomendacja, lista ryzyk i sugerowany podzial implementacji.

Na koncu:
Poczekaj na wszystkich agentow, zintegruj wyniki i podaj jedna decyzje.
```

### 2. Implementacja full-stack

```text
Uzyj subagentow: software_architect, backend_engineer, frontend_engineer, test_engineer.

Cel:
Zaimplementowac mala funkcje full-stack bez nakladania sie zmian.

Zakres:
Backend: app/api/** i app/lib/**.
Frontend: app/**/*.tsx oraz app/globals.css.
Testy: tests/**.

Ograniczenia:
Nie ruszac migracji Supabase bez wyraznej potrzeby. Nie oslabiaj auth, RBAC ani RLS.

Podzial pracy:
software_architect najpierw dzieli prace i wskazuje ryzyka.
backend_engineer wdraza kontrakt API.
frontend_engineer wdraza UI pod istniejacy kontrakt.
test_engineer dopisuje regresje i uruchamia walidacje.

Oczekiwany wynik:
Gotowa zmiana, lista zmienionych plikow i wyniki testow.

Na koncu:
Poczekaj na wszystkich agentow, zintegruj zmiany i podaj walidacje.
```

### 3. Backend, auth i Supabase

```text
Uzyj subagentow: backend_engineer, software_architect, test_engineer.

Cel:
Sprawdzic i poprawic logike backendowa zwiazana z auth, RBAC lub Supabase.

Zakres:
app/api/**, app/lib/auth-*.ts, app/lib/rbac.ts, app/lib/supabase-http.ts, supabase/**.

Ograniczenia:
Nie zmieniac UI. Nie logowac sekretow. Nie oslabiaj RLS ani funkcji security definer.

Podzial pracy:
backend_engineer analizuje i implementuje zmiane.
software_architect ocenia ryzyka bezpieczenstwa i kontraktow.
test_engineer dopisuje albo uruchamia najmniejsze sensowne testy regresji.

Oczekiwany wynik:
Bezpieczna zmiana backendowa z opisem decyzji autoryzacyjnych.

Na koncu:
Podaj zmienione pliki, zalozenia bezpieczenstwa i komendy walidacji.
```

### 4. Frontend i UX

```text
Uzyj subagentow: frontend_engineer, test_engineer.

Cel:
Poprawic UI, responsywnosc albo zachowanie komponentu.

Zakres:
app/components/**, app/dashboard/**, app/master-resume/**, app/resume/**, app/globals.css, app/resume/resume.css.

Ograniczenia:
Nie zmieniac API, migracji Supabase ani bibliotek auth. Zachowac obecny styl projektu.

Podzial pracy:
frontend_engineer wdraza zmiany UI i pilnuje dostepnosci.
test_engineer wskazuje testy regresji i uruchamia walidacje.

Oczekiwany wynik:
Mala zmiana UI z informacja, ktore route'y wymagaja manualnego sprawdzenia.

Na koncu:
Podaj zmienione pliki, ryzyka UI i wyniki testow.
```

### 5. Mistrzowska ocena UI/UX

```text
Uzyj subagentow: ui_ux_designer, frontend_engineer, test_engineer.

Cel:
Podniesc jakosc wizualna i UX wybranego ekranu bez szerokiego refaktoru.

Zakres:
app/dashboard/**, app/components/**, app/globals.css.

Ograniczenia:
Najpierw analiza, potem tylko wasko opisane poprawki. Nie zmieniac API, auth, Supabase ani kontraktow danych.

Podzial pracy:
ui_ux_designer ocenia obecny stan, hierarchie, spacing, responsywnosc, stany interakcji i dostepnosc.
frontend_engineer wdraza zaakceptowane rekomendacje w React/CSS.
test_engineer uruchamia walidacje i wskazuje manualne scenariusze QA.

Oczekiwany wynik:
Lista najwazniejszych problemow UI/UX, konkretne poprawki i kryteria akceptacji.

Na koncu:
Podaj zmienione pliki, ryzyka wizualne, viewporty do sprawdzenia i wyniki testow.
```

### 6. Doradztwo dla frontend_engineer

```text
Uzyj subagentow: ui_ux_designer, frontend_engineer.

Cel:
Pomoc frontend_engineer zaprojektowac lepsze rozwiazanie UI przed kodowaniem.

Zakres:
app/master-resume/editor-canvas-client.tsx, app/master-resume/resume-live-preview.tsx, app/globals.css.

Ograniczenia:
ui_ux_designer nie edytuje plikow; ma dac konkretne wskazowki. frontend_engineer implementuje dopiero po rekomendacji.

Podzial pracy:
ui_ux_designer opisuje docelowy uklad, hierarchie, stany, responsywnosc i acceptance criteria.
frontend_engineer ocenia wykonalnosc w obecnej strukturze i wdraza najmniejsza sensowna zmiane.

Oczekiwany wynik:
Praktyczna rekomendacja projektowa oraz implementacja zgodna z obecnym stylem aplikacji.

Na koncu:
Podaj decyzje projektowe, zmienione pliki i co trzeba sprawdzic manualnie.
```

### 7. Planowanie epika

```text
Uzyj subagentow: project_manager, software_architect, test_engineer.

Cel:
Rozbic wiekszy epik na male, bezpieczne PR-y.

Zakres:
Calosc funkcji: od API, przez UI, po testy i dokumentacje.

Ograniczenia:
Nie implementowac kodu. Nie tworzyc zbyt duzych PR-ow.

Podzial pracy:
project_manager przygotowuje kolejnosc prac, DoD i rollback.
software_architect wskazuje granice techniczne i zaleznosci.
test_engineer proponuje walidacje dla kazdego PR-a.

Oczekiwany wynik:
Plan prac z wlascicielami agentow, zakresem plikow, ryzykami i kryteriami akceptacji.

Na koncu:
Podaj rekomendowana kolejnosc PR-ow i pierwszy prompt do implementacji.
```

### 8. Ulepszanie subagentow

```text
Uzyj subagentow: agent_optimizer, software_architect, project_manager.

Cel:
Przeanalizowac aktualny stan projektu i poprawic konfiguracje subagentow.

Zakres:
.codex/agents/**, .codex/config.toml, AGENTS.md, .codex/instructions.md, .codex/site-map-and-dependencies.md.

Ograniczenia:
Nie zmieniac kodu produktu w app/**, supabase/**, public/** ani tests/**.

Podzial pracy:
agent_optimizer porownuje agentow z realnym stanem projektu i proponuje poprawki.
software_architect ocenia granice odpowiedzialnosci i ryzyka techniczne.
project_manager sprawdza czy workflow, DoD i routing agentow sa praktyczne.

Oczekiwany wynik:
Zaktualizowane instrukcje agentow albo lista precyzyjnych rekomendacji.

Na koncu:
Podaj co zostalo zmienione, dlaczego, oraz przyklady nowych promptow.
```
