# Audyt Technical SEO — OpenCiVera

**Serwis:** OpenCiVera (`plm-resume`, Next.js 16 App Router, hosting Netlify + `@netlify/plugin-nextjs`)
**Data:** 2026-10-13
**Metoda:** analiza statyczna kodu i konfiguracji. Nie mierzono Core Web Vitals, nagłówków HTTP ani TTFB na produkcji.
**Wynik ogólny: 55/100**

Uzupełnia [seo-audit-2026-10-13.md](seo-audit-2026-10-13.md); tam są meta tagi, nagłówki i JSON-LD. Tu: crawlowanie, indeksacja, renderowanie, wydajność, bezpieczeństwo.

---

## Crawlability: 60/100

- **`robots.txt` bez żadnych `disallow`.** Jedna reguła `allow: "/"` — `app/robots.ts:7-11`. Crawlery mogą wchodzić w `/api/*` (eksporty PDF/TXT/YAML publicznych CV, `app/api/public/opencv/v1/...`), `/dashboard`, `/admin`, `/master-resume`. Strony chronione przekierowują do `/login` (`proxy.ts:12,117`), ale każde takie trafienie zużywa budżet crawla i zwraca 307.
- **Sitemap niekompletny.** Tylko `/privacy`, `/terms` i publiczne CV — `app/sitemap.ts:15-22`. Brak `/` i `/resume`; strony statyczne bez `lastModified`.
- **Sitemap cicho degraduje się do 2 URL-i.** Przy błędzie Supabase `catch` zwraca same `/privacy` i `/terms` — `app/sitemap.ts:25-30`. Chwilowa awaria bazy zeruje listę publicznych CV w sitemapie bez żadnego sygnału. Do rozważenia: nie cache'ować takiej odpowiedzi albo zwracać 5xx.
- **Brak sitemap index.** Dziś nieistotne (daleko od 50 000 URL-i), ale `fetchIndexablePublicLinksForSitemap` nie ma wyraźnego limitu — do sprawdzenia przy wzroście liczby CV.
- **Brak `X-Robots-Tag` na eksportach.** Trasy `/api/resume/export/*` zwracają pliki bez nagłówka `X-Robots-Tag: noindex`, więc linkowany PDF może trafić do indeksu niezależnie od `allow_indexing` CV.

## Indeksacja: 55/100

- **Fallback bazowego URL do `http://localhost:3000`.** `app/lib/env.ts:36-41`. Sitemap, `robots.txt`, canonicale i JSON-LD użyją tej wartości bez błędu, jeśli na produkcji zabraknie `NEXT_PUBLIC_APP_BASE_URL` i `URL` (Netlify ustawia `URL` samo, więc ryzyko głównie dla preview/innych hostów). Brak `metadataBase` w `app/layout.tsx:18-27`.
- **Brak `not-found.tsx`, `error.tsx`, `global-error.tsx`.** Używane jest domyślne 404 Next.js — bez nawigacji i bez własnego `noindex`. Publiczne CV wywołuje `notFound()` (`app/[personSlug]/[publicId]/page.tsx`), więc status 404 jest poprawny, ale brak własnego widoku to utracone linkowanie wewnętrzne.
- **Brak kanonicznego URL na stronach marketingowych** (`/`, `/resume`, `/privacy`, `/terms`). Warianty z parametrami (`/?lang=pl`, `/login?mode=signup`) nie mają zadeklarowanego canonicala; `/login?mode=…` jest indeksowalny w dwóch wariantach z tym samym tytułem.
- **Canonical publicznego CV jest poprawny** (`alternates.canonical`, `app/[personSlug]/[publicId]/page.tsx:86-89`), ale wariant `?lang=xx` ma w sitemapie osobny wpis alternates — zgodne z hreflang, bez konfliktu `canonical` + `noindex`.
- **Brak przekierowań w `netlify.toml`/`next.config.ts`.** Nie ma reguł www ↔ non-www ani trailing slash; zależy od ustawień domeny Netlify (nieweryfikowalne z kodu).

## Performance: 45/100

