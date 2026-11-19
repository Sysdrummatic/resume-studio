# OpenCiVera Design System

Ten dokument opisuje, jak budujemy interfejs OpenCiVera z tokenów i prymitywów.
Decyzje: [ADR 0026](../../../docs/adr/0026-livecv-ui-css-3d-native-motion-and-portal-typography.md),
epik #190. Pełna specyfikacja wizualna: [`DESIGN.md`](../../../DESIGN.md).

## Źródło prawdy: tokeny (`tokens.css`)

Wszystkie kolory, role typograficzne, kształty i ruch pochodzą z
`app/components/design-system/tokens.css` (`--ocv-*`, `--motion-*`, `--ease-*`).
**Nie używaj hardkodowanych kolorów (`#ff0000`, `rgba(...)`) w komponentach.**
Jedyny wyjątek to arkusz CV (`.ocv-paper`), który jest biały w obu motywach i używa
palety CV (`app/resume/resume.css`).

- **Motyw:** każdy token koloru niesie wartość jasną i ciemną (przełączniki
  `--ocv-L` / `--ocv-D`). Komponenty nigdy nie rozgałęziają się po motywie.
  Wygrywa `data-app-theme` (cookie, ADR 0012). Serwer zawsze go ustawia (domyślnie
  ciemny); gałąź `prefers-color-scheme` zadziała dopiero po zmianie w #289.
- **Znaczenie koloru:** indygo = prywatna Baza doświadczeń (oraz focus),
  teal = opublikowane LiveCV, bursztyn = niezapisane zmiany, czerwień = tylko akcje
  destrukcyjne i błędy.
- **Kontrast:** każda para tekst/tło spełnia WCAG 2.1 AA (4,5:1), kontrolki i focus
  3:1 — w obu motywach. Pilnuje tego `tests/design-system-foundation.test.mjs`.

Poprzednia wersja tego dokumentu opisywała „Color Hub” w `src/styles/colors.ts`;
taki plik nigdy nie istniał w repozytorium.

## Typografia portalu (zmieniona 2026-11-19)

Wcześniej: „Geist only”. Teraz cztery role, każda z jednym zadaniem:

| Rola | Krój | Klasy | Użycie |
| --- | --- | --- | --- |
| Duże nagłówki | Fraunces (300 jasny / 350 ciemny) | `.ocv-display`, `.ocv-title`, `.ocv-heading` | hero, tytuł strony, tytuł sekcji |
| UI | Geist | `.ocv-subheading`, `.ocv-lead`, `.ocv-body`, `.ocv-meta`, `.ocv-label` | cały tekst interfejsu |
| Wartości | Geist Mono | `.ocv-value` | URL-e, daty, liczby, kody |
| CV | Space Grotesk | `.ocv-paper*` | tylko arkusz CV |

Fraunces nigdy w gęstym UI (etykiety, przyciski, tabele, małe nagłówki). Fonty
ładowane przez `next/font` w `app/layout.tsx`. Fraunces leży w `public/fonts/`
(podzbiory `latin` i `latin-ext` z polskimi znakami, licencja OFL obok) i wchodzi przez
`next/font/local`, więc build nie potrzebuje sieci; bez preloadu, dopóki żaden ekran go
nie używa. Arkusz CV używa wyłącznie wag 400/500/700 — imię i nazwisko 700
(PDF nie ma statycznej wagi 600, ADR 0014).

## Ruch

Jeden język ruchu, dwie intensywności: *ekspresyjna* (landing, logowanie,
onboarding) i *powściągliwa* (edytor, dashboard, admin, docs). Tylko natywny CSS
(transitions, View Transitions, `@property`, `linear()`), bez bibliotek animacji.
Animujemy wyłącznie `transform`, `opacity` i kolory.

| Token | Wartość | Użycie |
| --- | --- | --- |
| `--motion-instant` | 100ms | hover, focus, przełączniki |
| `--motion-quick` | 160ms | zmiana sekcji, pigułki stanu, menu |
| `--motion-base` | 240ms | modale, rozwijane wpisy |
| `--motion-slow` | 420ms | kroki onboardingu, publikacja |
| `--motion-base-exit` / `--motion-slow-exit` | 160ms / 280ms | wyjście (zawsze krótsze niż wejście) |
| `--motion-trace` | 1600ms | tylko obrys `traced` (rysowany raz) |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | wejście |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | wyjście |

`prefers-reduced-motion: reduce` zeruje tokeny ruchu i globalnie skraca przejścia
oraz animacje (reguła w `tokens.css`).

## Prymitywy (`primitives/`)

Komponenty React w `app/components/design-system/primitives/` (eksport z
`index.ts`), style w `primitives.css` (klasy `.ocv-*`, bez inline styles):

| Komponent | Klasa | Uwagi |
| --- | --- | --- |
| `Button` | `.ocv-btn` | `variant`: `primary` / `secondary` / `quiet` / `danger`; `size="small"`; `busy` |
| `IconButton` | `.ocv-icon-btn` | wymagany `label` (aria-label + title) |
| `SegmentedControl` | `.ocv-seg` | przyciski z `aria-pressed` w `role="group"` |
| `Field`, `TextInput`, `Select`, `Textarea` | `.ocv-field`, `.ocv-input` | etykieta, `hint`, `error` → `aria-describedby` / `aria-invalid` |
| `Checkbox` | `.ocv-check` | |
| `SearchField` | `.ocv-search` | wymagany `label` |
| `StatePill` | `.ocv-state` | `state`: `private` / `public` / `ok` / `changes` |
| `Panel` | `.ocv-panel` | `traced="public" \| "private"` rysuje obrys raz po pojawieniu się |
| `Modal` | `.ocv-modal` | natywny `<dialog>`, focus na tytule, Esc zamyka, wyjście krótsze niż wejście |
| `Menu`, `MenuItem` | `.ocv-menu` | link (`href`) albo przycisk; `tone="danger"` |
| `Toast` | `.ocv-toast` | `role="status"` (`alert` dla `danger`) |
| `EmptyState` | `.ocv-empty` | |
| `Paper`, `PaperSection` | `.ocv-paper` | arkusz CV, biały w obu motywach, `view-transition-class: ocv-paper` |

Każdy interaktywny prymityw ma widoczny `:focus-visible` (`--ocv-focus`).

## Atomy i molekuły (starsze)

`atoms/` (`Button`, `Typography`, `UserAvatar`) i `molecules/` (`ResumePreviewFrame`)
korzystają z palety `--portal-*` i są używane przez obecne ekrany. Zostają bez zmian,
dopóki etapy #289–#296 nie przeniosą ekranów na prymitywy; wtedy znikają razem z
paletą `--portal-*` (`TECH_DEBT.md`).

## Zasady

1. Nowy ekran lub komponent buduje się z prymitywów i tokenów, nie z własnego CSS.
2. Brakuje wariantu? Rozszerz prymityw (i ten dokument), zamiast kopiować style.
3. Zmiana tokenów lub prymitywów wymaga zielonego `tests/design-system-foundation.test.mjs`.
