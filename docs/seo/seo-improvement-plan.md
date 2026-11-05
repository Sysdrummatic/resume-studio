# Plan poprawy SEO — OpenCiVera

**Data:** 2026-10-13 · **Status:** plan do zatwierdzenia, nic jeszcze nie zaimplementowano
**Podstawa:** [seo-audit](seo-audit-2026-10-13.md), [technical-seo](technical-seo-audit-2026-10-13.md), [ai-visibility](ai-visibility-audit-2026-10-13.md)
**Cel:** serwis widoczny w Google i cytowany przez asystentów AI; poprawa wyniku z ok. 55/100 do 80+.

## Zasady wykonania (z reguł repo)

- **Gałąź i commity:** `ocv-<numer>-<opis>`, commity `type(ocv-<numer>): …`. Zasada repo (`git-workflow.md`) zakazuje stopek o autorstwie AI i ma pierwszeństwo przed domyślnymi.
- **TDD:** każda zmiana zachowania ma test, który wcześniej padał (`docs/CHECKLISTS.md`). Kontrakty w `tests/*.test.mjs`.
- **Przed "done":** `npm run lint`, `npm run typecheck`, `npm test`.
- **Sprzeczność z istniejącymi regułami** (CLAUDE.md → "Contradicting an Earlier Decision"): zaznaczone przy punktach 3 i 6 i w sekcji "Decyzje do podjęcia".
- **Terminologia produktu:** LiveCV / LiveCV link / Experience Base (`docs/guides/brand-language-and-terminology.md`); sprawdzić przed pisaniem copy.
- **Każde zadanie = issue** z projektem OpenCiVera, assignee, priorytetem (label + pole), milestone, label typu.

## Weryfikacja przez Chrome (punkt wyjścia i końcowy)

Cel: zmierzyć, co AI faktycznie mówi o OpenCiVera, przed zmianami i po nich.

1. Ustalić 10–12 promptów (EN + PL): "What is OpenCiVera?", "What is a LiveCV?", "best free CV builder", "CV builder with one master CV and multiple versions", "CV as code YAML", "kreator CV online za darmo", "CV jako link", porównania z JSON Resume/RenderCV.
2. Dla ChatGPT, Gemini, Perplexity i Claude (zakładki już zalogowane przez użytkownika): zadać prompt w **nowym czacie**, zapisać: wzmianka tak/nie, pozycja, czy opis poprawny, źródła, które cytuje.
3. Wynik do `docs/seo/ai-visibility-baseline-<data>.md` (tabela), powtórzyć po fazach 2 i 4.
4. Dodatkowo w Chrome: Lighthouse mobile dla `/`, `/resume`, jednego publicznego CV; podgląd udostępniania (LinkedIn Post Inspector, Facebook Sharing Debugger, Rich Results Test).
5. Zasady bezpieczeństwa: bez wysyłania danych osobowych użytkowników w promptach; nie logować się za użytkownika; przy braku dostępu do którejś usługi zapisać to w raporcie, nie zgadywać.

## Zadania wg punktów

### 1. Build sitemap.xml
**Sens:** mapa mówi wyszukiwarkom i botom AI, co istnieje i kiedy się zmieniło; nowe publiczne CV trafia do indeksu szybciej.
**Stan:** `app/sitemap.ts` zawiera tylko `/privacy`, `/terms` i publiczne CV; brak `/` i `/resume`; błąd bazy cicho zwija listę do 2 URL-i (`:25-30`); stałe strony bez `lastModified`.
**Zadania:**
- [ ] Test kontraktowy: sitemap zawiera `/`, `/resume`, `/privacy`, `/terms`, nowe strony publiczne (np. FAQ/docs publiczne), nie zawiera tras chronionych ani `noindex`.
- [ ] Dodać brakujące URL-e, `lastModified` (data builda lub plik), `alternates.languages` dla stron dwujęzycznych (po zadaniu 4).
- [ ] Błąd Supabase: nie zwracać okrojonej mapy jako sukcesu (logować, krótki cache lub 5xx); zachować zachowanie dla buildu bez zmiennych środowiskowych.
- [ ] Ustalić limit/stronicowanie `fetchIndexablePublicLinksForSitemap` (sitemap index powyżej 50 000 URL).
**Weryfikacja:** `/sitemap.xml` lokalnie i na preview; test; zgłoszenie w Search Console (pkt 19).

### 2. Add robots.txt
**Sens:** kieruje crawlery z dala od tras bez wartości (API, panele) i wskazuje sitemapę; ustala politykę dla botów AI.
**Stan:** `app/robots.ts` ma tylko `allow: /` i link do sitemapy.
**Zadania:**
- [ ] `disallow`: `/api/`, `/dashboard`, `/admin`, `/master-resume`, `/user`, `/onboarding`, `/settings`, `/login` (patrz pkt 3, decyzja o `/login`).
- [ ] **Pułapka:** `Disallow` blokuje crawl, ale nie usuwa z indeksu; strony ze znacznikiem `noindex` NIE mogą być zablokowane w robots, bo bot nie zobaczy tagu. Stosować `disallow` tylko do tras bez wartości w indeksie (`/api/`, panele), a `noindex` do reszty.
- [ ] Polityka botów AI (GPTBot, ClaudeBot, PerplexityBot, Google-Extended): marketing/docs otwarte; **publiczne CV użytkowników: decyzja produktowa** (patrz "Decyzje").
- [ ] `X-Robots-Tag: noindex` na `/api/resume/export/*` i publicznym API (`next.config.ts` `headers()` lub w handlerach).
- [ ] Test kontraktowy robots.
**Weryfikacja:** test + `/robots.txt` na preview.

