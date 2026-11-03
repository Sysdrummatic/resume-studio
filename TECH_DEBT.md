# Tech debt

## Osierocona migracja `auth_signup_policy_and_staff_mfa` (tylko na `test`)

**Status (2026-10-03):** otwarte. Prod nie jest w pełni zgodny z test.

### Opis

W ledgerze projektu `test` jest migracja `20260718000000_auth_signup_policy_and_staff_mfa`.
Nie ma jej na `prod` ani pliku w `supabase/migrations/`. Zastosowano ją poza historią
migracji w repo, więc nie ma jej źródła.

Różnice na test względem prod:

- tabela `blocked_signup_email_domains`,
- funkcje `assert_staff_aal2()`, `current_session_aal()`, `hook_before_user_created()`,
- wywołanie `assert_staff_aal2()` w `set_user_role`, `set_user_active`, `set_user_flag`,
  `update_user_privileges` i `can_delete_user_account`,
- zmienione `handle_new_auth_user`, `is_last_admin`, `is_only_profile`,
  `prevent_last_admin_deletion`,
- inne definicje polityk `admin_full_*` na `public_links`, `resume_configurations`,
  `resumes`, `uploaded_files`,
- `content_safety_flags.document_id` jest `NOT NULL` na test, nullowalne na prod
  (na prod 0 wierszy z NULL).

### Wpływ

- **Prod:** brak, nic w aplikacji ani w testach nie odwołuje się do powyższych obiektów.
  Prod działa bez MFA/AAL2 i bez hooka `before_user_created`, zgodnie z CLAUDE.md
  ("Auth Boundary Hardening").
- **Test:** RPC administracyjne wymagają sesji AAL2, której aplikacja nie potrafi
  uzyskać. Testy staff/admin na test mogą dawać inny wynik niż na prod.
- **Odtwarzalność:** środowisko budowane z `supabase/migrations/` nie będzie miało tych obiektów.

### Dlaczego nie wypchnięto na prod

Na prod każda zmiana roli, aktywności lub flagi użytkownika wymagałaby sesji AAL2.
Aplikacja nie ma kodu MFA, więc admini straciliby możliwość zarządzania użytkownikami.

### Do zrobienia

Wybrać jedno:

1. **MFA wchodzi** (Phase M M03/M08): odtworzyć SQL z test do pliku w `supabase/migrations/`,
   dodać obsługę AAL2 w aplikacji, wypchnąć na prod razem z kodem.
2. **MFA nie wchodzi teraz:** wycofać migrację z test (usunąć obiekty i wpis w ledgerze),
   żeby test odpowiadał prod.

W obu przypadkach poprawić sekcję "Auth Boundary Hardening" w CLAUDE.md. Twierdzi ona,
że taka migracja nigdy nie istniała, a na test istnieje.

### Powiązane

- [Phase M — Security, Privacy, Trust](docs/phases/phase-m-security-privacy-trust.md)
- Dryf ledgera migracji test/prod (sekcja niżej): nazwy i wersje w ledgerze
  rozjeżdżają się z nazwami plików lokalnych.

---

Poniższe pozycje przeniesiono z CLAUDE.md (2026-10-03).

## Dryf ledgera migracji `test`/`prod` (stan z 2026-09-07)

Ledger na `test`/`prod` rozjechał się z lokalnymi nazwami plików `.sql`: część migracji
zastosowano bezpośrednio (np. przez MCP `apply_migration`), a nie przez `db push`.
`test` ma co najmniej jedną migrację bez lokalnego pliku (patrz wyżej).
`supabase db push` w tym stanie prawdopodobnie zawiedzie na konfliktach/duplikatach obiektów.

**Obejście:** nowe migracje stosować przez `mcp__supabase-test__apply_migration` /
`mcp__supabase-prod__apply_migration` (to samo SQL i ta sama nazwa na obu), do czasu
naprawy ledgera.

## Usunięcie konta: luki w `admin_audit_logs` (ADR 0016)

1. Wpis audytu `user.deleted` jest po cichu gubiony: `writeAdminAuditLog` działa po
   kaskadowym usunięciu i narusza FK `target_user_id`
   (`app/api/admin/users/[userId]/route.ts`).
2. Konta staffu (`actor_user_id` w dowolnym wierszu audytu) nie da się usunąć
   przez `ON DELETE RESTRICT`.
