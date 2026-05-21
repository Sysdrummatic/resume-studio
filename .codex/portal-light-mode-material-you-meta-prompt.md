# [IMPLEMENTATION] Portal Light Mode Without CV Restyling

## Mission
Wdrożyć **tryb jasny portalu** oparty o Material You / Material Design 3 jako rozszerzenie istniejącego systemu `app theme`, z zachowaniem spójności z aktualnym portalowym stylem dark i bez ingerencji w subsystem CV.

Zmiana ma być przeprowadzona zgodnie z zasadami:

- `clean code`
- `KISS`
- `DRY`
- `TDD`

## Existing System Reality
Pracujesz w repo `plm-resume`.

Aktualny stan:

- aktywna aplikacja działa w `Next.js App Router` + `React` + `TypeScript`
- portalowy theme system istnieje już na poziomie:
  - `app/lib/app-theme.ts`
  - `app/components/app-theme-switch.tsx`
  - `app/globals.css`
  - `app/styles/colors.ts`
- domyślny theme to `dark`
- przełącznik motywu jest obecny w top barze, ale był projektowany jako future-ready
- subsystem CV ma osobny renderer i osobne style:
  - `app/components/resume-renderer/*`
  - `app/resume/resume.css`
- CV nie może zostać wizualnie naruszone przez wdrożenie light mode portalu

## Non-Negotiable Constraints
- Nie restyluj CV.
- Nie zmieniaj wizualnego kontraktu `app/resume/resume.css`.
- Traktuj portal shell i CV shell jako dwa oddzielne światy.
- Nie rób big-bang redesignu layoutów.
- Nie wprowadzaj drugiego równoległego systemu tokenów dla light mode.
- Nie zmieniaj semantyki routingu, auth, publikacji ani eksportów.
- Zachowaj domyślny dark mode jako bezpieczny fallback, dopóki light mode nie przejdzie walidacji.

## Design Intent
Poniższy prompt stylu Material You nie ma być wdrożony literalnie jako nowy “pełny redesign produktu”.
Ma zostać **zaadaptowany do istniejącego portalu** jako:

- tonalny, jasny wariant istniejącego shellu
- spójny z obecną architekturą klas i tokenów
- kompatybilny z aktualnymi komponentami header / nav / card / button / form / landing surfaces

### What to keep from the Material You prompt
- tonal surface hierarchy
- seed-color-based palette (`#6750A4`)
- organic softness i duże promienie
- przyjazną typografię
- pill buttons
- state layers zamiast brutalnych hover color swaps
- łagodny, taktylny feedback

### What to adapt instead of copying
- utility/Tailwind examples muszą zostać przepisane na istniejący model `global CSS + semantic vars`
- layout portalu nie ma być przebudowany w nowy system sekcji
- motion ma być zgodny z obecnym poziomem subtelności portalu
- light mode ma być wariantem istniejącego systemu, nie osobnym produktem

## Theme Boundary Model
Przyjmij ten podział odpowiedzialności:

- `app theme`
  - odpowiada za portalowe tokeny, shell, header, nawigację, landing, cards, forms, buttons
- `resume theme`
  - odpowiada za public CV, preview CV, PDF/print CV

Light mode Material You wdrażasz wyłącznie do `app theme`.

## Recommended Agent Roster
Użyj dokładnie tych agentów:

### 1. `software_architect`
Owner:
- granice między `app theme` i `resume theme`
- strategia migracji tokenów
- kontrola zakresu
- decyzje kontraktowe dla day/night switching

Why:
- największe ryzyko nie leży w kolorach, tylko w niekontrolowanym rozlaniu stylów na CV i w duplikacji tokenów

### 2. `ui_ux_designer`
Owner:
- translacja promptu Material You do realiów tego repo
- decyzje o tym, co zachować z aktualnego dark theme, a co zmienić w light
- review typografii, tonal surfaces, button language, focus states i responsywności

Why:
- prompt jest bogaty wizualnie, ale wymaga selekcji, żeby nie rozwalić spójności portalu

### 3. `frontend_engineer`
Owner:
- implementacja app-level light theme
- aktywacja toggle
- refactor tokenów i komponentów shellowych
- utrzymanie KISS/DRY przy wdrożeniu

Why:
- to jest głównie zmiana front-endowa w obrębie istniejącego systemu global CSS i React components

### 4. `test_engineer`
Owner:
- TDD plan
- testy kontraktu theme systemu
- regresje headera, toggle, layoutu i izolacji CV

Why:
- zmiana theme systemu łatwo generuje regresje i dryf kontraktów

## Agent Workflow

### Phase 1. Architecture Freeze
Lead: `software_architect`
Support: `ui_ux_designer`

Tasks:
- potwierdzić boundary `portal != CV`
- potwierdzić, że light mode wchodzi do istniejącego `app theme`
- potwierdzić, że `app/lib/app-theme.ts` pozostaje jedynym źródłem prawdy dla theme ids
- określić, czy persistence theme ma wejść w tym wdrożeniu, czy nie

Exit criteria:
- brak wątpliwości co wolno zmieniać
- brak ryzyka przypadkowego restylu CV

### Phase 2. Visual Adaptation Spec
Lead: `ui_ux_designer`
Support: `software_architect`