- **Cały serwis jest renderowany dynamicznie, bez cache'owania na CDN.** Root layout czyta `cookies()` i `getCurrentActor()` — `app/layout.tsx:35-40`; strona główna też — `app/page.tsx:16`. Do tego `export const dynamic = "force-dynamic"` na publicznym CV (`app/[personSlug]/[publicId]/page.tsx:20`) i `proxy.ts` uruchamiany na każdej nawigacji (`proxy.ts:136-141`), a przy wygasłym tokenie robiący wywołanie sieciowe do Supabase (`proxy.ts:120`). Skutek: każda odsłona, także crawlera, to renderowanie na serwerze, a TTFB zależy od Supabase. To największy techniczny koszt SEO w serwisie.
- **Publiczne CV nie używa ISR/tagów cache**, mimo że snapshoty są niemutowalne (ADR 0008). Kandydat: `revalidate` + `revalidateTag` przy publikacji/wycofaniu (ostrożnie: kontrola `allow_indexing` i unpublish muszą unieważniać natychmiast).
- **CSP z nonce wymusza dynamiczny render.** `script-src 'nonce-…' 'strict-dynamic'` (`proxy.ts:35`) wyklucza statyczny prerender stron — to świadomy kompromis bezpieczeństwa, ale trzeba go znać przy planowaniu cache.
- **Fonty CV jako TTF, nie WOFF2.** `SpaceGrotesk-VariableFont_wght.ttf` 134 kB (`app/globals.css:6-12`), bez `preload`. `font-display: swap` jest ustawione (dobrze). Konwersja do WOFF2 zmniejszy transfer o ok. połowę. Geist idzie przez `next/font` (self-host, dobrze).
- **44 pliki `"use client"`**, w tym komponenty landingu (`landing-features.tsx`, `landing-sample-cv.tsx`) i animacja. Wymaga pomiaru, jaki to JS na `/` (analiza bundla: `ANALYZE`/`@next/bundle-analyzer`, brak w repo).
- **`/resume` pobiera dane po stronie klienta** (`app/resume/resume-view-client.tsx:130`, `cache: "no-store"`) — opóźnia LCP i ukrywa treść przed crawlerem bez JS.
- **`next/script` ładuje `js-yaml.min.js`** na stronach chronionych i `/resume` (`app/resume/resume-view-client.tsx:4`); na publicznym `/resume` to zbędny koszt, jeśli widok nie edytuje YAML.
- **Brak `next/image` poza awatarem** — w serwisie nie ma obrazów treści, więc ryzyko niskie; OG image nie istnieje.
- **Brak konfiguracji nagłówków cache** dla `/fonts/*` w repo (`next.config.ts` bez `headers()`, brak `public/_headers`). Netlify domyślnie nada wartości, ale długi `immutable` dla fontów i animacji w `public/animations` nie jest zagwarantowany.

## Mobile: 75/100

- Viewport ustawiony poprawnie (`app/layout.tsx:29-32`); `font-size-base: 1rem` (`app/globals.css:41`).
- Jest wspólny breakpoint nawigacji (`DESKTOP_NAVIGATION_BREAKPOINT_QUERY`) i zasady responsywnych drawerów.
- **Niezweryfikowane:** celki dotykowe ≥ 44 px, poziomy scroll, kontrast; `--font-size-xs: 0.6875rem` (11 px) i `--font-size-sm: 0.8125rem` (13 px) — sprawdzić, gdzie są użyte w treści, a nie tylko w etykietach. Test w przeglądarce (`/design-review`, Lighthouse mobile).

## Security: 65/100

