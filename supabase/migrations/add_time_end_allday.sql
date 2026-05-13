-- Add end time and all-day flag to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_time_end TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT FALSE;
