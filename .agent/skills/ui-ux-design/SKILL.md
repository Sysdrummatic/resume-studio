---
name: UI/UX Design
description: Ten skill definiuje standardy projektowania interfejsów premium dla OpenCVHub, skupiając się na estetyce, czytelności i responsywności. Używaj go przy zadaniach dotyczących layoutu, stylizacji CSS oraz poprawy wrażeń użytkownika (UX).
---

# UI/UX Design Skill (OpenCVHub)

Ten plik definiuje premium standard projektowania UI/UX dla agentow pracujacych nad OpenCVHub. Uzywaj go przy zadaniach dotyczacych layoutu, stylow, hierarchii informacji, interakcji, responsywnosci, polishu i ogolnego kierunku wizualnego strony lub produktu.

## Cel

Projektuj interfejsy, ktore sa jednoczesnie:
- czytelne i szybkie w obsludze
- premium, charakterystyczne i niegeneryczne
- spojne z architektura Next.js App Router
- dostepne i responsywne
- realistyczne do wdrozenia w zwyklym CSS i istniejacych komponentach React

Skill ma nie tylko poprawiac UX. Ma aktywnie popychac projekt w strone rozpoznawalnego design language zamiast przecietnego wygladu "kolejnego SaaS dashboardu".

## Priorytety decyzyjne

1. Czytelnosc i orientacja uzytkownika
2. Dostepnosc i semantyka
3. Wyrazny kierunek art direction
4. Spojnosc systemowa
5. Responsywnosc
6. Jakosc interakcji i motion
7. Efekty dekoracyjne

## Rola tego skilla

Ten skill ma produkowac decyzje projektowe, nie tylko estetyczne sugestie. Agent powinien po jego uzyciu:
- wybrac konkretny kierunek wizualny
- odrzucic generyczne rozwiazania
- zaprojektowac hierarchie, rytm i kontrast z zamiarem
- utrzymac spojny jezyk wizualny miedzy ekranami
- dostarczyc UI, ktore wyglada jak swiadomie zaprojektowany produkt

## Kontekst produktu

OpenCVHub nie jest landing page'em marketingowym. To produkt z obszarami roboczymi, danymi uzytkownika, adminem, widokami CV, eksportem i przeplywami publikacji. Oznacza to:

- dashboardy i panele maja byc operacyjne, ale nie nudne
- formularze i akcje musza byc jednoznaczne
- stany systemowe musza byc natychmiast czytelne
- widoki publiczne CV moga miec mocniejszy charakter wizualny niz panele robocze
- interfejs nie moze ukrywac waznych ograniczen zwiazanych z auth, RBAC, publikacja i stanem danych

## Premium Design Mandate

Jesli zadanie dotyczy nowej strony, istotnego redesignu albo polishu, nie zatrzymuj sie na "czysto i poprawnie". Cel to interfejs, ktory:

- ma wlasna osobowosc wizualna
- tworzy nastroj przez typografie, powierzchnie, kolor i rytm
- jest nowoczesny bez bycia krzykliwym
- wyglada na zaprojektowany, nie zlozony z gotowych klockow

Nie wystarczy:
- poprawny spacing
- zwykly card grid
- neutralny font i jeden accent color
- standardowy hero + cards + CTA

To jest minimum, nie premium.

## Design Differentiation Rules

Agent ma aktywnie unikac ponizszych wzorcow, chyba ze istnieje bardzo mocny powod produktowy:

- generyczny bialy albo ciemny SaaS dashboard z losowym accentem
- wszedobylskie karty z identycznym promieniem i cieniem
- Inter lub Roboto jako bezmyslny default, jesli ekran ma byc charakterystyczny
- przypadkowe gradienty bez zwiazku z trescia
- przesadne oparcie layoutu na samych boxach i borderach
- bezpieczna, przewidywalna kompozycja bez punktu napiecia lub dominanty
- "AI slop UI", czyli estetyka ladna na pierwszy rzut oka, ale wymienna z setkami innych

Jesli propozycja wyglada jak cos, co moglby wygenerowac dowolny boilerplate UI, to nalezy ja uznac za niewystarczajaca.

## Art Direction Framework

Przed projektowaniem wybierz jeden glowny kierunek wizualny. Nie mieszaj wszystkiego naraz.

### 1. Editorial Precision

Najlepszy dla:
- publicznych stron CV
- stron profilowych
- ekranow, gdzie tresc ma byc bohaterem

