ALTER TABLE freelancer_profiles
  ADD COLUMN IF NOT EXISTS skills                TEXT[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_days        TEXT[]       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_hours_start TEXT,
  ADD COLUMN IF NOT EXISTS available_hours_end   TEXT,
  ADD COLUMN IF NOT EXISTS weekly_capacity_hours NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS contract_type         TEXT;

COMMENT ON COLUMN freelancer_profiles.skills IS 'Array of skill codes: copy, design, video, social, estrategia, operacao, atendimento, financeiro';
COMMENT ON COLUMN freelancer_profiles.available_days IS 'Work days: mon,tue,wed,thu,fri,sat,sun';
