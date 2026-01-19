-- Aggregate OpenAI usage per day/model to persist tokens across deploys
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date DATE NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens BIGINT NOT NULL DEFAULT 0,
  completion_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  calls BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usage_date, model)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_date ON ai_usage_daily(usage_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_daily_model ON ai_usage_daily(model);
