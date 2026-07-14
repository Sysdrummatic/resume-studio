# Scenariusze testowe — Faza G (Hardening & Launch Readiness)

Zakres: tylko funkcje w pełni wdrożone (Fazy A–F + role inheritance). Każda rola ma sekcję **A. Techniczne** (RBAC, RLS, granice API, infrastruktura) i **B. Produktowe** (realny flow użytkownika, klik-po-kliku).

Powiązane dokumenty: [Deployment and QA Checklist](../testing/deployment-qa.md).

---

## 0. Przygotowanie środowiska testowego

Potrzebujesz 4 kont testowych — jedno na rolę.

1. Zarejestruj 4 konta przez `/login` (Sign up) z osobnymi, działającymi adresami e-mail (np. aliasy Gmail `+user`, `+recruiter`, `+manager`, `+admin`). Każde domyślnie dostaje rolę `user`.
2. Zweryfikuj e-mail każdego konta (link z maila).
3. Pierwsze konto ustaw na `admin` ręcznie w Supabase (SQL Editor):
   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'twoj-admin@example.com');
   ```
4. Zaloguj się jako admin → menu konta (avatar w prawym górnym rogu) → **User management** → `/admin`.
5. W tabeli użytkowników w kolumnie **Role** zmień rolę dla konta 2 na `manager`, dla konta 3 na `recruiter`, konto 4 zostaw jako `user`.
6. Zweryfikuj zapisanie zmian (odśwież listę).

Zalecana kolejność testów: **User → Recruiter → Manager → Admin** — pozwala naturalnie zbudować dane testowe (CV, publikacje) przed przejściem do scenariuszy administracyjnych operujących na tych kontach.

---

## 1. USER (rola bazowa)

### A. Scenariusze techniczne

**T-U1 — Rejestracja i logowanie**

1. `/login` → zakładka Sign up → wpisz e-mail + hasło → Sign up.
2. Otwórz skrzynkę, kliknij link weryfikacyjny.
3. Wróć na `/login`, zaloguj się tymi danymi → oczekiwany redirect na `/dashboard`.
4. Kliknij **Log out** w menu konta → oczekiwany powrót do strony publicznej/`/login`.
5. Zaloguj się ponownie tymi samymi danymi → ponowny redirect na `/dashboard`.

Oczekiwany rezultat: pełny cykl bez błędów, brak dostępu przed weryfikacją e-maila.

**T-U2 — Ochrona trasy `/admin`**

1. Będąc zalogowanym jako `user`, w pasku adresu wpisz bezpośrednio `/admin`.

Oczekiwany rezultat: brak dostępu (redirect lub 403) — `user` nie ma `admin.area.access`.

**T-U3 — Brak "User management" w menu**

1. Kliknij avatar (menu konta).

Oczekiwany rezultat: widoczne tylko **Profile**, **Settings** (disabled), **Log out** — brak pozycji **User management**.

**T-U4 — Nieaktywne konto**

1. (Wykonaj po T-A* z poziomu admina) Po dezaktywacji tego konta przez admina, spróbuj się zalogować lub odśwież `/dashboard`.

Oczekiwany rezultat: brak dostępu do chronionych tras dla nieaktywnego konta.

**T-U5 — Izolacja danych (brak `resume.content.read_other`)**

1. Otwórz devtools → Network, podczas pracy w `/master-resume` zaobserwuj zapytania do `/api/resume/document`, `/api/resume/presets`, `/api/resume/languages`.
2. Spróbuj odtworzyć jedno z tych zapytań (np. w konsoli `fetch`) z parametrem wskazującym na ID innego użytkownika (jeśli endpoint przyjmuje jakikolwiek identyfikator docelowy).

Oczekiwany rezultat: API ignoruje/odrzuca jakikolwiek "target user id" — wynik zawsze ograniczony do zalogowanego aktora (403 lub dane tylko własne).

---

### B. Scenariusze produktowe (kanoniczny pełny flow)

**P-U1 — Personal Hub (`/user`)**

1. Przejdź do `/user`.
2. Kliknij ikonę **+** przy bio → wpisz krótki opis → zapisz.
3. Sprawdź panel **Insights**: liczniki **Variants** i **Public** odpowiadają liczbie Saved Versions / opublikowanych wersji.
4. Kliknij **Edit Master Resume** → oczekiwane przejście na `/master-resume`.
5. Wróć, kliknij **Manage CV Versions** → oczekiwane przejście na `/dashboard`.

**P-U2 — Edytor Master Resume (`/master-resume`)**

1. Sprawdź układ: formularz po lewej, **live preview** po prawej.
2. Zmień pole (np. tytuł stanowiska) w formularzu → sprawdź, że preview aktualizuje się na żywo.
3. W sekcji **Courses** kliknij **+ Add** → wypełnij Year/Course name → kliknij **Remove** na innym wpisie.
4. Sprawdź, że usunięcie/dodanie odzwierciedla się w live preview.

**P-U3 — Wersje językowe**

1. W nagłówku edytora zobacz badge **EN** + ikonę **+**.
2. Kliknij **+** → otworzy się modal **Add language version**.
3. Wpisz: Code = `pl`, Language name = `Polski`, Short label = `PL` → zapisz.
4. Oczekiwany rezultat: nowy badge **PL** pojawia się po prawej od EN, bez przeładowania strony.
5. Kliknij badge **PL** → edytor przełącza się na dokument PL (osobna treść, niezależna od EN).
6. Wprowadź inną treść w PL, przełącz z powrotem na EN → potwierdź, że treści są niezależne.

**P-U4 — Draft (save/restore/clear)**

1. Zmień dane w formularzu (bez publikacji).
2. Znajdź akcję **Save draft** (jeśli widoczna w UI) → zapisz.
3. Odśwież stronę → użyj **Restore draft** → sprawdź, że zmiany wróciły.
4. Użyj **Clear draft** → sprawdź, że draft zniknął, a edytor wraca do ostatniej opublikowanej/zapisanej wersji.

**P-U5 — Publikacja, rewizje i rollback**

1. Przejdź do sekcji **Publish**: wpisz tekst w **Change note**.
2. Zaznacz/odznacz **Allow indexing**.
3. Pozostaw odznaczone **Mark as AI generated**.
4. Kliknij **Save unpublished** → sprawdź toast "Unpublished version saved." i że dokument NIE staje się publiczny.
5. Zmień coś w treści, wpisz nowy **Change note**, kliknij **Publish and create revision** → sprawdź toast "Resume published. New revision created."
6. Przejdź do sekcji **Revision history** → potwierdź, że na liście pojawiła się nowa pozycja `Revision #N` z wpisanym change note i znacznikiem czasu.
7. Wprowadź kolejną zmianę i opublikuj (Revision #N+1).
8. Kliknij **Rollback** na Revision #N → sprawdź toast "Rollback complete." i że formularz/preview wrócił do treści z Revision #N.

**P-U6 — Saved Versions / Public Link management (w edytorze)**

1. W sekcji **Saved Versions and public links** znajdź swoją wersję.
2. Sprawdź badge **Private** + **Noindex** (stan domyślny).
3. Kliknij **Publish** → w modalu **PublishSavedVersionModal** zaznacz języki (np. EN i PL), wybierz **default locale** = EN, zaznacz **Allow indexing**.
4. Zapisz → sprawdź zmianę badge na **Published** + **Indexable**.
5. Sprawdź, że pojawiły się przyciski **Open public CV** i **Copy public URL**.
6. Kliknij **Copy public URL** → sprawdź feedback (toast/sukces).
7. Kliknij **Open public CV** → w nowej karcie powinien otworzyć się **canonical URL** w formacie `/{person-slug}/{public-id}` (nie `/r/[slug]`).
8. Na opublikowanej stronie sprawdź: dane zgodne z opublikowaną rewizją, dostępny **language switcher** EN/PL, meta `index,follow` (widok źródła strony lub devtools → `<meta name="robots">`).

**P-U7 — Niezmienność snapshotu po publikacji**

1. Po P-U6, wróć do edytora i zmień treść CV (np. inny tytuł stanowiska) **bez ponownej publikacji**.
2. Odśwież publiczny URL z kroku P-U6.7.

Oczekiwany rezultat: publiczna strona wciąż pokazuje **starą** (opublikowaną) treść — draft nie wpływa na snapshot.

**P-U8 — Unpublish i zgodność edytor/dashboard**

1. W edytorze kliknij **Unpublish** na opublikowanej Saved Version.
2. Sprawdź toast "CV Version unpublished." i że badge wraca na **Private**, a przyciski **Open/Copy** znikają.
3. Odśwież publiczny URL z P-U6.7 → oczekiwany 404/not-found lub `noindex,nofollow`.
4. Przejdź do `/dashboard` → sprawdź, że ta sama Saved Version pokazuje identyczny stan (**Private**), bez rozjazdu między edytorem i dashboardem.
5. Z `/dashboard`, kliknij **Publish** ponownie (republikacja) → sprawdź, że stan w edytorze (po przejściu na `/master-resume`) jest zsynchronizowany.

**P-U9 — Eksporty**

1. Na opublikowanej Saved Version (edytor lub `/dashboard`) kliknij **ATS (TXT)** → sprawdź pobranie pliku `.txt` z treścią CV.
2. Kliknij **PDF** → sprawdź pobranie/wygenerowanie PDF.
3. Zweryfikuj w PDF: brak metadanych/etykiet, które nie powinny być widoczne (np. wewnętrzne notatki), poprawne sekcje i kolejność.

**P-U10 — Zarządzanie Saved Versions z `/dashboard`**

1. Na `/dashboard` kliknij **Open CV** na karcie Saved Version → otwiera się **PresetPreviewModal** z podglądem.
2. Kliknij **Edit** → otwiera się **PresetModal** (edycja metadanych wersji) → zmień nazwę/tytuł → zapisz.
3. Kliknij ikonę kosza (**Delete CV Version**) na innej (testowej) Saved Version → potwierdź w oknie `window.confirm` → sprawdź usunięcie z listy.

**P-U11 — Trasa kompatybilności**

1. Jeśli masz starszy link `/r/{slug}` (z migracji), otwórz go.

Oczekiwany rezultat: redirect do canonical `/{person-slug}/{public-id}`, bez błędów 404.

---

## 2. RECRUITER (parytet z `user`)

### A. Scenariusze techniczne

**T-R1 — Brak dostępu administracyjnego**

1. Zaloguj się jako recruiter, otwórz menu konta.

Oczekiwany rezultat: brak **User management**; wejście na `/admin` bezpośrednim URL → odmowa dostępu.

**T-R2 — Parytet z `user` dla zasobów własnych**

1. Wykonaj P-U2, P-U3, P-U5 (publikacja), P-U6 (public link) z konta recruiter.

Oczekiwany rezultat: identyczne zachowanie jak dla `user` — recruiter ma `resume.*_own` i `resume.language.*_own` na tych samych zasadach (RI-4: "Recruiter receives user-equivalent own resume/language behavior").

**T-R3 — Izolacja danych**

1. Powtórz T-U5 z kontem recruiter.

Oczekiwany rezultat: brak dostępu do CV innych użytkowników (w tym do CV admina/managera).

### B. Scenariusze produktowe

Pełny przebieg identyczny jak P-U1–P-U11 (User). Wystarczy przejść skrócony smoke:

1. Edycja Master Resume + live preview (P-U2).
2. Publikacja + rollback (P-U5).
3. Publish/Unpublish Saved Version + canonical URL (P-U6, P-U8).
4. Eksport ATS/PDF (P-U9).

Cel: potwierdzić, że recruiter nie ma żadnych ograniczeń względem `user` w warstwie produktowej.

---

## 3. MANAGER (user + ograniczony admin)

### A. Scenariusze techniczne

**T-M1 — Dostęp do panelu admina**

1. Zaloguj się jako manager, otwórz menu konta.

Oczekiwany rezultat: widoczna pozycja **User management** → prowadzi do `/admin` (manager ma `admin.area.access`).

**T-M2 — Widoczność listy użytkowników**

1. Na `/admin` przejrzyj tabelę użytkowników.

Oczekiwany rezultat: manager widzi **siebie + tylko konta `user`/`recruiter`** (nie widzi innych `manager`/`admin`, zgodnie z filtrowaniem "self + user/recruiter").

**T-M3 — Zarządzanie `user`/`recruiter`**

1. Dla wiersza z rolą `user` (testowe konto 4), w kolumnie **Role** otwórz dropdown.

Oczekiwany rezultat: dostępne opcje to tylko `user` i `recruiter` (manager nie może awansować na `manager`/`admin`).

2. Zmień rolę testowego `user` na `recruiter` i z powrotem na `user` → sprawdź toast "Role updated." i odświeżenie listy.
3. Kliknij **Activate/Deactivate** dla tego konta → sprawdź toast "Account status updated."
4. Kliknij **Delete** dla konta testowego (przygotuj dodatkowe konto-śmietnik, jeśli nie chcesz usuwać konta 4) → potwierdź `window.confirm` → sprawdź usunięcie.

**T-M4 — Brak uprawnień wobec `manager`/`admin` (włącznie z sobą)**

1. Na `/admin`, znajdź wiersz odpowiadający **własnemu kontu** (manager) — jeśli widoczny.

Oczekiwany rezultat: dropdown **Role** i przycisk **Delete** są **disabled** (manager nie może zmienić własnych uprawnień — `disableRoleInput`/`disableDelete` = true dla ról staff, gdy aktor nie ma `admin.users.role_write`).

2. Jeśli na liście widoczne jest konto admina (nie powinno być — patrz T-M2), sprawdź to samo.

**T-M5 — Audit logs (read)**

1. Na `/admin` kliknij **View Audit Logs**.
2. Po wykonaniu T-M3 (zmiana roli/statusu), odśwież `/admin/audit`.

Oczekiwany rezultat: nowe wpisy w logu audytu z poprawnym aktorem (manager), celem (target user) i typem akcji.

**T-M6 — Analytics (read)**

1. Na `/admin` sprawdź widżety statystyk (Users, Resumes, Public Links, Public Views).

Oczekiwany rezultat: liczby są widoczne i sensowne (manager ma `admin.analytics.read`).

### B. Scenariusze produktowe

Identyczne jak P-U1–P-U11 — manager zarządza własnym CV na takich samych zasadach jak `user`. Wystarczy skrócony smoke (jak w sekcji Recruiter, punkty 1–4).

---

## 4. ADMIN (pełna kontrola)

### A. Scenariusze techniczne

**T-A1 — Pełna lista i zarządzanie wszystkimi rolami**

1. Na `/admin` jako admin, sprawdź, że tabela zawiera **wszystkie 4 konta testowe** (w tym manager i innych adminów, jeśli istnieją).
2. Dla konta `manager`, otwórz dropdown **Role** → sprawdź, że dostępne są **wszystkie role** (`admin`, `manager`, `user`, `recruiter`).
3. Zmień rolę testowego `manager` na `user`, sprawdź toast i odświeżenie, następnie przywróć na `manager`.

**T-A2 — Usuwanie kont każdej roli + edge case self-delete**

1. Na koncie testowym (np. recruiter) kliknij **Delete** → potwierdź → sprawdź usunięcie.
2. **Edge case:** znajdź wiersz **własnego konta** (admin) na liście i sprawdź stan przycisku **Delete**.

Punkt kontrolny: zgodnie z logiką `canAssignRole`/`canDeleteTarget`, admin ma `admin.users.delete` globalnie — sprawdź, czy przycisk **Delete** dla własnego konta jest aktywny. Jeśli tak — **nie klikaj** (ryzyko usunięcia własnego konta), tylko odnotuj to jako potencjalny gap do zgłoszenia (czy backend ma dodatkową blokadę self-delete, czy nie).

**T-A3 — Audit logs po operacjach admina**

1. Po T-A1/T-A2, otwórz **View Audit Logs**.

Oczekiwany rezultat: każda operacja (zmiana roli, usunięcie) ma odpowiadający wpis z aktorem = admin.

**T-A4 — `resume.content.read_other` zablokowane nawet dla admina**

1. Powtórz T-U5 z kontem admina — spróbuj odpytać `/api/resume/document`, `/api/resume/presets` z parametrem wskazującym na innego użytkownika.

Oczekiwany rezultat: odmowa — zgodnie z ADR 0003, **żadna rola**, włącznie z adminem, nie ma odczytu prywatnej treści CV innych użytkowników przez owner-scoped API.

**T-A5 — Draft PDF (uprawnienie tylko dla admina)**

1. Na `/dashboard` kliknij **Open CV** na Saved Version (otwiera **PresetPreviewModal**).

Oczekiwany rezultat: jako admin widzisz opcję podglądu/eksportu **draft PDF** (`allowDraftPdf = actorRole === "admin"`).

2. Powtórz ten sam krok na koncie `user`/`recruiter`/`manager` (z wcześniejszych sekcji) → opcja draft PDF **nie powinna** być widoczna.

### B. Scenariusze produktowe

Identyczne jak P-U1–P-U11 dla własnego CV admina, plus dodatkowo:

**P-A1 — Draft PDF**

1. W **PresetPreviewModal** (krok T-A5) wygeneruj draft PDF dla niepublikowanej Saved Version i porównaj z PDF wersji opublikowanej (P-U9) — sprawdź, czy draft jest czytelnie oznaczony jako draft.

---

## 5. Granica uprzywilejowanych pól profilu (bezpośredni PostgREST)

Automatyczny scenariusz jest w
`tests/profile-privileged-fields-postgrest.test.mjs`. Uruchamiaj go wyłącznie przeciwko
lokalnemu lub jednorazowemu projektowi Supabase:

```powershell
$env:SUPABASE_RLS_TEST_URL = "http://127.0.0.1:54321"
$env:SUPABASE_RLS_TEST_ANON_KEY = "<local-anon-key>"
$env:SUPABASE_RLS_TEST_SERVICE_ROLE_KEY = "<local-service-role-key>"
npm.cmd run test:rls
```

Dla zdalnego, dedykowanego projektu testowego wymagane jest dodatkowo
`SUPABASE_RLS_TEST_ALLOW_REMOTE=true`. Test tworzy unikalne konta, usuwa własne logi
audytu i konta w `finally`; nie wolno kierować go do produkcji.

**T-PF1 — Owner allowlist (`user` i `recruiter`)**

1. Dla obu ról wyślij bezpośredni `PATCH /rest/v1/profiles?id=eq.<self>` osobno dla
   `role`, `is_active`, `is_test_user` i `is_ocv_staff`.
2. Potwierdź odmowę oraz brak zmiany wartości w bazie.
3. Wyślij PATCH własnego `bio` i potwierdź sukces.
4. Dla każdej z czterech ról wyślij PATCH bezpiecznego pola, np. `bio`, na profilu
   innego użytkownika. Potwierdź odmowę, brak zmiany celu i brak wpisu audytu.

**T-PF2 — Granice managera**

1. Potwierdź odmowę bezpośredniej zmiany własnych pól uprzywilejowanych.
2. Potwierdź odmowę bezpośredniego PATCH oraz RPC wobec celu `manager` i `admin`.
3. Potwierdź sukces `set_user_flag` wobec różnych celów `user` i `recruiter`.

**T-PF3 — Zatwierdzone operacje admina i audyt**

1. Potwierdź, że bezpośredni PATCH pól uprzywilejowanych admina jest odrzucony.
2. Wykonaj przez pojedyncze RPC zmianę roli, aktywności oraz obu typów flag na
   zatwierdzonych celach, a następnie potwierdź atomowy zapis wszystkich pól.
3. Dla każdej efektywnej zmiany potwierdź dokładnie odpowiadający wpis w
   `admin_audit_logs`, zawierający aktora, cel oraz poprzednią i nową wartość.
4. Potwierdź odmowę pojedynczych RPC oraz atomowego `update_user_privileges`
   wywołanych jako `service_role`.
5. Potwierdź odmowę i brak audytu dla nieprawidłowej roli, wartości `NULL` statusu,
   nieznanej flagi, wartości `NULL` flagi oraz nieistniejącego celu.
6. Potwierdź, że próba atomowej promocji celu `user`/`recruiter` przez managera do
   `manager` lub `admin` wycofuje również pozostałe pola żądania i nie tworzy audytu.

Oczekiwany rezultat: żadna z czterech ról nie może zmienić pola uprzywilejowanego przez
bezpośredni PATCH. Uprawnienia managera i admina działają wyłącznie przez chronione,
audytowane RPC.

---

## 6. Konto i bezpieczeństwo — usuwanie konta (self-service, GDPR Art. 17)

Sekcja dotyczy Danger Zone w modalu **Profile** (avatar → Profile → "Usuń konto i wszystkie dane"),
`DELETE /api/user/account` oraz path-independent triggera `prevent_last_admin_deletion()`
(`supabase/migrations/20260614_prevent_last_admin_deletion.sql`).

⚠️ **Operacje w tej sekcji są nieodwracalne** (kaskadowe usunięcie `auth.users` + wszystkich danych CV,
ADR 0016). Używaj **dodatkowych kont-śmietników**, nie kont 1–4 z sekcji 0 — z wyjątkiem T-D2/T-D3/P-D3,
które celowo operują na koncie admina i jego promocjach/usunięciach.

### A. Scenariusze techniczne

**T-D1 — Confirmation gating (type-to-confirm)**

1. Zaloguj się jako `user` (konto-śmietnik), otwórz menu konta → **Profile**.
2. W sekcji **Danger Zone** kliknij **Usuń konto i wszystkie dane** → pojawia się pole tekstowe.
3. Wpisz dowolny tekst różny od adresu e-mail konta → sprawdź, że przycisk **Usuń konto na zawsze** jest **disabled**.
4. Wpisz dokładny e-mail konta (case-insensitive) → przycisk staje się **enabled**.

Oczekiwany rezultat: przycisk usuwający jest zablokowany do momentu wpisania poprawnego adresu e-mail.

**T-D2 — Last-admin safeguard: 409 `last_admin`**

Warunek wstępny: w systemie istnieje **dokładnie jedno** konto `admin` (konto 1) oraz co najmniej jedno
inne konto (np. konto 4 `user`).

1. Zaloguj się jako admin (konto 1) → **Profile** → Danger Zone → wpisz e-mail → **Usuń konto na zawsze**.

Oczekiwany rezultat: `DELETE /api/user/account` zwraca `409 { error: "last_admin" }`; w UI pojawia się
inline komunikat "Promote another account to admin before deleting this one." — **sesja NIE jest
czyszczona**, brak przekierowania na `/login`. Konto admina wciąż istnieje (sprawdź `/admin`).

**T-D3 — Last-admin safeguard: 409 `only_account`**

Warunek wstępny: konto admina (konto 1) jest **jedynym profilem** w systemie (wykonaj przed
rejestracją kont 2–4, albo po ich wcześniejszym usunięciu).

1. Zaloguj się jako jedyny admin → Profile → Danger Zone → wpisz e-mail → **Usuń konto na zawsze**.

Oczekiwany rezultat: `409 { error: "only_account" }`, inline komunikat "Your account is the only
account in the system; deletion is blocked." — sesja nieczyszczona, brak przekierowania.

**T-D4 — Trigger DB jest path-independent (usunięcie ostatniego admina przez panel `/admin`)**

Warunek wstępny: dwa konta `admin` (konto 1 i konto 2, np. po promocji w T-A1).

1. Jako konto 1, na `/admin` znajdź wiersz konta 2 (drugi admin) i kliknij **Delete** → potwierdź
   `window.confirm`.

Oczekiwany rezultat: usunięcie się powodzi (konto 2 nie jest ostatnim adminem). Następnie, jako konto 1
(teraz jedyny admin), spróbuj usunąć **samo siebie** przez `/admin` (jeśli `canDeleteTarget` dopuszcza
self-target — patrz T-A2) lub przez Danger Zone (P-D3/T-D2) → trigger blokuje operację niezależnie od
ścieżki, z odpowiednim błędem zamiast 500/crasha.

### B. Scenariusze produktowe

**P-D1 — Self-service deletion, happy path (non-admin)**

1. Zarejestruj dodatkowe konto-śmietnik jako `user` (zweryfikuj e-mail, zaloguj się).
2. Profile → Danger Zone → wpisz e-mail → **Usuń konto na zawsze**.

Oczekiwany rezultat: redirect na `/login?reason=account_deleted`; ponowne logowanie tymi danymi jest
niemożliwe (konto nie istnieje). Jeśli skonfigurowano `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`, przychodzi
e-mail potwierdzający; jeśli nie — brak błędu (fail-open), odpowiedź zawiera `warning`.

**P-D2 — Powtórz P-D1 dla `recruiter` i `manager` (konta-śmietniki)**

Cel: potwierdzić, że self-service deletion działa identycznie dla wszystkich ról niż-admin (trasa nie
nakłada dodatkowych ograniczeń RBAC poza pochodzeniem z własnej sesji).

**P-D3 — Last-admin happy path (admin self-delete, gdy nie jest ostatni)**

1. Mając konto 1 (`admin`) i konto 2 (`manager`), zaloguj się jako konto 1 i awansuj konto 2 na `admin`
   (T-A1).
2. Wyloguj się, zaloguj jako konto 1 (wciąż `admin`, ale **nie ostatni**) → Profile → Danger Zone →
   wpisz e-mail → **Usuń konto na zawsze**.

Oczekiwany rezultat: usunięcie się powodzi (konto 1 nie jest `last_admin`), redirect na
`/login?reason=account_deleted`. Konto 2 zostaje jedynym adminem — zaloguj się jako konto 2 i sprawdź,
że `/admin` (lista użytkowników, audit logs) działa normalnie.

---

## Macierz pokrycia (skrót)

| Obszar | User | Recruiter | Manager | Admin |
|---|---|---|---|---|
| Auth + sesja | pełny | smoke | smoke | smoke |
| Edytor CV / wersje językowe / publikacja / rollback | pełny | smoke (parytet) | smoke (parytet) | smoke (parytet) |
| Public link / SEO / snapshot | pełny | smoke | smoke | smoke |
| Eksporty ATS/PDF | pełny | smoke | smoke | + draft PDF |
| `/admin` dostęp i zarządzanie | brak (test odmowy) | brak (test odmowy) | ograniczone (user/recruiter) | pełne (wszystkie role) |
| Audit logs | – | – | read | read + weryfikacja wpisów |
| Uprzywilejowane pola profilu (direct PATCH / RPC) | deny / deny | deny / deny | deny / ograniczone RPC | deny / pełne RPC |
| RLS / `resume.content.read_other` | test izolacji | test izolacji | test izolacji | test izolacji (incl. self) |
| Self-service usuwanie konta (Danger Zone) | pełny (P-D1) | smoke (P-D2) | smoke (P-D2) | + last-admin safeguard (T-D2–T-D4, P-D3) |