Tasks:
- przełożyć prompt Material You na **light-only portal spec**
- wskazać tokeny:
  - background
  - surface
  - surface-container
  - surface-container-low
  - text/on-surface
  - outline
  - primary/secondary/tertiary
- określić co zostaje ze starego dark shellu:
  - spacing
  - hierarchy
  - component proportions
  - header density
- określić jak wygląda toggle:
  - dark -> moon
  - light -> sun
  - aktywny switch
  - bez copy typu `Soon`

Exit criteria:
- frontend ma precyzyjną specyfikację do wdrożenia

### Phase 3. TDD Contract Setup
Lead: `test_engineer`
Support: `software_architect`

Tasks:
- zdefiniować testy przed wdrożeniem:
  - `app theme` wspiera `dark | light`
  - toggle jest aktywnym kontrolerem
  - light mode nie modyfikuje `resume.css`
  - layout/header dalej spełnia kontrakty responsywności
  - visual mode contract jest jawny w `layout.tsx` / `app-theme.ts`

Exit criteria:
- istnieje test harness dla wdrożenia light mode

### Phase 4. Implementation
Lead: `frontend_engineer`
Support: `ui_ux_designer`

Tasks:
- rozszerzyć `app theme` o realny `light`
- zaadaptować Material You do istniejących tokenów w:
  - `app/globals.css`
  - `app/styles/colors.ts`
- aktywować toggle theme w headerze
- wprowadzić możliwie mały, spójny mechanizm switching
- unikać duplikacji klas i tokenów
- nie tworzyć nowych one-off stylów tam, gdzie wystarczy tokenizacja

Implementation rules:
- reuse over rewrite
- minimal diffs
- semantic CSS vars first
- no CV touch

### Phase 5. Validation
Lead: `test_engineer`

Tasks:
- uruchomić:
  - `npm.cmd run typecheck`
  - `npm.cmd run lint`
  - `npm.cmd test`
- jeśli trzeba:
  - testy manualne top bara
  - testy ręczne portal pages
  - test `/resume` i preview CV jako regresja izolacji

## Technical Direction

### Existing code to treat as source of truth
- `app/lib/app-theme.ts`
- `app/components/app-theme-switch.tsx`
- `app/layout.tsx`
- `app/components/app-header-navigation.tsx`
- `app/globals.css`
- `app/styles/colors.ts`

### Files that are explicitly out of scope
- `app/resume/resume.css`
- `app/components/resume-renderer/*`
- `app/lib/CvPdfTemplate.tsx`

## Material You Adaptation Rules

### Typography
- jeśli wdrażasz Roboto, zrób to świadomie i centralnie
- nie mieszaj font stacks per komponent
- jeżeli zmiana fontu grozi szeroką regresją layoutów, możesz zachować obecny stack i wdrożyć tylko scale/weights MD3

### Color
- seed `#6750A4` ma służyć jako podstawa light palette
- nie wymuszaj identycznych kolorów w dark mode
- light mode ma być tonalny, nie “biały i pusty”

### Components
- buttons: pill-shaped, ale bez rozwalania istniejącej semantyki variantów
- cards: tonal surfaces, subtelna elevation
- inputs: tylko jeśli da się to wdrożyć bez gwałtownej zmiany całej form language
- header: aktywny, czytelny toggle, bez zbędnego copy

### Motion
- subtelnie
- zgodnie z istniejącym portalem
- respektuj `prefers-reduced-motion`

## TDD Requirements
- Zacznij od testów kontraktowych dla:
  - `DEFAULT_APP_THEME`
  - enabled themes
  - toggle activation
  - icon switching per theme
  - brak naruszeń granicy CV
- Dopiero potem refaktor/implementacja.

## KISS / DRY / Clean Code Requirements
- Jedno źródło prawdy dla theme ids.
- Jedna warstwa tokenów portalowych.
- Brak powielonych light tokenów w wielu plikach bez potrzeby.
- Brak dead UI copy przy toggle.
- Brak nowych “temporary final” klas.
- Brak hardcoded component-level colors, jeśli istnieje sensowny token semantyczny.

## Definition of Done
Zadanie jest ukończone tylko gdy:

- light mode Material You działa w portalu
- dark mode pozostaje spójny i bez regresji
- toggle day/night jest aktywny i poprawnie pokazuje:
  - moon dla dark
  - sun dla light
- CV subsystem nie został wizualnie naruszony
- `app theme` pozostał jednym systemem, bez duplikacji
- testy przechodzą

## Final Reporting Format
Na końcu zespół zwraca jeden raport:

1. decyzje architektoniczne
2. zakres adaptacji promptu Material You
3. zmiany wdrożone
4. co zostało świadomie uproszczone dla KISS/DRY
5. walidacja
6. manual QA remaining

## Autonomy Clause
Nie pytaj użytkownika o drobne decyzje implementacyjne.
Pytanie do użytkownika jest dozwolone tylko jeśli:

- prompt Material You koliduje z niezmiennym kontraktem portalu
- light mode wymaga wejścia w CV styling
- istnieją dwie równoważne drogi o dużych skutkach produktowych i nie da się ich rozstrzygnąć na podstawie repo
