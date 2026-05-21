# OpenCVHub Design System

Ten dokument opisuje proces zarządzania stylami i budowania interfejsu aplikacji OpenCVHub zgodnie z architekturą Atomic Design i Design Tokens.

## Color Hub (`src/styles/colors.ts`)

Centralne miejsce zarządzania kolorami. **Nie używaj hardkodowanych kolorów typu `#ff0000` lub `rgba(...)` w komponentach!**

### Jak zmienić kolor w 5 sekund?
1. Otwórz `src/styles/colors.ts`.
2. Zmień wartość w obiekcie (np. `brand.accent`).
3. Zmiana automatycznie zaktualizuje kolory w:
   - Komponentach React (dzięki importowi `colors.ts`).
   - Generowanych plikach PDF (Bento-box template).
   - Klasach Tailwind (jeśli zostaną użyte).

## Architektura Komponentów (Atomic Design)

Struktura folderu `src/components/design-system/`:

1. **Atoms (Atomy)**: Najmniejsze elementy (Button, Typography, Badge, Icon). Nie mają zależności biznesowych.
2. **Molecules (Cząsteczki)**: Grupa atomów działających razem (np. `SkillTagGroup` = Typography + Badge).
3. **Organisms (Organizmy)**: Skomplikowane sekcje z określoną logiką (np. `Navigation`, `BentoGrid`).

## Plan Refaktoryzacji (Przejście na Design System)

Obecnie aplikacja posiada dużo rozproszonego kodu CSS (`globals.css`). Aby bezpiecznie przenieść system na Design Tokens, postępujemy według planu:

**Faza 1: Adopcja Atomów**
1. Zastąp `<button className="button">` nowym komponentem `<Button>` z DS.
2. Zastąp tagi `<h1>`, `<h2>`, `<p>` komponentem `<Typography>` tam, gdzie to możliwe, aby ujednolicić marginesy.

**Faza 2: Translacja CSS -> Tokens**
1. Usuwaj kolory z `globals.css` zastępując je zmiennymi CSS generowanymi z Tokenów, LUB migruj poszczególne widoki na klasy utility z Tailwind CSS.

**Faza 3: Reużywalność PDF**
1. Zaimportuj atomy do `CvPdfTemplate.tsx` i wstaw zmienne z `colors.ts` bezpośrednio do `StyleSheet.create()`.

> **Note:** Każdy dodawany komponent UI do projektu musi najpierw przejść ocenę Senior System Engineera. Zamiast pisać własny CSS, rozszerz odpowiedni komponent atomowy.
