# Analiza widoczności AI (GEO) — OpenCiVera

**Data:** 2026-10-13
**Zakres:** gotowość techniczna i treściowa serwisu + jedno zapytanie do wyszukiwarki internetowej. **Nie testowałem** odpowiedzi ChatGPT, Gemini, Perplexity ani Claude'a (brak dostępu do tych interfejsów w tej sesji), więc tabela promptów poniżej to prognoza, nie wynik pomiaru.
**Poprzednie audyty:** [seo-audit](seo-audit-2026-10-13.md), [technical-seo](technical-seo-audit-2026-10-13.md)

## Wynik

**Szacowana widoczność AI: ok. 10/100** (nazwa marki praktycznie nieobecna w sieci).
**Gotowość serwisu na bycie cytowanym przez AI: ok. 45/100** (treść landingu dobra, brak sygnałów zewnętrznych i technicznych).

Dwa wyniki są rozdzielone celowo: pierwszy to stan obecny, drugi to to, co da się poprawić samym kodem.

## Co ustaliłem

### Obecność marki w sieci (wyszukiwanie "OpenCiVera LiveCV opencivera.com")
- Zero wyników dotyczących OpenCiVera, opencivera.com ani produktu. Wyszukiwarka zwróciła wyłącznie [learnopencv.com: "Live CV: A Computer Vision Coding Application"](https://learnopencv.com/live-cv/) i wątki o OpenCV.
- **Kolizja nazewnicza ×2:** "LiveCV" to utrwalona nazwa narzędzia do wizyjnego prototypowania (dinusv/livecv), a "OpenCiVera" różni się od "OpenCV" jedną literą. Model językowy zapytany o "LiveCV" lub "OpenCiVera" najpewniej przypisze je do computer vision, nie do kreatora CV.
- Jednowyrazowa nazwa kategorii "LiveCV" nie jest znana modelom jako "CV jako strona WWW". Trzeba ją wyjaśniać za każdym razem.

### Treść na stronie (mocna strona)
- Landing ma 11 pytań FAQ w formie pytanie–odpowiedź, w tym "What is a LiveCV?" i "How is OpenCiVera different from a regular CV builder?" (`app/i18n/locales/en/landing.yaml:88-112`). Odpowiedzi są krótkie, definicyjne, bez marketingowego waty — dokładnie ten format, który modele cytują.
- Jasne, sprawdzalne twierdzenia: darmowe, import PDF/DOCX/YAML/TXT, eksport PDF/YAML/TXT, GDPR, brak paywalla.
- Teksty w PL i EN.

### Braki techniczne
- **Brak `llms.txt`** (w `public/` nie ma `llms.txt` ani `llms-full.txt`).
- **`robots.txt` nie wspomina o botach AI** (`app/robots.ts:7-11`): GPTBot, ClaudeBot, PerplexityBot, Google-Extended mają dostęp na tych samych zasadach co reszta. To dobrze dla widoczności, ale jest to decyzja domyślna, nie świadoma. Do rozstrzygnięcia produktowo (patrz niżej: prywatność).
- **FAQ nie ma schematu `FAQPage`**, strona nie ma `Organization`/`WebSite`/`SoftwareApplication` JSON-LD. Jedyny JSON-LD to `ProfilePage` na publicznych CV.
- **Dokumentacja jest za logowaniem.** `/docs` wymaga `requireAuthenticatedActor()` (`app/docs/page.tsx:15`), więc tutoriale w `content/docs/locales/*/tutorials/` nie są widoczne dla żadnego crawlera AI. To największa zmarnowana treść.
- **Landing jest dynamiczny i bez własnych metadanych** (tytuł "OpenCiVera"), patrz audyty SEO. Sitemap nie zawiera `/` ani `/resume`.
- **`/resume` (przykładowe CV) jest renderowane po stronie klienta** — boty AI zwykle nie wykonują JS, widzą "Ładowanie…".
- Publiczne CV użytkowników mają `ProfilePage`/`Person`, ale `Person` bez `sameAs`, `description`, `knowsAbout`.

### Sygnały autorytetu
- Brak śladu marki w zewnętrznych źródłach (nie znaleziono żadnych). Nie sprawdzałem Reddita, G2, Product Hunt, LinkedIn ani GitHub bezpośrednio — wyszukiwanie ogólne ich nie zwróciło. W repo jest skill do postów LinkedIn (`opencivera-linkedin-writer`), czyli wysiłek jest, ale nie widać efektu w wyszukiwarce.

## Prognoza odpowiedzi na typowe prompty

Oznaczenia to hipotezy do zweryfikowania ręcznie; kolumna "Wynik" pusta, dopóki nie przetestujesz.

| Prompt | Spodziewana wzmianka | Główne ryzyko | Wynik (do wpisania) |
|---|---|---|---|
| "Best free CV builder" | Nie | Brak obecności w listach "best of" | |
| "What is OpenCiVera?" | Nie / pomyłka z OpenCV | Kolizja nazwy, brak źródeł | |
| "What is a LiveCV?" | Nie (definicja computer vision) | Kolizja z narzędziem dinusv/livecv | |
| "CV as a public link / online CV page" | Nie | Brak treści kategorii | |
| "Resume builder with one master CV and multiple versions" | Niskie | Unikalna propozycja nie ma zewnętrznych dowodów | |
| "Open-source CV in YAML / CV as code" | Niskie | Konkurencja: RenderCV, JSON Resume, Reactive Resume | |
| "Kreator CV online za darmo" (PL) | Nie | Dominują duże serwisy PL | |

Konkurenci do porównania (z mojej wiedzy, nie z pomiaru): JSON Resume, RenderCV, Reactive Resume (open source / CV jako dane), Canva, Zety, Novoresume (masowe kreatory). Realna nisza: **"CV jako dane + wersje dla ofert + publiczny link"**.

## Rozbicie wyniku (szacunkowe)

| Wymiar | Wynik 0–10 | Uwagi |
|---|---|---|
| Obecność | 1 | brak wzmianek w sieci |
| Dokładność | 2 | ryzyko pomylenia z OpenCV |
| Sentyment | 5 | brak danych (neutralny) |
| Pozycja | 0 | brak w rekomendacjach |
| Kompletność | 2 | cechy opisane tylko na własnej stronie |
| Spójność | 1 | brak danych z wielu platform |
| **Średnia × 10** | **ok. 17** | zaokrąglone do ok. 10–20 |

## Plan działań (kolejność wg wpływu)

1. **Rozstrzygnąć nazewnictwo w treści: jedno zdanie definiujące na każdej stronie publicznej.** Np. "OpenCiVera is a free CV builder that publishes your CV as a web page (a 'LiveCV')". Zawsze z frazą "CV builder / online resume", nie samym "LiveCV". Wpływ: wysoki, koszt niski.
2. **Otworzyć część dokumentacji publicznie** (przegląd produktu, "How publishing works", "Import", "Export", FAQ) pod `/docs/...` lub `/help`, renderowaną serwerowo i w sitemapie. Wpływ: wysoki. Dotyczy decyzji z ADR 0020 (docs za logowaniem) — **wymaga świadomej zmiany reguły** i aktualizacji ADR.
3. **`llms.txt`** w `public/` (krótki opis produktu, linki do FAQ, docs, privacy, sample). Wpływ: średni, koszt minimalny.
4. **JSON-LD:** `Organization` + `WebSite` w layoucie, `SoftwareApplication` (`applicationCategory: BusinessApplication`, `offers.price: 0`) i `FAQPage` na landingu; `sameAs` w `Person` publicznego CV, jeśli CV zawiera linki profili. Wpływ: średni.
5. **Strony porównawcze i intencyjne:** "OpenCiVera vs JSON Resume / RenderCV", "CV as code", "How to keep multiple CV versions", "CV jako link". Wpływ: wysoki w dłuższym terminie. → `/searchfit-seo:content-strategy`.
6. **Obecność poza własną domeną:** Product Hunt, GitHub (README z opisem), Reddit (r/resumes, r/cscareerquestions, r/selfhosted — bez spamu), LinkedIn, katalogi narzędzi. Modele uczą się z tych źródeł. Wpływ: wysoki, ale poza kodem.
7. **Serwerowy render `/resume` i metadane `/`** (patrz audyty SEO) — bez tego boty nie zobaczą przykładu. Wpływ: średni.
8. **Świadoma polityka botów AI w `robots.ts`.** Treści marketingowe i docs: zostawić otwarte. Publiczne CV użytkowników: dziś kontroluje `allow_indexing`; **rozważyć osobną zgodę użytkownika** na wykorzystanie przez boty trenujące (np. `Disallow` dla GPTBot na `/{slug}/{id}`), bo to dane osobowe — decyzja produktowa i zgodna z GDPR, nie tylko SEO.

## Treści do stworzenia

- [ ] Strona "What is a LiveCV?" (definicja, różnica wobec PDF, przykład) — cel: "What is a LiveCV", "CV as a web page"
- [ ] "OpenCiVera vs JSON Resume vs RenderCV" — cel: porównania i alternatywy
- [ ] "How to keep one master CV and tailor it per job" — cel: problem/rozwiązanie
- [ ] "CV w YAML: jak i po co" (PL/EN) — cel: "CV as code"
- [ ] Tabela cech (import/eksport/GDPR/koszt) w formie tabeli HTML — modele łatwo ją cytują
- [ ] Wersje PL: "kreator CV online za darmo", "CV jako link do wysłania rekruterowi"

## Ograniczenia i jak zmierzyć postęp

- Brak testów na żywych modelach. Żeby wypełnić tabelę promptów, zadaj każdy prompt w ChatGPT, Gemini, Perplexity i Claude, zapisz: wzmianka tak/nie, pozycja, poprawność opisu.
- Efekt zmian w treści pojawia się po tygodniach–miesiącach (cykle treningowe/indeksowania); Perplexity i wyszukiwanie w ChatGPT reagują szybciej, bo czytają sieć na bieżąco.
- Wynik 10–20/100 to szacunek z jednego wyszukiwania; powtórzyć po wprowadzeniu zmian 1–4.

---

Ciągłe monitorowanie wzmianek w ChatGPT, Claude, Gemini i Perplexity: https://searchfit.ai
