# Phase K — ATS Intelligence Workstream

Status: Planned (post-launch)

Depends on: Phase I complete, stable production release.

## Goal

Live ATS compliance scoring in the Master Resume editor.
Read-only analysis of YAML source — never modifies CV data.
Visual PDF layout is never touched.

## Foundation (delivered in ATS Export PR)

`app/lib/ats-export-rules.ts` zawiera:
- stałe używane przez warstwę eksportu
- typy `ATSRuleResult`, `ATSScoreCategory`, `ATSCategoryScore`, `ATSScoreResult`

Engine scoringowy Phase K-1 importuje te typy bezpośrednio.

## Phase K-1 — ATS Score Sidebar (static rules)

Branch: `feat/phase-k1-ats-score-sidebar`

Pliki do utworzenia:
- `app/lib/ats-rules.ts` — pure function `(doc: ResumeDocument) => ATSScoreResult`
- `app/components/ats-score-sidebar/` — sidebar + sub-components
- `tests/ats-rules.test.mjs`

Modyfikacje:
- `app/master-resume/editor-canvas-client.tsx` — mount sidebar, pass parsed doc

Reguły per kategoria:

**Structure (25%):**
- wymagane sekcje obecne: summary, experience, education, skills
- sekcje mapują na standardowe nagłówki ATS w eksporcie
- brak nieznanych kluczy najwyższego poziomu w schemacie

**Skills (20%):**
- `skills[*].level` jest obecne — warn że wyciek do .txt eksportu
- `tech_stack` jest osobną sekcją — warn że musi być scalona w eksporcie
- minimum 5 skills zdefiniowanych

**Dates (20%):**
- wszystkie wpisy experience mają niepuste `period`
- `period` nie kończy się tokenem z `ATS_PERIOD_OPEN_TOKENS` — warn jeśli tak
- format `YYYY-MM` wykrywalny w `period` — info jeśli inny

**Contact (20%):**
- email obecny i niepusty
- telefon obecny
- minimum 1 link społecznościowy lub portfolio

**Metadata (15%):**
- `summary[*].position` != "Default" i niepuste
- `brand_initials` zdefiniowane
- `interests` obecne — info że będzie stripped w ATS eksporcie

UI contract:
- Sidebar w edytorze jako collapsible right panel
- Score ring 0–100, kolor: czerwony < 50, amber 50–79, zielony ≥ 80
- Mini bars per kategoria pod ringiem
- Lista issues: label, ścieżka pola YAML, severity dot
- Klik issue → scroll do linii w YAML
- Zakładki ATS / Visual (Visual tab — Phase K-2)
- Aktualizacja przy każdym parse YAML (debounce 500ms)
- Stan disabled gdy brak załadowanego YAML

DoD:
- Poprawny score dla fixture Ariany Holt
- Wszystkie reguły pokryte testami jednostkowymi
- Czas aktualizacji < 600ms od zmiany YAML
- Zero regresji w testach edytora
- `docs/STATUS.md` zaktualizowany

## Phase K-2 — Visual Score tab

Reguły czytelności dla człowieka:
- długość summary (60–200 słów optimal)
- liczba bullet pointów per wpis experience (2–5 optimal)
- tytuł roli zdefiniowany i niestandardowy
- minimum jedno mierzalne osiągnięcie (liczba lub %) per wpis experience
- sekcja languages obecna jeśli skonfigurowano wiele locale

## Phase K-3 — AI keyword gap (post Phase I)

`POST /api/resume/ats-keyword-gap` — przyjmuje YAML + job description,
zwraca brakujące słowa kluczowe względem treści CV.

Model: Gemini Flash (free tier) lub Groq (Llama 3, free tier).
Rate limit: 10 req/user/dzień.
Zależność: Phase I provider setup (preferowana, nie blokująca).

## Risk register

| Ryzyko | Kontrola |
|---|---|
| Score engine dodaje latencję edytora | Debounce parse trigger 500ms |
| False positives irytują użytkowników | Każda reguła ma czytelny rationale string w UI |
| AI keyword gap wyciek CV | Explicit user opt-in per request, brak persistent storage |
| Phase K-3 AI cost overrun | Free-tier model + per-user rate limit |
