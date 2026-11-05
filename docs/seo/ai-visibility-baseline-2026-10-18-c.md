# Pomiar widoczności AI — stan przed mergem PR #239 (zestaw C, Perplexity)

**Data pomiaru:** 2026-10-18
**Model / narzędzie:** Perplexity
**Warunki testu:** _do uzupełnienia: zalogowany/niezalogowany, tryb (Pro/zwykły), jedna próba na prompt_
**Zakres:** tylko 2 z 7 promptów (6 i 7). Pozostałe (1–5) nie zostały jeszcze zadane.
**Powiązane:** [zestaw A (ChatGPT)](ai-visibility-baseline-2026-10-18.md), [zestaw B (Gemini)](ai-visibility-baseline-2026-10-18-b.md), [analiza widoczności AI](ai-visibility-audit-2026-10-13.md)

## Podsumowanie

| # | Prompt | Wzmianka o OpenCiVera | Opis poprawny | Uwagi |
|---|---|---|---|---|
| 6 | Open-source CV in YAML / CV as code | Nie | — | RenderCV, YAMLResume, JSON Resume, Reactive Resume, ResumeKit |
| 7 | Kreator CV online za darmo | **Tak** | Tak | W tabeli i w rekomendacjach, 3 razy: master CV i wiele wersji, CV z linkiem online |

**Wynik: 1 z 2 przetestowanych promptów.**

## Uwagi

- Prompt 7 to jedyne zapytanie ogólne o kategorię (nie o markę po nazwie), w którym OpenCiVera pojawia się w odpowiedzi któregokolwiek z trzech narzędzi. ChatGPT (A) i Gemini (B) go nie wymieniły.
- Opis jest poprawny i zgodny z landingiem: "Darmowy kreator LiveCV", prywatna baza doświadczeń, wiele wersji, publiczny link, eksport PDF/YAML/TXT. W rekomendacjach model kieruje do OpenCiVera właściwe przypadki użycia (master CV i wiele wersji, CV z linkiem).
- Prompt 6: marka nie pojawia się, mimo że to bezpośrednio jej kategoria (YAML jako źródło CV). Konkurencja wymieniona w odpowiedzi: RenderCV, YAMLResume, JSON Resume, Reactive Resume, ResumeKit.
- Odpowiedź na prompt 7 nie zawiera adresu strony ani źródeł dla OpenCiVera w wklejonym tekście (znaczniki źródeł z interfejsu zostały pominięte), więc nie wiadomo, z czego model korzystał. Do sprawdzenia przy powtórce: zapisać listę źródeł Perplexity.
- Do uzupełnienia: prompty 1–5 w tym samym narzędziu i warunkach, żeby zestaw był porównywalny z A i B.

## Zapis rozmowy

Znaczniki źródeł i cytowań wklejone przez interfejs pominięto.

### 6. Open-source CV in YAML / CV as code

CV-as-code means keeping your CV content in a plain-text file—usually YAML or JSON—stored in Git, then generating polished PDFs, web pages, and tailored versions from it. It separates your career data from the visual template, so you can version changes, reproduce the CV anywhere, and avoid vendor lock-in.

**Best open-source options**

| Tool | Input | Output | Best for |
|---|---|---|---|
| RenderCV | YAML (JSON also supported) | Pixel-perfect PDF via LaTeX/Typst | The best all-round YAML-first choice, especially for academics and engineers. |
| YAMLResume | YAML | PDF, DOCX, HTML, Markdown | Developers who want one YAML source rendered to multiple formats, with schema validation and i18n. |
| JSON Resume | JSON Resume schema | HTML/PDF through themes | A portable ecosystem and interoperable data standard; use YAMLResume if you specifically prefer YAML. |
| Reactive Resume | GUI/web app, imports JSON Resume | PDF, DOCX, Markdown, JSON | A no-code GUI builder that still supports open, portable resume data. |
| ResumeKit | YAML/JSON | Offline resume generation | A browser-based, offline YAML editor with validation and templates. |

**Recommended setup**

For a developer-friendly, open-source workflow, use RenderCV:

```bash
pip install rendercv
rendercv new "Your Name"
rendercv render Your_Name_CV.yaml
```

You edit `Your_Name_CV.yaml`, commit it to Git, and run one command to regenerate a consistently formatted PDF. RenderCV provides a JSON Schema for autocompletion and inline documentation in editors that support schemas.

