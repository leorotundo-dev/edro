-- SRS user settings for personalized scheduling
CREATE TABLE IF NOT EXISTS srs_user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  memory_strength TEXT NOT NULL DEFAULT 'normal' CHECK (memory_strength IN ('weak', 'normal', 'strong')),
  learning_style TEXT NOT NULL DEFAULT 'mixed' CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'mixed')),
  max_new_cards_per_day INTEGER NOT NULL DEFAULT 20,
  base_interval_days INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_srs_user_settings_user ON srs_user_settings(user_id);
