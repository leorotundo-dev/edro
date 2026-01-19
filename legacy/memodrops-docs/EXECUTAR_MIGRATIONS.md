# 🚀 EXECUTAR MIGRAÇÕES - SISTEMA DE JOBS

## 📋 SITUAÇÃO ATUAL

✅ **Conexão com PostgreSQL**: Funcionando (Railway)  
❌ **Tabelas jobs e job_schedules**: NÃO existem no banco  
✅ **Migrações SQL**: Já existem no projeto (`0011_jobs_system.sql`)  
✅ **Script de migração**: Pronto para executar

---

## 🎯 OPÇÃO 1: EXECUTAR MIGRAÇÕES AUTOMATICAMENTE (RECOMENDADO)

### Passo 1: Configurar DATABASE_URL

Crie/edite o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://postgres:senha@host:porta/railway
```

**Como pegar a DATABASE_URL do Railway:**
1. Acesse: https://railway.app
2. Vá no projeto MemoDrops
3. Clique no serviço **PostgreSQL**
4. Aba **Variables**
5. Copie o valor de `DATABASE_URL`

### Passo 2: Executar Script PowerShell

No terminal PowerShell (raiz do projeto):

```powershell
.\executar-migrations.ps1
```

✅ Isso executará automaticamente TODAS as migrações pendentes!

---

## 🎯 OPÇÃO 2: EXECUTAR MANUALMENTE NO RAILWAY

Se preferir executar SQL diretamente no Railway:

### Passo 1: Acessar Railway Query Editor

1. Acesse: https://railway.app
2. Vá no projeto MemoDrops
3. Clique no serviço **PostgreSQL**
4. Aba **Query**

### Passo 2: Executar SQL Completo

Cole e execute este SQL:

```sql
-- =====================================================
-- CRIAR TABELA DE CONTROLE DE MIGRAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 1. JOBS TABLE
-- =====================================================
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

-- =====================================================
-- 2. JOB SCHEDULES (Cron-like)
-- =====================================================
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

-- =====================================================
-- 3. JOB LOGS
-- =====================================================
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

-- =====================================================
-- 4. HARVEST SOURCES
-- =====================================================
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

-- =====================================================
-- 5. HARVESTED CONTENT
-- =====================================================
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

-- =====================================================
-- 6. SCHEDULED JOBS PREDEFINIDOS
-- =====================================================
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES 
  ('Daily Cleanup', 'cleanup', '0 3 * * *', '{}', true),
  ('Daily Harvest', 'harvest', '0 2 * * *', '{"limit": 20}', true),
  ('Weekly Stats Update', 'update_stats', '0 4 * * 0', '{}', true),
  ('Weekly Embedding Generation', 'generate_embeddings', '0 1 * * 6', '{}', false)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- REGISTRAR MIGRAÇÃO
-- =====================================================
INSERT INTO schema_migrations (name)
VALUES ('0011_jobs_system.sql')
ON CONFLICT (name) DO NOTHING;
```

### Passo 3: Verificar Tabelas Criadas

Execute para confirmar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content')
ORDER BY table_name;
```

✅ Deve retornar 5 tabelas!

---

## 🎯 OPÇÃO 3: EXECUTAR VIA NPM (Pelo Railway)

Se você tiver acesso ao terminal do Railway:

```bash
cd apps/backend
npm run db:migrate
```

---

## ✅ APÓS EXECUTAR AS MIGRAÇÕES

### 1. Verificar Status

Execute no Railway Query:

```sql
-- Ver todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver migrações aplicadas
SELECT * FROM schema_migrations ORDER BY id;

-- Ver jobs agendados
SELECT * FROM job_schedules;
```

### 2. Reiniciar Backend

1. Vá no Railway → Serviço **Backend**
2. Clique em **Restart**
3. Aguarde deploy completar

### 3. Verificar Logs

No Railway → Backend → **Logs**

Procure por:
```
✅ Conectado ao PostgreSQL
🚀 Job worker iniciado
✅ Servidor rodando na porta 3000
```

### 4. Testar Endpoints

```bash
# Health check
curl https://seu-backend.railway.app/health

# Jobs stats
curl https://seu-backend.railway.app/api/admin/jobs/stats
```

---

## 🔍 VERIFICAR SE FUNCIONOU

### SQL de Verificação:

```sql
-- Contar registros em cada tabela
SELECT 'jobs' as tabela, COUNT(*) as total FROM jobs
UNION ALL
SELECT 'job_schedules', COUNT(*) FROM job_schedules
UNION ALL
SELECT 'job_logs', COUNT(*) FROM job_logs
UNION ALL
SELECT 'harvest_sources', COUNT(*) FROM harvest_sources
UNION ALL
SELECT 'harvested_content', COUNT(*) FROM harvested_content;
```

**Resultado esperado:**
- `jobs`: 0 (vazio inicialmente)
- `job_schedules`: 4 (jobs agendados padrão)
- `job_logs`: 0 (vazio inicialmente)
- `harvest_sources`: 0 (vazio inicialmente)
- `harvested_content`: 0 (vazio inicialmente)

---

## ❌ PROBLEMAS COMUNS

### Erro: "uuid_generate_v4() not found"

Execute antes:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- OU (PostgreSQL 13+)
-- Nada necessário, gen_random_uuid() é nativo
```

### Erro: "relation already exists"

As tabelas já existem! Verifique com:

```sql
\dt
-- OU
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

### Erro: DATABASE_URL inválida

Formato correto:
```
postgresql://username:password@host:port/database
```

Exemplo Railway:
```
postgresql://postgres:xxxxxxxxxxx@roundhouse.proxy.rlwy.net:12345/railway
```

---

## 📞 PRÓXIMOS PASSOS

Após migrações executadas:

1. ✅ **Testar criação de jobs**
   ```bash
   curl -X POST https://seu-backend.railway.app/api/admin/jobs \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Job","type":"cleanup"}'
   ```

2. ✅ **Testar listagem de jobs**
   ```bash
   curl https://seu-backend.railway.app/api/admin/jobs
   ```

3. ✅ **Ver estatísticas**
   ```bash
   curl https://seu-backend.railway.app/api/admin/jobs/stats
   ```

---

## 🎉 SUCESSO!

Se tudo funcionou, você verá:
- ✅ Tabelas criadas no PostgreSQL
- ✅ Backend reiniciado sem erros
- ✅ Logs mostrando "Job worker iniciado"
- ✅ Endpoints respondendo corretamente

**Me avise quando executar para verificarmos juntos!** 🚀
