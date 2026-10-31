# Koncepcja indeksowania i noindex dla całego serwisu (T20, #237)

Status: propozycja do akceptacji. Ten dokument nie zmienia kodu. Decyzje oznaczone jako **do decyzji** wymagają akceptacji właściciela produktu przed wdrożeniem.

Podstawa: inwentarz tras [robots-inventory.md](robots-inventory.md) (stan po T05, #222) oraz kod: `app/robots.ts`, `app/sitemap.ts`, `app/lib/seo-metadata.ts`, `app/[personSlug]/[publicId]/page.tsx`, `app/login/page.tsx`.

## 1. Stan obecny

Indeksowanie jest sterowane dwoma mechanizmami, które działają równolegle:

- **`robots.txt`** (`app/robots.ts`) blokuje crawlowanie: `/api/`, `/dashboard`, `/admin`, `/master-resume`, `/user`, `/onboarding`, `/settings`. Reszta jest dozwolona.
- **Meta `robots`** na poziomie strony ustawia `index`/`noindex` (helper `publicPageMetadata()`).

Wynik dla kluczowych tras:

| Trasa | Robots.txt | Meta | Uwaga |
| --- | --- | --- | --- |
| `/`, `/resume`, `/privacy`, `/terms` | dozwolona | `index, follow` | zgodnie z inwentarzem |
| `/docs` i tutoriale publiczne | dozwolona | `index, follow` | ukryte artykuły dla anonima mają `noindex` |
| `/login` | dozwolona | `index, follow` lub `noindex, nofollow` przy ograniczonej rejestracji | warianty `?mode=`, `?reason=` kanonizowane do `/login` |
| `/cv-templates` | dozwolona | `noindex, nofollow` | nie jest w `robots.txt` celowo: crawler musi zobaczyć `noindex` |
| `/{personSlug}/{publicId}` | dozwolona | `index` tylko gdy `allowIndexing`, inaczej `noindex` | decyzja per link (ADR 0008) |
| `/user`, `/settings`, `/onboarding` | zablokowana | `noindex, nofollow` | |
| `/dashboard`, `/admin`, `/master-resume` | zablokowana | brak `noindex` w meta | patrz pkt 3 |

Dodatkowo `allowIndexing` przechodzi przez `resolveEffectiveAllowIndexing`, a sitemap zawiera tylko linki, które są indeksowalne (`fetchIndexablePublicLinksForSitemap`).

## 2. Problemy

1. **Brak `noindex` na chronionych stronach `/dashboard`, `/admin`, `/master-resume`.** Są zablokowane w `robots.txt`, więc Google nie je pobierze. Jeśli jednak trafią do indeksu przez linki zewnętrzne, wynik może być pusty albo wyświetlić tytuł bez treści. Blokada w `robots.txt` nie usuwa URL-i z indeksu, a `noindex` działa tylko wtedy, gdy crawler może stronę pobrać. Dlatego nie wolno dodać `Disallow` i `noindex` do tej samej trasy jednocześnie bez ustalenia kolejności.
2. **Niespójność dwóch źródeł prawdy.** Część tras jest blokowana w `robots.txt`, część ma `noindex` w meta, a część ma oba. Nowa trasa nie ma reguły, którą można sprawdzić jednym testem.
3. **Dokumentacja wspomina o wstrzymanym indeksowaniu CV.** `CLAUDE.md` mówi, że wszystkie publiczne CV są `noindex` przy wyłączonej fladze `public_cv_indexing_enabled`. Kod ma tę logikę, ale koncepcja i inwentarz powinny być z nią zgodne.

## 3. Opcje

**Opcja A: zostawić obecny model.** Bez zmian w kodzie. Zaleta: zero ryzyka. Wada: problem z pkt 1 i 2 pozostaje.

**Opcja B: jedno źródło prawdy dla tras prywatnych.** Chronione strony dostają `noindex, nofollow` w meta (bez zmiany w `robots.txt`, żeby crawler mógł je zobaczyć). Pozostają w `robots.txt` tylko `/api/`. Zaleta: jedna zasada, zgodna z Google. Wada: crawler będzie pobierał strony przekierowujące na logowanie.

**Opcja C: pełna lista dozwolonych tras.** `robots.txt` pozwala tylko na jawną listę publicznych tras, reszta jest blokowana. Meta pozostaje do stron publicznych. Zaleta: domyślnie zamknięte, nowe trasy są prywatne. Wada: każda nowa publiczna strona wymaga zmiany w liście, a `/{personSlug}/{publicId}` nie da się opisać statycznie.

**Rekomendacja: opcja B** dla tras prywatnych, z testem kontraktowym, który sprawdza, że każda trasa z `PRIVATE_PATHS` ma `noindex` w meta. Opcja C jest bezpieczniejsza, ale kosztuje utrzymanie listy, a ryzyko z pkt 1 jest niskie, bo strony chronione nie zawierają treści bez sesji.

## 4. Decyzje do podjęcia

- **Do decyzji:** czy zastosować opcję B, C czy A.
- **Do decyzji:** czy `/login` ma być indeksowany, gdy rejestracja jest otwarta. Obecnie tak.
- **Do decyzji:** czy publiczne CV mają być indeksowalne po włączeniu flagi `public_cv_indexing_enabled`, czy zostają `noindex` na stałe. Decyzja wpływa na ADR 0001 i 0005.

## 5. Plan wdrożenia po akceptacji

1. Wyrównać `PRIVATE_PATHS` w `app/robots.ts` z trasami, które mają `noindex` w meta (opcja B).
2. Dodać `noindex, nofollow` do `/dashboard`, `/admin`, `/master-resume` przez `publicPageMetadata()` lub bezpośrednio w `metadata`.
3. Test kontraktowy: każda trasa z listy prywatnej ma `noindex`, każda publiczna z `index` ma wpis w sitemap.
4. Zaktualizować [robots-inventory.md](robots-inventory.md) i `CLAUDE.md`, żeby opisy zgadzały się z kodem.

## 6. Poza zakresem tego dokumentu

- Weryfikacja w Google Search Console i Bing Webmaster Tools (#234).
- Ponowny pomiar widoczności (#236).
- Zmiany w RLS i w fladzie `public_cv_indexing_enabled` w bazie.
