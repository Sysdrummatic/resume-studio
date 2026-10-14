# Inwentarz robots tras

Stan po T05 (#222). Wejście do Fazy 5 (T20): zakres `noindex` dla pozostałych tras.
Tytuły i opisy stron publicznych: `meta` w `app/i18n/locales/{en,pl}/app-shell.yaml`;
helper `publicPageMetadata()` w `app/lib/seo-metadata.ts` ustawia `index, follow` i canonical.

| Trasa | Decyzja | Powód |
| --- | --- | --- |
| `/` | `index, follow`, canonical `/` | Strona główna produktu |
| `/resume` | `index, follow`, canonical `/resume` | Publiczny przykład LiveCV |
| `/docs` | `index, follow`, canonical `/docs` | Dokumentacja; wymaga logowania (`requireAuthenticatedActor`), więc bot zobaczy przekierowanie, tag jest zabezpieczeniem na wypadek zmiany dostępu |
| `/login` | `index, follow`, canonical `/login` | Strona logowania może być w Google; warianty `?mode=` i `?reason=` kanonizowane do `/login` |
| `/privacy` | `index, follow`, canonical `/privacy` | Dokument publiczny |
| `/terms` | `index, follow`, canonical `/terms` | Dokument publiczny |
| `/cv-templates` | `noindex, nofollow` | Wewnętrzny showcase szablonów, bez wartości dla wyszukiwarki |
| `/{personSlug}/{publicId}` | `index, follow` tylko gdy `allowIndexing`, w przeciwnym razie `noindex, nofollow`; canonical na ścieżkę kanoniczną | Decyzja użytkownika per link (R09/ADR 0008); tytuł "Imię - Rola", opis z podsumowania wybranego do publikacji |
| `/{personSlug}/{publicId}` (brak linku) | `noindex, nofollow` | Brak treści |
| `/dashboard`, `/admin`, `/master-resume`, `/user`, `/settings`, `/onboarding` | bez zmian w T05; `/user`, `/settings`, `/onboarding` mają `noindex, nofollow` | Strony chronione; pozostałe do decyzji w T20 |