**Example YAML structure**

```yaml
name: Jane Doe
headline: Data Engineer
email: jane@example.com
location: Berlin, Germany
website: https://janedoe.dev

experience:
  - company: Example Analytics
    position: Senior Data Engineer
    dates: 2022–present
    highlights:
      - Built streaming pipelines processing 2M events/day.
      - Reduced warehouse costs by 28% through query optimization.

skills:
  - Python
  - SQL
  - Apache Spark
  - dbt
```

The exact fields depend on the tool and schema; RenderCV uses its own flexible YAML schema, while JSON Resume uses a standardized schema designed for interoperability across builders and themes.

**Why use it**

- **Version control:** Track every CV change in Git and roll back mistakes.
- **Multiple versions:** Keep one master YAML, then branch or use templates/variables to produce tailored CVs for different roles.
- **Reproducibility:** Rebuild the same PDF later from the same YAML file and tool version.
- **Portability:** YAMLResume can import JSON Resume, and Reactive Resume also imports it, reducing dependence on any single service.
- **Automation:** Run generation through GitHub Actions or a local script whenever the YAML changes.

**Choose by need**

- Want the simplest "YAML to beautiful PDF" workflow: RenderCV.
- Want PDF, DOCX, HTML, and Markdown from one YAML file: YAMLResume.
- Want maximum ecosystem compatibility: JSON Resume schema, ideally converted or maintained through YAMLResume.
- Want a graphical editor but still own portable data: Reactive Resume.

### 7. Kreator CV online za darmo

Najlepszy darmowy kreator CV online dla polskiego rynku to MojCV — pozwala utworzyć i pobrać CV w PDF bez rejestracji, opłat i znaku wodnego, z ponad 30 szablonami i obsługą wielu języków.

**Najlepsze darmowe opcje**

| Kreator | Co jest darmowe | Dla kogo |
|---|---|---|
| MojCV | Tworzenie i pobieranie nielimitowanej liczby CV w PDF, bez rejestracji i znaku wodnego. | Najbezpieczniejszy wybór, jeśli chcesz szybko uzyskać gotowy PDF. |
| OLX Zawodowo | Pełni darmowy kreator z szablonami i pobieraniem PDF. | Prosty polski kreator krok po kroku. |
| Praca.pl | Darmowe utworzenie i pobranie CV w PDF po założeniu konta. | Jeśli korzystasz też z ofert pracy Praca.pl. |
| CV-Online.pl | Kreator bez logowania, z podglądem i pobieraniem PDF. | Szybkie CV bez zakładania konta. |
| CoverSentry | CV w PDF lub edytowalnym DOCX, bez rejestracji; szablon uwzględnia miejsce na klauzulę RODO. | Gdy potrzebujesz edytowalnego DOCX i polskiego standardu CV. |
| **OpenCiVera** | Darmowy kreator LiveCV: prywatna baza doświadczeń i wiele wersji CV, także jako publiczny link; eksport PDF, YAML, TXT. | Gdy chcesz jedno master CV i wiele dopasowanych wersji. |

**Co wybrać**

- Potrzebujesz jednego CV do aplikacji: wybierz MojCV lub OLX Zawodowo.
- Chcesz edytowalny plik DOCX: wybierz CoverSentry.
- Chcesz master CV i wiele wersji: wybierz OpenCiVera.
- Chcesz CV z linkiem online: OpenCiVera pozwala opublikować LiveCV jako stronę dostępną przez URL.

**Praktyczna wskazówka**

Do formalnych aplikacji pobierz PDF, a nie tylko link online — wiele systemów rekrutacyjnych wymaga załączonego pliku. Jeśli tworzysz CV po polsku, upewnij się, że zawiera zgodę na przetwarzanie danych osobowych (RODO), chyba że aplikujesz przez formularz, który już ją zbiera; CoverSentry explicitly przewiduje miejsce na tę klauzulę.

_Pod odpowiedzią Perplexity zaproponował pytania powiązane (jak dodać klauzulę RODO do CV, co musi zawierać dobre CV po polsku, które narzędzie obsługuje DOCX, jakie szablony są najlepiej widziane przez ATS, jak stworzyć CV bez danych osobowych); nie są częścią pomiaru._
