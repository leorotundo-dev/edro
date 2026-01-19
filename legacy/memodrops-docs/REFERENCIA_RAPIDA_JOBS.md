# ⚡ REFERÊNCIA RÁPIDA - SISTEMA DE JOBS

## 🚀 INÍCIO RÁPIDO

### Opção 1: Script PowerShell (Recomendado)
```powershell
.\executar-migrations.ps1
```

### Opção 2: SQL Direto no Railway
1. Abra: `EXECUTAR_NO_RAILWAY.sql`
2. Copie todo o conteúdo
3. Cole no Railway Query Editor
4. Execute

### Opção 3: Via NPM
```bash
cd apps/backend
npm run db:migrate
```

---

## 📊 COMANDOS SQL ÚTEIS

### Verificar Tabelas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%job%';
```

### Ver Jobs
```sql
-- Todos os jobs
SELECT * FROM jobs ORDER BY created_at DESC;

-- Jobs pendentes
SELECT * FROM jobs WHERE status = 'pending';

-- Jobs falhados
SELECT * FROM jobs WHERE status = 'failed';

-- Estatísticas
SELECT status, COUNT(*) 
FROM jobs 
GROUP BY status;
```

### Ver Jobs Agendados
```sql
-- Listar todos
SELECT * FROM job_schedules;

-- Apenas ativos
SELECT name, schedule, last_run, next_run 
FROM job_schedules 
WHERE enabled = true;
```

### Ver Logs
```sql
-- Últimos 10 logs
SELECT * FROM job_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Logs de um job específico
SELECT * FROM job_logs 
WHERE job_id = 'uuid-do-job' 
ORDER BY timestamp DESC;

-- Logs de erros
SELECT * FROM job_logs 
WHERE level = 'error' 
ORDER BY timestamp DESC;
```

---

## 🔧 ADMINISTRAÇÃO

### Criar Job Manualmente
```sql
INSERT INTO jobs (name, type, data, priority)
VALUES (
  'Test Job',
  'harvest',
  '{"limit": 5}',
  8
);
```

### Ativar/Desativar Job Agendado
```sql
-- Desativar
UPDATE job_schedules 
SET enabled = false 
WHERE name = 'Daily Harvest';

-- Ativar
UPDATE job_schedules 
SET enabled = true 
WHERE name = 'Daily Harvest';
```

### Reprocessar Job Falhado
```sql
UPDATE jobs 
SET status = 'pending', 
    attempts = 0,
    error = NULL
WHERE id = 'uuid-do-job';
```

### Limpar Jobs Antigos
```sql
DELETE FROM jobs 
WHERE status IN ('completed', 'failed') 
  AND completed_at < NOW() - INTERVAL '30 days';
```

### Cancelar Job em Execução
```sql
UPDATE jobs 
SET status = 'failed',
    error = 'Cancelado manualmente',
    completed_at = NOW()
WHERE id = 'uuid-do-job' 
  AND status = 'running';
```

---

## 🌐 ENDPOINTS API

### Estatísticas
```bash
GET /api/admin/jobs/stats

# Resposta:
{
  "total": 10,
  "pending": 2,
  "running": 1,
  "completed": 6,
  "failed": 1,
  "avg_duration_ms": 1234.56
}
```

### Listar Jobs
```bash
GET /api/admin/jobs

# Query params opcionais:
?status=pending
?type=harvest
?limit=10
```

### Ver Job Específico
```bash
GET /api/admin/jobs/:id
```

### Criar Job
```bash
POST /api/admin/jobs
Content-Type: application/json

{
  "name": "Custom Job",
  "type": "harvest",
  "priority": 7,
  "data": {
    "sourceId": "uuid",
    "limit": 10
  }
}
```

### Executar Job Manualmente
```bash
POST /api/admin/jobs/:id/execute
```

### Cancelar Job
```bash
POST /api/admin/jobs/:id/cancel
```

### Listar Jobs Agendados
```bash
GET /api/admin/jobs/schedules
```

### Atualizar Job Agendado
```bash
PATCH /api/admin/jobs/schedules/:id
Content-Type: application/json

{
  "enabled": false
}
```

### Ver Logs de Job
```bash
GET /api/admin/jobs/:id/logs
```

---

## 📝 TIPOS DE JOBS

| Tipo | Descrição | Dados Necessários |
|------|-----------|-------------------|
| `harvest` | Buscar conteúdo externo | `sourceId` (opcional), `limit` |
| `generate_embeddings` | Gerar embeddings para RAG | - |
| `generate_drops` | Gerar drops com IA | `topico`, `subtopico`, `banca`, `dificuldade` |
| `generate_questions` | Gerar questões com IA | `topico`, `subtopico`, `banca`, `quantidade` |
| `cleanup` | Limpar dados antigos | - |
| `update_stats` | Atualizar estatísticas | - |

---

## 🔄 STATUS DE JOBS

| Status | Descrição | Pode executar? |
|--------|-----------|----------------|
| `pending` | Aguardando execução | ✅ Sim |
| `running` | Em execução | ❌ Não |
| `completed` | Concluído com sucesso | ❌ Não |
| `failed` | Falhou | ✅ Sim (se attempts < max_attempts) |

---

## ⏰ EXPRESSÕES CRON

| Expressão | Descrição |
|-----------|-----------|
| `0 3 * * *` | Todos os dias às 3h |
| `0 */6 * * *` | A cada 6 horas |
| `0 2 * * 1` | Segundas-feiras às 2h |
| `0 4 * * 0` | Domingos às 4h |
| `*/15 * * * *` | A cada 15 minutos |
| `0 1 * * 6` | Sábados à 1h |

Formato: `minuto hora dia mês dia-da-semana`

---

## 🐛 TROUBLESHOOTING

### Job fica em "pending" eternamente
```sql
-- Verificar se worker está rodando
-- (ver logs do backend no Railway)

