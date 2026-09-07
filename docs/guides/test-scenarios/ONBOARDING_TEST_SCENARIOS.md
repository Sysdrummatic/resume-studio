# Onboarding — scenariusze testowe dla Usera i Admina

Scenariusze manualne dla pierwszego utworzenia Master CV oraz osobnego trybu
testowego administratora. Dokument opisuje oczekiwane wyniki; nie jest raportem
z wykonanych testów. Wszystkie scenariusze mają początkowo status **Niewykonany**.

Opis funkcji: [First-use Master CV guide](../features/first-use-master-cv.md).

## 1. Przygotowanie

1. Korzystaj ze środowiska testowego z wdrożoną aplikacją i migracjami:
   - `20260907000000_resume_onboarding.sql`;
   - `20260907010000_admin_onboarding_tests.sql`.
2. Przygotuj osobne sesje przeglądarki dla poniższych kont. Konto nowego Usera
   utwórz dopiero w scenariuszu U-01, po zastosowaniu migracji.
3. Przygotuj fikcyjne dane CV i pliki importu. Przykładowy YAML jest w sekcji 2.
4. Zanotuj adres środowiska, wersję aplikacji/commit, przeglądarkę i datę testu.
5. Do weryfikacji linków używaj osobnego okna prywatnego bez zalogowanej sesji.
   Testy publikacji tworzą rzeczywiście publiczne CV — używaj danych fikcyjnych.

| Konto | Przygotowanie | Zastosowanie |
| --- | --- | --- |
| User A | Nowe konto `user`, utworzone po migracji | Od zera, wznowienie, publikacja |
| User B | Drugie nowe konto `user`, utworzone po migracji | Import i zakończenie bez publikacji |
| User C | Konto `user` istniejące przed migracją | Brak automatycznego onboardingu na starym koncie |
| Admin A | Istniejące, aktywne konto `admin`, zweryfikowany e-mail, zapisane Master CV | Powtarzalne testy na osobnym szkicu |
| Admin B | Drugie aktywne, zweryfikowane konto `admin` | Izolacja przebiegów między administratorami |

Dla Admina A zapisz stan początkowy: treść Master CV dla każdego języka,
historię rewizji, listę języków i język domyślny, imię/nazwisko w profilu,
adres istniejącego publicznego CV oraz liczbę pozycji w dashboardzie.
W Master CV ustaw rozpoznawalny tekst `MASTER — NIE ZMIENIAĆ`.

**Zasady wykonania:** U-01 → U-02 → U-05 → U-03 wykonuj na Userze A;
U-01 → U-04 → U-06 na Userze B. Pozostałe testy wymagające niezakończonego
onboardingu wykonaj przed publikacją albo na kolejnym nowym Userze.
Nie resetuj zakończonego onboardingu Usera ręcznie w bazie. Admin może wielokrotnie
uruchamiać osobne testy, bez tworzenia nowego konta.

## 2. Dane testowe i kolejność plansz

Zapisz poniższy tekst jako `onboarding-import.yaml` w UTF-8:

```yaml
brand_initials: AT
first_name: Anna
family_name: Testowa
summary:
  - position: QA Engineer — IMPORT
    description: Fikcyjne CV do sprawdzenia onboardingu.
    default: true
contact: []
experience: []
education: []
skills: []
languages: []
courses: []
interests: []
tech_stack: []
qr_codes: []
gdpr_clause: ""
```

Do ręcznego wypełnienia użyj `Jan Testowy` oraz podsumowania
`QA Engineer — RĘCZNIE`. W testach Admina stosuj `ADMIN TEST ONLY` jako nazwisko
i `SZKIC TESTOWY` w opisie, aby łatwo odróżnić szkic od rzeczywistego Master CV.

| Plansza | Zawartość | Przykładowa czynność |
| --- | --- | --- |
| 1 | Logo OpenCiVera i powitanie | Rozpocznij przewodnik |
| 2 | Od zera / import, język CV | Wybierz metodę i język |
| 3 | Dane osobowe | Wpisz imię i nazwisko |
| 4 | Podsumowanie zawodowe | Dodaj stanowisko i opis |
| 5 | Doświadczenie | Dodaj firmę, rolę, okres i osiągnięcie |
| 6 | Wykształcenie | Dodaj szkołę, kierunek i okres |
| 7 | Umiejętności | Dodaj umiejętność |
| 8 | Języki | Dodaj język i poziom |
| 9 | Kursy | Dodaj kurs lub pomiń |
| 10 | Zainteresowania | Dodaj zainteresowanie lub pomiń |
| 11 | Technologie | Dodaj technologię lub pomiń |
| 12 | Kody QR | Dodaj obsługiwany wpis lub pomiń |
| 13 | Klauzula RODO | Wpisz tekst testowy lub pomiń |
| 14 | Podgląd CV | Sprawdź dane i odnośniki do sekcji |
| 15 | Decyzja o utworzeniu CV z linkiem | Opublikuj albo zakończ bez publikacji |

