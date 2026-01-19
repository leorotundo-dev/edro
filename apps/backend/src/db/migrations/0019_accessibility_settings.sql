-- Configuracoes de acessibilidade por usuario
CREATE TABLE IF NOT EXISTS accessibility_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(50) DEFAULT 'default',
  tts_voice VARCHAR(100),
  tts_speed NUMERIC(4,2) DEFAULT 1,
  stt_language VARCHAR(20) DEFAULT 'pt-BR',
  font_size VARCHAR(20) DEFAULT 'md',
  contrast_mode VARCHAR(20) DEFAULT 'normal',
  motion_reduced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accessibility_settings_user ON accessibility_settings(user_id);
