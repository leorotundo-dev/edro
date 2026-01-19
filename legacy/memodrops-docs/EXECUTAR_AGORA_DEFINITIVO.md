# ⚡ EXECUTAR MIGRAÇÕES AGORA - MÉTODO DEFINITIVO

## 🚨 SITUAÇÃO

Tentei executar automaticamente mas:
- ❌ `pg` módulo não instalado
- ❌ `ts-node` não disponível  
- ❌ `pnpm install` falha (workspace)

## ✅ SOLUÇÃO DEFINITIVA

### **MÉTODO 1: SQL DIRETO NO RAILWAY (2 MINUTOS)**

Este é o método mais rápido e confiável:

#### Passo 1: Acessar Railway

1. Abra: https://railway.app
2. Faça login
3. Clique no projeto **MemoDrops**
4. Clique no serviço **PostgreSQL**
5. Clique na aba **Query**

#### Passo 2: Executar SQL

Copie e cole este SQL completo:

\`\`\`sql
-- =====================================================
-- SISTEMA DE JOBS - EXECUTAR TUDO DE UMA VEZ
-- =====================================================

-- 1. Tabela de controle
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela jobs
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- 3. Tabela job_schedules
CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled ON job_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next_run ON job_schedules(next_run);

-- 4. Tabela job_logs
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs(job_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp DESC);

-- 5. Tabela harvest_sources
CREATE TABLE IF NOT EXISTS harvest_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvest_sources_enabled ON harvest_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_type ON harvest_sources(type);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_priority ON harvest_sources(priority DESC);

-- 6. Tabela harvested_content
CREATE TABLE IF NOT EXISTS harvested_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES harvest_sources(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title VARCHAR(500),
  content_type VARCHAR(50),
  raw_html TEXT,
  parsed_content JSONB,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvested_content_source ON harvested_content(source_id);
CREATE INDEX IF NOT EXISTS idx_harvested_content_status ON harvested_content(status);
CREATE INDEX IF NOT EXISTS idx_harvested_content_type ON harvested_content(content_type);
CREATE INDEX IF NOT EXISTS idx_harvested_content_created ON harvested_content(created_at DESC);

-- 7. Inserir jobs agendados
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES 
  ('Daily Cleanup', 'cleanup', '0 3 * * *', '{}', true),
  ('Daily Harvest', 'harvest', '0 2 * * *', '{"limit": 20}', true),
  ('Weekly Stats Update', 'update_stats', '0 4 * * 0', '{}', true),
  ('Weekly Embedding Generation', 'generate_embeddings', '0 1 * * 6', '{}', false)
ON CONFLICT (name) DO NOTHING;

-- 8. Registrar migração
INSERT INTO schema_migrations (name)
VALUES ('0011_jobs_system.sql')
ON CONFLICT (name) DO NOTHING;

-- 9. Verificar resultados
SELECT 'TABELAS' as tipo, table_name as nome, 'OK' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content')
UNION ALL
SELECT 'JOBS_AGENDADOS', name, CASE WHEN enabled THEN 'ATIVO' ELSE 'INATIVO' END
FROM job_schedules
ORDER BY tipo, nome;
\`\`\`

#### Passo 3: Clicar em "Run Query"

Aguarde a execução (5-10 segundos)

#### Passo 4: Verificar Resultado

Você deve ver:
- ✅ 5 linhas com tipo "TABELAS"
- ✅ 4 linhas com tipo "JOBS_AGENDADOS"

---

### **MÉTODO 2: RAILWAY CLI (SE TIVER INSTALADO)**

\`\`\`bash
# 1. Login no Railway
railway login

# 2. Linkar ao projeto
railway link

# 3. Executar SQL
railway run psql -c "$(cat EXECUTAR_NO_RAILWAY.sql)"
\`\`\`

---

## ✅ APÓS EXECUTAR

### 1. Reiniciar Backend

1. Railway → Serviço **Backend**
2. Clique em **⋮** (menu)
3. Clique em **Restart**
4. Aguarde deploy (~2 min)

### 2. Verificar Logs

1. Clique em **Deployments**
2. Último deploy → **View Logs**
3. Procure por:
   ```
   ✅ Conectado ao PostgreSQL
   🚀 Job worker iniciado
   ✅ Servidor rodando
   ```

### 3. Testar Endpoint

Abra no navegador:
\`\`\`
https://seu-backend.railway.app/api/admin/jobs/stats
\`\`\`

Deve retornar:
\`\`\`json
{
  "total": 0,
  "pending": 0,
  "running": 0,
  "completed": 0,
  "failed": 0,
  "avg_duration_ms": 0
}
\`\`\`

---

## 🎉 SUCESSO!

Se tudo funcionou, você terá:
- ✅ 5 tabelas criadas
- ✅ 4 jobs agendados
- ✅ Sistema funcionando
- ✅ API respondendo

---

## 📞 PRÓXIMOS PASSOS

Me avise quando completar dizendo:

**"Executei o SQL, funcionou! Aqui estão os logs:"**

E cole:
1. Resultado do SQL no Railway
2. Logs do backend após restart
3. Resposta do endpoint /api/admin/jobs/stats

Aí eu te ajudo com os próximos passos! 🚀