Przycisk przejścia dalej może nazywać się **Dalej / Continue** lub
**Dalej / pomiń / Continue / skip**, zależnie od sekcji i języka przewodnika.
Język przewodnika oraz język dokumentu CV wybiera się niezależnie.

## 3. Konto User

### U-01 — Rejestracja i automatyczny start [P0]

**Warunek:** nowy adres e-mail; konto jeszcze nie istnieje.

1. Zarejestruj konto przez `/login` → Sign up.
2. Przed weryfikacją sprawdź, czy nie można zapisywać ani publikować prywatnego CV.
3. Zweryfikuj e-mail i zaloguj się.
4. Otwórz `/dashboard`, a następnie sprawdź również wejście do `/master-resume`,
   zanim przejdziesz z planszy powitalnej dalej.

**Oczekiwany wynik:** konto wymaga weryfikacji. Po zalogowaniu przejście na
dashboard lub Master Resume prowadzi do `/onboarding`. Widoczne są logo,
powitanie, wybór języka przewodnika i pasek postępu. Nie powstaje jeszcze CV
z publicznym linkiem.

### U-02 — Utworzenie CV od zera i podgląd [P0]

**Warunek:** User A po U-01, niezakończony onboarding.

1. Rozpocznij przewodnik i wybierz **Zaczynam od zera / Start from scratch**.
2. Wybierz język CV i wypełnij sekcje zgodnie z tabelą plansz.
3. Jedną z opcjonalnych sekcji pozostaw pustą i przejdź dalej.
4. Po każdym przejściu sprawdź numer planszy i pasek postępu.
5. Użyj **Wstecz / Back**, popraw wpis i ponownie przejdź dalej.
6. Na planszy podglądu przejdź odnośnikiem do wybranej sekcji, zmień dane
   i wróć kolejnymi planszami do podglądu.

**Oczekiwany wynik:** wyświetla się wszystkich 11 sekcji w kolejności z tabeli.
Dane pozostają po cofnięciu, poprawki trafiają do podglądu, a pominięta sekcja
nie dodaje pustego wpisu do CV. Pasek odpowiada aktualnej planszy; po cofnięciu
może się zmniejszyć. Samo wypełnienie i podgląd nie tworzą publicznego CV.

### U-03 — Publikacja pierwszego CV i wysłanie linku [P0]

**Warunek:** User A ma zapisane imię lub nazwisko oraz podsumowanie zawodowe.

1. Przejdź z podglądu do pytania o utworzenie CV z linkiem.
2. Wybierz zgodę na publikację.
3. Sprawdź ekran zakończenia i pasek postępu.
4. Skopiuj link; otwórz go w oknie prywatnym.
5. Przejdź do dashboardu i otwórz utworzoną pozycję.
6. Wyloguj się, zaloguj ponownie i otwórz `/onboarding`.

**Oczekiwany wynik:** pojawia się jedno zapisane CV w dashboardzie oraz działający
link do tego samego CV. Osoba bez konta widzi wybrane dane i właściwy język;
indeksowanie jest wyłączone. Pasek zakończenia pokazuje 100%. Ponowne logowanie
nie otwiera przewodnika, a `/onboarding` kieruje na dashboard.

### U-04 — Import istniejącego CV [P0]

**Warunek:** User B po U-01; dostępny `onboarding-import.yaml`.

1. Wybierz **Importuję moje CV / Import my CV** i język CV.
2. Wgraj plik i sprawdź ekran przeglądu importu.
3. Anuluj przegląd importu; następnie wgraj plik ponownie i zatwierdź dodanie danych.
4. Przejdź przez plansze formularza. Sprawdź `Anna Testowa` i `QA Engineer — IMPORT`.
5. Zmień opis podsumowania i przejdź do podglądu.

