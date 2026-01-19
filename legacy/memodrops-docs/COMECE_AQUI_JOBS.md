# 🚀 SISTEMA DE JOBS - COMECE AQUI!

## 📌 RESUMO RÁPIDO

Você tem um sistema de **Jobs/Tasks** pronto, mas as tabelas não existem no banco de dados do Railway.

**O que você precisa fazer:** Executar as migrações para criar as tabelas.

---

## ⚡ SOLUÇÃO RÁPIDA (3 PASSOS)

### 🔹 PASSO 1: Configure o `.env`

Crie o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgresql://postgres:senha@host:porta/railway
```

**Como pegar no Railway:**
1. https://railway.app → Seu projeto
2. PostgreSQL → Variables → Copie `DATABASE_URL`

### 🔹 PASSO 2: Execute o script

No PowerShell (raiz do projeto):

```powershell
.\executar-migrations.ps1
```

### 🔹 PASSO 3: Reinicie o backend

No Railway:
1. Vá no serviço **Backend**
2. Clique em **Restart**
3. Aguarde deploy

---

## ✅ COMO SABER SE FUNCIONOU?

### Verifique no Railway Query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_schedules', 'job_logs')
ORDER BY table_name;
```

**Deve retornar 3 tabelas!**

### Ou execute o script de verificação:

```powershell
.\verificar-migrations.ps1
```

---

## 📚 O QUE ESTE SISTEMA FAZ?

### 1. **Tabela `jobs`**
Armazena jobs para execução (harvest, gerar drops, etc)

```sql
-- Ver jobs pendentes
SELECT * FROM jobs WHERE status = 'pending';

-- Ver estatísticas
SELECT status, COUNT(*) 
FROM jobs 
GROUP BY status;
```

### 2. **Tabela `job_schedules`**
Jobs agendados (cron-like)

```sql
-- Ver jobs agendados
SELECT name, schedule, enabled 
FROM job_schedules;
```

### 3. **Tabela `job_logs`**
Logs de execução

```sql
-- Ver logs recentes
SELECT * FROM job_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 🎯 ENDPOINTS DISPONÍVEIS

Após migrações executadas:

### 📊 Estatísticas

```bash
GET /api/admin/jobs/stats
```

Retorna:
```json
{
  "total": 0,
  "pending": 0,
  "running": 0,
  "completed": 0,
  "failed": 0,
  "avg_duration_ms": 0
}
```

### 📋 Listar Jobs

```bash
GET /api/admin/jobs
```

### ➕ Criar Job

```bash
POST /api/admin/jobs
Content-Type: application/json

