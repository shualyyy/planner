-- 003_coop_tables.sql
-- Coop mode: project members, invites, assigned_to on tasks.

-- ── project_members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_project_idx ON public.project_members (project_id);
CREATE INDEX IF NOT EXISTS project_members_user_idx    ON public.project_members (user_id);

-- ── project_invites ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planer_id   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_invites_planer_idx  ON public.project_invites (planer_id);
CREATE INDEX IF NOT EXISTS project_invites_project_idx ON public.project_invites (project_id);

-- ── assigned_to / assigned_by on tasks ──────────────────────────────────────
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view" ON public.project_members;
CREATE POLICY "Members can view" ON public.project_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can insert members" ON public.project_members;
CREATE POLICY "Owners can insert members" ON public.project_members
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Owners can delete members" ON public.project_members;
CREATE POLICY "Owners can delete members" ON public.project_members
  FOR DELETE TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "View own invites" ON public.project_invites;
CREATE POLICY "View own invites" ON public.project_invites
  FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid()
    OR planer_id = (SELECT planer_id FROM public.user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Create invites" ON public.project_invites;
CREATE POLICY "Create invites" ON public.project_invites
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

DROP POLICY IF EXISTS "Update own invites" ON public.project_invites;
CREATE POLICY "Update own invites" ON public.project_invites
  FOR UPDATE TO authenticated
  USING (planer_id = (SELECT planer_id FROM public.user_profiles WHERE id = auth.uid()));

-- Migrate existing project owners into project_members
INSERT INTO public.project_members (project_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.projects
ON CONFLICT (project_id, user_id) DO NOTHING;
