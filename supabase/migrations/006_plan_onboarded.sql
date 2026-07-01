-- 006_plan_onboarded.sql
-- Adds `plan` (free/pro), `onboarded`, and `display_name` to user_profiles.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro'));

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;

-- display_name already exists in the base schema for most installs, but add if missing.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Grandfather existing users so they don't see the onboarding flow.
-- Comment out this UPDATE if you want existing users to see it too.
UPDATE public.user_profiles
  SET onboarded = true
  WHERE onboarded IS NULL OR onboarded = false;