### 3. Remove noindex tags — **ZAWĘŻONE; reszta na sam koniec (Faza 5)**
**Sens:** `noindex` mówi wyszukiwarce "nie pokazuj tej strony". Zdejmujemy go tylko z tego, co ma być w Google.
**Decyzja (2026-10-13):** temat `noindex` jako całość wymaga przemyślenia w kontekście koncepcji serwisu i jest odłożony do Fazy 5. **Teraz** robimy tylko: gwarancja `index, follow` na `/`, `/resume`, `/docs` (strony publiczne) i `/login`, oraz `noindex` na `/cv-templates`.
**Stan:** `noindex` jest na `/onboarding`, `/settings`, `/user`, test-cv, nieznalezionych CV i CV z `allow_indexing=false` (opt-in użytkownika z ADR 0001 i ADR 0005; **nie** ADR 0008, który dotyczy zakresu danych w eksportach). `/privacy`, `/terms` mają `index: true`.
**Zadania teraz:**
- [ ] Test: `/`, `/resume`, `/docs` (publiczne), `/login`, `/privacy`, `/terms` mają `index, follow` i nie mają `X-Robots-Tag: noindex`.
- [ ] `/cv-templates`: `robots: { index: false, follow: false }`.
- [ ] Zinwentaryzować tagi robots w `app/**/page.tsx` (tabela trasa → decyzja → powód), jako wejście do Fazy 5.
**Zadania w Fazie 5 (koncepcja indeksowania):** chronione trasy (`/dashboard`, `/master-resume`), CV z `allow_indexing`, polityka botów AI (pkt 2), spójność z ADR 0001/0005.
**Weryfikacja:** test + `<meta name="robots">` w Chrome (DevTools) na preview.

### 4. Add canonical tags
**Sens:** wskazuje jedną "właściwą" wersję adresu, żeby warianty (`?lang=`, `?mode=`, UTM) nie dzieliły rankingu.
**Stan:** canonical tylko na publicznym CV. Brak `metadataBase`; fallback bazowego URL do localhost (`app/lib/env.ts:36-41`).
**Zadania:**
- [ ] `metadataBase` w `app/layout.tsx` z `getAppBaseUrl()`; w produkcji brak zmiennej = błąd, nie localhost.
- [ ] `alternates.canonical` (ścieżka względna) dla `/`, `/resume`, `/privacy`, `/terms`, docs publicznych.
- [ ] `/login?mode=…`: canonical na `/login` albo `noindex`.
- [ ] Decyzja i18n: ten sam URL w PL/EN (wybór po cookie) vs osobne ścieżki; do czasu decyzji canonical bez `hreflang` na stronach statycznych (patrz "Decyzje").
- [ ] Test: każda trasa publiczna ma canonical absolutny z poprawnym hostem.
**Weryfikacja:** test + `curl`/DevTools; Search Console → Inspekcja URL (pkt 19).

### 5. Add meta titles
**Sens:** tytuł to główny element wyniku w Google i pierwsze zdanie, które widzi AI.
**Stan:** layout ma `title: "OpenCiVera"` (10 znaków); `/login` dziedziczy; `/privacy`, `/terms`, `/resume`, `/docs` mają własne.
**Zadania:**
- [ ] Zastosować `title.template` (`%s | OpenCiVera`) i `default` z keywordem, np. "OpenCiVera — Free CV Builder with a Public LiveCV Link" (50–60 znaków, EN i PL osobno w słownikach).
- [ ] Własny tytuł dla `/`, `/resume`, `/login`, `/cv-templates`.
- [ ] Publiczne CV: dodać rolę ("Imię Nazwisko — Rola").
- [ ] Teksty w `app/i18n/locales/{en,pl}/*.yaml`, nie na sztywno.
- [ ] Test długości i unikalności tytułów tras publicznych.
**Weryfikacja:** test + podgląd w Chrome.

### 6. Meta descriptions
**Sens:** opis zachęca do kliknięcia i jest streszczeniem dla AI.
**Stan:** opis globalny ma ok. 120 znaków (EN/PL); każda strona bez własnego dziedziczy ten sam; `/cv-templates` ma opis wewnętrzny.
**Zadania:**
- [ ] Napisać opisy 150–160 znaków (PL/EN) dla `/`, `/resume`, `/privacy`, `/terms`, `/login`, docs publicznych.
- [ ] Publiczne CV: opis z `summary` (obcięty do ~155 znaków, bez cięcia w słowie).
- [ ] Skill do copy: `/impeccable clarify` dla tekstów interfejsu albo `/searchfit-seo:on-page-seo`.
- [ ] Test unikalności i długości.
**Weryfikacja:** test + podgląd.

### 7. One H1 per page
**Sens:** jeden `h1` jednoznacznie nazywa temat strony; ułatwia crawlerom i czytnikom ekranu.
**Stan:** `/` ma jedno `h1`; `/cv-templates` ma; `/resume` zależy od JS; renderer CV i docs niezweryfikowane.
**Zadania:**
- [ ] Skrypt/test statyczny: zliczać `<h1` w serwerowym HTML tras publicznych (np. `fetch` do `next start` lub rendering testowy).
- [ ] `/resume`: serwerowy render (patrz pkt 16), potwierdzić `h1`.
- [ ] Renderer CV (`app/components/resume-renderer/`): imię = `h1`, tylko jedno.
- [ ] Docs: tytuł dokumentu = `h1`, nagłówki z markdown zaczynają się od `h2`.
**Weryfikacja:** Chrome → DevTools lub wtyczka nagłówków; test.

### 8. Fix heading order
**Sens:** logiczna hierarchia (h1→h2→h3 bez przeskoków) poprawia zrozumienie struktury strony.
**Zadania:**
- [ ] Przejrzeć landing (sekcje `h2` OK), legal (`legal-document.tsx`), renderer CV, docs (`renderMarkdownWithOutline`).
- [ ] Naprawić przeskoki (np. h2→h4) oraz nagłówki używane stylistycznie (zamienić na `p` + klasę).
- [ ] Test: walidator hierarchii na wyrenderowanym HTML kluczowych tras.
**Weryfikacja:** Chrome + test.

### 9. Add alt text
**Sens:** opis obrazu dla czytników ekranu i wyszukiwania obrazów.
**Stan:** w aplikacji jest jeden obraz treści (`UserAvatar`, `alt="User avatar"`, widoczny po zalogowaniu); QR w `public/images/qrs/`; animacja w `iframe` z `title`. Serwis jest niemal bez obrazów treści.
**Zadania:**
- [ ] Przejrzeć `<img>`, `<Image>`, `<svg>`, `iframe` i tła; dekoracyjne: `alt=""`/`aria-hidden`.
- [ ] `UserAvatar`: alt z imienia użytkownika zamiast stałego tekstu (i18n).
- [ ] QR na publicznym CV: alt opisowy ("QR code linking to …").
- [ ] Przy dodaniu `og:image` i grafik na landing: alt od razu.
- [ ] Test statyczny: brak `<img>` bez `alt` w `app/`.
**Weryfikacja:** test + Lighthouse (Accessibility).