**Oczekiwany wynik:** anulowanie nie dodaje danych. Zatwierdzony import uzupełnia
formularz; dane można poprawiać. Podgląd zawiera poprawiony tekst. Import sam
w sobie nie publikuje CV i nie pomija pytania o publikację.

**Wariant P1:** powtórz import na nowych przebiegach z czytelnym PDF, DOCX i TXT
z fikcyjnymi danymi. Sprawdź możliwość przeglądu i korekty odczytanej treści;
nie oczekuj identycznego odtworzenia formatowania pliku źródłowego.

### U-05 — Przerwanie, odświeżenie i wznowienie [P0]

**Warunek:** User A w trakcie wypełniania, przed U-03.

1. W sekcji doświadczenia dodaj tekst `WZNOWIENIE-01`.
2. Wybierz **Dokończę później / Finish later**.
3. Na dashboardzie odszukaj możliwość wznowienia przewodnika.
4. Wyloguj się i zaloguj ponownie, opcjonalnie na drugim urządzeniu.
5. Wznów przewodnik, przejdź do następnej planszy, a następnie odśwież stronę.

**Oczekiwany wynik:** wyjście zapisuje dane i bieżący krok. Dashboard pozostaje
dostępny i oferuje wznowienie. Po wznowieniu oraz odświeżeniu zachowane są ostatni
zapisany krok i `WZNOWIENIE-01`. Nie powstaje dodatkowe publiczne CV.

### U-06 — Zakończenie bez publikacji [P0]

**Warunek:** User B po imporcie lub ręcznym wypełnieniu, na ostatniej planszy.

1. Wybierz **Nie teraz / Not now**.
2. Otwórz dashboard, a następnie edytor Master Resume.
3. Sprawdź zaimportowane i poprawione dane.
4. Wyloguj się, zaloguj ponownie i otwórz `/onboarding`.

**Oczekiwany wynik:** Master CV jest zapisane, ale nie powstaje nowa opublikowana
wersja ani link. Przewodnik jest zakończony i nie uruchamia się ponownie.
Dalsze tworzenie CV jest dostępne przez standardowy przepływ aplikacji.

### U-07 — Walidacja i nieudany import [P1]

**Warunek:** niezakończony onboarding; dla każdego wariantu wróć do wskazanej planszy.

1. Na planszy danych osobowych usuń zarówno imię, jak i nazwisko i wybierz Dalej.
2. Wpisz imię, pozostaw wszystkie podsumowania bez stanowiska i opisu,
   a następnie przejdź do pytania o publikację.
3. W osobnym przebiegu importu spróbuj wgrać YAML o treści `summary: [broken`.

**Oczekiwany wynik:** brak imienia i nazwiska blokuje przejście dalej z czytelnym
komunikatem. Brak podsumowania blokuje publikację; można zakończyć bez linku.
Uszkodzony YAML wyświetla błąd i nie zastępuje danych formularza ani nie publikuje CV.

### U-08 — Istniejące konto i brak narzędzi Admina [P0]

**Warunek:** User C utworzony przed migracją.

1. Zaloguj się i otwórz `/dashboard` oraz `/master-resume`.
2. Sprawdź menu konta i spróbuj wejść bezpośrednio na `/settings`.
3. Wykonaj test odmowy API opisany w A-08 z sesją Usera C.

**Oczekiwany wynik:** brak automatycznego onboardingu, również gdy stare konto ma
puste Master CV. Narzędzia testowe Admina są niedostępne; API zwraca 403.
Dotychczasowe CV pozostają bez zmian.

## 4. Konto Admin — osobny tryb testowy

Nowo utworzone konto, któremu nadano rolę `admin`, może również mieć zwykły
onboarding pierwszego użycia. Ten przepływ sprawdza się scenariuszami Usera.
Poniższe testy dotyczą osobnego szkicu uruchamianego przez ustawienia istniejącego
Admina; nie powinny zmieniać stanu jego zwykłego onboardingu.

### A-01 — Zaplanowanie i anulowanie automatycznego startu [P0]

**Warunek:** Admin A, brak automatycznie uruchamianego zwykłego onboardingu.

1. Otwórz menu konta → **Settings / Ustawienia** → **Narzędzia testowe → Onboarding**.
2. Zaznacz **Uruchom onboarding przy następnym wejściu do dashboardu**.
3. Poczekaj na potwierdzenie zapisu i odśwież ustawienia.
4. Odznacz opcję, poczekaj na zapis i otwórz dashboard.
5. Wróć do ustawień, zaznacz opcję ponownie i otwórz dashboard.

