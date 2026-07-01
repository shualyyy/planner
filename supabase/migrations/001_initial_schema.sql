-- 001_initial_schema.sql
-- Core tables — tasks, projects, habits, habit_logs
-- Assumes auth.users already exists (Supabase built-in).
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#D97757',
  description  TEXT,
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_idx ON public.projects (user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_own" ON public.projects;
CREATE POLICY "projects_own" ON public.projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  task_date      DATE NOT NULL,
  task_time      TEXT,
  task_time_end  TEXT,
  is_all_day     BOOLEAN NOT NULL DEFAULT FALSE,
  is_done        BOOLEAN NOT NULL DEFAULT FALSE,
  description    TEXT,
  recurrence     TEXT,               -- 'daily' | 'weekly' | 'monthly' | NULL
  is_pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  pin_end        DATE,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status         TEXT,               -- 'not_started' | 'in_progress' | 'blocked' | 'done'
  priority       TEXT,               -- 'high' | 'medium' | 'low'
  time_estimate  INTEGER,            -- minutes
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_user_idx     ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_date_idx     ON public.tasks (task_date);
CREATE INDEX IF NOT EXISTS tasks_project_idx  ON public.tasks (project_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_own" ON public.tasks;
CREATE POLICY "tasks_own" ON public.tasks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── habits ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'circle',
  color        TEXT NOT NULL DEFAULT '#D97757',
  frequency    TEXT NOT NULL DEFAULT 'daily',
  time_of_day  TEXT NOT NULL DEFAULT 'morning',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS habits_user_idx ON public.habits (user_id);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habits_own" ON public.habits;
CREATE POLICY "habits_own" ON public.habits
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── habit_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id        UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date  DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

CREATE INDEX IF NOT EXISTS habit_logs_user_idx  ON public.habit_logs (user_id);
CREATE INDEX IF NOT EXISTS habit_logs_habit_idx ON public.habit_logs (habit_id);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "habit_logs_own" ON public.habit_logs;
CREATE POLICY "habit_logs_own" ON public.habit_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
