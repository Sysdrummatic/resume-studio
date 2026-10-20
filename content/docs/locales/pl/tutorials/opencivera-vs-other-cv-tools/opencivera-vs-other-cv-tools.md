---
title: OpenCiVera w porównaniu z JSON Resume, RenderCV i Reactive Resume
description: Czym kreator CV OpenCiVera różni się od JSON Resume, RenderCV i Reactive Resume, wraz z tabelą cech i wskazówkami, kiedy które pasuje.
updatedAt: 2026-10-20
author: Łukasz Michta
category: tutorials
order: 23
---

# OpenCiVera w porównaniu z JSON Resume, RenderCV i Reactive Resume

**Te narzędzia rozwiązują różne problemy.** JSON Resume to standard danych, RenderCV to działające w terminalu narzędzie generujące PDF z pliku YAML, Reactive Resume to kreator CV, który można hostować samodzielnie, a OpenCiVera to hostowany kreator CV oparty na jednej prywatnej Bazie doświadczeń i wielu opublikowanych LiveCV.

| | OpenCiVera | JSON Resume | RenderCV | Reactive Resume |
| --- | --- | --- | --- | --- |
| Czym jest | Hostowany kreator CV | Otwarty schemat JSON dla CV, z motywami i rejestrem | Narzędzie wiersza poleceń generujące PDF z pliku YAML | Otwartoźródłowy kreator CV do samodzielnego hostowania |
| Pracujesz w | Formularzu webowym, opcjonalnie w edytorze YAML | Pliku JSON i narzędziach | Pliku YAML i terminalu | Edytorze webowym |
| Jedno źródło, wiele dopasowanych wersji | Tak: Baza doświadczeń i zapisane wersje LiveCV | Pliki zarządzasz sam(a) | Pliki zarządzasz sam(a) | Zależy od organizacji CV |
| Publiczny link do dopasowanego CV | Tak: link do LiveCV, który możesz wyłączyć | Przez rejestr społeczności lub własny hosting | Nie; udostępniasz wygenerowane pliki | Udostępnianie CV jest obsługiwane |
| Wynik | Strona, PDF, TXT, YAML | Zależy od motywu lub narzędzia | PDF i inne generowane formaty | PDF i eksport danych |
| Koszt | Bezpłatnie | Bezpłatnie, open source | Bezpłatnie, open source | Bezpłatnie, open source |

:::info
Informacje o innych narzędziach pochodzą z ich publicznych stron projektów według stanu na październik 2026. Aktualne szczegóły sprawdź na ich stronach.
:::

## Kiedy co pasuje

- **JSON Resume**, jeśli chcesz neutralnego formatu danych do zbudowania własnego procesu.
- **RenderCV**, jeśli dobrze czujesz się w terminalu i chcesz dopracowanego PDF z pliku pod kontrolą wersji.
- **Reactive Resume**, jeśli chcesz otwartoźródłowego kreatora, który sam hostujesz i kontrolujesz.
- **OpenCiVera**, jeśli chcesz mieć jeden zapis, publikować różne dopasowane wersje pod własnymi linkami i niczego samodzielnie nie uruchamiać.

OpenCiVera eksportuje też dane jako YAML, więc wybór tego narzędzia nie zamyka drogi do innych. Zobacz [CV jako kod w YAML](/docs/tutorials/cv-as-code-yaml) i [czym jest LiveCV](/docs/tutorials/what-is-a-livecv).
