# Skille: gstack, impeccable i skille z konta claude.ai

Ściąga. Skille są zainstalowane globalnie w `C:\Users\lukas\.claude\skills\` i działają w każdym projekcie.
Wywołanie: `/<nazwa> [argumenty]` albo prośba zwykłym zdaniem.

Uwaga dla tego repo: `/ship` i `/document-release` zakładają VERSION/CHANGELOG i własny format commitów.
Tu obowiązuje `docs/guides/development/git-workflow.md` (`feat(ocv-XXXX): ...`, bez stopek AI).

## gstack

### Planowanie i przegląd planu
| Komenda | Do czego |
|---|---|
| `/office-hours` | Burza mózgów, „czy warto to budować” (tryb YC Office Hours) |
| `/spec` | Mglisty pomysł → precyzyjna specyfikacja / issue (5 faz) |
| `/plan-ceo-review` | Przegląd planu okiem founder/CEO: zakres, ambicja |
| `/plan-eng-review` | Przegląd architektury planu |
| `/plan-design-review` | Przegląd designu planu |
| `/plan-devex-review` | Przegląd developer experience planu (API/CLI/SDK) |
| `/autoplan` | Wszystkie przeglądy planu po kolei, automatycznie |
| `/plan-tune` | Strojenie, jak często gstack zadaje pytania |

### Kod, jakość, bezpieczeństwo
| Komenda | Do czego |
|---|---|
| `/review` | Przegląd diffa przed merge |
| `/investigate` | Systematyczne szukanie przyczyny błędu |
| `/cso` | Audyt bezpieczeństwa (OWASP, sekrety, zależności) |
| `/health` | Dashboard jakości kodu |
| `/codex` | Druga opinia z OpenAI Codex CLI |
| `/document-generate` | Dokumentacja od zera dla funkcji/modułu/projektu |

### Przeglądarka i QA
| Komenda | Do czego |
|---|---|
| `/gstack`, `/browse` | Headless przeglądarka: goto, snapshot, screenshot, responsive |
| `/qa` | Testuje aplikację i poprawia znalezione błędy |
| `/qa-only` | Tylko raport błędów, bez poprawek |
| `/design-review` | Wizualny audyt działającej strony + poprawki |
| `/devex-review` | Audyt developer experience na żywo |
| `/benchmark` | Wykrywanie regresji wydajności |
| `/benchmark-models` | Porównanie modeli na skillach gstack |
| `/setup-browser-cookies` | Import ciasteczek z Chrome do testów stron po zalogowaniu |
| `/open-gstack-browser` | Widoczny Chromium z panelem bocznym gstack |
| `/pair-agent` | Podpięcie zdalnego agenta AI do Twojej przeglądarki |
| `/scrape` | Wyciąganie danych ze strony |
| `/skillify` | Zamiana ostatniego `/scrape` w stały browser-skill |

### Design
| Komenda | Do czego |
|---|---|
| `/design-consultation` | Propozycja design systemu (typografia, kolor, layout, motion) |
| `/design-shotgun` | Kilka wariantów designu do porównania |
| `/design-html` | Dopracowany, produkcyjny HTML/CSS |
| `/diagram` | Diagram z opisu lub mermaid (+ plik .excalidraw) |
| `/make-pdf` | Markdown → PDF w jakości publikacji |

### Wysyłka i wdrożenie
| Komenda | Do czego |
|---|---|
| `/ship` | Merge bazy, testy, review, CHANGELOG, commit, push, PR |
| `/land-and-deploy` | Merge + deploy + weryfikacja |
| `/setup-deploy` | Konfiguracja wdrożenia dla `/land-and-deploy` |
| `/canary` | Monitoring po wdrożeniu |
| `/landing-report` | Podgląd kolejki `/ship` (tylko odczyt) |
| `/document-release` | Aktualizacja dokumentacji po wydaniu |
| `/retro` | Tygodniowe retro |

### Sesja i bezpieczeństwo pracy
| Komenda | Do czego |
|---|---|
| `/context-save` / `/context-restore` | Zapis i wznowienie kontekstu pracy |
| `/careful` | Ostrzeżenia przed destrukcyjnymi komendami |
| `/freeze` / `/unfreeze` | Blokada edycji poza wybranym katalogiem |
| `/guard` | `/careful` + `/freeze` razem |
| `/learn` | Zapamiętane „lekcje” projektu |
| `/setup-gbrain` / `/sync-gbrain` | Konfiguracja i synchronizacja GBrain (wyszukiwanie semantyczne) |
| `/gstack-upgrade` | Aktualizacja gstack |

### iOS (nie dotyczy tego repo)
`/ios-qa`, `/ios-fix`, `/ios-design-review`, `/ios-sync`, `/ios-clean`

## impeccable

Jeden skill, komenda jako argument: `/impeccable <komenda> [cel]`, np. `/impeccable critique app/page.tsx`.

| Komenda | Etap | Do czego |
|---|---|---|
| `craft [feature]` | Budowa | Zaprojektuj i zbuduj funkcję od początku do końca |
| `shape [feature]` | Budowa | Zaplanuj UX/UI przed pisaniem kodu |
| `teach` | Budowa | Przygotuj kontekst w PRODUCT.md i DESIGN.md |
| `document` | Budowa | Wygeneruj DESIGN.md z istniejącego kodu |
| `extract [cel]` | Budowa | Wyciągnij tokeny i komponenty do design systemu |
| `critique [cel]` | Ocena | Przegląd UX z oceną według heurystyk |
| `audit [cel]` | Ocena | Kontrola techniczna: a11y, wydajność, responsywność |
| `polish [cel]` | Szlif | Ostatni przegląd przed wydaniem |
| `bolder [cel]` | Szlif | Wyrazistszy design, gdy jest zbyt bezpieczny |
| `quieter [cel]` | Szlif | Wycisz zbyt krzykliwy design |
| `distill [cel]` | Szlif | Usuń zbędną złożoność |
| `harden [cel]` | Szlif | Gotowość produkcyjna: błędy, i18n, przypadki brzegowe |
| `onboard [cel]` | Szlif | Pierwsze uruchomienie, puste stany, aktywacja |
| `animate [cel]` | Wzbogacenie | Celowe animacje i ruch |
| `colorize [cel]` | Wzbogacenie | Strategiczny kolor w monochromatycznym UI |
| `typeset [cel]` | Wzbogacenie | Hierarchia typograficzna i fonty |
| `layout [cel]` | Wzbogacenie | Odstępy, rytm, hierarchia wizualna |
| `delight [cel]` | Wzbogacenie | Charakter i zapadające w pamięć detale |
| `overdrive [cel]` | Wzbogacenie | Poza konwencjonalne granice |
| `clarify [cel]` | Poprawka | Teksty UX, etykiety, komunikaty błędów |
| `adapt [cel]` | Poprawka | Dopasowanie do urządzeń i rozmiarów ekranu |
| `optimize [cel]` | Poprawka | Diagnoza i naprawa wydajności UI |
| `live` | Iteracja | Wybierasz elementy w przeglądarce i dostajesz warianty |
| `pin <komenda>` / `unpin <komenda>` | Zarządzanie | Przypięcie / odpięcie komendy |

## Skille z konta claude.ai (`anthropic-skills:*`)

Zarządzane na claude.ai → Customize → Skills, nie na dysku. Wywołanie: `/anthropic-skills:<nazwa>`.
Lista odpowiada temu, co było dostępne w sesji Claude Code 2026-09-21; strona na claude.ai może pokazywać więcej lub mniej.

| Komenda | Do czego |
|---|---|
| `docx` | Tworzenie i edycja dokumentów Word (.docx) |
| `xlsx` | Arkusze Excel (.xlsx): tworzenie, analiza, formuły |
| `pptx` | Prezentacje PowerPoint (.pptx) |
| `pdf` | PDF: odczyt, wypełnianie formularzy, łączenie, tworzenie |
| `frontend-design` | Dopracowany, charakterystyczny frontend zamiast szablonowego |
| `web-artifacts-builder` | Złożone artefakty HTML/React (wiele komponentów, stan) |
| `theme-factory` | Gotowe motywy kolorystyczno-typograficzne dla materiałów |
| `brand-guidelines` | Kolory i typografia marki Anthropic |
| `brand-designer` | Warsztat brandingowy krok po kroku: kolory, typografia, referencje stron |
| `skill-creator` | Tworzenie i ulepszanie własnych skilli |
| `docs` | Dokumenty Claude Docs do współdzielenia i komentowania |
| `opencivera-linkedin-writer` | Posty na LinkedIn o OpenCiVera |
| `import-memory` | Import pamięci/kontekstu do Claude |
| `morning` | (brak opisu w sesji; sprawdź na claude.ai) |

## Pluginy z konta claude.ai

Też spoza dysku. Wywołanie: `/<plugin>:<skill>`.

**`engineering:`** `architecture` (ADR), `code-review`, `debug`, `deploy-checklist`, `documentation`, `incident-response`, `standup`, `system-design`, `tech-debt`, `testing-strategy`

**`product-management:`** `brainstorm`, `product-brainstorming`, `competitive-brief`, `metrics-review`, `roadmap-update`, `sprint-planning`, `stakeholder-update`, `synthesize-research`, `write-spec`

**`searchfit-seo:`** treści: `create-content`, `create-topic`, `content-brief`, `content-strategy`, `keyword-cluster`, `keyword-clustering`, `translate-content`, `content-translation` · strony: `seo-check`, `on-page-seo`, `seo-audit`, `technical-seo`, `schema-markup`, `generate-schema`, `internal-linking`, `broken-links` · AI: `ai-visibility`
