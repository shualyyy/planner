-- 002_user_profiles.sql
-- User profile with generated Planer ID, backfill, and signup trigger.

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  email         TEXT,
  planer_id     TEXT UNIQUE NOT NULL,
  avatar_color  TEXT DEFAULT '#D97757',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate a 6-char Planer ID (format XXX-XXX) on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_planer_id TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i INT;
BEGIN
  LOOP
    new_planer_id := '';
    FOR i IN 1..3 LOOP
      new_planer_id := new_planer_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    new_planer_id := new_planer_id || '-';
    FOR i IN 1..3 LOOP
      new_planer_id := new_planer_id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE planer_id = new_planer_id);
  END LOOP;

  INSERT INTO public.user_profiles (id, email, planer_id)
  VALUES (NEW.id, NEW.email, new_planer_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.user_profiles (id, email, planer_id)
SELECT
  u.id,
  u.email,
  (
    SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32+1)::int, 1), '')
    FROM generate_series(1,3)
  ) || '-' || (
    SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random()*32+1)::int, 1), '')
    FROM generate_series(1,3)
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = u.id);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read any profile" ON public.user_profiles;
CREATE POLICY "Read any profile" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Update own profile" ON public.user_profiles;
CREATE POLICY "Update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
