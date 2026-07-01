-- =============================================================
-- Planer — Coop Mode Full Setup
-- Run this ONCE in Supabase → SQL Editor → New query
-- =============================================================

-- ─── 1. user_profiles table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email        TEXT,
  planer_id    TEXT    UNIQUE NOT NULL,
  avatar_color TEXT    NOT NULL DEFAULT '#CC785C',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.user_profiles;
CREATE POLICY "profiles_select"
  ON public.user_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.user_profiles;
CREATE POLICY "profiles_insert"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON public.user_profiles;
CREATE POLICY "profiles_update"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);


-- ─── 2. Planer ID generator ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_planer_id()
RETURNS TEXT AS $$
DECLARE
  chars  TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i      INT;
  tries  INT  := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    result := substr(result, 1, 2) || '-' || substr(result, 3);
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE planer_id = result) THEN
      RETURN result;
    END IF;
    tries := tries + 1;
    IF tries > 200 THEN RAISE EXCEPTION 'Cannot generate unique Planer ID'; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ─── 3. Trigger — create profile on signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, planer_id)
  VALUES (NEW.id, NEW.email, public.generate_planer_id())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 4. Backfill existing users ───────────────────────────────
-- Creates profiles for users who signed up BEFORE this script ran
INSERT INTO public.user_profiles (id, email, planer_id)
SELECT u.id, u.email, public.generate_planer_id()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.id = u.id
);


-- ─── 5. project_members table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('owner','editor','viewer')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm_select" ON public.project_members;
CREATE POLICY "pm_select"
  ON public.project_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pm_insert" ON public.project_members;
CREATE POLICY "pm_insert"
  ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "pm_delete" ON public.project_members;
CREATE POLICY "pm_delete"
  ON public.project_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );


-- ─── 6. project_invites table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_invites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  planer_id  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'viewer'
               CHECK (role IN ('editor','viewer')),
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pi_select" ON public.project_invites;
CREATE POLICY "pi_select"
  ON public.project_invites FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pi_insert" ON public.project_invites;
CREATE POLICY "pi_insert"
  ON public.project_invites FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS "pi_update" ON public.project_invites;
CREATE POLICY "pi_update"
  ON public.project_invites FOR UPDATE TO authenticated USING (true);


-- ─── Done ─────────────────────────────────────────────────────
-- After running, reload the app. Your Planer ID will appear
-- in Settings (You screen) under your email address.
-- Invite UI: Projects → tap a project → scroll down → "Members"