### 10. Add schema markup
**Sens:** dane strukturalne mówią maszynom (Google, AI), czym jest strona; dają rich results.
**Stan:** tylko `ProfilePage` + `Person` (ubogi) na publicznym CV; bezpieczny serializer `app/lib/jsonld.ts`.
**Zadania:**
- [ ] Layout lub landing: `Organization` + `WebSite` (nazwa, url, logo).
- [ ] Landing: `SoftwareApplication` (kategoria, darmowa oferta `price: 0`) i `FAQPage` z 11 pytań (z tych samych słowników, by nie dublować tekstu).
- [ ] Docs publiczne: `Article`/`TechArticle` + `BreadcrumbList`.
- [ ] Publiczne CV: wzbogacić `Person` o `sameAs` (tylko linki z kontaktów przepuszczone przez `sanitizeExternalHref`), `description`, `knowsAbout`; **bez danych spoza zaznaczonej selekcji** (kontrakt R09: tylko `resolver` publicznego CV).
- [ ] Zawsze przez `safeJsonLdScript()`; z nonce CSP.
- [ ] Rozszerzyć `tests/jsonld-safe-serializer.test.mjs` + nowy test kształtu schematów.
**Weryfikacja:** Rich Results Test i Schema Validator w Chrome.

### 11. Add internal links
**Sens:** linki wewnętrzne rozprowadzają autorytet i pozwalają crawlerom znaleźć strony.
**Stan:** stopka linkuje `/resume`, `/login`, `/privacy`, `/terms`; brak linków do docs, brak breadcrumbs; `/cv-templates` osierocona.
**Zadania:**
- [ ] Stopka i nagłówek (dla niezalogowanych): linki do publicznych docs/FAQ, przykładu, porównań.
- [ ] Z landingu: do `/resume`, FAQ, docs; z docs: do landingu i rejestracji.
- [ ] Breadcrumbs na stronach docs (zgodne z `BreadcrumbList`).
- [ ] Publiczne CV: link "Utwórz własne LiveCV" w stopce (powiązanie z produktem; sprawdzić renderer, bez wpływu na selekcję danych).
- [ ] Opisowe anchory, nie "kliknij tutaj".
- [ ] Skrypt: mapa linków i wykrywanie stron bez linków przychodzących.
**Weryfikacja:** skrypt + przegląd w Chrome.

### 12. Fix broken links
**Sens:** martwe linki marnują budżet crawla i psują zaufanie.
**Stan:** nieprzebadane (audyt statyczny nie wykonywał crawla).
**Zadania:**
- [ ] Skrypt (Node, lokalnie na `next start`): przejść wszystkie linki z tras publicznych i sitemapy, raport 4xx/5xx/przekierowań.
- [ ] Sprawdzić linki w treściach docs (`content/docs/**`) i w słownikach i18n (`mailto:`, linki zewnętrzne).
- [ ] Naprawić lub usunąć; przekierowania 301 dla zmienionych adresów (`next.config.ts` `redirects()`).
- [ ] Wprowadzić skrypt jako krok opcjonalny (nie w `npm run ci`, który ma działać offline).
**Weryfikacja:** raport przed/po; Search Console → Strony (błędy 404).

### 13. Compress images
**Sens:** mniejszy transfer = lepszy LCP.
**Stan:** w serwisie prawie nie ma obrazów treści; największe zasoby to fonty TTF (4 × ok. 115–134 kB) i ilustracje w docs (`content/docs/**/resources/*.png`); animacja w `public/animations/`.
**Zadania:**
- [ ] Zmierzyć wagę zasobów na `/`, `/resume`, CV (Chrome → Network).
- [ ] Fonty Space Grotesk: konwersja do WOFF2, `preload` na stronach CV.
- [ ] Zrzuty ekranu w docs: konwersja do WebP/AVIF i `next/image` przy publikowaniu docs; wymiary width/height.
- [ ] Przyszłe `og:image` i grafiki: od razu zoptymalizowane.
**Weryfikacja:** Lighthouse "Properly size images / modern formats"; porównanie rozmiarów.

### 14. Core Web Vitals
**Sens:** LCP/INP/CLS to oficjalne sygnały jakości strony.
**Stan:** cały serwis dynamiczny (root layout czyta `cookies()` i aktora; publiczne CV `force-dynamic`; `proxy.ts` na każdej nawigacji; CSP z nonce wymusza dynamiczny render); `/resume` ładuje dane po stronie klienta; 44 pliki klienckie.
**Zadania:**
- [ ] Pomiar bazowy (Lighthouse mobile + PageSpeed Insights) dla 3 tras.
- [ ] **ADR najpierw:** jak uzyskać cache'owanie stron publicznych przy CSP z nonce i nawigacji zależnej od sesji (opcje: wynieść stan zalogowanego do klienta; grupy tras; CSP oparte o hashe). Zmiana architektoniczna — `/plan-eng-review`.
- [ ] ISR/tag cache dla publicznych CV z `revalidateTag` przy publikacji/wycofaniu/zmianie `allow_indexing`; test, że unpublish działa natychmiast (kontrakt publikacji).
- [ ] `/resume` serwerowo; usunąć `js-yaml` ze ścieżki publicznej, jeśli nieużywany.
- [ ] Analiza bundla (`@next/bundle-analyzer`), dynamiczne importy ciężkich komponentów landingu.
- [ ] CLS: wymiary dla mediów i animacji, rezerwacja miejsca dla rotującego słowa w `h1`.
- [ ] Cache-Control dla `/fonts/*`, `/animations/*`.
**Weryfikacja:** Lighthouse przed/po; cel: LCP < 2,5 s, INP < 200 ms, CLS < 0,1 (mobile).

### 15. Fix mobile layout
**Sens:** indeksowanie jest mobile-first.
**Stan:** viewport poprawny; kontrast, cele dotykowe i poziomy scroll niezweryfikowane; `font-size-xs` 11 px, `sm` 13 px.
**Zadania:**
- [ ] Przejrzeć w Chrome (emulacja 360/390/768 px) trasy publiczne i publiczne CV; zrzuty.
- [ ] Naprawić overflow, cele dotykowe < 44 px, małe fonty w treści.
- [ ] Skill: `/impeccable adapt` lub `/design-review`; wzorce z `docs/guides/development/responsive-ui-and-drawer-patterns.md`.
- [ ] Zgodnie z `CHECKLISTS.md`: dark/light, PL/EN, fokus i klawiatura.
**Weryfikacja:** Lighthouse mobile + przegląd ręczny.