**Oczekiwany wynik:** checkbox zachowuje zapisany stan po odświeżeniu. Po
odznaczeniu dashboard nie przekierowuje automatycznie. Po ponownym włączeniu
otwiera się `/onboarding?test=<ID>` z powitaniem i informacją o osobnym szkicu.

### A-02 — Uruchom teraz i wznowienie tego samego testu [P0]

**Warunek:** Admin A; można wykorzystać przebieg z A-01.

1. W ustawieniach wybierz **Uruchom teraz / Start now** i zanotuj ID z adresu.
2. Wybierz tworzenie od zera i wpisz dane oznaczone `ADMIN TEST ONLY`.
3. Przejdź do podsumowania, zapisz treść i wybierz Dokończę później.
4. Na dashboardzie wybierz **Wznów test / Resume test** i sprawdź adres oraz dane.
5. Ponownie przerwij test; w ustawieniach kliknij Uruchom teraz.

**Oczekiwany wynik:** oba sposoby wznawiania otwierają ten sam ID, zapisane dane
i krok. Automatyczny start jest wyłączony po zapisaniu postępu. Liczba publicznych
CV nie zmienia się.

### A-03 — Izolacja szkicu, importu i języków [P0]

**Warunek:** zapisany stan początkowy Admina A z sekcji 1; nowy pusty test.

1. Sprawdź, czy formularz testu nie zawiera `MASTER — NIE ZMIENIAĆ` ani danych profilu.
2. Wybierz PL jako język CV; szczególnie sprawdź konto z aktywnym tylko językiem EN.
3. Zaimportuj przykładowy YAML, zatwierdź import i popraw nazwisko na `ADMIN TEST ONLY`.
4. Przejdź kilka plansz i przerwij test z zapisem.
5. Otwórz zwykły edytor, profil oraz ustawienia języków konta.
6. Porównaj Master CV i historię rewizji ze stanem początkowym.

**Oczekiwany wynik:** import i poprawki są wyłącznie w szkicu testowym. Treść
Master CV, jego rewizje, dane profilu, adres istniejącego publicznego CV oraz
języki konta i język domyślny nie zmieniają się. PL działa w teście bez dodania
go do języków rzeczywistego Master CV.

### A-04 — Publikacja testowego CV w dashboardzie [P0]

**Warunek:** Admin A z wypełnionym szkicem testowym.

1. Uzupełnij wymagane dane, sprawdź podgląd i zatwierdź publikację.
2. Skopiuj link i otwórz go bez zalogowania.
3. Otwórz dashboard i odszukaj **Test onboardingu**.
4. Sprawdź, czy liczba zapisanych CV wzrosła o jeden i link otwiera właściwe dane.
5. Sprawdź stan checkboxa w ustawieniach i ponów kontrolę izolacji z A-03.

**Oczekiwany wynik:** istnieje jedno nowe CV o nazwie `Test onboardingu`, z treścią
szkicu testowego i działającym linkiem. Zawartość rzeczywistego Master CV nie
przenika do publikacji. Indeksowanie i automatyczny start są wyłączone; test jest
zakończony. Pozostałe CV i profil nie zmieniają się.

### A-05 — Powtórzenie po zakończeniu i nowy pusty test [P0]

**Warunek:** zakończony A-04; zachowaj link opublikowanego testowego CV.

1. W ustawieniach kliknij Uruchom teraz.
2. Sprawdź nowe ID, planszę powitalną i pusty formularz.
3. Wprowadź `DRUGI TEST`, zapisz i pozostaw tę kartę otwartą.
4. W drugiej karcie otwórz ustawienia i kliknij **Zacznij nowy pusty test**.
5. Sprawdź kolejne nowe ID, powitanie i pusty formularz.
6. W starej karcie zmień dane i spróbuj przejść dalej z zapisem.
7. Otwórz link z A-04.

**Oczekiwany wynik:** każde jawne rozpoczęcie nowego testu tworzy nowy przebieg.
Poprzednie szkice są zachowane, a opublikowane CV nadal działa. Stara karta nie
potwierdza zapisu zmian do zakończonego przebiegu i nie zmienia nowego szkicu.

### A-06 — Zakończenie testu bez publikacji [P0]