- ✅ **CSP z nonce** na wszystkich nawigacjach, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests` — `proxy.ts:33-45`. Bezpieczne serializowanie JSON-LD — `app/lib/jsonld.ts`.
- ⚠️ **Brak pozostałych nagłówków bezpieczeństwa w kodzie:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Ani w `next.config.ts`, ani w `netlify.toml`. HSTS Netlify dodaje na własnych domenach, ale na domenie niestandardowej trzeba to potwierdzić (`curl -I`).
- ⚠️ **`style-src 'unsafe-inline'`** (`proxy.ts:36`) — świadomy kompromis opisany w komentarzu; niska ocena CSP w skanerach, bez wpływu na SEO.
- ✅ Sekrety poza repo: `.env*` w `.gitignore`, w repo tylko pliki `*.example`. Plik `.env.local` jest lokalny i ignorowany.
- ✅ HTTPS wymuszane przez `upgrade-insecure-requests`; HTTP → HTTPS po stronie Netlify (do potwierdzenia na domenie).

## Dane strukturowane i i18n (skrót)

- JSON-LD tylko na publicznym CV (`ProfilePage`/`Person`), szczegóły i braki w audycie SEO.
- `<html lang>` dynamiczny; `hreflang` tylko dla publicznych CV (`alternates.languages` + sitemap). Język na pozostałych stronach wybierany cookie/`Accept-Language` (`app/i18n/server.ts:182`) — jeden URL, dwie wersje: crawler zobaczy tę wynikającą z nagłówka.

## Struktura URL: 85/100

- Kanoniczna, płytka struktura `/{personSlug}/{publicId}`, małe litery, `encodeURIComponent` w sitemapie i canonicalach. Starych tras `.html` i `/r/[slug]` nie ma.
- Parametr `?lang=` do przełączania języka CV jest zadeklarowany w sitemapie jako alternatywa — poprawnie.
- `/cv-templates` i `/login?mode=…` to jedyne trasy z parametrami/stroną wewnętrzną, które powinny dostać `noindex` (patrz audyt SEO).

---

## Priorytetowe poprawki

1. **[Krytyczne] `metadataBase` + brak fallbacku localhost.** W `app/layout.tsx` dodać `metadataBase: new URL(getAppBaseUrl())`; w `getAppBaseUrl()` rzucać błąd w `NODE_ENV=production`, gdy brak zmiennych. Mały diff, usuwa ryzyko błędnych canonicali/sitemapy.
2. **[Krytyczne] Dodać `/` i `/resume` do sitemapy** oraz nie ukrywać błędu bazy (`app/sitemap.ts:15-30`).
3. **[Wysokie] `robots.ts`: `disallow` dla `/api/`, `/dashboard`, `/admin`, `/master-resume`, `/user`, `/onboarding`, `/settings`, `/docs`** + `X-Robots-Tag: noindex` na eksportach `/api/resume/export/*`.
4. **[Wysokie] Wydzielić z root layoutu odczyt `cookies()`/aktora**, tak aby strony publiczne mogły być cache'owane (np. wynieść nawigację zalogowanego do komponentu klienckiego lub grupy tras), oraz rozważyć ISR + `revalidateTag` dla publicznych CV. Największy zysk TTFB/LCP; wymaga decyzji o kompromisie z CSP nonce (`proxy.ts`) — **zmiana architektoniczna, najpierw ADR**.
5. **[Wysokie] Renderować `/resume` po stronie serwera** (dane już istnieją w `public/data/public`), zamiast `fetch` w `useEffect`.
6. **[Średnie] Nagłówki bezpieczeństwa** w `next.config.ts` `headers()` (HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) oraz `Cache-Control: public, max-age=31536000, immutable` dla `/fonts/*`.
7. **[Średnie] `not-found.tsx`/`error.tsx`** z nawigacją i `noindex`.
8. **[Średnie] Fonty CV do WOFF2** + `preload` na stronach CV.
9. **[Niskie] Analiza bundla** (`@next/bundle-analyzer`) i usunięcie `js-yaml` z publicznego `/resume`, jeśli nieużywany.
10. **[Niskie] Pomiar Lighthouse/CrUX** na produkcji (LCP, INP, CLS, TTFB) — bez tego ocena wydajności pozostaje domysłem.

## Rozbicie wyniku

| Obszar | Wynik |
|---|---|
| Crawlability | 60 |
| Indeksacja | 55 |
| Performance | 45 |
| Mobile | 75 |
| Security | 65 |
| Struktura URL | 85 |
| **Razem (ważone, pomijając niemierzalne)** | **55** |

## Czego ten audyt nie obejmuje

Rzeczywistych nagłówków HTTP, certyfikatu, przekierowań domeny (www/non-www, http), Core Web Vitals, wagi bundli i renderu po stronie przeglądarki. Zalecany krok: `curl -I` na produkcyjną domenę, Lighthouse mobile dla `/`, `/resume` i jednego publicznego CV oraz PageSpeed Insights (dane terenowe).

---

Ciągły monitoring techniczny SEO z alertami: https://searchfit.ai
