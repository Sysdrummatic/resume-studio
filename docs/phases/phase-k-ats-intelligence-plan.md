# Phase K — ATS Intelligence

Status: In progress

Issue: [#161](https://github.com/Sysdrummatic/resume-studio/issues/161)

## Cel

ATS Intelligence ocenia dokument, który kandydat rzeczywiście wyśle, a jednocześnie pomaga rozwijać bibliotekę treści w Master CV.

System rozróżnia dwa poziomy:

1. **Master CV readiness** — wskaźniki jakości i kompletności źródłowej biblioteki treści. Nie jest to wynik dopasowania pojedynczej aplikacji.
2. **Saved Version ATS score** — punktacja konkretnej wersji CV po zastosowaniu jej wyboru sekcji, podsumowań, ról, punktów doświadczenia, umiejętności i edukacji.

Analiza jest tylko do odczytu. Nie modyfikuje YAML, zapisanej wersji, eksportu PDF ani publikacji.

## Model domenowy

```text
Master CV (pełna biblioteka treści)
  ├─ wskaźniki gotowości i jakości treści
  └─ Saved Version selection
       └─ wybrany dokument CV
            ├─ bazowy wynik ATS
            └─ opcjonalne dopasowanie do opisu stanowiska
```

Wynik Saved Version powstaje dopiero po zastosowaniu istniejącego kontraktu `ResumePresetSelection` do surowego dokumentu. Analizator nie może zobaczyć niewybranych ról, punktów ani umiejętności z Master CV. Dla wersji wielojęzycznych podstawą jest dokument w `default_locale` danej wersji, z zachowaniem obecnych fallbacków.

## Aktualne praktyki ATS i rekrutacji

Zweryfikowano 11 września 2026 na podstawie aktualnych materiałów:

- [Indeed: ATS resume keywords](https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume-keywords) — używanie prawdziwych słów kluczowych z opisu stanowiska w podsumowaniu, doświadczeniu i umiejętnościach; bez dodawania nieistotnych fraz i sztucznego powtarzania.
- [Indeed: ATS-compliant resume](https://ca.indeed.com/career-advice/resumes-cover-letters/ats-compliant-resume) oraz [ATS resume template](https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume-template) — standardowe nazwy sekcji, kompletne dane kontaktowe, prosta struktura i kompatybilny format pliku.
- [Greenhouse: unsuccessful resume parse](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse) — obrazy, tabele, nagłówki i stopki, pola tekstowe, kolumny oraz niejasne sekcje mogą pogarszać parsowanie.
- [Greenhouse: non-English parsing](https://support.greenhouse.io/hc/en-us/articles/205019689-Resume-parsing-with-non-English-languages) — pełne parsowanie obejmuje między innymi język angielski i polski.
- [Workday: skills-based strategies](https://www.workday.com/en-us/perspectives/hr/key-skills-based-strategies-for-agility.html) — dobór kandydatów coraz częściej opiera się na wykazanych umiejętnościach, a nie wyłącznie na tytułach i formalnych kwalifikacjach.

Wnioski dla OpenCiVera:

- oceniamy standardową, możliwą do sparsowania treść eksportu;
- porównujemy autentyczne słownictwo CV z opisem stanowiska i liczymy unikalne pokrycie, aby powtarzanie fraz nie podnosiło wyniku;
- premiujemy umiejętności poparte kontekstem doświadczenia oraz mierzalnymi rezultatami;
- nie karzemy poprawnego otwartego okresu zatrudnienia, na przykład `Present`;
- nie ostrzegamy o polach, które istniejący eksport ATS już normalizuje lub usuwa;
- wynik jest wskazówką jakości, nie gwarancją zachowania konkretnego systemu ATS ani decyzji rekrutera.

## Zakres wdrożenia

### Silnik reguł

`app/lib/ats-intelligence.ts` udostępnia czyste, deterministyczne funkcje:

- `analyzeMasterResume(document)` — gotowość biblioteki i liczniki treści;
- `analyzeResumeForAts(document, jobDescription?)` — wynik konkretnego dokumentu i opcjonalne pokrycie słów kluczowych;
- `getATSScoreBand(score)` — wspólne progi prezentacji.

Bazowa punktacja ma pięć kategorii:

| Kategoria | Waga | Sprawdzane sygnały |
|---|---:|---|
| Structure | 20 | podsumowanie, doświadczenie, edukacja i umiejętności |
| Contact | 15 | e-mail, telefon i co najmniej jeden link |
| Experience | 30 | rola i firma, 2–5 punktów, konkretne rezultaty i mierzalny wpływ |
| Skills | 20 | minimum pięć unikalnych umiejętności oraz ich użycie w kontekście |
| Dates | 15 | okres dla każdej roli i rozpoznawalny rok |

Gdy opis stanowiska zawiera co najmniej dwa znaczące słowa, końcowy wynik składa się w 75% z bazowej gotowości i w 25% z pokrycia unikalnych słów kluczowych. Ten sam wyraz jest liczony najwyżej raz.

### Master Resume Editor

Zakładka `ATS` w istniejącym panelu bocznym pokazuje:

- readiness score biblioteki treści;
- liczbę ról, ról z mierzalnym wpływem, umiejętności, kanałów kontaktu i podsumowań;
- wynik kategorii i krótkie wskazówki powiązane z sekcjami edytora;
- przejście z wybranej wskazówki do odpowiedniej sekcji.

### Dashboard i Saved Versions

- Każda zapisana wersja ma własną etykietę `ATS <score>`.
- Punktacja używa wyłącznie treści wybranej przez tę wersję.
- Podgląd wersji pokazuje pełne kategorie, wskazówki i właściwy podgląd CV.
- Użytkownik może wkleić opis stanowiska i zobaczyć dopasowane oraz brakujące słowa kluczowe.
- Opis stanowiska pozostaje wyłącznie w stanie przeglądarki; zamknięcie podglądu go usuwa. Nie jest wysyłany do zewnętrznego dostawcy ani zapisywany w bazie.

## Prywatność i zależności

- Analiza działa lokalnie i nie wymaga API AI, nowej tabeli, migracji ani sekretu.
- Nie dodajemy paczek. Implementacja używa TypeScriptu i Reacta już zadeklarowanych w `package.json` i zablokowanych w `package-lock.json`.
- Ewentualna analiza semantyczna przez zewnętrzny model wymaga osobnej decyzji o dostawcy, retencji, zgodzie użytkownika, limitach i kosztach. Nie jest częścią obecnego wdrożenia.

## Testy i kryteria akceptacji

- [x] Test najpierw wykazał brak silnika, następnie przeszedł po minimalnej implementacji.
- [x] Silny fixture Saved Version otrzymuje stabilny, deterministyczny wynik.
- [x] Master CV zwraca właściwe liczniki gotowości.
- [x] Analiza Saved Version nie widzi niewybranej treści Master CV.
- [x] Otwarty okres z rokiem i `Present` jest poprawny.
- [x] Słowo kluczowe jest liczone raz niezależnie od liczby powtórzeń.
- [x] Słaby dokument zwraca wskazówki powiązane z polami.
- [x] `npm.cmd run verify` przechodzi: lint i typecheck bez błędów, 578 testów zaliczonych, 1 pominięty.
- [x] Build produkcyjny przechodzi.
- [x] Wspólny komponent sprawdzony w przeglądarce na desktopie i mobile, w jasnym i ciemnym motywie oraz z obsługą klawiatury.
- [ ] Końcowy smoke test osadzonych widoków Dashboard i Master Resume wymaga uwierzytelnionej sesji środowiska preview.

## Ryzyka i kontrola

| Ryzyko | Kontrola |
|---|---|
| Wynik jest interpretowany jako gwarancja przejścia ATS | UI nazywa go wskazówką i opisuje zakres analizy |
| Niewybrana treść zawyża wynik CV | Analiza działa po zastosowaniu `ResumePresetSelection` |
| Keyword stuffing zawyża dopasowanie | Pokrycie bazuje na zbiorze unikalnych słów |
| Opis stanowiska lub CV wycieka do dostawcy | Analiza jest lokalna, bez wywołania sieciowego i bez trwałego zapisu |
| Reguły stają się zależne od eksportu wizualnego | Silnik przyjmuje dokument domenowy i nie zmienia rendererów ani PDF |
| Duży, równoległy PR dashboardu powoduje konflikt | Funkcja jest wspólnym komponentem; integracja dashboardu pozostaje mała i może zostać przeniesiona po zmergowaniu PR |

## Dalszy rozwój

Po zebraniu danych z realnych aplikacji można kalibrować wagi i progi. Analiza semantyczna ma sens dopiero wtedy, gdy reguły deterministyczne nie wystarczą i zostanie zatwierdzony kontrakt prywatności. Nie może zastąpić oceny konkretnej Saved Version ani uzyskać dostępu do niewybranej treści Master CV.
