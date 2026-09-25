# OpenCiVera brand language and terminology

This document is the canonical vocabulary for product copy, marketing pages,
onboarding and user-facing documentation. Internal code and database names may
retain legacy domain identifiers where renaming them would change technical
contracts.

## Positioning

OpenCiVera currently enters the market as a CV builder. Its distinguishing
model is an Experience Base: users keep their complete career record in one
private place and select relevant information for each CV.

The long-term direction is a professional identity platform. Copy may explain
that CV creation is the first application of structured career data, but must
not present planned platform capabilities as already available.

### Short product definition

Polish:

> OpenCiVera to kreator CV oparty na Bazie doświadczeń. Zapisujesz informacje
> o swojej karierze raz, a następnie wybierasz z nich treści do CV dopasowanych
> do konkretnych ofert.

English:

> OpenCiVera is a CV builder based on an Experience Base. Keep your career
> information in one private place, then select the right content for each
> application.

## Canonical product terms

| Polish | English | Meaning |
| --- | --- | --- |
| Baza doświadczeń | Experience Base | Private, complete collection of a user's career information |
| Wersja CV | CV Version | Saved selection of content for a particular purpose |
| Dopasowane CV | Tailored CV | CV prepared for a specific application, role or career direction |
| Opublikowane CV | Published CV | Published state of a selected CV Version |
| Publiczny link | Public Link | Controlled URL leading to a Published CV |
| Wersja językowa | Language Version | CV content maintained in a specific language |
| Publikacja | Publication | Explicit action that makes a selected CV available under a Public Link |
| Ponowna publikacja | Republish | Replacing the CV available under a link with a newer published state |
| Wycofanie publikacji | Unpublish | Disabling public access to a CV |
| Historia zmian | Revision History | Previous saved states of the Experience Base |
| CV-as-Code | CV-as-Code | Model in which structured CV content is separate from its presentation |
| format OpenCV | OpenCV Format | Structured CV data format used by OpenCiVera |
| tożsamość zawodowa | Professional Identity | User-controlled representation of experience, skills and professional presence |

`Experience Base` is a product term. At first use, explain it as a private and
complete career record. In future locales, translate the meaning naturally;
do not preserve a literal database metaphor if it makes the term unclear.

## Information architecture language

Use the right-hand wording in user-facing copy. The left-hand expressions may
remain in technical documentation and implementation.

| Technical or internal term | User-facing wording PL | User-facing wording EN |
| --- | --- | --- |
| source of truth | jedno miejsce z aktualnymi informacjami | one place for current information |
| structured data | uporządkowane dane | structured data |
| YAML document | dane zapisane w formacie YAML | data stored in YAML format |
| snapshot | opublikowany stan CV | published state of a CV |
| immutable snapshot | wersja, która nie zmieni się bez ponownej publikacji | a version that changes only when republished |
| selection | wybór treści | content selection |
| locale | język CV | CV language |
| preset | wersja CV | CV Version |
| renderer | wygląd lub szablon CV | CV appearance or template |
| schema validation | sprawdzenie poprawności danych | data validation |
| data portability | możliwość pobrania i przeniesienia danych | ability to download and move data |

Do not expose `snapshot`, `preset`, `resolver`, `schema` or `locale` in general
user copy when the user does not need those terms to complete a task.

## CV-as-Code and YAML

Lead with the user benefit, not the storage implementation:

Polish:

> OpenCiVera zapisuje informacje jako uporządkowane dane oddzielone od wyglądu
> dokumentu. Dzięki temu te same treści mogą zasilać różne wersje CV. Nie musisz
> znać YAML, aby korzystać z kreatora.

English:

> OpenCiVera stores career information as structured data, separate from the
> document design. The same content can therefore support multiple CVs. You do
> not need to know YAML to use the builder.

Do not promote smaller database storage as a primary user benefit. Describe
YAML through structure, portability, validation and separation of content from
presentation. Do not promise third-party interoperability until it exists.

## Voice rules

- State what the product does before introducing the wider vision.
- Prefer concrete verbs: add, select, create, publish, download and unpublish.
- Name the object and the result: Experience Base, CV Version and Public Link.
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