3. `DELETE /api/user/account`: `requireRequestActor()` nie ogranicza roli, więc
   admin/manager może wywołać trasę na własnym koncie. Jeśli było kiedykolwiek
   `actor_user_id` w `admin_audit_logs`, kaskadowe usunięcie zawiedzie na poziomie
   Postgresa (`ON DELETE RESTRICT`). RBAC temu nie zapobiega.

Status: nienaprawione.

## Dokumenty prawne: wymagają przeglądu prawnego

- `app/privacy/page.tsx`: tekst to szkic założyciela oparty na obecnym modelu danych
  (hosting Supabase EU i Netlify, brak śledzenia reklamowego), czeka na przegląd prawny.
- `app/terms/page.tsx`: sekcje 10 (Limitation of Liability) i 11 (Governing Law) to tekst
  zastępczy. Wymagają przeglądu prawnego, zanim usługa będzie miała płacących klientów
  lub znaczną bazę użytkowników. Nie sprawdzono ich pod kątem polskiego/unijnego prawa
  konsumenckiego.

## Auth Boundary Hardening (G-P0-04): brakujące elementy (stan z 2026-08-26)

Odroczone do [Phase M](docs/phases/phase-m-security-privacy-trust.md) M03/M08 jako
mniejsze ryzyko przy becie dla garstki zaproszonych testerów:

- Auth Hook `before_user_created` (`hook_before_user_created_enabled: false` na prod).
- Egzekwowanie MFA/AAL2 w aplikacji. TOTP po stronie Supabase jest już włączony na prod
  (`mfa_totp_enroll_enabled`/`verify_enabled: true`), brakuje wyłącznie kodu aplikacji.
- CAPTCHA (`security_captcha_enabled: false`, dostawca domyślnie `hcaptcha`, brak sekretu).
- `password_hibp_enabled` (ochrona przed wyciekłymi hasłami): próba przez Management API
  odrzucona z `402`, wymaga planu Pro.
- Weryfikator Disify jest **domyślnie włączony**: `isDisposableEmailAddress()`
  (`app/lib/disposable-email.ts`) woła `https://www.disify.com/api/email`, chyba że
  ustawiono `DISPOSABLE_EMAIL_CHECK_URL`. Nie ma lokalnej listy `DISPOSABLE_EMAIL_DOMAINS`.
  Śledzone w Phase M M08.

## Walidator "ta wartość wygląda niebezpiecznie" w edytorze

Pominięty w Phase G (G-P0-01) i odroczony do [Phase O](docs/phases/phase-o-opencv-standard.md)
(O02), żeby reguły zaprojektować raz w ramach standardu OpenCV, a nie doraźnie w aplikacji.

## Wersje językowe bez ID: dane, testy i odczyt starego kształtu

**Status (2026-10-11):** otwarte (ocv-0211, ADR 0024).

- **Istniejące dokumenty** zostały zmigrowane na `test` (2026-10-11, skrypt
  `scripts/migrate/parallel-language-versions.mjs`: usunięcie `entry_id`/`__ocv`, konwersja starego
  tekstowego `summary`, dopełnienie krótszych wersji pustymi slotami). **`prod` czeka**: backup
  `resume_documents`, dry-run, przegląd raportu, dopiero `--apply`. Do tego czasu czytnik akceptuje stary
  kształt, a każdy zapis go czyści; edytor blokuje zapis konta, którego wersje nie są równoległe, dopóki
  użytkownik nie użyje „Dopasuj”. Różnice, których skrypt nie naprawia (inne okresy lub szkoły w tłumaczeniu),
  są tylko w raporcie dry-runu. Schemat `ocv0211_backup` na `test` (kopie danych użytkowników) do usunięcia
  po akceptacji PR.
- **Odczyt starego kształtu** (`entry_id`, `__ocv` w dokumentach, rewizjach, snapshotach i paczkach
  eksportu) zostaje na stałe; `stripPrivateLinkage` w `published-export.ts` też.
- **Brak testu przeglądarkowego** nowych przepływów edytora (dodaj/usuń wpis i punkt we wszystkich
  wersjach, „Dopasuj” i wskaźnik procentowy, blokada zapisu). Poprzedni opt-in test
  (`editor-save-retry-browser`) dotyczył konfliktów legacy-pairing i został usunięty.
- **Brak testu** odmowy publikacji wersji CV przy niezgodnych wersjach (`publishResumePreset`,
  `409 parity`); pokrycie jest tylko dla importu, rollbacku i zmiany wersji domyślnej.