{
  "name": "Test Harvest",
  "type": "harvest",
  "data": {
    "limit": 10
  }
}
```

### 📅 Listar Jobs Agendados

```bash
GET /api/admin/jobs/schedules
```

### 🔄 Executar Job Manualmente

```bash
POST /api/admin/jobs/:id/execute
```

---

## 🧪 TESTAR LOCALMENTE

Se quiser testar antes de fazer deploy:

```powershell
# No diretório apps/backend
npm run dev
```

Acesse: http://localhost:3000/api/admin/jobs/stats

---

## 🛠️ TIPOS DE JOBS DISPONÍVEIS

O sistema suporta estes tipos de jobs:

### 1. **harvest**
Buscar conteúdo de fontes externas
```json
{
  "type": "harvest",
  "data": {
    "sourceId": "uuid-da-fonte",
    "limit": 10
  }
}
```

### 2. **generate_embeddings**
Gerar embeddings para RAG
```json
{
  "type": "generate_embeddings",
  "data": {}
}
```

### 3. **generate_drops**
Gerar drops com IA
```json
{
  "type": "generate_drops",
  "data": {
    "topico": "Português",
    "subtopico": "Regência Verbal",
    "banca": "FCC",
    "dificuldade": "medium"
  }
}
```

### 4. **generate_questions**
Gerar questões com IA
```json
{
  "type": "generate_questions",
  "data": {
    "topico": "Matemática",
    "subtopico": "Porcentagem",
    "banca": "CESPE",
    "quantidade": 5
  }
}
```

### 5. **cleanup**
Limpar dados antigos
```json
{
  "type": "cleanup",
  "data": {}
}
```

### 6. **update_stats**
Atualizar estatísticas
```json
{
  "type": "update_stats",
  "data": {}
}
```

---

## 📅 JOBS AGENDADOS PADRÃO

Após as migrações, estes jobs estarão agendados:

| Nome | Tipo | Schedule | Descrição |
|------|------|----------|-----------|
| Daily Cleanup | cleanup | `0 3 * * *` | Limpa dados antigos às 3h |
| Daily Harvest | harvest | `0 2 * * *` | Busca conteúdo às 2h |
| Weekly Stats Update | update_stats | `0 4 * * 0` | Atualiza stats aos domingos |
| Weekly Embedding Generation | generate_embeddings | `0 1 * * 6` | Gera embeddings aos sábados (desabilitado) |

---

## 🔧 ADMINISTRAÇÃO

### Ativar/Desativar Job Agendado

```sql
UPDATE job_schedules 
SET enabled = false 
WHERE name = 'Daily Harvest';
```

### Ver Jobs Falhados

```sql
SELECT * FROM jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

### Reprocessar Job Falhado

```sql
UPDATE jobs 
SET status = 'pending', 
    attempts = 0 
WHERE id = 'job-uuid';
```

### Limpar Jobs Antigos

```sql
DELETE FROM jobs 
WHERE status IN ('completed', 'failed') 
  AND completed_at < NOW() - INTERVAL '7 days';
```

---

## 📖 ARQUITETURA DO SISTEMA

```
┌─────────────────────────────────────────────┐
│           JOB SCHEDULER                     │
│  (cronService.ts - verifica schedules)      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           JOB QUEUE                         │
│  (Tabela jobs - pending, running, etc)      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           JOB WORKER                        │
│  (jobService.ts - executa jobs)             │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           JOB HANDLERS                      │
│  - harvestService                           │
│  - openaiService                            │
│  - embeddingsService                        │
│  - etc                                      │
└─────────────────────────────────────────────┘
```

---

## ❓ TROUBLESHOOTING

### ❌ "relation 'jobs' does not exist"

**Solução:** Execute as migrações
```powershell
.\executar-migrations.ps1
```

### ❌ "DATABASE_URL não encontrada"

**Solução:** Configure o `.env` na raiz do projeto

### ❌ "Job worker não está iniciando"

**Solução:** Verifique logs do backend no Railway

### ⚠️ "Jobs ficam em 'pending' eternamente"

**Solução:** 
1. Verifique se o backend está rodando
2. Verifique se o worker está iniciado (logs)
3. Reinicie o backend

---

## 🎉 PRÓXIMOS PASSOS

Após executar as migrações:

1. ✅ **Testar criação de job**
2. ✅ **Verificar logs de execução**
3. ✅ **Configurar jobs agendados**
4. ✅ **Monitorar performance**

---

## 📞 PRECISA DE AJUDA?

Me diga uma dessas frases:

- **"Executei o SQL, o que fazer agora?"**
- **"As migrações falharam com erro X"**
- **"Quero testar a criação de um job"**
- **"Como ver os logs dos jobs?"**

---

## 🎯 CHECKLIST

- [ ] Arquivo `.env` configurado com DATABASE_URL
- [ ] Script `executar-migrations.ps1` executado
- [ ] Tabelas criadas (verificar com `verificar-migrations.ps1`)
- [ ] Backend reiniciado no Railway
- [ ] Logs do backend verificados
- [ ] Endpoint `/api/admin/jobs/stats` testado
- [ ] Job de teste criado e executado

**Quando completar este checklist, o sistema estará 100% funcional!** 🚀
