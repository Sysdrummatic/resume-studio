# Instrukcja konfiguracji Supabase dla OpenCV Manager

## Krok 1: Utwórz projekt w Supabase

1. Wejdź na **https://supabase.com** i zaloguj się / utwórz konto
2. Kliknij **"New Project"**
3. Wybierz organizację, nazwij projekt (np. `opencv-manager`)
4. Ustaw hasło do bazy danych (zapisz je!)
5. Wybierz region najbliższy Twoim użytkownikom
6. Kliknij **"Create new project"** i poczekaj ~2 minuty

## Krok 2: Uruchom migrację bazy danych

1. W dashboardzie Supabase kliknij **"SQL Editor"** (ikona kodu po lewej)
2. Kliknij **"New Query"**
3. Skopiuj **całą zawartość** pliku `supabase-setup.sql` z tego projektu
4. Wklej do edytora SQL
5. Kliknij **"Run"** (Ctrl+Enter)
6. Powinieneś zobaczyć **"Success. No rows returned"**

## Krok 3: Pobierz klucze API

1. W dashboardzie kliknij **"Settings"** (ikona koła zębatego) → **"API"**
2. Skopiuj:
   - **Project URL** → to będzie `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → to będzie `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   - **service_role secret** key → to będzie `SUPABASE_SERVICE_ROLE_KEY`

## Krok 4: Skonfiguruj aplikację

Otwórz plik `.env` w katalogu głównym aplikacji i odkomentuj/uzupełnij:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TWOJ-PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...twoj-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...twoj-service-role-key
```

## Krok 5: Zrestartuj aplikację

```bash
sudo supervisorctl restart nextjs
```

## Krok 6: Zweryfikuj

Sprawdź endpoint health:
```
GET /api/health
```

Powinien zwrócić:
```json
{
  "status": "ok",
  "mode": "supabase",
  "timestamp": "..."
}
```

Jeśli widzisz `"mode": "supabase"` — aplikacja jest połączona z Supabase!

## Krok 7: Utwórz konta użytkowników

Po przełączeniu na Supabase musisz utworzyć nowe konta przez formularz rejestracji w aplikacji.

**Konto admina:**
- Email: `sysdrummatic@gmail.com`
- Hasło: dowolne (np. `admin1`)
- Rola zostanie automatycznie ustawiona na `ADMIN` dzięki triggerowi w bazie

---

## Architektura

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend   │────▶│   API Routes     │────▶│   Supabase      │
│   (React)    │     │   (/api/...)     │     │   Auth + DB     │
│              │◀────│                  │◀────│   + RLS         │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

## Tabele w Supabase

| Tabela     | Opis                                    |
|------------|-----------------------------------------|
| `profiles` | Profile użytkowników (id, email, name, role) |
| `cvs`      | CV użytkowników (id, user_id, title, data jako JSONB) |

## Polityki RLS

- Użytkownik widzi/edytuje/usuwa **tylko swoje** dane
- Operacje administracyjne (zmiana ról, przeglądanie wszystkich CV) 
  wykonywane są przez **service_role key** (bypass RLS)

## Tryb podwójny

Aplikacja automatycznie wykrywa tryb:
- **Brak zmiennych Supabase** → MongoDB (obecny tryb)
- **Zmienne Supabase ustawione** → Supabase (po konfiguracji)

Nie musisz zmieniać żadnego kodu — wystarczy uzupełnić `.env` i zrestartować.
