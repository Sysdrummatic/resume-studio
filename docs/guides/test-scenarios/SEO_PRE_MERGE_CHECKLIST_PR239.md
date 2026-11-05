# Checklista przed mergem — PR #239 (SEO i widoczność dla AI)

PR: `feat(ocv-0223)` — llms.txt, wstrzymane indeksowanie, hreflang, dane strukturalne,
zarezerwowane i transliterowane slugi. Środowisko: **test**. Dalej `<TEST>` oznacza adres
środowiska testowego. Konwencja checkboxów: `[ ]` do zrobienia, `[x]` zrobione, `[/]` świadomie pominięte.

Migracje z tego PR-a (`public_cv_indexing_flag`, `reserve_route_person_slugs`,
`transliterate_person_slugs`) są zastosowane na `test` i `prod`.

## A. Przygotowanie

- [x] Zaloguj się na `<TEST>/login` na konto zwykłego użytkownika (nie admina). Drugie okno incognito zostaw do kroków publicznych.
- [x] DevTools → karta **Network**, zaznacz **Disable cache**.

## B. Pliki dla botów

- [x] `<TEST>/llms.txt` wyświetla tekst (nie 404), z linkami do `/docs` i opisem produktu.
- [x] `<TEST>/llms-full.txt` jest dłuższy niż `llms.txt` i bez błędu 500.
- [x] `<TEST>/robots.txt`: boty AI (GPTBot, ClaudeBot itp.) mają jawne reguły; ścieżki aplikacji (`/dashboard`, `/admin`, `/api`) są zablokowane; jest linia `Sitemap:`.
- [x] `<TEST>/sitemap.xml` zawiera `/`, `/resume`, `/docs`, `/privacy`, `/terms` i **nie zawiera** żadnego publicznego CV `/{slug}/{id}`.

## C. Strony publiczne: SEO (okno incognito)

- [x] `<TEST>/` — w DevTools → **Elements** (Ctrl+F):
  - `hreflang` ma wpisy `en`, `pl`, `x-default`;
  - `application/ld+json` parsuje się (validator.schema.org albo `JSON.parse` w konsoli);
  - `og:image` otwiera obrazek w nowej karcie.
- [x] To samo na `/resume`, `/docs` i dowolnym tutorialu `/docs/tutorials/...`.
- [x] Na `/docs` linki do docs, FAQ i wezwanie do akcji „utwórz LiveCV” działają; żaden nie kończy się 404.
- [x] Menu języka w nagłówku (EN ↔ PL): adres dostaje `?lang=`, treść się zmienia, po odświeżeniu język zostaje.
- [x] `<TEST>/nie-ma-takiej-strony` pokazuje nową stronę 404 z nawigacją, nie gołą stronę Next.js.

## D. Publiczne CV (indeksowanie wstrzymane)

- [x] `<TEST>/dashboard` → otwórz zapisaną wersję CV → opublikuj.
- [x] W oknie publikacji **nie ma** opcji zgody na indeksowanie; publikacja bez niej przechodzi.
- [x] Opublikowany link `<TEST>/{slug}/{id}` w incognito:
  - `<meta name="robots" content="noindex...">` w `<head>`;
  - `X-Robots-Tag: noindex` w nagłówkach odpowiedzi (Network → pierwszy request → Headers), jeśli aplikacja go wysyła;
  - JSON-LD obecny i poprawny;
  - `og:image` otwiera się jako obrazek 1200×630 (w konsoli na karcie z obrazkiem: `[document.images[0].naturalWidth, document.images[0].naturalHeight]`); przy wstrzymanym indeksowaniu to ogólna karta **bez** imienia i nazwiska (`buildCvOgContent` zwraca `null`, gdy `allowIndexing=false`) — dane osobowe na obrazku byłyby błędem;
  - treść spoza zaznaczonej wersji (ukryte sekcje) nie jest widoczna.
- [x] Eksporty ze strony CV (PDF, TXT, ATS YAML, CVasCode) pobierają się, zawierają tylko wybraną treść, a nazwa pliku nie ma polskich liter.
- [x] `<TEST>/api/public/opencv/v1/{slug}/{id}` zwraca YAML z poprawnymi danymi.
- [x] `<TEST>/{slug}/{id}/opengraph-image` otwiera się bezpośrednio jako obrazek.

## E. Slugi (migracje)

- [x] `<TEST>/login` → rejestracja nowego konta testowego z imieniem i nazwiskiem „Żółć Łukasz”; potwierdź e-mail, jeśli trzeba.
- [x] Opublikuj CV na tym koncie: adres wygląda jak `/zolclukasz/...`, nie `/user/...` ani `/ukasz.../`.
- [x] Ustaw nazwę wyświetlaną lub nazwisko na `docs`, `resume` lub `api` i opublikuj: slug dostaje sufiks (np. `resume-1`), nie samo `resume`.
- [x] Konto ze starym publicznym linkiem: link się nie zmienił i nadal działa.

## F. Boty AI i obraz udostępniania

W Git Bash, podstawiając własny link:


https://deploy-preview-239--opencivera.netlify.app/arianaholt/54d374a3eee44e/opengraph-image

```
curl -sI -A "GPTBot" "https://deploy-preview-239--opencivera.netlify.app/arianaholt/54d374a3eee44e/opengraph-image" | head -5
curl -sI -A "Mozilla/5.0" "https://deploy-preview-239--opencivera.netlify.app/arianaholt/54d374a3eee44e/opengraph-image" | head -5
curl -sI -A "GPTBot" "https://deploy-preview-239--opencivera.netlify.app/arianaholt/54d374a3eee44e/llms.txt" | head -5
```

- [x] GPTBot dostaje blokadę (403 lub brak obrazu) na `opengraph-image`.
- [x] Zwykła przeglądarka dostaje 200 na `opengraph-image`.
- [x] GPTBot dostaje 200 na `/llms.txt` (dozwolone).

## G. Crawl martwych linków

```
node scripts/qa/check-links.mjs <TEST>
```

- [x] Brak wpisów „broken”; wpisy z sitemapy znalazły się w crawlu.

## H. Regresja

- [x] Admin: `/admin` ładuje się, lista użytkowników działa.
- [x] `/master-resume`: zapis zmiany w YAML i rollback do poprzedniej wersji działają.
- [x] Wylogowany `/dashboard` przekierowuje na `/`.
- [x] Konsola DevTools na stronach z sekcji C i D bez czerwonych błędów (np. CSP).

## Warunki zaliczenia

Wszystkie sekcje B–H bez błędów, w szczególności: brak CV w sitemapie, `noindex` na publicznym CV,
poprawne slugi (sekcja E) i brak 404 w linkach (sekcje C i G).
