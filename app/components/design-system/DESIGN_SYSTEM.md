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
  `data-app-theme` działa na dowolnym elemencie (np. jasny podpanel na ciemnej stronie):
  blok tokenów jest deklarowany także tam, bo `var()` rozwiązuje się w miejscu deklaracji;
  ustawia też `color-scheme`. `light-dark()` odrzucone: wymaga Chrome 123 / Safari 17.5
  (powyżej domyślnych celów Next.js) i nie obsłuży tokenu wagi Fraunces.
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
oraz animacje (reguła w `tokens.css`). Tokeny ruchu są deklarowane wyłącznie na `:root` (nie w bloku motywu), więc `body` i zagnieżdżone motywy dziedziczą wartości reduced motion. Obie reguły zostają celowo: globalna chroni
obecne ekrany na `--portal-*`, a zerowanie tokenów obejmuje też opóźnienia (`*-delay`)
i odczyty z JS. Animacje wyjścia kończą się wtedy po 0,01 ms, więc `animationend` nadal
przychodzi (modal ma dodatkowo zegar awaryjny 400 ms).

## Prymitywy (`primitives/`)

Komponenty React w `app/components/design-system/primitives/` (eksport z
`index.ts`), style w `primitives.css` (klasy `.ocv-*`, bez inline styles):

| Komponent | Klasa | Uwagi |
| --- | --- | --- |
| `Button` | `.ocv-btn` | `variant`: `primary` / `secondary` / `quiet` / `danger`; `size="small"`; `busy` (zawsze `aria-disabled`/`aria-busy="true"`, zostaje w kolejności fokusu, blokuje własny `onClick` i wysłanie formularza przez swoją aktywację — kliknięcie, Enter, Spacja, Enter w polu; `form.requestSubmit()` i inne przyciski działają) |
| `IconButton` | `.ocv-icon-btn` | wymagany `label` (aria-label + title) |
| `SegmentedControl` | `.ocv-seg` | przyciski z `aria-pressed` w `role="group"` |
| `Field`, `TextInput`, `Select`, `Textarea` | `.ocv-field`, `.ocv-input` | etykieta, `hint`, `error` → `aria-describedby` / `aria-invalid` (własne `aria-describedby` wywołującego jest dołączane). Element błędu (`{id}-error`, `aria-live="polite"`) jest zawsze zamontowany i pusty, gdy pole jest poprawne, więc błąd po walidacji zostaje ogłoszony; ten sam tekst nie jest ponawiany przy kolejnych klawiszach (węzeł tekstu się nie zmienia) |
| `Checkbox` | `.ocv-check` | cała etykieta klikalna; na ekranie dotykowym min. 44 px wysokości |
| `SearchField` | `.ocv-search` | wymagany `label` |
| `StatePill` | `.ocv-state` | `state`: `private` / `public` / `ok` / `changes` |
| `Panel` | `.ocv-panel` | `traced="public" \| "private"` rysuje obrys raz po pojawieniu się |
| `Modal` | `.ocv-modal` | natywny `<dialog>`, sterowany: zamyka się tylko przez `open={false}`. Esc, przycisk zamknięcia i `<form method="dialog">` wywołują raz `onClose(returnValue)` (wartość przycisku wysyłającego, inaczej `""`); `dialog.returnValue` jest zapisywane dopiero przy zamknięciu zaakceptowanym przez rodzica, więc odrzucony submit nie zostawia wartości. Rodzic może odmówić, zostawiając `open`. Zagnieżdżony modal obsługuje tylko własne zdarzenia (React przekazuje `cancel`/`close`/`submit` w górę drzewa), więc zamyka się sam i oddaje fokus swojemu elementowi otwierającemu. Ponowny Esc w trakcie zamykania jest ignorowany. Focus na tytule, powrót do elementu otwierającego, wyjście krótsze niż wejście. Na niskim ekranie (`max-height: 32rem`) przewija się całe okno, więc stopka jest osiągalna. Znane ograniczenie: drugi z rzędu odrzucony Esc Chrome zamyka natywnie (bez możliwości anulowania) — dialog jest przywracany w zdarzeniu `close`, co może dać jedną klatkę mignięcia |
| `Menu`, `MenuItem` | `.ocv-menu` | link (`href`) albo przycisk; `tone="danger"` |
| `Toast` | `.ocv-toast` | element wizualny nie jest regionem na żywo; treść trafia do dwóch stałych, początkowo pustych regionów w `<body>` — albo w otwartym `<dialog>`, jeśli toast jest w jego obrębie, bo wszystko poza modalem jest inertne — (`role="status"`, dla `danger` `role="alert"`) ok. 100 ms po zamontowaniu. Każdy nowy komunikat dostaje własny `key` — wtedy identyczny tekst jest ogłaszany ponownie |
| `EmptyState` | `.ocv-empty` | |
| `Paper`, `PaperSection` | `.ocv-paper` | arkusz CV, biały w obu motywach, `view-transition-class: ocv-paper` |

Każdy interaktywny prymityw ma widoczny `:focus-visible` (`--ocv-focus`).

**Eksporty i App Router.** Publiczne API to komponenty z `index.ts` oraz
`buttonClassName(variant, size)` — styl przycisku dla linku. `buttonClassName` leży
w osobnym module bez `"use client"`, więc wolno go wywołać w komponencie serwerowym.
`Button`, `TextInput`/`Select`/`Textarea`, `Field`, `Modal` i `Toast` są modułami
klienckimi, więc można je renderować z serwerowego `page.tsx` (tylko z
serializowalnymi propsami). `cx` jest wewnętrzny i nie jest eksportowany z `index.ts`.
Regresja w prawdziwym App Routerze i Chromium:
`DESIGN_SYSTEM_BROWSER_TEST=1 node --test tests/design-system-browser.test.mjs`
(fixture `tests/design-system-app/`, kopiowany do `tmp/` na czas testu).

## Atomy i molekuły (starsze)

`atoms/` (`Button`, `Typography`, `UserAvatar`) i `molecules/` (`ResumePreviewFrame`)
korzystają z palety `--portal-*` i są używane przez obecne ekrany. Zostają bez zmian,
dopóki etapy #289–#295 nie przeniosą ekranów na prymitywy; usuwa je razem z paletą
`--portal-*` etap #296, po migracji ostatniego konsumenta (`TECH_DEBT.md`).

## Zasady

1. Nowy ekran lub komponent buduje się z prymitywów i tokenów, nie z własnego CSS.
2. Brakuje wariantu? Rozszerz prymityw (i ten dokument), zamiast kopiować style.
3. Zmiana tokenów lub prymitywów wymaga zielonego `tests/design-system-foundation.test.mjs`.