-- Forçar reprocessamento
UPDATE jobs 
SET scheduled_for = NOW() - INTERVAL '1 minute'
WHERE status = 'pending';
```

### Job falha continuamente
```sql
-- Ver erro
SELECT error FROM jobs WHERE id = 'uuid';

-- Verificar tentativas
SELECT attempts, max_attempts FROM jobs WHERE id = 'uuid';

-- Aumentar max_attempts
UPDATE jobs 
SET max_attempts = 5 
WHERE id = 'uuid';
```

### Job agendado não executa
```sql
-- Verificar se está ativo
SELECT * FROM job_schedules WHERE name = 'Nome do Job';

-- Verificar próxima execução
SELECT name, next_run 
FROM job_schedules 
WHERE enabled = true;

-- Forçar próxima execução
UPDATE job_schedules 
SET next_run = NOW() 
WHERE name = 'Nome do Job';
```

---

## 📈 MONITORAMENTO

### Dashboard de Jobs (SQL)
```sql
SELECT 
  type,
  status,
  COUNT(*) as quantidade,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type, status
ORDER BY type, status;
```

### Performance por Tipo
```sql
SELECT 
  type,
  COUNT(*) as total,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_seconds,
  MIN(EXTRACT(EPOCH FROM (completed_at - started_at))) as min_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_seconds
FROM jobs
WHERE status = 'completed'
  AND completed_at > NOW() - INTERVAL '7 days'
GROUP BY type
ORDER BY avg_seconds DESC;
```

### Taxa de Sucesso
```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as sucesso,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as falha,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as taxa_sucesso
FROM jobs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY taxa_sucesso DESC;
```

---

## 🧹 MANUTENÇÃO

### Cleanup Semanal
```sql
-- Deletar jobs completados com mais de 30 dias
DELETE FROM jobs 
WHERE status = 'completed' 
  AND completed_at < NOW() - INTERVAL '30 days';

-- Deletar logs com mais de 60 dias
DELETE FROM job_logs 
WHERE timestamp < NOW() - INTERVAL '60 days';
```

### Vacuum (Otimização)
```sql
VACUUM ANALYZE jobs;
VACUUM ANALYZE job_logs;
```

### Resetar Job Travado
```sql
-- Jobs em "running" há mais de 1 hora
UPDATE jobs 
SET status = 'failed',
    error = 'Timeout - travado por mais de 1 hora',
    completed_at = NOW()
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '1 hour';
```

---

## 🔐 SEGURANÇA

### Verificar Permissões
```sql
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN ('jobs', 'job_schedules', 'job_logs');
```

### Auditoria de Alterações
```sql
-- Jobs modificados recentemente
SELECT name, type, status, created_at 
FROM jobs 
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Schedules alterados
SELECT name, enabled, updated_at 
FROM job_schedules 
WHERE updated_at > NOW() - INTERVAL '7 days'
ORDER BY updated_at DESC;
```

---

## 🎯 EXEMPLOS PRÁTICOS

### Criar Job de Harvest
```bash
curl -X POST https://seu-backend.railway.app/api/admin/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Harvest QConcursos",
    "type": "harvest",
    "priority": 8,
    "data": {
      "limit": 20
    }
  }'
```

### Criar Job de Geração de Drops
```bash
curl -X POST https://seu-backend.railway.app/api/admin/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gerar Drops de Português",
    "type": "generate_drops",
    "data": {
      "topico": "Português",
      "subtopico": "Regência Verbal",
      "banca": "FCC",
      "dificuldade": "medium"
    }
  }'
```

### Agendar Job Customizado
```sql
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES (
  'Backup Diário',
  'backup',
  '0 5 * * *',  -- 5h da manhã
  '{"target": "all"}',
  true
);
```

---

## 📚 DOCUMENTAÇÃO

- **Arquivos importantes:**
  - `apps/backend/src/services/jobService.ts` - Lógica principal
  - `apps/backend/src/services/cronService.ts` - Agendamento
  - `apps/backend/src/routes/jobs-admin.ts` - Endpoints API
  - `apps/backend/src/db/migrations/0011_jobs_system.sql` - Schema

- **Guias:**
  - `COMECE_AQUI_JOBS.md` - Guia de início
  - `EXECUTAR_MIGRATIONS.md` - Instruções de migração
  - `EXECUTAR_NO_RAILWAY.sql` - SQL direto

---

## ✅ CHECKLIST DE VERIFICAÇÃO

- [ ] Tabelas criadas no banco
- [ ] 4 jobs agendados ativos
- [ ] Backend reiniciado
- [ ] Logs mostram "Job worker iniciado"
- [ ] Endpoint `/api/admin/jobs/stats` respondendo
- [ ] Job de teste criado e executado
- [ ] Logs de execução visíveis

---

**💡 Dica:** Salve este arquivo para consulta rápida!
