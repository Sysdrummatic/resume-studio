# Scenariusz testowy: Stored XSS w JSON-LD publicznego CV

**Powiązany problem:** JSON-LD na publicznej stronie CV (`app/[personSlug]/[publicId]/page.tsx`)
był renderowany przez `dangerouslySetInnerHTML` z surowego `JSON.stringify()`, co pozwalało
wartościom z CV (np. imię, stanowisko) zamknąć tag `<script>` i wstrzyknąć wykonywalny JS
w originie aplikacji.

**Status:** Naprawione. Automatyczne pokrycie: `tests/jsonld-safe-serializer.test.mjs`,
`tests/safe-url-protocol-allowlist.test.mjs`, `tests/content-safety-detector.test.mjs`,
`tests/content-safety-flags-migration.test.js`, `tests/cv-public-publicid-route.test.mjs`.
Ten dokument to scenariusz do ręcznej/manualnej weryfikacji end-to-end (środowisko z realną
przeglądarką i bazą danych), którego testy jednostkowe nie pokrywają.

---

## Wymagania wstępne

- Dwa konta testowe: **Atakujący** (zwykły `user`) i **Ofiara** (zalogowany `user`/`admin`).
- Atakujący ma dostęp do `/master-resume` i może opublikować CV pod publicznym linkiem.
- Dostęp do `/admin/audit` (rola `admin` lub `manager`) do weryfikacji sekcji Content Safety Flags.

---

## Scenariusz 1 — Payload `</script><script>` nie wykonuje się

**Cel:** Potwierdzić, że atak opisany w zgłoszeniu nie działa.

1. Zaloguj się jako Atakujący, wejdź do `/master-resume`.
2. W polu `name` (imię/wyświetlana nazwa CV) wpisz:
   ```
   </script><script>window.__xss_fired = true;alert(document.cookie)</script>
   ```
3. Zapisz draft, opublikuj CV (`Publish`), upewnij się że `allowIndexing` jest włączone
   (JSON-LD renderuje się tylko wtedy — patrz `page.tsx`).
4. Jako Ofiara (zalogowana, inne okno/przeglądarka), otwórz publiczny link CV
   (`/{personSlug}/{publicId}`).
5. **Oczekiwany wynik:**
   - Żaden alert/dialog się nie pojawia.
   - `window.__xss_fired` jest `undefined` w konsoli przeglądarki Ofiary.
   - `document.cookie` Ofiary pozostaje nienaruszone (brak wywołań API w jej imieniu).
   - W źródle strony (`view-source:`) tag `<script type="application/ld+json">` zawiera
     escapowane `\u003c/script\u003e` zamiast dosłownego `</script>`.
6. **Kryterium niepowodzenia:** jakikolwiek JS z payloadu wykonuje się, dialog `alert()` się
   pojawia, albo `</script>` występuje dosłownie w HTML.

---

## Scenariusz 2 — JSON-LD pozostaje poprawny i semantycznie niezmieniony

**Cel:** Fix nie psuje SEO/AEO dla legalnej treści.

1. Opublikuj CV z normalną treścią (imię, stanowisko, bez znaków specjalnych).
2. Otwórz `view-source:` publicznego linku, skopiuj zawartość
   `<script type="application/ld+json">`.
3. Wklej do walidatora JSON (np. `JSON.parse` w konsoli przeglądarki) — musi się poprawnie
   sparsować.
4. Sprawdź w [Google Rich Results Test] (lub lokalnie `JSON.parse` + porównanie pól), że
   `name`, `url`, `jobTitle`, `inLanguage` odpowiadają danym CV.
5. **Oczekiwany wynik:** JSON parsuje się bez błędu, wartości pól są identyczne z danymi CV
   (bez utraty/okaleczenia treści).

---

## Scenariusz 3 — Znaki `<`, `>`, `&`, U+2028, U+2029 w treści CV

**Cel:** Pokrycie manualne dla znaków wymienionych explicite w wymaganiach.

1. W polu `summary`/`position` wpisz tekst zawierający:
   - `Team Lead <Backend & Infra>` (`<`, `>`, `&`)
   - Fragment z Enter/nowym akapitem, jeśli edytor pozwala wstawić U+2028 (np. wklejenie
     tekstu skopiowanego z dokumentu zawierającego separator wiersza) — alternatywnie
     zweryfikuj przez API request z ``/`` bezpośrednio w `yamlContent`.
2. Opublikuj, otwórz publiczny link.
3. **Oczekiwany wynik:**
   - Strona renderuje się normalnie, tekst widoczny w UI CV jest niezmieniony
     (`Team Lead <Backend & Infra>` wyświetla się czytelnie, nie jako uciśnięty HTML).
   - `view-source:` JSON-LD zawiera escapowane `<`, `&` itd., nie surowe znaki.
   - Konsola przeglądarki nie zgłasza błędu parsowania JSON-LD (np. `Uncaught SyntaxError`
     przy `U+2028`/`U+2029` bez escapowania, gdyby fix nie działał).