### 16. Enforce HTTPS
**Sens:** zaufanie, ranking i bezpieczeństwo; bez mieszanej treści.
**Stan:** CSP ma `upgrade-insecure-requests` (`proxy.ts:44`); brak HSTS i innych nagłówków w kodzie; Netlify zwykle przekierowuje HTTP→HTTPS i może dodawać HSTS na własnej domenie (do potwierdzenia).
**Zadania:**
- [ ] `curl -I http://…` i `https://…` na produkcji: przekierowanie 301, HSTS, bez łańcuchów (www ↔ non-www).
- [ ] Dodać w `next.config.ts` `headers()`: `Strict-Transport-Security` (najpierw krótki `max-age`, potem `includeSubDomains; preload` po weryfikacji), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] Wymusić `NEXT_PUBLIC_APP_BASE_URL` jako `https://…` w produkcji.
- [ ] Szukać mieszanej treści (`http://` w kodzie i treści).
- [ ] Test kontraktowy nagłówków.
**Weryfikacja:** curl + securityheaders.com / DevTools Security.

### 17. Clean up URL slugs
**Sens:** czytelne, stabilne adresy.
**Stan:** struktura już dobra: `/{personSlug}/{publicId}`, małe litery, brak `.html`; `?lang=` na CV; `/login?mode=…`.
**Zadania:**
- [ ] Przejrzeć generowanie `personSlug` (polskie znaki, spacje, kolizje, długość) — `app/lib/` slugify i testy.
- [ ] Docs: slugi z kategorii/slug, bez dat i identyfikatorów.
- [ ] Nowe strony publiczne: krótkie angielskie lub polskie slugi (decyzja i18n).
- [ ] Jeśli zmieniamy istniejące ścieżki: `redirects()` 301 + wpis w sitemapie.
- [ ] **Nie zmieniać** kanonicznego formatu publicznych linków (zerwie istniejące linki).
**Weryfikacja:** test slugifikacji; crawl linków.

### 18. Add an og:image
**Sens:** podgląd przy udostępnianiu (LinkedIn, Slack, komunikatory) i wizytówka dla AI.
**Stan:** brak `og:image` i `opengraph-image`; publiczne CV i `/` bez obrazka; CSP `img-src 'self' blob: data:` nie blokuje własnych obrazów.
**Zadania:**
- [ ] `app/opengraph-image.tsx` (lub statyczny PNG 1200×630) dla `/` — logo, hasło, "free CV builder".
- [ ] Dynamiczny OG dla publicznych CV (imię + rola; tylko dane z zaznaczonej selekcji; nigdy dane prywatne). Uwaga: `next/og` miał advisory (GHSA-vcvr-r3jv-pc5j) — sprawdzić zaktualizowaną wersję `^16.3.8`.
- [ ] `twitter:card: summary_large_image`, wymiary, alt.
- [ ] Test obecności `og:image` i poprawnej ścieżki absolutnej.
**Weryfikacja:** LinkedIn Post Inspector, Facebook Debugger w Chrome.

### 19. Verify Search Console
**Sens:** jedyne źródło prawdy o indeksacji, błędach i zapytaniach; bez tego nie zmierzymy efektu.
**Stan:** nie ma śladu weryfikacji w kodzie (nie sprawdzano konta).
**Zadania:**
- [ ] Użytkownik: dodać właściwość (najlepiej domena DNS na Netlify); alternatywnie tag HTML `metadata.verification.google` (bez CSP problemów, to `<meta>`).
- [ ] Zgłosić `sitemap.xml`; sprawdzić "Strony" (nieindeksowane, duplikaty, 404) i Core Web Vitals.
- [ ] Bing Webmaster Tools (zasila także część AI, np. Copilot/ChatGPT search).
- [ ] Zapisać przypisanie własności w `docs/runbooks/` (kto ma dostęp).
- [ ] Rejestr tygodniowy: wyświetlenia, kliknięcia, zindeksowane strony.
**Weryfikacja:** status "zweryfikowano"; sitemap "Powodzenie".

### 20. Add llms.txt
**Sens:** zwięzła, czytelna dla modeli wizytówka serwisu (nieoficjalny standard, wpływ nieudowodniony, koszt minimalny).
**Stan:** brak pliku.
**Zadania:**
- [ ] `public/llms.txt` (EN): opis produktu w 2–3 zdaniach z definicją "LiveCV" (rozróżnienie od OpenCV), linki do landingu, FAQ, przykładu, docs, privacy/terms.
- [ ] Opcjonalnie `llms-full.txt` z pełnym FAQ i opisem funkcji (generowany z `landing.yaml`, aby nie dublować treści).
- [ ] Test: plik istnieje, linki są poprawne i w sitemapie.
- [ ] Uwaga: `proxy.ts` pomija ścieżki z kropką (`.*\\.`), więc plik jest serwowany bez CSP — poprawnie dla `.txt`.
**Weryfikacja:** `https://…/llms.txt`; zapytanie testowe w Chrome do AI po kilku tygodniach.

## Fazy i kolejność

| Faza | Zakres | Powód kolejności |
|---|---|---|
| 0 | Baseline w Chrome (AI + Lighthouse), inwentarz tras i `robots`, issue + gałęzie | bez pomiaru nie zobaczymy efektu |
| 1 (szybkie wygrane) | 1, 2, 3, 4, 5, 6, 16 (nagłówki), 20 | małe zmiany, duży wpływ na indeksację |
| 2 (treść i struktura) | 7, 8, 9, 10, 11, 12, 17, 18 | wymaga copy PL/EN i decyzji o publicznych docs |
| 3 (wydajność) | 13, 14, 15 | wymaga ADR (cache vs CSP nonce); największy koszt |
| 4 (pomiar i AI) | 19, ponowny baseline w Chrome, treści "What is a LiveCV", porównania | Search Console potrzebuje czasu na dane |
| 1b | Wstrzymanie indeksowania CV (flaga + ukrycie UI) i blokada botów na API/eksportach | decyzja z 2026-10-13; upraszcza resztę planu |
| 5 (na końcu) | koncepcja `noindex` dla pozostałych tras, ewentualny powrót indeksowania CV i `allow_ai_access` | wymaga decyzji produktowej; wpływa na ADR 0001/0005 |

Faza 2 obejmuje teraz też: publiczne docs (nowy ADR zmieniający 0020) i `?lang=` dla `/` i docs.

Proponowany podział na PR-y: (A) crawlability — pkt 1–4, 16, 20; (B) metadane i copy — 5, 6, 18; (C) struktura HTML — 7–9, 11, 17; (D) schema — 10; (E) wydajność — 13–15 (po ADR); (F) narzędzia i raporty — 12, 19.