Cechy:
- mocna typografia
- wyrazny rytm pionowy
- duzo swiatla i celowo dozowana asymetria
- eleganckie kontrasty rozmiaru tekstu
- oszczedne, ale wyrafinowane kolory

Unikaj:
- przechadzania w magazyn lifestyle
- nadmiaru ozdobnikow
- oslabienia czytelnosci CV

### 2. Technical Premium

Najlepszy dla:
- dashboardow
- paneli admina
- obszarow z danymi, statusami i workflow

Cechy:
- precyzyjna siatka
- wyrazne warstwy informacji
- elegancki kontrast powierzchni
- subtelny feeling "high-end tool"
- operacyjnosc polaczona z charakterem

Unikaj:
- nudnego enterprise gray UI
- zbyt wielu ramek i separatorow
- przesadnej sterylnosci

### 3. Quiet Futurism

Najlepszy dla:
- homepage
- sekcji showcase
- miejsc, gdzie produkt ma wygladac nowoczesnie i ambitnie

Cechy:
- ograniczona, swiadoma paleta
- delikatny gradient atmosferyczny
- swietlne akcenty, ale bez cyberpunkowego przeladowania
- nowoczesna typografia i spokojne motion

Unikaj:
- neonowego chaosu
- sci-fi dla samego sci-fi
- zabicia tresci efektem

### 4. Warm Authority

Najlepszy dla:
- auth
- onboarding
- krytycznych flow konta

Cechy:
- wysoki poziom zaufania
- przyjazn bez infantylizacji
- spokojne tlo i wyrazne CTA
- mocna czytelnosc formularzy i komunikatow

Unikaj:
- zimnej bezosobowosci
- dekoracyjnosci, ktora oslabia wiarygodnosc

## System budowania unikalnego wygladu

Kazdy ekran powinien miec przynajmniej 3 z 5 ponizszych elementow wyrozniajacych:

1. Charakterystyczna typografia
2. Swiadomie zaprojektowana powierzchnia tla
3. Wlasny rytm layoutu zamiast standardowego card grid
4. Rozpoznawalny system akcentow kolorystycznych
5. Celowe motion albo reveal behavior

Jesli ekran nie ma zadnego elementu wyrozniajacego poza kolorem przycisku, nie jest gotowy.

## Zasady wizualne

### Hierarchia
- Ustal jeden dominujacy cel ekranu.
- Uzywaj tylko jednego `h1` na strone.
- Buduj wyrazny porzadek: naglowek strony, opis, glowne akcje, tresc, akcje poboczne.
- Grupuj elementy wedlug zadania, nie tylko wedlug podobnego wygladu.
- Zaprojektuj przynajmniej jeden punkt dominujacy wizualnie.

### Kompozycja
- Uzywaj ukladu, ktory tworzy rytm, a nie tylko rowne pudelka.
- Lacz regularnosc z jednym celowym przelamaniem: skala, offset, asymetria, breakout, tlo sekcyjne.
- Niech ekran ma napiecie wizualne, ale nie chaos.
- Jesli wszystko ma ten sam ciezar wizualny, kompozycja jest za slaba.

### Gestosc i spacing
- Preferuj spojny system odstepow oparty o kroki `4px`, `8px`, `12px`, `16px`, `24px`, `32px`.
- Zwiekszaj gestosc informacji przez lepsze grupowanie i wyrownanie, nie przez sciskanie wszystkiego.
- Duze sekcje oddzielaj swiatlem, kontrastem tla, warstwa powierzchni albo zmiana rytmu, nie tylko wiekszym marginesem.

### Kolor i kontrast
- Kolor ma najpierw niesc znaczenie, potem estetyke.
- Ogranicz palete i nadaj jej role: baza, akcent, status, surface contrast, text contrast.
- Unikaj przypadkowych, nasyconych kolorow podstawowych bez systemu.
- Statusy musza byc odroznialne nie tylko kolorem, ale tez ikona, etykieta albo copy.
- Kontrast tekstu i elementow interaktywnych ma spelniac praktyczny standard WCAG.

### Typografia
- Typografia ma byc jednym z glownych nosnikow charakteru.
- Nie wybieraj fontu bez powodu. Okresl, czy ekran ma byc bardziej:
  - redakcyjny
  - narzedziowy
  - techniczny
  - elegancki
