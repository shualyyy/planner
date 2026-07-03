-- 007_fix_invite_flow.sql
-- Fixes the Coop invite flow:
--  1. Invites are created as 'pending'; membership is granted only on accept.
--  2. accept_project_invite() — SECURITY DEFINER RPC, because RLS forbids the
--     invited user from inserting into project_members directly.
--  3. Members can actually SEE shared projects and their tasks (previously
--     projects/tasks policies were owner-only, so Coop was invisible).

-- ── Accept invite atomically ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_project_invite(invite_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.project_invites%ROWTYPE;
  my_planer_id TEXT;
BEGIN
  SELECT planer_id INTO my_planer_id
    FROM public.user_profiles WHERE id = auth.uid();
  IF my_planer_id IS NULL THEN
    RAISE EXCEPTION 'No profile for current user';
  END IF;

  SELECT * INTO inv FROM public.project_invites
   WHERE id = invite_id
     AND planer_id = my_planer_id
     AND status = 'pending'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already handled';
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (inv.project_id, auth.uid(), inv.role)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  UPDATE public.project_invites SET status = 'accepted' WHERE id = invite_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_project_invite(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_project_invite(UUID) TO authenticated;

-- ── Members can see shared projects ─────────────────────────────────────────
DROP POLICY IF EXISTS "projects_member_select" ON public.projects;
CREATE POLICY "projects_member_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- ── Members can see tasks of shared projects ────────────────────────────────
DROP POLICY IF EXISTS "tasks_member_select" ON public.tasks;
CREATE POLICY "tasks_member_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- ── Editors/owners can update tasks in shared projects ──────────────────────
DROP POLICY IF EXISTS "tasks_member_update" ON public.tasks;
CREATE POLICY "tasks_member_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role IN ('owner','editor')
    )
  );

-- ── Editors/owners can add their own tasks into shared projects ─────────────
DROP POLICY IF EXISTS "tasks_member_insert" ON public.tasks;
CREATE POLICY "tasks_member_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role IN ('owner','editor')
    )
  );
