# Koncepcja indeksowania i noindex dla całego serwisu (T20, #237)

Status: opcja B zaimplementowana w kodzie PR #269. Scalenie PR i publikację na produkcji należy potwierdzić osobno w procesie wydania.

Podstawa: inwentarz tras [robots-inventory.md](robots-inventory.md) (stan po T05, #222) oraz kod: `app/robots.ts`, `app/sitemap.ts`, `app/lib/seo-metadata.ts`, `app/[personSlug]/[publicId]/page.tsx`, `app/login/page.tsx`.

## 1. Stan przed T20

Poniższy opis jest historycznym punktem wyjścia po T05 (#222), przed implementacją T20 w #269. Przyjętą politykę opisuje sekcja 4, a jej implementację sekcja 5.

Indeksowanie było sterowane dwoma mechanizmami działającymi równolegle:

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
| `/dashboard`, `/admin`, `/master-resume` | zablokowana | brak `noindex` w meta | stan sprzed T20 |

Dodatkowo `allowIndexing` przechodzi przez `resolveEffectiveAllowIndexing`, a sitemap zawiera tylko linki, które są indeksowalne (`fetchIndexablePublicLinksForSitemap`).

## 2. Problemy zidentyfikowane przed T20

1. **Brak `noindex` na chronionych stronach `/dashboard`, `/admin`, `/master-resume`.** Są zablokowane w `robots.txt`, więc Google nie je pobierze. Jeśli jednak trafią do indeksu przez linki zewnętrzne, wynik może być pusty albo wyświetlić tytuł bez treści. Blokada w `robots.txt` nie usuwa URL-i z indeksu, a `noindex` działa tylko wtedy, gdy crawler może stronę pobrać. Dlatego nie wolno dodać `Disallow` i `noindex` do tej samej trasy jednocześnie bez ustalenia kolejności.
2. **Niespójność dwóch źródeł prawdy.** Część tras jest blokowana w `robots.txt`, część ma `noindex` w meta, a część ma oba. Nowa trasa nie ma reguły, którą można sprawdzić jednym testem.
3. **Dokumentacja wspomina o wstrzymanym indeksowaniu CV.** `CLAUDE.md` mówi, że wszystkie publiczne CV są `noindex` przy wyłączonej fladze `public_cv_indexing_enabled`. Kod ma tę logikę, ale koncepcja i inwentarz powinny być z nią zgodne.

## 3. Opcje

**Opcja A: zostawić obecny model.** Bez zmian w kodzie. Zaleta: zero ryzyka. Wada: problem z pkt 1 i 2 pozostaje.

**Opcja B: jedno źródło prawdy dla tras prywatnych.** Chronione strony dostają `noindex, nofollow` w meta, a blokady tych stron są usuwane z `robots.txt`, żeby crawler mógł zobaczyć dyrektywę. Reguła `disallow` dla `User-agent: *` zawiera tylko `/api/`; osobna reguła dla botów AI pozostaje bez zmian. Zaleta: jedna zasada, zgodna z Google. Wada: crawler będzie pobierał strony przekierowujące na logowanie.

**Opcja C: pełna lista dozwolonych tras.** `robots.txt` pozwala tylko na jawną listę publicznych tras, reszta jest blokowana. Meta pozostaje do stron publicznych. Zaleta: domyślnie zamknięte, nowe trasy są prywatne. Wada: każda nowa publiczna strona wymaga zmiany w liście, a `/{personSlug}/{publicId}` nie da się opisać statycznie.

**Wybrana opcja: B** dla tras prywatnych, z testami kontraktowymi sprawdzającymi `noindex` na prywatnych stronach i brak blokad tych stron w ogólnej regule `robots.txt`. Opcja C jest bezpieczniejsza, ale kosztuje utrzymanie listy, a ryzyko z pkt 1 jest niskie, bo strony chronione nie zawierają treści bez sesji.

## 4. Decyzje

- **Podjęte:** opcja B, implementacja w #269: prywatne strony mają `noindex, nofollow`, a reguła `disallow` dla `User-agent: *` zawiera tylko `/api/`.
- **Podjęte:** `/login` pozostaje indeksowalny, gdy rejestracja jest otwarta. Przy ograniczonym dostępie dostaje `noindex, nofollow`, bez zmian w kodzie.
- **Podjęte:** publiczne CV pozostają `noindex`, dopóki flaga `public_cv_indexing_enabled` jest wyłączona. Decyzja nie wymaga zmian w ADR 0001 i 0005. Ponowne rozważenie wymaga osobnej decyzji właściciela produktu.

## 5. Zakres implementacji (#269)

Implementacja polityki jest dostarczana osobno w #269, opartym na tym PR dokumentacyjnym (#267):

1. `app/robots.ts`: ogólna reguła `disallow` zawiera tylko `/api/`; prywatne strony nie są blokowane.
2. `/dashboard`, `/admin`, `/master-resume`: metadata zawiera `noindex, nofollow`. Istniejące dyrektywy na `/user`, `/settings`, `/onboarding` i `/onboarding/test-cv/[runId]` pozostają.
3. `tests/robots-and-sitemap-contract.test.mjs` oraz `tests/private-routes-noindex.test.mjs`: kontrakty ogólnej reguły robots i metadanych prywatnych stron. Kontrakty sitemap pozostają bez zmian.
4. [robots-inventory.md](robots-inventory.md): inwentarz zgodny z kodem implementacji T20.

Kolejność scalenia: #267, potem #269. #268 zawiera wyłącznie poprawki mobilne i nie dostarcza tego dokumentu. Po scaleniu #267 bazę #269 należy ustawić na gałąź docelową #267. Wdrożenie produkcyjne następuje zgodnie z [runbookiem wydania](../runbooks/release-and-rollback.md); status PR nie jest potwierdzeniem deploya.

## 6. Poza zakresem tego dokumentu

- Weryfikacja w Google Search Console i Bing Webmaster Tools (#234).
- Ponowny pomiar widoczności (#236).
- Zmiany w RLS i w fladzie `public_cv_indexing_enabled` w bazie.
