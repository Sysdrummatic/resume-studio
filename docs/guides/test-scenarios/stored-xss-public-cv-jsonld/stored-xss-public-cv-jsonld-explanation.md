Zagrożenie

Publiczna strona CV (app/[personSlug]/[publicId]/page.tsx) generowała dane strukturalne JSON-LD (do SEO/Google) i wstrzykiwała je bezpośrednio do HTML przez dangerouslySetInnerHTML, używając surowego JSON.stringify():

<script type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(publicResumeJsonLd) }} />

Problem: JSON.stringify() nie escapuje znaku <. JSON-LD zawiera dane z CV użytkownika (imię, stanowisko), które są w pełni kontrolowane przez tego, kto publikuje CV.

Scenariusz ataku: Ktoś ustawia sobie w CV imię na </script><script>alert(document.cookie)</script>. To zamyka tag <script type="application/ld+json"> przedwcześnie i otwiera nowy, prawdziwy, wykonywalny <script>. Gdy zalogowany użytkownik (np. rekruter, admin) otworzy to opublikowane CV, złośliwy JS wykona się w kontekście aplikacji OpenCiVera. Auth cookies są HttpOnly, więc skrypt nie odczyta ich wartości bezpośrednio (stąd document.cookie w przykładzie realnie zwróciłby niewiele) — ale może wykonywać uwierzytelnione żądania same-origin w imieniu tego użytkownika, bo przeglądarka automatycznie dołącza cookies do każdego żądania (np. usunięcie danych, zmiana uprawnień). To klasyczny stored XSS.

Co zrobiłem

1. Naprawa źródła problemu (app/lib/jsonld.ts)
Nowa funkcja safeJsonLdScript() — zamiast surowego JSON.stringify, escapuje <, >, &, U+2028, U+2029 do postaci \uXXXX. Wynik jest nadal poprawnym JSON-em (te escape'y \u003c itd. JSON.parse odczytuje identycznie jak oryginalny znak), ale fizycznie nie może zawierać sekwencji </script>.

2. Sprawdzenie innych miejsc w tej samej ścieżce renderowania
Znalazłem drugi problem: resume.contact[].link (link kontaktowy z CV, np. strona www/LinkedIn) był renderowany jako href bez żadnej walidacji protokołu — użytkownik mógł tam wpisać javascript:.... Dodałem app/lib/safe-url.ts z allowlistą protokołów (http:, https:, mailto:, tel:) — wszystko inne (javascript:, data: itd.) jest odrzucane, link renderuje się wtedy jako zwykły tekst.

3. Testy regresyjne
Dodałem testy jednostkowe sprawdzające dokładnie payload </script><script>alert(1)</script>, pojedyncze znaki <, >, &, oraz U+2028/U+2029 — każdy test potwierdza, że po escapowaniu JSON nadal parsuje się do oryginalnej wartości (czyli nic się nie psuje semantycznie), a jednocześnie niebezpieczne sekwencje znikają z wygenerowanego HTML.

4. Druga warstwa obrony — CSP (na Twoją prośbę, dodatkowo)
Dodałem nagłówek Content-Security-Policy z script-src 'self' 'nonce-...' 'strict-dynamic' w proxy.ts (Next.js middleware). To nie jest naprawa samego problemu — to siatka bezpieczeństwa na wypadek, gdyby w przyszłości ktoś dodał podobny błąd gdzie indziej: nawet jeśli atakujący wstrzyknie <script>, przeglądarka odmówi go wykonać, bo nie ma poprawnego nonce'a.

Wynik

- Payload </script><script>...</script> nie jest już w stanie wykonać się jako JS.
- JSON-LD nadal poprawnie renderuje się dla Google/SEO (semantyka bez zmian).
- Linki z CV przechodzą przez allowlistę protokołów.
- npm run lint, npm run typecheck, npm test (316/316) oraz npm run build — wszystko przechodzi.
- CSP działa jako dodatkowa warstwa, nie jako substytut naprawy.