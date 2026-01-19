-- 0033_gamification_system_v2.sql
-- Gamification, missions, events, clans, notification prefs, behavioral paywall

CREATE TABLE IF NOT EXISTS gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_total INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_best INTEGER NOT NULL DEFAULT 0,
  streak_freezes INTEGER NOT NULL DEFAULT 0,
  last_study_at TIMESTAMPTZ,
  last_streak_at TIMESTAMPTZ,
  avatar_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_gamification_profiles_user ON gamification_profiles(user_id);

CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  amount INTEGER NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  rule_type VARCHAR(50) NOT NULL,
  rule_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id, earned_at DESC);

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'event')),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mission_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  goal INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  window_start DATE NOT NULL,
  window_end DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mission_id, user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_mission_progress_user ON mission_progress(user_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_mission_progress_status ON mission_progress(status);

CREATE TABLE IF NOT EXISTS gamification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('challenge', 'event')),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES gamification_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  progress JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON event_participants(user_id);

CREATE TABLE IF NOT EXISTS clans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(80) NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE (clan_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user ON clan_members(user_id);

CREATE TABLE IF NOT EXISTS clan_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  xp_total INTEGER NOT NULL DEFAULT 0,
  members_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clan_id, score_date)
);

CREATE INDEX IF NOT EXISTS idx_clan_scores_date ON clan_scores(score_date, xp_total DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL DEFAULT 'push',
  enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours JSONB DEFAULT '{}'::jsonb,
  max_per_day INTEGER,
  min_interval_minutes INTEGER,
  topics JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

CREATE TABLE IF NOT EXISTS notification_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  token TEXT NOT NULL,
  device_id VARCHAR(120),
  platform VARCHAR(30),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, token)
);

CREATE INDEX IF NOT EXISTS idx_notification_devices_user ON notification_devices(user_id, provider);

CREATE TABLE IF NOT EXISTS paywall_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paywall_events_user ON paywall_events(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gamification_profiles ON gamification_profiles;
CREATE TRIGGER trigger_update_gamification_profiles
  BEFORE UPDATE ON gamification_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_mission_progress ON mission_progress;
CREATE TRIGGER trigger_update_mission_progress
  BEFORE UPDATE ON mission_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_clan_scores ON clan_scores;
CREATE TRIGGER trigger_update_clan_scores
  BEFORE UPDATE ON clan_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_notification_preferences ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

-- Seed core badges
INSERT INTO badges (code, title, description, category, rule_type, rule_config)
VALUES
  ('xp_500', 'XP 500', 'Earn 500 XP total', 'xp', 'xp_total', '{"threshold":500}'),
  ('xp_2000', 'XP 2000', 'Earn 2000 XP total', 'xp', 'xp_total', '{"threshold":2000}'),
  ('streak_7', 'Streak 7', 'Study 7 days in a row', 'streak', 'streak_current', '{"threshold":7}'),
  ('streak_30', 'Streak 30', 'Study 30 days in a row', 'streak', 'streak_current', '{"threshold":30}'),
  ('srs_10', 'SRS 10', 'Complete 10 SRS reviews', 'srs', 'srs_reviews', '{"threshold":10}'),
  ('simulado_1', 'First Simulado', 'Finish your first simulado', 'simulado', 'simulado_finish', '{"threshold":1}')
ON CONFLICT (code) DO NOTHING;

-- Seed sample missions
INSERT INTO missions (code, type, title, description, rules, rewards, is_active)
VALUES
  ('daily_srs_10', 'daily', 'Daily SRS 10', 'Complete 10 SRS reviews today', '{"type":"srs_reviews","goal":10}', '{"xp":50}', true),
  ('daily_drops_3', 'daily', 'Daily Drops 3', 'Complete 3 drops today', '{"type":"drops_completed","goal":3}', '{"xp":30}', true),
  ('weekly_questions_20', 'weekly', 'Weekly Questions 20', 'Answer 20 questions this week', '{"type":"questions_answered","goal":20}', '{"xp":120}', true)
ON CONFLICT (code) DO NOTHING;

-- Seed sample event
INSERT INTO gamification_events (code, type, title, description, rules, rewards, is_active, start_at, end_at)
VALUES
  ('event_weekly_sprint', 'event', 'Weekly Sprint', 'Score the most XP this week', '{"type":"xp_total"}', '{"xp_bonus":200}', true, NOW(), NOW() + INTERVAL '7 days')
ON CONFLICT (code) DO NOTHING;