- Zmieniaj skale, wage i tracking z zamiarem.
- Dlugie teksty utrzymuj w wygodnej szerokosci czytania.
- W panelach narzedziowych preferuj stabilny rytm i czytelne etykiety zamiast czysto dekoracyjnych zabiegow.

### Powierzchnie i glebia
- Uzywaj warstw swiadomie: tlo aplikacji, kontener sekcji, karta, element aktywny.
- Cienie, blur i gradienty maja wspierac orientacje i nastroj.
- Karty nie moga byc jedynym narzedziem organizacji interfejsu.
- Glassmorphism stosuj oszczednie i tylko tam, gdzie nie pogarsza czytelnosci.

## Motion Language

Motion ma byc czescia premium odczucia, ale ma pozostac funkcjonalny.

- Uzywaj krotkich, znaczacych przejsc dla `opacity`, `transform`, `color`, `background-color`, `box-shadow`.
- Animacje maja wspierac orientacje: wejscie sekcji, zmiana stanu, otwarcie panelu, potwierdzenie akcji.
- Preferuj motion, ktory daje wrazenie precyzji, nie zabawy.
- Szanuj `prefers-reduced-motion`.
- Unikaj animacji, ktore spowalniaja prace uzytkownika lub maskuja opoznienia backendu.

## Zachowanie i interakcje

### Informacja zwrotna
- Kazdy istotny element interaktywny musi miec stany `default`, `hover`, `focus`, `active`, `disabled`.
- Akcje asynchroniczne musza komunikowac `loading`, `success`, `error`.
- Nie polegaj wylacznie na toasterach; istotny stan pokaz tez lokalnie przy akcji lub sekcji.
- Premium UI daje poczucie kontroli. Uzytkownik nie moze zgadywac, co sie dzieje.

### Formularze
- Etykiety maja byc jednoznaczne i zwiezle.
- Bledy walidacji pokazuj blisko pola i jezykiem zadaniowym.
- Dlugie formularze dziel na logiczne sekcje.
- Najgrozniejsze akcje wymagaja wizualnego rozroznienia i jasnych konsekwencji.
- Formularz ma wygladac pewnie i wiarygodnie, nie dekoracyjnie.

### Nawigacja
- Uzytkownik ma zawsze wiedziec:
  - gdzie jest
  - co moze zrobic teraz
  - co sie stanie po kliknieciu
- Akcje glowne i poboczne musza byc rozdzielone wizualnie.
- Nie duplikuj CTA w wielu stylach o tej samej wadze.

## Standardy techniczne

### CSS
- Preferuj zwykly CSS zgodny z istniejacym repo.
- Tokeny projektowe i zmienne umieszczaj centralnie, zwykle w `app/globals.css`.
- Jesli tworzysz nowy kierunek wizualny, zdefiniuj go przez czytelne custom properties.
- Nie wprowadzaj nowych wzorcow stylowania bez potrzeby.
- Jesli ekran ma wlasny jezyk wizualny, utrzymuj ho lokalnie w odpowiednim pliku CSS, zamiast rozlewac wyjatki globalnie.

### React i App Router
- Zachowuj podzial na komponenty prezentacyjne i logike ekranu.
- Nie rozwiazuj problemow UX przez nadmiar stanu, jesli wystarczy lepsza struktura DOM i CSS.
- W komponentach klienckich dbaj o focus management, czytelne aria-label i semantyczny HTML.

### Dostepnosc
- Uzywaj semantycznych elementow: `main`, `nav`, `section`, `header`, `article`, `button`, `label`.
- Focus ring musi byc widoczny i nie moze byc usuwany bez sensownego zamiennika.
- Elementy klikalne maja miec odpowiedni rozmiar i przewidywalny obszar trafienia.
- Dialogi, menu i dropdowny musza byc sensowne dla klawiatury.

## Wzorce zalezne od obszaru

### Dashboard, admin, obszary robocze
- Stawiaj na klarowny podzial sekcji, szybki scanning i czytelne statusy.
- Priorytetem sa operacyjnosc i zaufanie, ale forma ma nadal nosic premium craft.
- Tabele, listy i karty maja eksponowac najwazniejsze decyzje i ryzyka.
- Szukaj alternatyw dla monotonii rownych kart: pasy sekcyjne, sticky summary, modularne bloki, zroznicowanie powierzchni.

### Auth i konto
- Minimalizuj obciazenie poznawcze.
- Jedna glowna akcja na ekran.
- Bledy musza byc precyzyjne, ale bez ujawniania wrazliwych szczegolow.
- Ekran logowania lub odzyskiwania dostepu ma budowac zaufanie juz sama kompozycja i tonem wizualnym.