## Decyzje

**Podjęte (2026-10-13):**
1. **Docs publiczne:** podstawowe tutoriale i przegląd stają się publiczne (zmiana ADR 0020: nowy ADR lub aneks). Test scenarios dla beta-testerów zostają za logowaniem (`canViewTestScenarios`).
2. **Boty AI:** strony marketingowe i docs dostępne; publiczne CV użytkowników niedostępne dla botów AI. Mechanizm i ryzyka: sekcja "Boty AI a CV użytkowników" niżej.
3. **`/cv-templates`:** `noindex`.
4. **`/login`:** indeksowalna (strony logowania mogą być w Google); wymaga własnego tytułu/opisu i canonicala na `/login` (warianty `?mode=signin|signup`).
5. **Indeksowanie na 100%:** `/`, `/resume`, `/docs` (część publiczna), `/login`.
6. **Całość tematu `noindex`:** na sam koniec (Faza 5).

7. **Indeksowanie CV użytkowników: funkcja ukryta** (patrz zadanie "Wstrzymanie indeksowania CV" niżej).
8. **API OpenCV v1 i eksporty (PDF/TXT/YAML):** poza zasięgiem botów AI (i wyszukiwarek) na razie.

**Do rozstrzygnięcia:**
- **Język w URL (`?lang=`) dla `/` i docs:** wariant rekomendowany to `?lang=` zgodnie z publicznym CV (sekcja "Języki"). Alternatywa `/pl`, `/en` droższa, bo zmienia routing.
- **Nazewnictwo:** w publicznych tekstach zawsze "CV builder" obok "LiveCV", żeby nie mylić z OpenCV.

## Zadanie: Wstrzymanie indeksowania CV (decyzja 2026-10-13)

**Decyzja:** opcja `allow_indexing` (CV widoczne w wyszukiwarkach) jest na razie ukryta i niedostępna dla użytkowników. Wszystkie publiczne CV są `noindex,nofollow`.
**Sprzeczność z regułą:** ADR 0001 ("Indexing is user opt-in", linia 117) i ADR 0005 opisują opt-in. Opt-in zostaje w modelu danych, ale jego użycie jest zawieszone — zgodnie z CLAUDE.md zmiana wymaga aktualizacji obu ADR w tym samym PR.
**Proponowane wykonanie (jeden PR):**
- [ ] Przełącznik `platform_feature_flags.public_cv_indexing_enabled` (domyślnie `false`, fail-closed; wzorzec `pdf_draft_enabled`). Dzięki temu dane użytkowników nie są kasowane i funkcję da się włączyć bez migracji.
- [ ] Resolver publicznego linku: efektywne `allowIndexing = allow_indexing && flag` — jedno miejsce, z którego korzystają `generateMetadata` (`app/[personSlug]/[publicId]/page.tsx`), sitemap (`fetchIndexablePublicLinksForSitemap`) i JSON-LD/canonical.
- [ ] UI: ukryć kontrolkę indeksowania w modalu publikacji i w edytorze/dashboardzie (`PublishSavedVersionModal.tsx` i pokrewne); copy mówiące, że CV są dostępne tylko przez link.
- [ ] API publikacji (`/api/resume/presets/[id]/publish`): przy wyłączonej fladze ignorować/odrzucać `allow_indexing=true` (zod), żeby nie dało się obejść UI.
- [ ] Sprawdzić w bazie (test i prod), ile linków ma dziś `allow_indexing=true` i poinformować właścicieli (jeśli to nie tylko konta testowe — patrz wiadomość o bazie głównie testowej).
- [ ] Sitemap: wpisy CV znikają, zostają strony statyczne.
- [ ] Testy: kontrakty publikacji (`tests/cv-publication-test-contracts`), robots/sitemap, metadane CV z flagą wyłączoną i włączoną.
- [ ] Aktualizacja ADR 0001, 0005, `CLAUDE.md` (sekcja routingu/publikacji) i polityki prywatności, jeśli wspomina o indeksowaniu.
**Skutek uboczny (korzystny):** w Fazie 5 problem botów AI wobec CV dotyczy już tylko samego linku, a nie indeksu Google; `allow_ai_access` przestaje być pilne.

## Zabezpieczone API i eksporty — ryzyka na przyszłość

Zakres teraz: `robots.txt` (`Disallow: /api/`), `X-Robots-Tag: noindex` na API i eksportach, blokada User-Agentów botów AI i crawlerów, istniejący rate limit.
- **UA to nie prawdziwe zabezpieczenie.** Zatrzymuje uczciwe boty; ktoś podszywający się pod przeglądarkę przejdzie. Realna ochrona danych to nadal selekcja z ADR 0008 (R09) i nieodgadywalne `publicId`.
- **Cache:** ADR 0008 przewiduje `Cache-Control: public, s-maxage=300`. Blokada po UA z `Vary: User-Agent` rozbija cache; bez `Vary` CDN może zbuforować 403 i podać go ludziom (lub odwrotnie). Blokować na brzegu (Netlify edge/reguła przed cache) albo `Vary: User-Agent` z `private`/krótkim cache dla bota.
- **Sprzeczność z wizją ADR 0008** ("OpenCV-standard exchange"): v1 jest publiczne i bez autoryzacji. Przyszli integratorzy (importery ATS, narzędzia partnerów) mogą mieć "botowe" UA lub potrzebować dostępu maszynowego. Rozwiązanie: zapisać w ADR 0008, że v1 jest dla ludzi i zaufanych integracji, a dostęp maszynowy przez klucz API w `/v2/` (zmiana kontraktu jest wtedy jawna; zmiana v1 w locie byłaby breaking).
- **Fałszywe trafienia:** podglądy linków (LinkedIn, Slack), narzędzia rekruterów i skanery bezpieczeństwa mogą wpaść na listę; lista UA to własność do utrzymania, z testem i wyjątkami.
- **Przyciski pobierania na publicznym CV** działają w przeglądarce użytkownika, więc nie ucierpią; sprawdzić tylko, że blokada nie obejmuje nawigacji przeglądarki.
- **Dryf konfiguracji:** lista botów starzeje się (nowe UA co kwartał). Jedno miejsce w kodzie + test; przegląd listy raz na kwartał.
- **Rate limit (G-P0-05)** pozostaje główną ochroną przed masowym pobieraniem, niezależnie od UA.
Wniosek: tymczasowa blokada jest bezpieczna dla przyszłości, jeśli (a) jest w jednym miejscu, (b) nie psuje cache, (c) ADR 0008 jawnie zapisuje politykę i przyszłą ścieżkę (`/v2/` + klucze).