**Warunek:** Admin A, niezakończony test; zanotowana liczba CV w dashboardzie.

1. Przejdź do ostatniej planszy i wybierz Nie teraz.
2. Sprawdź ekran zakończenia oraz dashboard.
3. Wróć do ustawień i uruchom kolejny test.

**Oczekiwany wynik:** test kończy się bez utworzenia CV i linku; liczba CV nie
wzrasta. Checkbox jest wyłączony. Nowy test jest pusty. Szkic zakończonego testu
nie staje się rzeczywistym Master CV.

### A-07 — Wycofanie i ponowna publikacja testowego CV [P0]

**Warunek:** istnieje opublikowany `Test onboardingu`; znany jego link.

1. W dashboardzie wycofaj publikację tej pozycji.
2. Sprawdź w oknie prywatnym, czy dawny link przestał udostępniać CV.
3. Otwórz prywatny podgląd testowego CV jako Admin.
4. Ponownie opublikuj tę samą pozycję z dashboardu.
5. Sprawdź link i dane oraz brak dodatkowej pozycji w dashboardzie.
6. Na końcu testu usuń tę testową pozycję i ponownie sprawdź link bez zalogowania.

**Oczekiwany wynik:** prywatny podgląd zawiera szkic testowy. Ponowna publikacja
używa jego zapisanego języka, ma wyłączone indeksowanie i zachowuje dotychczasowy
link. Nie pobiera treści Master CV. Usunięty test znika z dashboardu, a link nie
udostępnia już CV. Rzeczywiste CV pozostają bez zmian.

### A-08 — Granice uprawnień i izolacja między administratorami [P0]

**Warunek:** znane ID niezakończonego testu Admina A; osobna sesja Admina B i Usera.

1. Jako Admin B otwórz `/onboarding?test=<ID_ADMIN_A>` oraz
   `/onboarding/test-cv/<ID_ADMIN_A>`.
2. W narzędziach deweloperskich wykonaj GET
   `/api/admin/onboarding-test/<ID_ADMIN_A>`.
3. W sesji Usera wykonaj GET `/api/admin/onboarding-test` oraz POST pod ten adres
   z JSON `{"action":"start"}` i nagłówkiem `Content-Type: application/json`.
4. Powtórz żądania z kroku 3 bez sesji. Jeżeli dostępne są konta Manager i Recruiter,
   powtórz także z ich sesjami.

**Oczekiwany wynik:** Admin B otrzymuje 404 dla cudzego przebiegu/podglądu/API.
User, Manager i Recruiter otrzymują 403 z API; klient anonimowy otrzymuje 401.
Nie pojawiają się cudze dane ani nowy przebieg dla niedozwolonej roli.

**Wariant P1:** na dodatkowym koncie Admina sprawdź odmowę dostępu po dezaktywacji
lub przy niezweryfikowanym e-mailu. Nie dezaktywuj jedynego aktywnego administratora.

## 5. Testy wspólne — wykonaj jako User i w trybie testowym Admina

### W-01 — Błąd zapisu i odzyskanie połączenia [P0]

1. W niezakończonym przebiegu zmień dane na planszy formularza.
2. W DevTools → Network ustaw Offline, a następnie wybierz Dalej lub Dokończę później.
3. Sprawdź komunikat i zawartość formularza.
4. Przywróć połączenie i ponów tę samą czynność.
5. Odśwież stronę po udanym zapisie lub wznów z dashboardu.

**Oczekiwany wynik:** błąd nie przenosi na kolejną planszę ani dashboard, wpisy
pozostają na ekranie. Po przywróceniu połączenia zapis działa i dane wracają po
odświeżeniu. Dla Admina nadal zachowana jest izolacja z A-03.

### W-02 — Wielokrotne zatwierdzenie i ponowienie publikacji [P0]

1. Na ostatniej planszy włącz wolne połączenie w DevTools i szybko kliknij zgodę
   na publikację kilka razy.
2. Poczekaj na wynik i sprawdź dashboard oraz działanie linku.
3. W wariancie z narzędziem do symulacji awarii odpowiedzi dopuść zapis publikacji
   na serwerze, ale przerwij jej odpowiedź do przeglądarki. Następnie ponów operację.

