-- 0008_logs_ops_observability.sql
-- Sistema de Operação, Logs, Telemetria e Observabilidade (Cap. 49)

-- =====================================================
-- PARTE 1: LOGS ESTRUTURADOS (10 tipos)
-- =====================================================

-- 1. LOGS DE API
CREATE TABLE IF NOT EXISTS logs_api (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Request
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  
  -- Response
  status_code INTEGER,
  response_time_ms INTEGER,
  
  -- Erro
  error_message TEXT,
  error_stack TEXT,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_api_timestamp ON logs_api(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_api_user ON logs_api(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_api_status ON logs_api(status_code);
CREATE INDEX IF NOT EXISTS idx_logs_api_path ON logs_api(path);

-- Particionamento temporal (opcional, para performance)
-- CREATE TABLE logs_api_2024_01 PARTITION OF logs_api FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 2. LOGS DE WORKERS
CREATE TABLE IF NOT EXISTS logs_worker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Worker
  worker_name VARCHAR(100) NOT NULL,
  job_id VARCHAR(255),
  job_type VARCHAR(100),
  
  -- Status
  status VARCHAR(50), -- 'started', 'processing', 'completed', 'failed'
  
  -- Timing
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Resultado
  result JSONB DEFAULT '{}',
  error_message TEXT,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_worker_timestamp ON logs_worker(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_worker_name ON logs_worker(worker_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_worker_status ON logs_worker(status);

-- 3. LOGS DE IA
CREATE TABLE IF NOT EXISTS logs_ia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Chamada
  model VARCHAR(100) NOT NULL,
  provider VARCHAR(50), -- 'openai', 'anthropic', 'xai', 'ollama'
  prompt_type VARCHAR(100),
  
  -- Tokens
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  
  -- Custo
  cost_usd NUMERIC(10,6),
  
  -- Timing
  latency_ms INTEGER,
  
  -- Contexto
  user_id UUID,
  context JSONB DEFAULT '{}',
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_ia_timestamp ON logs_ia(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_ia_model ON logs_ia(model);
CREATE INDEX IF NOT EXISTS idx_logs_ia_user ON logs_ia(user_id, timestamp DESC);

-- 4. LOGS DE SEGURANÇA (já expandido em Cap. 48)
-- Usar logs_security existente

-- =====================================================
-- PARTE 2: HEALTH CHECKS
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Serviço
  service_name VARCHAR(100) NOT NULL, -- 'api', 'database', 'redis', 'worker_recco', 'gpu_ia', 'filesystem'
  
  -- Status
  status VARCHAR(50) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
  
  -- Métricas
  latency_ms INTEGER,
  throughput NUMERIC(10,2),
  error_rate NUMERIC(5,2),
  
  -- Detalhes
  details JSONB DEFAULT '{}',
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_health_service ON ops_health(service_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_health_status ON ops_health(status);

-- =====================================================
-- PARTE 3: WORKERS & FILAS
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Worker
  worker_name VARCHAR(100) NOT NULL UNIQUE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'idle', -- 'idle', 'busy', 'error', 'stopped'
  last_heartbeat TIMESTAMPTZ,
  
  -- Métricas
  jobs_processed INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  avg_processing_time_ms INTEGER,
  
  -- Config
  max_concurrency INTEGER DEFAULT 1,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_workers_name ON ops_workers(worker_name);
CREATE INDEX IF NOT EXISTS idx_ops_workers_status ON ops_workers(status);

CREATE TABLE IF NOT EXISTS ops_filas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Fila
  queue_name VARCHAR(100) NOT NULL,
  
  -- Métricas
  size INTEGER DEFAULT 0,
  waiting INTEGER DEFAULT 0,
  active INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  
  -- Timing
  avg_wait_time_ms INTEGER,
  avg_processing_time_ms INTEGER,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_filas_queue ON ops_filas(queue_name, timestamp DESC);

-- =====================================================
-- PARTE 4: ANOMALIAS (AI Ops)
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_anomalias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Anomalia
  type VARCHAR(100) NOT NULL, -- 'spike_errors', 'high_latency', 'cognitive_drop', 'queue_overflow', 'worker_down'
  severity VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  
  -- Contexto
  service_name VARCHAR(100),
  metric_name VARCHAR(100),
  expected_value NUMERIC(10,2),
  actual_value NUMERIC(10,2),
  deviation_pct NUMERIC(5,2),
  
  -- Detalhes
  details JSONB DEFAULT '{}',
  
  -- Resolução
  auto_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_anomalias_detected ON ops_anomalias(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_anomalias_severity ON ops_anomalias(severity);
CREATE INDEX IF NOT EXISTS idx_ops_anomalias_resolved ON ops_anomalias(auto_resolved);

-- =====================================================
-- PARTE 5: ALERTAS
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_alertas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Alerta
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  
  -- Mensagem
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Contexto
  service_name VARCHAR(100),
  details JSONB DEFAULT '{}',
  
  -- Destinatários
  channels JSONB DEFAULT '[]', -- ['email', 'slack', 'sms', 'push']
  sent_to JSONB DEFAULT '[]',
  
  -- Status
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_alertas_created ON ops_alertas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_alertas_severity ON ops_alertas(severity);
CREATE INDEX IF NOT EXISTS idx_ops_alertas_acknowledged ON ops_alertas(acknowledged);

-- =====================================================
-- PARTE 6: MÉTRICAS DO SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Métrica
  metric_name VARCHAR(100) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- 'tecnica', 'cognitiva', 'pedagogica', 'operacional'
  
  -- Valor
  value NUMERIC(10,2) NOT NULL,
  unit VARCHAR(50), -- 'ms', '%', 'count', 'rate'
  
  -- Contexto
  service_name VARCHAR(100),
  tags JSONB DEFAULT '{}',
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_metrics_name ON ops_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_metrics_type ON ops_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_ops_metrics_timestamp ON ops_metrics(timestamp DESC);

-- =====================================================
-- PARTE 7: CACHE PARA DASHBOARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_dashboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Dashboard
  dashboard_name VARCHAR(100) NOT NULL UNIQUE,
  
  -- Dados Cacheados
  data JSONB NOT NULL DEFAULT '{}',
  
  -- Cache
  expires_at TIMESTAMPTZ NOT NULL,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_dashboard_cache_name ON ops_dashboard_cache(dashboard_name);
CREATE INDEX IF NOT EXISTS idx_ops_dashboard_cache_expires ON ops_dashboard_cache(expires_at);

-- =====================================================
-- PARTE 8: AUDITORIA
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Evento
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100), -- 'user', 'recco', 'trilha', 'simulado'
  entity_id UUID,
  
  -- Ação
  action VARCHAR(100) NOT NULL, -- 'created', 'updated', 'deleted', 'executed'
  
  -- Contexto
  user_id UUID,
  ip_address INET,
  
  -- Antes/Depois
  before_state JSONB DEFAULT '{}',
  after_state JSONB DEFAULT '{}',
  changes JSONB DEFAULT '{}',
  
  -- Rastreamento
  trace_id UUID,
  session_id UUID,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_auditoria_timestamp ON ops_auditoria(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_auditoria_user ON ops_auditoria(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ops_auditoria_entity ON ops_auditoria(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ops_auditoria_action ON ops_auditoria(action);

-- =====================================================
-- PARTE 9: MONITORAMENTO DE IA (modelos)
-- =====================================================

CREATE TABLE IF NOT EXISTS ops_ia_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Modelo
  model_name VARCHAR(100) NOT NULL UNIQUE,
  provider VARCHAR(50),
  
  -- Status
  status VARCHAR(50) DEFAULT 'online', -- 'online', 'degraded', 'offline'
  
  -- Métricas
  avg_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  p99_latency_ms INTEGER,
  error_rate NUMERIC(5,2),
  total_calls INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10,2) DEFAULT 0,
  
  -- Limites
  rate_limit INTEGER,
  rate_limit_remaining INTEGER,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_ia_models_name ON ops_ia_models(model_name);
CREATE INDEX IF NOT EXISTS idx_ops_ia_models_status ON ops_ia_models(status);