### Widok CV i publiczne strony
- Mozna pozwolic sobie na mocniejszy charakter wizualny, ale tresc CV musi pozostac dominanta.
- Czytelnosc druku i eksportu ma pierwszenstwo nad dekoracja.
- Przelaczanie jezyka, badge i sekcje doswiadczenia musza pozostac jednoznaczne.
- Publiczna strona ma wygladac jak starannie zaprojektowana prezentacja profesjonalisty, nie jak surowy export danych.

### Homepage i strony showcase
- To miejsce na najsilniejszy kierunek art direction.
- Uzywaj atmosferycznego tla, rytmu sekcji, skali typografii i motion reveal.
- Nie wracaj odruchowo do ukladu: hero, 3 cards, feature grid, CTA footer.

## Antywzorce

- Nie kopiuj generycznych ukladow SaaS bez dopasowania do tresci.
- Nie uzywaj modnych efektow kosztem kontrastu i czytelnosci.
- Nie przeladowuj ekranu kartami, jesli prostsza struktura sekcji dziala lepiej.
- Nie ukrywaj waznych akcji w dropdownach tylko po to, by UI wygladal czysciej.
- Nie mieszaj kilku roznych promieni, kilku modeli cienia i wielu przypadkowych spacingow.
- Nie dodawaj nowych bibliotek UI bez wyraznej potrzeby.
- Nie projektuj przez kopiowanie "dribbblowych" fragmentow bez logiki systemowej.
- Nie wybieraj "bezpiecznego" stylu tylko dlatego, ze jest szybki.

## Workflow dla agenta

1. Zidentyfikuj typ ekranu i glowne zadanie uzytkownika.
2. Wybierz jeden kierunek art direction z tego skilla.
3. Sprawdz istniejace wzorce w `app/`, `app/components/`, `app/globals.css`, `app/resume/resume.css`, `app/user/user.css`.
4. Okresl, co jest problemem:
   - hierarchia
   - kompozycja
   - spacing
   - kontrast
   - responsywnosc
   - stany interakcji
   - gestosc informacji
   - brak charakteru wizualnego
5. Najpierw popraw strukture i semantyke, potem styl.
6. Zdefiniuj 2-5 tokenow, ktore nadadza ekranowi charakter:
   - font pairing lub font role
   - surface colors
   - accent colors
   - radius logic
   - shadow logic
   - motion timing
7. Zweryfikuj desktop i mobile.
8. Sprawdz focus, hover, disabled, loading i error states.
9. Ocen, czy ekran da sie odroznic od generycznego boilerplate UI.

## Premium Review Questions

Przed zakonczeniem odpowiedz sobie:
- Co w tym ekranie jest rozpoznawalne wizualnie?
- Czy typografia robi realna robote, czy jest tylko neutralnym nosnikiem tekstu?
- Czy tlo, powierzchnie i rytm layoutu buduja nastroj?
- Czy ten ekran wyglada jak swiadomy produkt, czy jak skladanka komponentow?
- Co odroznia go od przecietnego SaaS template?

Jesli nie ma dobrej odpowiedzi na te pytania, design jest za slaby.

## Definition of Done dla zmian UI/UX

- Interfejs ma jasna hierarchie i jeden czytelny primary action path.
- Layout dziala na desktopie i mobile bez lamania tresci.
- Stany interakcji sa kompletne i spojne.
- Kontrast i focus nie pogorszyly dostepnosci.
- Zmiany sa spojne z istniejacym jezykiem produktu albo swiadomie ustanawiaja lepszy wzorzec.
- CSS pozostal mozliwie prosty i lokalny wzgledem odpowiedzialnosci.
- Ekran ma przynajmniej kilka rozpoznawalnych decyzji wizualnych, a nie tylko poprawny porzadek.

## Krotka checklista przed zakonczeniem

- Czy ekran da sie zeskanowac w 5 sekund?
- Czy uzytkownik wie, co jest najwazniejsze?
- Czy glowna akcja jest jednoznaczna?
- Czy stany bledu i ladowania sa czytelne?
- Czy mobilny layout nadal ma sens?
- Czy UI wyglada lepiej dlatego, ze jest bardziej uporzadkowany?
- Czy UI ma charakter, a nie tylko porzadek?
- Czy da sie go pomylic z generycznym template? Jesli tak, popraw ho.