**Oczekiwany wynik:** podczas operacji przyciski są zablokowane; dla jednego
przebiegu powstaje jedna pozycja CV. Ponowienie po utracie odpowiedzi odzyskuje
ten sam link. Błąd nie kończy przewodnika pozornym sukcesem. W zwykłym onboardingu
po nieudanej publikacji w dashboardzie może istnieć zarezerwowany szkic;
ponowienie powinno wykorzystać tę samą pozycję.

Jeżeli nie można zasymulować awarii po zapisie na serwerze, oznacz krok 3 jako
**Niewykonany**, osobno od wyniku próby wielokrotnego kliknięcia.

### W-03 — Język przewodnika i język CV [P1]

1. Ustaw przewodnik na PL, a dokument CV na EN; wpisz dane i zapisz przejściem dalej.
2. Zmień przewodnik na EN, przejdź dalej i odśwież stronę.
3. W osobnym przebiegu sprawdź przewodnik EN z dokumentem PL i publikację.

**Oczekiwany wynik:** zmieniają się nagłówki i przyciski przewodnika, bez tłumaczenia
wpisanej treści ani zmiany wybranego języka CV. Po zapisaniu kroku i odświeżeniu
wybory pozostają. Publikacja udostępnia wybrany język dokumentu.

### W-04 — Mały ekran, klawiatura i postęp [P1]

1. Sprawdź powitanie, import, formularz, podgląd i zakończenie przy szerokości
   390 px oraz na komputerze.
2. Przewiń długą planszę i sprawdź dostępność paska postępu.
3. Przejdź pola i przyciski klawiszem Tab; uruchamiaj je klawiaturą.
4. Zmień planszę i sprawdź położenie strony oraz fokus nagłówka.

**Oczekiwany wynik:** brak poziomego przewijania całej strony i zasłoniętych akcji.
Postęp pozostaje widoczny podczas wypełniania. Fokus jest widoczny, kolejność
klawiatury logiczna, a zmiana planszy przenosi widok na jej początek.

### W-05 — Zamknięcie strony z niezapisanymi zmianami [P1]

1. Zapisz krok, przechodząc dalej. Na nowej planszy zmień tekst bez zapisu.
2. Spróbuj odświeżyć lub zamknąć kartę; jeśli przeglądarka pokazuje ostrzeżenie,
   najpierw anuluj wyjście i sprawdź wpisany tekst.
3. Ponów wyjście, zaakceptuj utratę niezapisanych zmian i otwórz przewodnik ponownie.

**Oczekiwany wynik:** obsługujące tę funkcję przeglądarki ostrzegają po interakcji
z formularzem. Powracają dane z ostatniego udanego zapisu. Zmiany na bieżącej
planszy, których nie zapisano, mogą zostać utracone — nie jest to zapis ciągły.

## 6. Rejestr wyników i kryteria odbioru

Skopiuj wiersz dla każdego wykonanego scenariusza; W-01–W-05 zapisz osobno dla
Usera i Admina. Statusy: **Niewykonany / PASS / FAIL / BLOCKED**.

| ID | Rola/konto | Przeglądarka i rozmiar | Status | Wynik rzeczywisty / zgłoszenie / dowód |
| --- | --- | --- | --- | --- |
| U-01 | User A | — | Niewykonany | — |
| A-01 | Admin A | — | Niewykonany | — |
| W-01 | User A | — | Niewykonany | — |
| W-01 | Admin A | — | Niewykonany | — |

Do błędu dołącz ID scenariusza, wersję aplikacji, ostatni poprawny krok,
oczekiwany i rzeczywisty wynik oraz zrzut ekranu lub kod odpowiedzi API.
Nie dołączaj tokenów sesji ani haseł.

Warunki odbioru:

- [ ] Wszystkie scenariusze P0 zaliczone; brak pominiętych kroków bez odnotowania.
- [ ] User tworzy Master CV od zera i przez import; dane są zachowane po wznowieniu.
- [ ] Publikacja daje jedno CV w dashboardzie i działający link bez logowania.
- [ ] Odmowa publikacji nie tworzy publicznego CV.
- [ ] Admin powtarza test bez nowego konta i bez zmian w swoim Master CV/profilu.
- [ ] User i drugi Admin nie uzyskują dostępu do cudzego przebiegu testowego.
- [ ] Wyniki P1 oraz wszelkie ograniczenia środowiska zapisane w raporcie.

Po testach wycofaj lub usuń utworzone publiczne CV testowe, sprawdź niedostępność
ich linków oraz wyłącz checkbox automatycznego startu u Admina.
