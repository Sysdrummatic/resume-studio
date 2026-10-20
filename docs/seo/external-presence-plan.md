# Plan obecności poza domeną (T18)

**Data:** 2026-10-20 · **Wykonuje:** właściciel produktu (kod nie pomoże) · **Powiązane:** [seo-improvement-plan](seo-improvement-plan.md), zadanie T18, [pomiar AI](ai-visibility-baseline-2026-10-18.md)

## Po co

Asystenci AI polecają produkty, które opisuje wiele niezależnych źródeł. Własna strona (już gotowa: [Czym jest LiveCV](/docs/tutorials/what-is-a-livecv), [jedno CV, wiele wersji](/docs/tutorials/one-master-cv-many-versions), [CV w YAML](/docs/tutorials/cv-as-code-yaml), [porównanie](/docs/tutorials/opencivera-vs-other-cv-tools)) odpowiada na pytania, ale bez zewnętrznych wzmianek model rzadko ją wybierze. Pomiar z 2026-10-18: marka pojawia się głównie przy pytaniu o nią po nazwie, a prawie wcale przy pytaniach o kategorię.

## Zasady

- Jedna kwestia na wpis: problem czytelnika (CV rozjeżdżające się na kopie), potem narzędzie. Bez haseł reklamowych.
- Zawsze "CV builder" obok "LiveCV"; w pierwszym zdaniu rozróżnienie od OpenCV (patrz [terminologia](../guides/brand-language-and-terminology.md)).
- Każdy wpis linkuje do jednej strony z odpowiedzią, nie tylko do strony głównej.
- Reddit i fora: przeczytać regulamin przed wpisem, odpowiadać w istniejących wątkach, nie zakładać serii postów. Jedno konto, ujawniona relacja z produktem.
- Nie wysyłać prawdziwych CV użytkowników; tylko przykład z `/resume`.

## Harmonogram

| Termin | Kanał | Działanie | Treść / link docelowy | Skill do pomocy |
| --- | --- | --- | --- | --- |
| 2026-10-21 | Google Search Console, Bing Webmaster | Weryfikacja domeny, zgłoszenie `sitemap.xml` (T17). Bing zasila wyszukiwanie ChatGPT i Copilota | `https://opencivera.com/sitemap.xml` | — |
| 2026-10-23 | Profil w LinkedIn / strona firmowa | Opis produktu w jednym zdaniu z definicją LiveCV, link do landingu; to samo zdanie w `sameAs` Organization, jeśli jeszcze go nie ma | [Czym jest LiveCV](/docs/tutorials/what-is-a-livecv) | `/anthropic-skills:opencivera-linkedin-writer` |
| 2026-10-27 | LinkedIn (post) | Post o problemie kopii CV i wersji z jednego źródła, PL | [Jedno CV, wiele wersji](/docs/tutorials/one-master-cv-many-versions) | `/anthropic-skills:opencivera-linkedin-writer` |
| 2026-10-30 | GitHub | Jeśli repozytorium jest lub będzie publiczne: README z definicją, zrzutem ekranu i linkiem do dokumentacji; w przeciwnym razie osobne małe repo z przykładowym plikiem YAML CVasCode | [CV w YAML](/docs/tutorials/cv-as-code-yaml) | `/document-generate` |
| 2026-11-04 | Reddit / społeczności programistów | Odpowiedzi w istniejących wątkach o "resume as code", JSON Resume, RenderCV; link tylko tam, gdzie jest na temat | [Porównanie](/docs/tutorials/opencivera-vs-other-cv-tools) | — |
| 2026-11-10 | LinkedIn (post, EN) | Wersja angielska z przykładem LiveCV i porównaniem podejść | [Czym jest LiveCV](/docs/tutorials/what-is-a-livecv) | `/anthropic-skills:opencivera-linkedin-writer` |
| 2026-11-17 | Product Hunt | Przygotowanie wpisu (tagline, opis, 3 zrzuty, pierwszy komentarz); premiera dopiero po ustabilizowaniu rejestracji | landing | `/spec` |
| 2026-11-24 | Katalogi narzędzi (np. alternatywy dla kreatorów CV) | Zgłoszenie do 2–3 katalogów, które sprawdzają treść | landing, `/resume` | — |
| 2026-12-01 | Pomiar | Powtórzyć prompty AI w czystych sesjach, 3 próby na prompt (T19) i porównać z [bazą](ai-visibility-baseline-2026-10-18.md) | — | `/searchfit-seo:ai-visibility` |

## Co mierzyć

- Wzmianki o marce w odpowiedziach AI na prompty kategorii (1, 4, 5, 6, 7 z zestawu bazowego), nie tylko na zapytanie o nazwę.
- Czy prompt „What is a LiveCV?" przestał zwracać wideo-CV.
- Ruch z Search Console na cztery nowe strony i liczba zaindeksowanych adresów.
- Źródła cytowane przez Perplexity (zapisywać listę linków, w pierwszym pomiarze jej brakowało).

## Czego nie robimy

- Zakupu linków, wymiany wzmianek, masowych wpisów w katalogach ani generowanych opinii.
- Wpisów bez ujawnienia relacji z produktem.