- **Edycja punktów w polu tekstowym** zmienia ich liczbę we wszystkich wersjach; gdy punktów ubywa,
  obcinany jest koniec listy w pozostałych wersjach (z potwierdzeniem, jeśli ma tam tekst), bo pole
  tekstowe nie mówi, która linia zniknęła.

## Edycja Bazy doświadczeń nie sygnalizuje nieaktualnego linku do LiveCV (stan z 2026-10-10)

**Status:** otwarte. Zakres [#214](https://github.com/Sysdrummatic/resume-studio/issues/214)
objął tylko edycję z poziomu wersji LiveCV ("Zaktualizuj LiveCV").

Opublikowany link czyta niezmienną migawkę, więc zmiana wpisu w Bazie doświadczeń
(Master CV), który jest w wyborze opublikowanej wersji, nie zmienia linku. Edycja tej
wersji zapisuje i aktualizuje link, ale sama edycja Bazy doświadczeń nie zostawia żadnego
śladu, że link jest starszy.

### Do zrobienia

Znacznik "zmiany nieopublikowane w linku" przy opublikowanej wersji, z przyciskiem
"Zaktualizuj". Wykrywanie: `published_at` linku starsze niż `updated_at` dokumentów
wybranych języków albo samej wersji (`resume_presets`, `resume_preset_variants`).
Prostsza wersja daje fałszywe alarmy przy edycji wpisu spoza wyboru. Dokładna wymaga
porównania YAML po zastosowaniu wyboru na surowym dokumencie (kontrakt R09). Nie publikować
automatycznie przy zapisie Bazy doświadczeń: szkic trafiłby od razu do publicznego linku.

## ADR 0001 mówi, że ponowna publikacja po wycofaniu tworzy nowy `public-id` (stan z 2026-10-10)

Migracja `20260604000000_reactivate_revoked_public_link_on_publish.sql` robi odwrotnie:
`publish_resume_saved_version` przywraca unieważniony link z tym samym `public_id`
(chroni test `tests/publish-republish-contract.test.mjs`). ADR 0001 (reguła 8 i PR4)
opisuje zachowanie sprzed tej migracji. Decyzja: poprawić ADR zgodnie z kodem albo
przywrócić regułę z ADR. Do rozstrzygnięcia przez właściciela produktu.

## Uprawnienia `anon` szersze niż potrzeba i wzorzec NULL w rolach RLS

**Status (2026-10-22):** punkty 1 i 3 otwarte, punkt 2 przejrzany. Wynika z [incydentu](docs/incidents/2026-10-21-anon-target-user-access.md).

### Opis

1. Rola `anon` ma na `test`/`prod` uprawnienia tabelowe wykraczające poza potrzeby aplikacji
   (np. `INSERT`/`DELETE` na `profiles`, `INSERT`/`UPDATE`/`DELETE` na tabelach CV). Jedyną barierą
   jest RLS. Do rozważenia: `revoke` nieużywanych uprawnień `anon` jako obrona w głąb.
2. ~~Funkcje ról nie były przeglądane pod kątem NULL.~~ Przegląd 2026-10-22: `is_admin_user`,
   `is_manager_user`, `is_staff_user` używają `coalesce`, `can_delete_user_account` i
   `require_onboarding_test_admin` zwracają fałsz/błąd dla NULL, `can_access_target_user` naprawiono
   2026-10-21. Nic więcej do poprawy w tym wzorcu.
3. **Dezaktywacja konta nie odcina sesji.** `profiles.is_active = false` sprawdza aplikacja
   (`requireRequestActor`) i RPC uprzywilejowane (`current_active_staff_role`), ale nie unieważnia
   refresh tokenu w Supabase Auth. Pomocniki RLS ignorowały to pole, więc dezaktywowany
   admin/manager z żywą sesją czytał wszystkie profile i logi audytu bezpośrednio przez PostgREST.
   Naprawione dla staff migracją `20261022000000_current_user_role_requires_active_account` (test w
   `tests/rls-cross-account-postgrest.test.mjs`). **Nadal otwarte:** zwykły dezaktywowany użytkownik
   zachowuje dostęp do *własnych* danych przez PostgREST, a sesja żyje do wygaśnięcia refresh
   tokenu. Pełne rozwiązanie: ban w Supabase Auth (`ban_duration` przez Admin API) przy
   dezaktywacji w `PATCH /api/admin/users/[userId]` i zdjęcie bana przy reaktywacji.

## Audyt autoryzacji `app/api/` (2026-10-22)

**Status:** wykonany; jeden wpis niskiego priorytetu otwarty.

Zakres: 35 tras. Każda trasa poza `auth/*` i publicznymi eksportami woła `requireRequestActor`
(sesja, zweryfikowany e-mail, konto aktywne, rola/capability). Trasy admina dodatkowo sprawdzają
`canAssignRole`/`canDeleteTarget`, a zmiany uprzywilejowane idą przez RPC z kontrolą w bazie
(`update_user_privileges`, `can_delete_user_account`). Żadna trasa nie przyjmuje właściciela z body ani
query (`userId` pochodzi z sesji). Zapytania service-role w `resume-server.ts` mają filtr `user_id`
z sesji albo dotyczą danych publicznych/globalnych; odczyty rewizji i aktualizacje dokumentów idą z tokenem
użytkownika (RLS). Znalezisko z tego audytu: dezaktywacja konta (sekcja wyżej, punkt 3).

**Otwarte, niski priorytet:** `ensureGlobalResumeLanguage` pozwala każdemu zalogowanemu dodać nowy wpis do
globalnego katalogu `resume_languages` (dowolny dwuliterowy kod, etykieta bez limitu długości). Istniejących
wpisów nie nadpisze, ale pierwszy autor ustala etykietę dla wszystkich. Do rozważenia: limit długości
etykiety i ograniczenie katalogu do listy dozwolonych kodów.

## Starsze tabele `resumes` i `public_links` czytelne dla `anon`

**Status (2026-10-21):** ZAMKNIĘTE tego samego dnia migracją `20261021010000_close_legacy_resume_tables_to_anon` (test i prod). Funkcje RPC domknięto dla `authenticated` migracją `20261021020000_close_legacy_rpc_to_authenticated`. Opis poniżej zostawiony jako historia; otwarte pozostaje tylko usunięcie starszego schematu po decyzji o danych. Pierwotnie: otwarte, znalezione w audycie powierzchni ataku `anon` (po incydencie
`can_access_target_user`). Zmierzone na `prod` jako rola `anon` (tylko odczyt):
`resumes` = 18 wierszy, `public_links` = 18, `get_public_resume_by_slug()` zwraca dane.

### Opis

- Polityki `resumes_select_public (is_public = true)` i `public_links_select_active`
  plus `SELECT` dla `anon` pozwalają każdemu z publicznym kluczem anon czytać starsze CV
  (`data`, `content_yaml`, `template_yaml`). Trigger `seed_user_master_resume` zakłada wiersz
  z `is_public = true` dla każdego konta, więc wszystkie 18 jest publicznych. Dziś są niemal puste
  (0 z imieniem w `data`, 1 z wpisami doświadczenia, `content_yaml` domyślny), ale to jest
  sprzeczne z ADR 0008 (dane master nigdy publicznie).
- Aplikacja nie używa już tych tabel ani funkcji `get_public_resume_by_slug`,
  `increment_public_link_view`, `get_admin_user_overview` (brak odwołań w `app/`).
  `increment_public_link_view` pozwala anonowi dowolnie zawyżać `view_count` starszych linków.
- Propozycja: osobna migracja — `revoke` wszystkich uprawnień `anon` na obu tabelach, usunięcie
  polityk `*_select_public/active`, `revoke execute` z `anon` na trzech funkcjach starszych (albo
  `drop` całego starszego schematu po decyzji o migracji danych). Wymaga przeglądu architektury.

### Wynik audytu `anon` (prod, 2026-10-21)

Bezpieczne dla anona (guard poprawnie zawodzi przy NULL): `log_admin_action`,
`get_admin_platform_stats`, `get_admin_user_overview`, `get_staff_user_overview`,
`can_delete_user_account`, `publish_/unpublish_resume_saved_version`, `update_own_profile`;
`rate_limit_counters`, `resume_onboarding*` bez dostępu. Zamknięte poprawką
`fail_closed_target_user_access`: `create_resume_revision` i `rollback_resume_document` (anon mógł
tworzyć rewizje i cofać dokumenty kont user/recruiter). Niski priorytet: `is_last_admin` i
`is_only_profile` działają dla anona jako wyrocznia „czy ten UUID to admin". Dotyczy też zalogowanych użytkowników (wywołują je jako `authenticated`).