## Boty AI a CV użytkowników

**Założenie:** użytkownik może włączyć `allow_indexing` (ADR 0001/0005); wtedy CV ma `index, follow` i Google je zaindeksuje. Chcemy, żeby boty AI i tak nie czytały CV użytkowników.

**Warstwy (żadna sama nie wystarcza):**
1. `robots.txt` per bot AI (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, Meta-ExternalAgent): `Allow` dla stron marketingowych i `/docs`, `Disallow: /` dla reszty. Ścieżka CV `/{slug}/{id}` ma ten sam kształt co inne dwusegmentowe trasy, więc lista musi być **allowlistą** (nowa strona marketingowa = wpis do listy + test).
2. Blokada po stronie serwera (`proxy.ts`): znane User-Agenty botów AI dostają 403 na ścieżkach CV, PDF/TXT/YAML i `/api/public/opencv/v1/`. Działa na uczciwe boty, które nie respektują robots, ale nie na te, które podszywają się pod przeglądarkę.
3. Nagłówki/meta na CV: `noarchive`, `max-snippet`/`nosnippet` ograniczają wykorzystanie w AI Overviews, ale mogą też pogorszyć wygląd wyniku w Google — do decyzji.
4. Copy: informacja w modalu publikacji i w polityce prywatności, co dokładnie oznacza włączenie indeksowania.

**Nie robić:** `Disallow` dla Googlebota na CV — zablokowałby odczyt `noindex` i zepsuł opt-in.

**Ryzyka:**
- Zgodność z robots jest dobrowolna; `ChatGPT-User` i `Perplexity-User` (pobrania na żądanie użytkownika) mogą ją pomijać.
- Google AI Overviews i Gemini w wyszukiwarce korzystają z indeksu Googlebota, więc zaindeksowane CV może pojawić się w odpowiedziach AI Google; `Google-Extended` dotyczy tylko trenowania. Pełna blokada w Google = `noindex`/`nosnippet`.
- Publiczne API OpenCV v1 i eksporty (PDF/TXT/YAML) są z założenia maszynowe (ADR 0008): trzeba wprost rozstrzygnąć, że blokada botów AI obejmuje też je.
- RODO: CV to dane osobowe; wykorzystanie przez AI poza zgodą użytkownika wymaga podstawy w polityce prywatności; usunięcie z już wytrenowanego modelu jest niemożliwe.
- Rozważyć osobną opcję `allow_ai_access` (domyślnie wyłączona): migracja, UI, ADR; rekomendowane, jeśli chcemy zgody jawnej, a nie domniemanej z `allow_indexing`.

## Języki: `?lang=` dla `/` i docs

Technicznie możliwe i tańsze niż `/pl`, `/en`. Wymagania:
- `?lang=` ma pierwszeństwo przed cookie i `Accept-Language` w `resolveAppLocale` (`app/i18n/server.ts`);
- samoreferencyjny canonical dla każdego wariantu + `alternates.languages` (hreflang) + `x-default` na URL bez parametru;
- oba warianty w sitemapie;
- **wszystkie linki wewnętrzne niosą wybrany język** (nawigacja, stopka, linki w docs), inaczej crawler po pierwszym kliknięciu wraca do domyślnego;
- URL bez parametru: `Vary: Accept-Language`, stabilny dla botów (bot nie ma cookie);
- docs: `content/docs/locales/{en,pl}` już istnieją, wariant PL dostępny pod `?lang=pl`;
- `/login?mode=…`: osobny parametr, canonical na `/login`.
Zaleta uboczna: język w URL, a nie w cookie, upraszcza cache'owanie (pkt 14).
Słabość: Google woli osobne ścieżki, ale akceptuje parametr z poprawnym hreflang; spójne z istniejącym `?lang=` na CV.

## Ryzyka

- **ISR i unpublish:** cache publicznych CV nie może przetrwać wycofania ani zmiany `allow_indexing` — test kontraktowy obowiązkowy.
- **Selekcja publiczna (R09):** OG, JSON-LD i `llms.txt` nie mogą ujawniać danych poza zaznaczonym zakresem.
- **CSP:** nowe skrypty JSON-LD z nonce; `og:image` generowany lokalnie.
- **Efekt SEO/AI jest opóźniony** (tygodnie–miesiące); pierwsze mierzalne wyniki po fazie 1 w Search Console, w AI po fazie 4.
- **Zakres ręczny:** Search Console, katalogi (Product Hunt, GitHub, Reddit) i konta AI wymagają działań użytkownika.

## Definicja ukończenia

- Lighthouse mobile ≥ 90 (SEO i Best Practices) na `/`, `/resume`, publicznym CV; CWV w zielonym.
- Search Console: sitemap zaakceptowana, 0 błędów krytycznych, strony publiczne zindeksowane.
- Test kontraktowy dla robots, sitemapy, canonical, tytułów/opisów, JSON-LD, `alt`, nagłówków HTTP.
- Ponowny baseline AI w Chrome vs wyjściowy, zapisany w `docs/seo/`.
- Audyty SEO ponownie uruchomione; wynik ≥ 80/100.

---

# Backlog zadań (kolejność wykonania)

Legenda: **Rozm.** S ≤ 0,5 dnia, M ≈ 1–2 dni, L > 2 dni. Priorytet wg labeli repo (`critical/high/medium/low`). Każde zadanie = issue + gałąź `ocv-<numer>-<opis>` + PR; testy piszemy przed implementacją; przed zamknięciem `npm run lint && npm run typecheck && npm test`. Numery punktów (1–20) odnoszą się do sekcji "Zadania wg punktów".

## Faza 0 — pomiar

### T00 Baseline i porządek (S, high, chore)
- Chrome: prompty do ChatGPT/Gemini/Perplexity/Claude (EN+PL) → `docs/seo/ai-visibility-baseline-<data>.md`; Lighthouse mobile dla `/`, `/resume`, jednego publicznego CV; PageSpeed Insights.
- Inwentarz tras: trasa → `robots` → canonical → tytuł → `h1` (tabela w `docs/seo/`).
- Założyć issues T01–T20 (projekt OpenCiVera, assignee, priorytet label + pole, milestone, label typu).
- **Akceptacja:** raport baseline w repo; issues z kompletem metadanych.

## Faza 1 — fundamenty indeksacji

