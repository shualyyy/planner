-- 004_task_comments.sql
-- Comments on tasks (used by TaskDetailSheet).

CREATE TABLE IF NOT EXISTS public.task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx ON public.task_comments (task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tc_select" ON public.task_comments;
CREATE POLICY "tc_select" ON public.task_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "tc_insert" ON public.task_comments;
CREATE POLICY "tc_insert" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tc_delete" ON public.task_comments;
CREATE POLICY "tc_delete" ON public.task_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
