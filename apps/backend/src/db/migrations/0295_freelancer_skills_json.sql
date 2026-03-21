-- Migration 0295: Add skills_json for rich ArsenalPicker storage

ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS skills_json JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN freelancer_profiles.skills_json IS
  'Full ArsenalPicker payload: [{id, label, category, level}]. skills TEXT[] kept for backward compat.';
