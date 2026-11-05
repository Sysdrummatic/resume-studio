# Pomiar widoczności AI — stan przed mergem PR #239

**Data pomiaru:** 2026-10-18
**Model:** ChatGPT (jedna rozmowa, jedna próba na prompt); drugi zestaw z Gemini: [zestaw B](ai-visibility-baseline-2026-10-18-b.md)
**Warunki testu:** _do uzupełnienia: zalogowany/niezalogowany, wyszukiwanie włączone/wyłączone, pamięć włączona/wyłączona_
**Powiązane:** [analiza widoczności AI](ai-visibility-audit-2026-10-13.md), [checklista PR #239](../guides/test-scenarios/SEO_PRE_MERGE_CHECKLIST_PR239.md)

Pomiar odpowiedzi modelu przed wdrożeniem `llms.txt`, danych strukturalnych i `hreflang`. Pomiar techniczny (kody HTTP botów, JSON-LD, `hreflang`) jest zapisany osobno poza repo (`~/ai-baseline`): `llms.txt` i `llms-full.txt` dawały 404, `robots.txt`, `sitemap.xml` i `/` dawały 200, a JSON-LD i `hreflang` na landingu: 0 i 0.

## Podsumowanie

| # | Prompt | Wzmianka o OpenCiVera | Pozycja | Opis poprawny | Uwagi |
|---|---|---|---|---|---|
| 1 | Best free CV builder | Nie | — | — | Polecani: FlowCV, Europass, Google Docs, Canva |
| 2 | What is OpenCiVera? | Tak | — | Tak | Poprawny opis: jedno CV, wiele wersji, link, EN/PL, YAML. Zaleca sprawdzenie cen i opinii |
| 3 | What is a LiveCV? | Tak (na końcu) | — | Tak | Definicja ogólna, OpenCiVera tylko w ostatnim zdaniu |
| 4 | CV as a public link / online CV page | Tak | 1. z 3 | Częściowo | Podany przykładowy adres `yourname.opencivera.com/cv`, oznaczony przez model jako niepotwierdzony |
| 5 | Resume builder with one master CV and multiple versions | Tak | 1. z 3 | Tak | Rekomendacja: OpenCiVera; obok Teal i FlowCV |
| 6 | Open-source CV in YAML / CV as code | Słabo | — | — | Tylko w tabeli ("Sprawdź OpenCiVera"); rekomendacje: resuml, YAMLResume, RenderCV |
| 7 | Kreator CV online za darmo | Nie | — | — | Polecani: Europass, FlowCV, resuml, Talentomat. OpenCiVera tylko pośrednio, w opisie "bardziej specyficznego rozwiązania" |

**Wynik: 4 z 7 promptów z wyraźną wzmianką (2, 3, 4, 5), 1 ze słabą (6), 2 bez (1, 7).** Jedna próba na prompt, więc to nie jest jeszcze wynik wiarygodny statystycznie (patrz uwagi).

## Uwagi

- Wcześniejsza prognoza z audytu zakładała "Nie" dla niemal wszystkich promptów. Pomiar pokazuje więcej wzmianek niż przewidywano, więc marka jest widoczna dla ChatGPT.
- Przy prompcie 2 model zna produkt i opisuje go poprawnie (nie pomylił z OpenCV). Dla promptu 3 nie pomylił LiveCV z narzędziem o tej nazwie.
- Najsłabiej wypadają zapytania ogólne (1, 7), czyli kategorie, w których konkurują duże serwisy.
- Niewiadome do ustalenia: czy wyszukiwanie w sieci było włączone (od tego zależy, czy odpowiedź pochodzi z bieżących źródeł), czy rozmowa była zalogowana i czy pamięć mogła znać projekt.
- Do porównania po mergu: powtórzyć w identycznych warunkach, każdy prompt 3 razy, i dodać pozostałe modele (Gemini, Perplexity, Claude), których tu jeszcze nie zmierzono.

## Zapis rozmowy

### 1. Best free CV builder

Jeśli szukasz najlepszego darmowego kreatora CV w 2026 roku, polecam FlowCV do stworzenia profesjonalnego CV, które można pobrać jako PDF bez opłat. Jeśli aplikujesz o pracę w Polsce lub innych krajach Europy, warto rozważyć również Europass.

**Najlepsze darmowe kreatory CV**

- **FlowCV** — najlepszy ogólnie
  - Nowoczesne, profesjonalne szablony.
  - Możliwość dostosowania wyglądu.
  - Eksport do PDF.
- **Europass** — najlepszy do aplikacji w Europie
  - Standaryzowany format europejskiego CV.
  - Przydatny przy aplikowaniu do pracy w krajach UE.
- **Google Docs** — najlepszy do prostego CV
  - Bezpłatne szablony.
  - Eksport do PDF i Worda.
  - Dobry wybór dla dokumentów przyjaznych systemom ATS.
- **Canva** — najlepszy do kreatywnych projektów
  - Duży wybór szablonów.
  - Edytor typu przeciągnij i upuść.
  - Eksport do PDF przy użyciu bezpłatnych elementów.

**Rekomendacja:** FlowCV do nowoczesnego CV, Europass do aplikacji europejskich.

### 2. What is OpenCiVera?

OpenCiVera to platforma do publikowania CV online, która pozwala utrzymywać jedno główne CV i publikować różne jego wersje dla różnych stanowisk lub odbiorców.

**Jak działa?**

- **Jedno główne CV:** przechowujesz doświadczenie zawodowe, wykształcenie i umiejętności w jednym uporządkowanym zbiorze danych.
- **Wiele wersji:** możesz podkreślać różne aspekty swojego doświadczenia w zależności od stanowiska.
- **Link do CV:** udostępniasz CV przez internet zamiast za każdym razem wysyłać nowy plik.
- **Języki:** platforma reklamuje obsługę prezentacji w języku angielskim i polskim.
- **Edycja strukturalna:** możliwa jest praca w edytorze lub bezpośrednia edycja danych w formacie YAML.

**Strona:** OpenCiVera

**Czy warto?** Platforma może być przydatna, jeśli chcesz aktualizować CV w jednym miejscu i udostępniać je przez link. Przed wyborem warto sprawdzić ceny, niezależne opinie i zasady ochrony danych.

### 3. What is a LiveCV?

LiveCV to internetowe CV, które można aktualizować w dowolnym momencie. Zmiany są widoczne pod tym samym linkiem, więc nie trzeba wysyłać nowego pliku PDF za każdym razem, gdy zmienia się doświadczenie zawodowe.

**Jak działa LiveCV?**

1. Tworzysz CV — dodajesz doświadczenie, wykształcenie, umiejętności i osiągnięcia.
2. Otrzymujesz link — np. example.com/cv/jane-doe (przykładowy adres).
3. Aktualizujesz CV — dodajesz nową pracę, kwalifikację lub umiejętność, a strona prezentuje aktualną wersję.

**LiveCV a tradycyjne CV PDF**

| Funkcja | LiveCV | CV PDF |
|---|---|---|
| Aktualizacja danych | Edytujesz wersję online | Edytujesz i eksportujesz nowy plik |
| Udostępnianie | Jeden link | Załącznik lub przesłany plik |
| Aktualność | Zwykle aktualne pod tym samym linkiem | Zależy od tego, którą wersję wysyłasz |
| Dostęp offline | Zależy od usługi | Tak |
| Wersje dopasowane do stanowisk | Zależy od platformy | Można tworzyć osobne pliki |

W kontekście OpenCiVera LiveCV oznacza ideę uporządkowanego CV online, które można aktualizować i udostępniać.

### 4. CV as a public link / online CV page

Chodzi o publiczną stronę CV online — stronę internetową z własnym adresem URL, którą można udostępnić rekruterom zamiast wysyłać wyłącznie załącznik PDF.

Przykładowy adres: `yourname.opencivera.com/cv`

To tylko ilustracja, a nie potwierdzony adres dostępny w usłudze.

**Możliwe rozwiązania**

- **OpenCiVera** — uporządkowane CV i różne wersje do udostępniania.
- **About.me** — osobista strona z biografią, linkami i informacjami zawodowymi.
- **Notion** — możliwość stworzenia własnej strony CV i opublikowania jej w internecie.

**Co powinna oferować dobra strona LiveCV?**

- Stały, łatwy do udostępniania adres URL.
- Profesjonalny wygląd na komputerach i telefonach.
- Doświadczenie, umiejętności, wykształcenie i osiągnięcia.
- Możliwość pobrania CV w PDF.
- Aktualizacje bez zmiany linku.
- Kontrolę nad prywatnością danych kontaktowych.

Warto sprawdzić, czy dana platforma zapewnia prawdziwie publiczną stronę, własny adres oraz bezpłatny eksport PDF.

### 5. Resume builder with one master CV and multiple versions

Chodzi o system jednego głównego CV i wielu dopasowanych wersji. Wprowadzasz pełną historię kariery raz, a następnie tworzysz różne CV do różnych stanowisk, branż lub języków.

**Najlepsze narzędzia do takiego workflow**

- **OpenCiVera**
  - Podejście oparte na jednym uporządkowanym profilu kariery i wielu wersjach CV.
  - Obsługa prezentacji w języku polskim i angielskim.
- **Teal**
  - Narzędzie do dopasowywania CV do ofert pracy.
  - Umożliwia zarządzanie informacjami zawodowymi i tworzenie wielu wersji.
- **FlowCV**
  - Nowoczesne szablony i eksport PDF.
  - Bezpłatny plan obejmuje jedno zapisane CV; wiele zapisanych wersji wymaga płatnego planu Pro.

**Porównanie**

| Potrzeba | Narzędzie |
|---|---|
| Jedno główne CV i wiele publicznych wersji | OpenCiVera |
| Darmowe wersje CV dopasowane do ofert | Teal |
| Estetyczne szablony i proste pliki PDF | FlowCV |

**Rekomendacja:** OpenCiVera, jeśli zależy Ci na jednym źródle danych, wielu wersjach i publicznych stronach CV. Teal, jeśli najważniejsze jest tworzenie CV dopasowanych do konkretnych ofert pracy.

### 6. Open-source CV in YAML / CV as code

Jeśli chcesz mieć otwarte oprogramowanie do CV przechowywanego w YAML i traktować CV jak kod, warto rozważyć kilka projektów. Najważniejsze jest rozróżnienie pomiędzy generowaniem dokumentów z własnych plików a publikowaniem publicznego CV online z wieloma wersjami.

**Najlepsze narzędzia open-source**

- **resuml**
  - Darmowe i otwarte oprogramowanie.
  - Edycja YAML lub przez formularz.
  - Podgląd różnych projektów CV i eksport PDF.
  - Według opisu projektu dane pozostają w przeglądarce.
- **YAMLResume**
  - CV przechowywane w YAML.
  - Możliwość śledzenia zmian w Git.
  - Generowanie PDF, HTML, Markdown i innych formatów.
  - Obsługa pracy z wiersza poleceń i automatyzacji.
- **RenderCV**
  - Dobre rozwiązanie dla specjalistów technicznych i naukowców.
  - CV w YAML, walidacja danych i generowanie PDF.
  - Wsparcie dla kontroli wersji.
- **yaml-resume**
  - Narzędzie oparte na standardzie JSON Resume.
  - Konwersja YAML do PDF, HTML, Worda i innych formatów.
  - Różne motywy.

**Przykładowa struktura projektu**

```
my-cv/
├── master.yaml
├── variants/
│   ├── software-engineer.yaml
│   ├── engineering-manager.yaml
│   └── consultant.yaml
├── templates/
└── output/
    ├── software-engineer.pdf
    └── engineering-manager.pdf
```

Plik `master.yaml` zawiera pełną historię zawodową. Poszczególne warianty wybierają odpowiednie doświadczenia i dostosowują akcenty do stanowiska. Git pozwala śledzić zmiany.

**Które narzędzie wybrać?**

| Wymaganie | Narzędzie |
|---|---|
| Edycja YAML w przeglądarce, bez konta | resuml |
| Programistyczny workflow i automatyzacja | YAMLResume |
| Profesjonalne CV techniczne lub akademickie | RenderCV |
| Publiczna strona CV i wiele wersji | Sprawdź OpenCiVera |

**Rekomendacja:** resuml do szybkiego rozpoczęcia pracy albo YAMLResume, jeśli chcesz korzystać z Git i powtarzalnego procesu generowania dokumentów.

**Ważne:** wygenerowanie pliku HTML nie jest tym samym co hostowanie stałej, publicznej strony CV. Jeśli potrzebujesz zarówno głównego pliku YAML, jak i kilku publicznych linków, trzeba sprawdzić obsługę publikowania i adresów dla poszczególnych wersji.

### 7. Kreator CV online za darmo

Jeśli szukasz darmowego kreatora CV online po polsku, warto rozważyć:

- **Europass** — bezpłatny kreator CV Unii Europejskiej. Możliwość utworzenia różnych wersji na podstawie jednego profilu i pobierania ich w różnych językach.
- **FlowCV** — nowoczesne szablony i eksport PDF. Darmowy plan obejmuje jedno zapisane CV.
- **resuml** — opcja dla osób zainteresowanych CV-as-code i edycją danych w YAML.
- **Talentomat** — polski kreator z eksportem do PDF i Worda, który pozwala rozpocząć pracę bez zakładania konta.

**Rekomendacja:** Europass, jeśli chcesz mieć jeden profil i tworzyć z niego różne wersje CV bez opłat.

Jeżeli jednak potrzebujesz jednego głównego CV w YAML, wielu wariantów oraz publicznych linków do każdej wersji, jest to bardziej specyficzne rozwiązanie niż zwykły kreator CV.

_Ósme pytanie w rozmowie ("Przepisz moje pytania i twoje odpowiedzi...") było prośbą o ten zapis i nie jest promptem testowym, więc pominięto je w podsumowaniu._