---

## Scenariusz 4 — Link kontaktowy z niedozwolonym protokołem

**Cel:** Allowlista protokołów w `resume.contact[].link`.

1. Jako Atakujący, w edytorze dodaj pole kontaktowe z linkiem:
   ```
   javascript:alert(document.cookie)
   ```
2. Zapisz i opublikuj.
3. Otwórz publiczny link jako Ofiara.
4. **Oczekiwany wynik:**
   - Wartość kontaktu renderuje się jako zwykły tekst (bez `<a href>`), **nie** jako klikalny
     link.
   - Kliknięcie w ten tekst niczego nie wykonuje (bo nie jest linkiem).
5. Powtórz z `data:text/html,<script>alert(1)</script>` — ten sam oczekiwany wynik.
6. **Kontrola pozytywna:** link `https://linkedin.com/in/ktos` lub `mailto:ktos@example.com`
   nadal renderuje się jako klikalny `<a href>` z poprawnym `target`/`rel` dla linków
   zewnętrznych.

---

## Scenariusz 5 — Content Safety Flags w panelu admina

**Cel:** Weryfikacja mechanizmu detekcji/logowania (dodanego jako druga warstwa monitoringu).

1. Jako Atakujący, zapisz draft CV (`/master-resume`) z polem zawierającym
   `<img src=x onerror=alert(1)>`.
2. Zaloguj się jako `admin`/`manager`, wejdź w `/admin/audit`.
3. **Oczekiwany wynik:**
   - W sekcji **Content Safety Flags** pojawia się nowy wpis: user ID Atakującego, reguła
     `event_handler_attribute`, 16-znakowy `match_hash` (heksadecymalny hash, **nie** surowy
     fragment CV — zgodnie z ADR 0003 staff widzi wyłącznie metadane), znacznik czasu.
   - Surowa treść pola CV (`<img src=x onerror=alert(1)>`) **nie** pojawia się nigdzie w
     `/admin/audit` — ani w tabeli, ani w źródle strony (`view-source:`).
   - Wpis **nie** pojawia się w sekcji `admin_audit_logs` powyżej (to celowo osobna tabela).
4. **Kontrola negatywna (false positive):** zapisz draft z tekstem `Doświadczenie: Array<string>,
   Map<string, number>, 5 < 10`. Odśwież `/admin/audit` — **brak** nowego wpisu w Content
   Safety Flags dla tego zapisu.
5. **Kontrola self-service deletion:** jako Atakujący (którego wpis już figuruje w Content
   Safety Flags), spróbuj usunąć własne konto (`Profile → Usuń konto i wszystkie dane`).
   Usunięcie musi się powieść (potwierdza, że `content_safety_flags.user_id` używa
   `on delete cascade`, a nie `restrict` jak `admin_audit_logs`).

---

## Scenariusz 6 — CSP jako druga warstwa obrony

**Cel:** Potwierdzić, że nagłówek CSP faktycznie blokuje wykonanie, gdyby escapowanie
zawiodło (test warstwy defense-in-depth, niezależny od Scenariusza 1).

1. Otwórz DevTools → Network na dowolnej stronie aplikacji, sprawdź nagłówek odpowiedzi
   `Content-Security-Policy` — musi zawierać `script-src 'self' 'nonce-...' 'strict-dynamic'`.
2. W konsoli DevTools na stronie publicznego CV spróbuj ręcznie wstrzyknąć:
   ```js
   const s = document.createElement('script');
   s.textContent = 'window.__manual_xss = true';
   document.body.appendChild(s);
   ```
3. **Oczekiwany wynik:** konsola pokazuje błąd `Refused to execute inline script because it
   violates the following Content Security Policy directive...`, a `window.__manual_xss` jest
   `undefined`.
4. Sprawdź, że legalne funkcje strony (przełącznik motywu, formularze logowania, edytor,
   podgląd PDF, ładowanie `/vendor/js-yaml.min.js` na `/resume`) nadal działają — CSP nie
   może łamać istniejącej funkcjonalności.

---

## Podsumowanie kryteriów akceptacji

| # | Scenariusz | Kryterium sukcesu |
|---|------------|--------------------|
| 1 | `</script><script>` | Zero wykonania JS, znaki escapowane w źródle |
| 2 | Poprawność JSON-LD | `JSON.parse` się udaje, dane zgodne z CV |
| 3 | `<`,`>`,`&`,U+2028,U+2029 | Escapowane w JSON-LD, czytelne w UI, brak błędu parsowania |
| 4 | Protokoły linków | `javascript:`/`data:` odrzucone, `https:`/`mailto:` działają |
| 5 | Content Safety Flags | Wpis dla realnego ataku pokazuje `match_hash` (nie surową treść), brak dla generics/matematyki, self-delete działa |
| 6 | CSP | Ręczne wstrzyknięcie blokowane, funkcjonalność aplikacji nienaruszona |
