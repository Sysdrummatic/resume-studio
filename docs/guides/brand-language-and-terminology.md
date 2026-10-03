# OpenCiVera brand language and terminology

This document is the canonical vocabulary for product copy, marketing pages,
onboarding and user-facing documentation. Internal code and database names may
retain legacy domain identifiers where renaming them would change technical
contracts.

## Positioning

OpenCiVera currently enters the market as a LiveCV builder. Its distinguishing
model is an Experience Base: users keep their complete career record in one
private place and select relevant information for each LiveCV.

The long-term direction is a professional identity platform. Copy may explain
that CV creation is the first application of structured career data, but must
not present planned platform capabilities as already available.

### Short product definition

Polish:

> OpenCiVera to platforma tworzenia i publikacji LiveCV oparta na Bazie doświadczeń. Zapisujesz informacje
> o swojej karierze raz, a następnie wybierasz z nich treści do LiveCV dopasowanych
> do konkretnych ofert.

English:

> OpenCiVera is a LiveCV creation and publication platform based on an Experience Base. Keep your career
> information in one private place, then select the right content for each
> application.

## Canonical product terms

| Polish | English | Meaning |
| --- | --- | --- |
| Baza doświadczeń | Experience Base | Private, complete collection of a user's career information |
| LiveCV | LiveCV | The document a user creates in OpenCiVera from selected Experience Base content; private until explicitly published |
| Wersja LiveCV | LiveCV version | Saved selection of content for a particular purpose |
| Dopasowane LiveCV | Tailored LiveCV | LiveCV prepared for a specific application, role or career direction |
| Opublikowane LiveCV | Published LiveCV | Published state of a selected LiveCV version |
| Link do LiveCV | LiveCV link | Controlled public URL leading to a published LiveCV |
| Wersja językowa | Language Version | CV content maintained in a specific language |
| Publikacja | Publication | Explicit action that makes a selected LiveCV available under a LiveCV link |
| Ponowna publikacja | Republish | Replacing LiveCV content under its existing link with a newer published state |
| Wycofanie publikacji | Unpublish | Disabling public access to LiveCV |
| Historia zmian | Revision History | Previous saved states of the Experience Base |
| CV-as-Code | CV-as-Code | Model in which structured CV content is separate from its presentation |
| format OpenCV | OpenCV Format | Structured CV data format used by OpenCiVera |
| tożsamość zawodowa | Professional Identity | User-controlled representation of experience, skills and professional presence |

`Experience Base` is a product term. At first use, explain it as a private and
complete career record. In future locales, translate the meaning naturally;
do not preserve a literal database metaphor if it makes the term unclear.

### LiveCV naming rules

Use `LiveCV` in both languages for documents created in the service, including
private drafts, tailored versions, previews and published documents. The user
journey is: build an Experience Base → create LiveCV → publish LiveCV → share
the LiveCV link. In English, `LiveCVs` is the ordinary plural.

Name actions explicitly: `Utwórz LiveCV` / `Create LiveCV`, `Zapisz LiveCV` /
`Save LiveCV`, `Otwórz LiveCV` / `Open LiveCV`, and `Kopiuj link do LiveCV` /
`Copy LiveCV link`. Explain at first use that LiveCV is a tailored CV that can
be published as a browser page and downloaded as PDF or ATS text.

LiveCV does not mean automatic publication: editing the Experience Base or a
private selection does not update published content. Republish explicitly to
replace the content under the existing link. Keep the base and unpublished
versions private.

Use generic `CV` for an existing external CV being imported, general job-market
advice and third-party documents. Keep `CV-as-Code`, the OpenCV format, technical
identifiers, URLs, historical ADRs and data contracts unchanged. Download actions
may simply say `PDF`, `ATS` or `YAML`; explanatory copy calls these LiveCV exports.

## Information architecture language

Use the right-hand wording in user-facing copy. The left-hand expressions may
remain in technical documentation and implementation.

| Technical or internal term | User-facing wording PL | User-facing wording EN |
| --- | --- | --- |
| source of truth | jedno miejsce z aktualnymi informacjami | one place for current information |
| structured data | uporządkowane dane | structured data |
| YAML document | dane zapisane w formacie YAML | data stored in YAML format |
| snapshot | opublikowany stan LiveCV | published state of LiveCV |
| immutable snapshot | wersja, która nie zmieni się bez ponownej publikacji | a version that changes only when republished |
| selection | wybór treści | content selection |
| locale | język LiveCV | LiveCV language |
| preset | wersja LiveCV | LiveCV version |
| renderer | wygląd lub szablon LiveCV | LiveCV appearance or template |
| schema validation | sprawdzenie poprawności danych | data validation |
| data portability | możliwość pobrania i przeniesienia danych | ability to download and move data |

Do not expose `snapshot`, `preset`, `resolver`, `schema` or `locale` in general
user copy when the user does not need those terms to complete a task.

## CV-as-Code and YAML

Lead with the user benefit, not the storage implementation:

Polish:

> OpenCiVera zapisuje informacje jako uporządkowane dane oddzielone od wyglądu
> dokumentu. Dzięki temu te same treści mogą zasilać różne wersje LiveCV. Nie musisz
> znać YAML, aby korzystać z kreatora.

English:

> OpenCiVera stores career information as structured data, separate from the
> document design. The same content can therefore support multiple LiveCVs. You do
> not need to know YAML to use the builder.

Do not promote smaller database storage as a primary user benefit. Describe
YAML through structure, portability, validation and separation of content from
presentation. Do not promise third-party interoperability until it exists.

## Voice rules

- State what the product does before introducing the wider vision.
- Prefer concrete verbs: add, select, create, publish, download and unpublish.
- Name the object and the result: Experience Base, LiveCV version and LiveCV link.
- Explain relationships between objects instead of relying on slogans.
- Separate current capabilities from future direction.
- Use sentence case for headings and controls.
- Keep Polish and English semantically equivalent, but write naturally in each
  language instead of translating word for word.

Avoid generic constructions such as:

- "Your story deserves..."
- "Take the next step"
- "Give your experience the right shape"
- "On your terms"
- "Less X. More Y."
- "Unlock your potential"
- abstract references to a "story" where experience, achievements or career
  information would be more precise.

## Naming boundary

Use `Baza doświadczeń` and `Experience Base` on user-facing surfaces. Existing
identifiers such as `masterResume`, database tables, API fields and historical
ADRs remain technical contracts until a separately planned migration changes
them. Do not rename those contracts as part of copy editing.
