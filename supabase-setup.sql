-- ====================================================================
-- OpenCV Manager — Konfiguracja bazy danych Supabase
-- ====================================================================
-- Uruchom ten skrypt w Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Wklej i uruchom
-- ====================================================================

-- 1. Tabela profili użytkowników (powiązana z auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'STANDARD_USER'
    CHECK (role IN ('ADMIN', 'MANAGER', 'RECRUITER', 'STANDARD_USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela CV
CREATE TABLE IF NOT EXISTS public.cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  title TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indeksy
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON public.cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_cvs_updated_at ON public.cvs(updated_at DESC);

-- 4. Włącz Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

-- 5. Polityki RLS dla profiles
-- Użytkownik widzi swój profil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Użytkownik może edytować swój profil (ale nie rolę)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 6. Polityki RLS dla cvs
-- Użytkownik widzi swoje CV
CREATE POLICY "Users can view own CVs"
  ON public.cvs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Użytkownik tworzy swoje CV
CREATE POLICY "Users can create own CVs"
  ON public.cvs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Użytkownik edytuje swoje CV
CREATE POLICY "Users can update own CVs"
  ON public.cvs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Użytkownik usuwa swoje CV
CREATE POLICY "Users can delete own CVs"
  ON public.cvs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Trigger: automatycznie twórz profil przy rejestracji
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    CASE
      WHEN NEW.email = 'sysdrummatic@gmail.com' THEN 'ADMIN'
      ELSE 'STANDARD_USER'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usuń istniejący trigger jeśli istnieje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Utwórz trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- GOTOWE! Teraz:
-- 1. Skopiuj SUPABASE_URL, ANON_KEY i SERVICE_ROLE_KEY z:
--    Dashboard → Settings → API
-- 2. Wklej do pliku .env w aplikacji
-- 3. Uruchom: sudo supervisorctl restart nextjs
-- ====================================================================
