# Pomiar widoczności AI — stan przed mergem PR #239 (zestaw D, Claude)

**Data pomiaru:** 2026-10-18
**Model / narzędzie:** Claude (z wyszukiwaniem w sieci)
**Warunki testu:** **zanieczyszczony kontekstem, nie nadaje się jako pomiar punktu odniesienia** (patrz niżej). _Do uzupełnienia: czy rozmowa miała dostęp do pamięci, projektu lub wcześniejszych rozmów o OpenCiVera._
**Zakres:** 3 z 7 promptów (1, 6, 7).
**Powiązane:** [zestaw A (ChatGPT)](ai-visibility-baseline-2026-10-18.md), [zestaw B (Gemini)](ai-visibility-baseline-2026-10-18-b.md), [zestaw C (Perplexity)](ai-visibility-baseline-2026-10-18-c.md)

## Dlaczego ten zestaw jest nieczysty

Odpowiedzi zawierają ślady kontekstu spoza samych promptów:

- "Z poprzednich wyników", "wcześniej ustaliliśmy" i "(from the earlier search)" odwołują się do wcześniejszych tur rozmowy, których nie ma w tym zapisie.
- Opis produktu ("LiveCV treats versions as projections of the master, not copies... immutable snapshots for what was actually published") jest wewnętrzną terminologią projektu, nie sformułowaniem z publicznej strony.
- Propozycja "positioning copy for the OpenCiVera Schema" zakłada znajomość projektu.
- Wzmianka o OpenCiVera pojawia się w prompcie 1 i 6 bez pytania o markę.

Najpewniej model znał projekt z pamięci, kontekstu projektu albo wcześniejszej rozmowy. **Wzmianek z tego zestawu nie wolno liczyć jako dowodu, że obcy użytkownik zobaczy OpenCiVera.** Powtórz pomiar w nowej rozmowie bez pamięci, projektu i wcześniejszych tur (okno incognito, bez logowania albo z wyłączoną pamięcią).

## Podsumowanie

| # | Prompt | Wzmianka o OpenCiVera | Wiarygodność | Uwagi |
|---|---|---|---|---|
| 1 | Best free CV builder | Tak (sekcja "Where OpenCiVera differs") | Niska | Lista narzędzi to Teal, VisualCV, Enhancv, airesume.guru; OpenCiVera dopisana jako różnica |
| 6 | Open-source CV in YAML / CV as code | Tak (sekcja "Gap relative to OpenCiVera") | Niska | Główna rekomendacja: RenderCV; OpenCiVera jako uzupełnienie |
| 7 | Kreator CV online za darmo | Nie | Wyższa | Jooble, zarabiaj.pl, Enhancv, Reactive Resume, Teal; brak wzmianki |

Jedyny wynik, któremu można ufać, to prompt 7 (brak wzmianki), bo w nim kontekst nie przeciekł do odpowiedzi.

## Zapis rozmowy

Znaczniki źródeł wklejone przez interfejs pominięto.

### 1. Best free CV builder

_Searched the web_

**Tools that support master + versions**

- **Teal:** a job tracker with a builder. Good for organizing applications, with free unlimited PDF downloads (from the earlier search).
- **VisualCV:** combines a resume builder, AI assistance, templates, multiple resume versions and online sharing. It is ranked top in its own roundup, so treat that ranking with caution.
- **Enhancv:** lets you keep a "Master Resume" and spin off tailored versions; unlimited versions and AI features sit in the premium tier.
- **airesume.guru:** keeps one master per language (up to 6), and tailoring forks a separate copy and leaves the master untouched. Pro adds unlimited tailored copies.
- **Jobscan / SkillSyncer:** not builders. They compare a resume against a job description for keyword matching.

**The common pattern**

Most tools fork a copy from the master. The risk is drift: each tailored resume becomes a disconnected rewrite once the master changes. Typical advice is to keep the master complete and never trim it, and to name versions by company, role and date.

**Where OpenCiVera differs**

LiveCV treats versions as projections of the master, not copies: change the master once and every derived version follows, with immutable snapshots for what was actually published. That is the gap in the forking model above.

Are you looking for a tool to use, or a competitor comparison for OpenCiVera?

### 6. Open-source CV in YAML / CV as code

_Searched the web_

**Open-source CV as code**

RenderCV is the closest match. It's a Python package with a CLI that reads a CV written in YAML with Markdown syntax, converts it to Typst code, and generates a PDF.

- Content and design are version-controlled separately.
- It ships a JSON Schema, so the YAML can be filled out interactively in an editor.
- Install with `pip install "rendercv[full]"` and start with `rendercv new "John Doe"`.
- It includes several themes (Classic, Sb2nov, Moderncv, Engineeringresumes), and custom themes can be added.

JSON Resume is the long-standing open schema, in JSON rather than YAML, with a theme ecosystem (from general knowledge, not checked in this search).

Reactive Resume and OpenResume are open-source web builders rather than code-first tools (see earlier results).

**Gap relative to OpenCiVera**

RenderCV is a local file-to-PDF pipeline. Its output is a document, not a hosted link, and it has no master-to-projection layer or immutable snapshots. That is the space LiveCV occupies: the same YAML plus JSON Schema foundation, but with publishing, versions and verifiability on top.

What do you want next: a feature comparison table, or positioning copy for the OpenCiVera Schema?

### 7. Kreator CV online za darmo

_Searched the web_

**Darmowe kreatory CV (PL)**

- **Jooble:** tworzenie, edycja i pobieranie są w 100% darmowe, bez karty kredytowej, z nieograniczoną liczbą wersji CV i plików PDF. Haczyk: serwis zarabia na proponowaniu ofert pracy na podstawie Twojego CV, więc Twoje dane trafiają do ich wyszukiwarki ofert.
- **zarabiaj.pl:** bez rejestracji i logowania, pobieranie w PDF lub DOCX, wersje po polsku, angielsku i niemiecku. To najszybsza opcja, jeśli nie chcesz zakładać konta.
- **Enhancv (PL):** 11 edytowalnych szablonów, eksport do PDF lub TXT, import ze starego CV lub z LinkedIna. Wcześniej ustaliliśmy, że funkcje AI i nielimitowane wersje są w płatnym planie.

**Z poprzednich wyników**

- Reactive Resume (open source, w pełni darmowy)
- Teal (darmowe PDF bez limitu)

**Uważaj na**

Zety i Resume Genius: pobranie PDF lub Worda wymaga subskrypcji. W ogóle warto sprawdzić, czy PDF jest darmowy i jak serwis chroni dane osobowe, zanim wpiszesz cokolwiek do kreatora.

**Rekomendacja**

- Najszybciej, bez konta: zarabiaj.pl
- Bez limitów i z wieloma wersjami: Jooble
- Pełna kontrola, bez ryzyka paywalla: Reactive Resume

Czy CV jest na polski rynek (ze zdjęciem), czy na zagraniczny (po angielsku, bez zdjęcia)?