### T01 Adres bazowy, `metadataBase`, nagłówki HTTPS (M, critical, fix) — pkt 4, 16
- `getAppBaseUrl()` (`app/lib/env.ts`): w produkcji brak zmiennej = błąd; wymóg `https://`.
- `metadataBase` w `app/layout.tsx`.
- `next.config.ts` `headers()`: HSTS (najpierw krótki `max-age`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `Cache-Control: immutable` dla `/fonts/*`, `/animations/*`.
- Zweryfikować `curl -I` http→https i www↔non-www na produkcji.
- **Testy:** kontrakt nagłówków i `getAppBaseUrl`. **Akceptacja:** brak `localhost` w wyjściu produkcyjnym; nagłówki obecne.

### T02 `robots.txt` i sitemap (M, critical, feat) — pkt 1, 2
- `app/robots.ts`: `Disallow` dla `/api/`, `/dashboard`, `/admin`, `/master-resume`, `/user`, `/onboarding`, `/settings` (bez `/login`, `/docs`, `/resume`, `/`); sitemapa.
- `app/sitemap.ts`: `/`, `/resume`, `/privacy`, `/terms`, `/docs` (publiczne, po T07), `lastModified`; błąd bazy nie kończy się cichym okrojeniem; limit/stronicowanie linków CV.
- **Zależności:** T04 (wpisy CV znikają), T07/T08 dopisują adresy. **Testy:** kontrakt robots i sitemapy (obecność/nieobecność tras).
- **Akceptacja:** `/robots.txt` i `/sitemap.xml` zgodne z testem; brak tras chronionych i `noindex`.

### T03 Boty AI, API i eksporty poza zasięgiem + ADR 0008 (M, high, security)
- Jedna biblioteka `app/lib/ai-bots.ts` (lista UA + test): GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, Meta-ExternalAgent.
- `robots.txt`: allowlista dla botów AI (marketing, `/docs`, `/resume`, `/privacy`, `/terms`, `/login`), reszta `Disallow`.
- Blokada 403 dla tych UA na ścieżkach CV (`/{slug}/{id}`), eksportach (`/api/resume/export/*`) i `/api/public/opencv/v1/*`; **na brzegu/przed cache lub z `Vary: User-Agent`** (ryzyko zbuforowania 403).
- `X-Robots-Tag: noindex` na API i eksportach.
- **ADR 0008 (aneks):** v1 dla ludzi i zaufanych integracji, dostęp maszynowy przez klucze w `/v2/`; blokada botów AI jako polityka tymczasowa.
- **Testy:** UA z listy → 403 na wskazanych ścieżkach, 200 dla przeglądarki i na stronach marketingowych; kontrakt cache.
- **Zależności:** T02. **Akceptacja:** testy zielone; ADR zaktualizowany; ręczna weryfikacja `curl -A GPTBot`.

### T04 Wstrzymanie indeksowania CV (M, high, feat) — decyzja 2026-10-13
- Flaga `platform_feature_flags.public_cv_indexing_enabled` (migracja przez `apply_migration` na test i prod, ta sama nazwa), domyślnie `false`, fail-closed.
- Efektywne `allowIndexing = allow_indexing && flaga` w jednym miejscu resolvera; użycie w `generateMetadata`, sitemapie, JSON-LD/canonical.
- Ukryć kontrolkę w modalu publikacji i edytorze; API publikacji odrzuca `allow_indexing=true` (zod).
- Sprawdzić w bazie liczbę linków z `allow_indexing=true`; w razie realnych użytkowników powiadomić.
- Aktualizacja ADR 0001, 0005, CLAUDE.md (publikacja), polityki prywatności; kontrakty publikacji.
- **Testy:** flaga off/on w metadanych, sitemapie i API. **Akceptacja:** każde publiczne CV `noindex,nofollow` przy fladze off; brak UI opcji.

### T05 Strony publiczne: robots, canonical, tytuły, opisy (M, critical, feat) — pkt 3 (zawężony), 4, 5, 6
- `title.template` + `default` z frazą "free CV builder" (50–60 zn.), opisy 150–160 zn. w `app/i18n/locales/{en,pl}`; własne dla `/`, `/resume`, `/login`, `/privacy`, `/terms`.
- Gwarancja `index, follow` dla `/`, `/resume`, `/docs` (publiczne), `/login`; `/cv-templates` → `noindex`.
- Canonical: `/`, `/resume`, `/privacy`, `/terms`, `/login` (warianty `?mode=` → `/login`).
- Publiczne CV: tytuł z rolą, opis z `summary` (~155 zn.).
- **Testy:** długość i unikalność tytułów/opisów, robots, canonical. **Zależności:** T01.
- **Akceptacja:** inwentarz z T00 zgodny z decyzjami; brak duplikatów tytułów.

### T06 `llms.txt` (S, medium, feat) — pkt 20
- `public/llms.txt` (EN) z definicją "LiveCV" (odróżnienie od OpenCV), linki do landingu, FAQ, `/resume`, docs, privacy/terms; opcjonalnie `llms-full.txt` generowany z `landing.yaml`.
- **Testy:** plik istnieje, linki rozwiązują się i są w sitemapie. **Zależności:** T07 (linki do docs).

## Faza 2 — treść i struktura

### T07 Publiczna dokumentacja + ADR (L, high, feat)
- Nowy ADR zmieniający ADR 0020: podstawowe tutoriale i przegląd publiczne; `test-scenarios` nadal przez `canViewTestScenarios` (admin bypass wg ADR 0021).
- `/docs`, `/docs/[category]/[slug]`: bez `requireAuthenticatedActor` dla publicznych kategorii, serwerowy render, `generateMetadata` z tytułem/opisem z frontmatter, `index, follow`.
- Oznaczenie w `content.ts`, które dokumenty są publiczne (np. pole frontmatter); sidebar pokazuje tylko dostępne.
- Aktualizacja `content/docs/README.md`, `tests/beta-docs-site.test.mjs`, `docs-layout.test.mjs`.
- **Testy:** anonim widzi publiczne docs, nie widzi test-scenarios (404). **Akceptacja:** docs w sitemapie; reguły dostępu zapisane w ADR.

### T08 Język przez `?lang=` na `/` i docs (L, high, feat)
- `resolveAppLocale`: `?lang=` przed cookie i `Accept-Language`.
- Samoreferencyjny canonical + `alternates.languages` + `x-default` dla `/`, `/resume`, `/privacy`, `/terms`, docs; oba warianty w sitemapie; `Vary: Accept-Language` dla adresu bez parametru.
- Wszystkie linki wewnętrzne (nawigacja, stopka, docs, landing) niosą wybrany język; przełącznik języka ustawia `?lang=`.
- **Testy:** rozwiązywanie języka, hreflang, linki. **Zależności:** T05, T07. **Ryzyko:** wpływ na cache (T14).

### T09 `/resume` renderowane serwerowo (M, high, perf)
- Dane z `public/data/public` pobierane na serwerze; `h1` i treść w HTML; usunięcie `js-yaml` ze ścieżki publicznej, jeśli zbędny.
- **Testy:** treść i `h1` w wyrenderowanym HTML bez JS. **Akceptacja:** Lighthouse bez "Ładowanie…" w HTML.

### T10 Struktura HTML: `h1`, nagłówki, `alt`, strony błędów (M, medium, fix) — pkt 7, 8, 9
- Test walidujący hierarchię nagłówków i unikalność `h1` w trasach publicznych (landing, legal, CV, docs).
- Poprawki: renderer CV, `legal-document.tsx`, markdown docs (start od `h2`).
- `alt`: `UserAvatar` (imię użytkownika, i18n), QR na CV, dekoracje `alt=""`; test statyczny na `<img>` bez `alt`.
- `app/not-found.tsx`, `app/error.tsx`, `global-error.tsx` z nawigacją i `noindex`.

### T11 Dane strukturalne (M, medium, feat) — pkt 10
- Layout: `Organization` + `WebSite`; landing: `SoftwareApplication` (darmowa) + `FAQPage` z tych samych słowników; docs: `TechArticle` + `BreadcrumbList`.
- Publiczne CV: `Person` z `sameAs` (przez `sanitizeExternalHref`), `description`, `knowsAbout`; tylko dane z zaznaczonej selekcji (R09).
- Zawsze `safeJsonLdScript()` z nonce CSP; rozszerzenie `tests/jsonld-safe-serializer.test.mjs`.
- **Weryfikacja:** Rich Results Test w Chrome.

### T12 Linkowanie wewnętrzne, linki, slugi (M, medium, chore) — pkt 11, 12, 17
- Stopka/nawigacja (niezalogowani): docs, FAQ, przykład; breadcrumbs w docs; anchory opisowe; link "Utwórz własne LiveCV" na publicznym CV.
- Skrypt crawl (Node, `next start`): martwe linki + strony bez linków przychodzących (poza `npm run ci`); naprawy i `redirects()` 301.
- Przegląd slugifikacji `personSlug` (polskie znaki, kolizje) z testami; **bez zmiany formatu istniejących publicznych linków**.

### T13 `og:image` (M, medium, feat) — pkt 18
- `app/opengraph-image.tsx` (lub statyczny 1200×630) dla `/`; dynamiczny OG dla CV (imię + rola, tylko dane z selekcji); `twitter:card: summary_large_image`.
- Sprawdzić wersję `next` pod kątem advisory `next/og`.
- **Weryfikacja:** LinkedIn Post Inspector, Facebook Debugger.

## Faza 3 — wydajność

### T14 ADR: cache publiczny vs CSP z nonce i sesją (M, high, architecture)
- Pomiar bazowy (T00), opcje: stan zalogowanego po stronie klienta, grupy tras, CSP z hashami, ISR + `revalidateTag`. Decyzja i plan; `/plan-eng-review`.
- **Akceptacja:** zatwierdzony ADR; kontrakt: unpublish i `allow_indexing` unieważniają cache natychmiast.

### T15 Wdrożenie wydajności (L, high, perf) — pkt 13, 14
- Zgodnie z ADR (T14): cache stron publicznych i CV; `@next/bundle-analyzer`, dynamiczne importy; stabilne wymiary dla rotującego słowa (CLS).
- Fonty Space Grotesk → WOFF2 + `preload` na CV; obrazy docs → WebP/AVIF z `next/image` i wymiarami.
- **Cel:** LCP < 2,5 s, INP < 200 ms, CLS < 0,1 (mobile). **Zależności:** T14, T08, T09.

### T16 Mobile (M, medium, fix) — pkt 15
- Przegląd w Chrome (360/390/768 px), dark/light, PL/EN; cele dotykowe ≥ 44 px, overflow, małe fonty w treści; `/impeccable adapt`.
- **Akceptacja:** brak poziomego scrolla; Lighthouse mobile bez uwag a11y/tap targets.

## Faza 4 — pomiar i treść

### T17 Search Console i Bing Webmaster (S, high, chore) — pkt 19 (wykonuje użytkownik)
- Weryfikacja domeny (DNS) lub meta `verification`; zgłoszenie sitemapy; zapis właścicieli w `docs/runbooks/`; rejestr tygodniowy.
- **Zależności:** T02. **Akceptacja:** sitemap "Powodzenie".

### T18 Treści pod widoczność AI (L, medium, docs)
- "What is a LiveCV?" (EN/PL), porównania z JSON Resume/RenderCV/Reactive Resume, "jedna baza i wiele wersji CV", "CV w YAML"; tabela cech.
- Obecność poza domeną (Product Hunt, GitHub README, Reddit, LinkedIn) — plan i teksty (`/searchfit-seo:content-strategy`, `/anthropic-skills:opencivera-linkedin-writer`).

### T19 Ponowny pomiar (S, medium, chore)
- Powtórzyć Chrome (AI + Lighthouse), audyty SEO/technical/AI-visibility; zapisać porównanie z T00. Po 4–8 tygodniach drugi pomiar AI.
- **Cel:** wynik audytu ≥ 80/100.

## Faza 5 — na końcu

### T20 Koncepcja indeksowania i `noindex` (M, medium, architecture)
- Przegląd wszystkich tras (chronione, CV, docs), spójność ADR 0001/0005; decyzja o powrocie indeksowania CV i ewentualnym `allow_ai_access`; aktualizacja polityki botów.

## Zależności (skrót)
T00 → wszystkie. T01 → T05. T04 → T02 (wpisy CV). T02 → T03, T17. T07 → T06, T08. T05, T07 → T08. T09, T08, T14 → T15. T15 → T19. T20 po T19.

## Proponowany podział na PR-y
PR1: T01 · PR2: T02+T03 · PR3: T04 · PR4: T05+T06 · PR5: T07 · PR6: T08 · PR7: T09+T10 · PR8: T11 · PR9: T12+T13 · PR10: T14 (ADR) · PR11: T15+T16 · T17–T19 bez kodu.
