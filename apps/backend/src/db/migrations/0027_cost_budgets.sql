-- 0027_cost_budgets.sql
-- Budgets de custos por servico/plano/usuario

CREATE TABLE IF NOT EXISTS cost_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope VARCHAR(20) NOT NULL, -- 'global' | 'plan' | 'user'
  service VARCHAR(50) NOT NULL DEFAULT 'openai',
  plan_code VARCHAR(50),
  user_id UUID,
  budget_usd NUMERIC(12,2) NOT NULL,
  alert_threshold NUMERIC(5,2) DEFAULT 0.9,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_budgets_scope ON cost_budgets(scope);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_service ON cost_budgets(service);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_plan ON cost_budgets(plan_code);
CREATE INDEX IF NOT EXISTS idx_cost_budgets_user ON cost_budgets(user_id);
