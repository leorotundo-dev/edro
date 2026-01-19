# Stage 19 — Scheduler de Jobs com node-cron

**Commit:** `1a837b0`  
**Data:** Nov 25, 2025  
**Status:** ✅ Completo

---

## 📋 Resumo Executivo

Stage 19 implementa a **automação de jobs** usando node-cron, permitindo que os processos de extração de blueprints e geração de drops sejam executados automaticamente em intervalos configuráveis.

Este stage transforma o sistema de jobs do Stage 18 em um **sistema automatizado e controlável**, com logging completo e API de gerenciamento.

---

## 🏗️ Arquitetura

### Fluxo de Automação

```
Startup do Backend
    ↓
initializeScheduler()
    ↓
Buscar job_schedule do banco
    ↓
Para cada job ativo:
  ├─ Registrar cron job com node-cron
  └─ Agendar execução automática
    ↓
Quando cron dispara:
  ├─ Executar job (extract-blueprints ou generate-drops)
  ├─ Registrar log em job_logs
  └─ Atualizar status em job_schedule
```

### Componentes Implementados

#### 1. **Scheduler** (`scheduler/jobScheduler.ts`)

**Funções Principais:**
- `initializeScheduler()` — Inicializa todos os jobs do banco
- `extractBlueprintsJob()` — Processa harvests pendentes
- `generateDropsJob()` — Gera drops por tópico
- `runJobManually(jobName)` — Executa job manualmente
- `logJobExecution()` — Registra logs no banco

**Características:**
- ✅ Lê agendamentos do banco (dinâmico)
- ✅ Suporta múltiplos jobs
- ✅ Logging detalhado
- ✅ Tratamento robusto de erros
- ✅ Execução em background

#### 2. **Jobs Integrados**

**`extract-blueprints.ts`** — Processa harvests
- Busca harvest_items com status PENDING (limite 10)
- Extrai blueprint usando IA
- Salva em exam_blueprints
- Atualiza status para BLUEPRINT_DONE/BLUEPRINT_ERROR

**`generate-drops-v2.ts`** — Gera drops
- Busca exam_blueprints (limite 5)
- Para cada tópico, gera drops
- Implementa cache com hash SHA256
- Salva em drop_cache e drops

#### 3. **Tabelas de Controle** (Migração 0003)

**`job_schedule`** — Configuração de agendamentos
- `id` - PK
- `job_name` - Nome do job (UNIQUE)
- `cron_expression` - Expressão cron
- `is_active` - Ativo/inativo
- `last_run_at` - Última execução
- `next_run_at` - Próxima execução
- `created_at` - Timestamp
- `updated_at` - Timestamp

**`job_logs`** — Histórico de execuções
- `id` - PK
- `job_name` - Nome do job
- `status` - STARTED, COMPLETED, FAILED
- `started_at` - Início da execução
- `ended_at` - Fim da execução
- `items_processed` - Itens processados
- `items_failed` - Itens com falha
- `error_message` - Mensagem de erro
- `metadata` - JSONB com dados adicionais

**`drop_cache`** — Cache de drops gerados
- `id` - PK
- `blueprint_id` - FK para exam_blueprints
- `hash` - SHA256(blueprint_id:topic_code)
- `payload` - JSONB com resultado
- `created_at` - Timestamp
- UNIQUE(blueprint_id, hash)

#### 4. **Rotas de Controle** (`routes/jobs.ts`)

**GET `/api/jobs/schedules`**
- Listar todos os agendamentos
- Retorna: `JobScheduleRow[]`

**GET `/api/jobs/schedules/:jobName`**
- Buscar agendamento específico
- Retorna: `JobScheduleRow | { error }`

**PUT `/api/jobs/schedules/:jobName`**
- Atualizar agendamento
- Body: `{ cron_expression?, is_active? }`
- Retorna: `JobScheduleRow`

**POST `/api/jobs/run/:jobName`**
- Executar job manualmente
- Retorna: `{ message, jobName }`

**GET `/api/jobs/logs`**
- Listar logs com filtro e paginação
- Query: `{ jobName?, limit?, offset? }`
- Retorna: `JobLogRow[]`

**GET `/api/jobs/logs/:jobName/latest`**
- Último log de um job
- Retorna: `JobLogRow | { error }`

**GET `/api/jobs/status`**
- Status geral dos jobs
- Retorna: `{ schedules, latestLogs, totalLogs }`

#### 5. **Integração** (`index.ts`)

```typescript
import { initializeScheduler } from './scheduler/jobScheduler';

async function main() {
  // ... migrações e setup ...
  
  // Inicializar scheduler após startup
  await initializeScheduler();
}
```

---

## 📊 Configuração Padrão

Inserida automaticamente na migração:

```sql
INSERT INTO job_schedule (job_name, cron_expression, is_active)
VALUES
  ('extract-blueprints', '0 */6 * * *', true),  -- A cada 6 horas
  ('generate-drops', '0 0 * * *', true)         -- Diariamente à meia-noite
```

**Expressões Cron:**
- `0 */6 * * *` — A cada 6 horas (0h, 6h, 12h, 18h)
- `0 0 * * *` — Diariamente à meia-noite
- `0 9 * * 1-5` — Weekdays às 9h
- `*/15 * * * *` — A cada 15 minutos

---

## 🔄 Fluxo Completo

### 1. Startup do Backend
```bash
npm run dev
```

**Logs:**
```
[scheduler] Inicializando scheduler de jobs...
[scheduler] Encontrados 2 jobs agendados
[scheduler] Agendando job: extract-blueprints com cron: 0 */6 * * *
[scheduler] Agendando job: generate-drops com cron: 0 0 * * *
[scheduler] ✅ Scheduler inicializado com sucesso
```

### 2. Execução Automática (Cron)
```
[scheduler] ⏰ Executando job: extract-blueprints
[scheduler] Iniciando job: extract-blueprints
[scheduler] Encontrados 5 itens para processar
[scheduler] Processando harvest id=1
[scheduler] ✅ Sucesso para harvest id=1
...
[scheduler] ✅ Job extract-blueprints finalizado: 5 sucesso, 0 falhas
```

### 3. Execução Manual (API)
```bash
curl -X POST http://localhost:3333/api/jobs/run/extract-blueprints
```

**Resposta:**
```json
{
  "message": "Job extract-blueprints iniciado",
  "jobName": "extract-blueprints"
}
```

### 4. Consultar Status
```bash
curl http://localhost:3333/api/jobs/status
```

**Resposta:**
```json
{
  "schedules": [
    {
      "id": 1,
      "job_name": "extract-blueprints",
      "cron_expression": "0 */6 * * *",
      "is_active": true,
      "last_run_at": "2025-11-25T18:00:00Z",
      "next_run_at": "2025-11-26T00:00:00Z"
    }
  ],
  "latestLogs": {
    "extract-blueprints": {
      "id": 42,
      "job_name": "extract-blueprints",
      "status": "COMPLETED",
      "started_at": "2025-11-25T18:00:05Z",
      "ended_at": "2025-11-25T18:05:30Z",
      "items_processed": 5,
      "items_failed": 0,
      "error_message": null
    }
  },
  "totalLogs": 127
}
```

---

## 📝 Scripts NPM

Adicionados ao `package.json`:

```json
{
  "scripts": {
    "job:extract-blueprints": "ts-node --transpile-only src/jobs/extract-blueprints.ts",
    "job:generate-drops-v2": "ts-node --transpile-only src/jobs/generate-drops-v2.ts"
  }
}
```

---

## 🚀 Próximos Passos (Stages 20+)

### Stage 20: Monitoring & Alertas
- Dashboard de status dos jobs
- Alertas para falhas
- Métricas de performance

### Stage 21: Retry & Resilência
- Retry automático para falhas
- Backoff exponencial
- Dead letter queue

### Stage 22: Distribuição
- Suporte a múltiplas instâncias
- Distributed locking
- Job deduplication

### Stage 23: Analytics
- Métricas detalhadas
- Gráficos de performance
- Alertas inteligentes

---

## 📂 Arquivos Modificados/Criados

### Novos Arquivos
- `src/scheduler/jobScheduler.ts` - 305 linhas
- `src/routes/jobs.ts` - 230 linhas
- `src/jobs/extract-blueprints.ts` - 80 linhas
- `src/jobs/generate-drops-v2.ts` - 105 linhas
- `src/db/migrations/0003_stage19_tables.sql` - 60 linhas

### Arquivos Modificados
- `src/index.ts` - Adicionada inicialização do scheduler
- `src/routes/index.ts` - Adicionada rota de jobs
- `package.json` - Adicionados node-cron e scripts
- `tsconfig.json` - Adicionado skipLibCheck

### Total
- **5 arquivos novos** (780 linhas)
- **4 arquivos modificados**
- **Build:** ✅ Sem erros TypeScript

---

## ✅ Checklist de Implementação

- [x] Integrar jobs do Stage 19
- [x] Implementar scheduler com node-cron
- [x] Criar tabelas de controle (job_schedule, job_logs)
- [x] Criar sistema de logging
- [x] Criar rotas de controle de jobs
- [x] Adicionar execução manual de jobs
- [x] Integrar scheduler no startup
- [x] Corrigir erros de compilação
- [x] Fazer build sem erros
- [x] Fazer commit e push
- [x] Documentar Stage 19

---

## 🔗 Referências

- **Commit:** https://github.com/leorotundo-dev/memodrops/commit/1a837b0
- **Branch:** main
- **Documentação:** docs/STAGE_19_COMPLETO.md
- **node-cron:** https://github.com/kelektiv/node-cron

---

## 📌 Notas Importantes

1. **Cron Expressions:** Usar formato padrão de 6 campos (segundos minutos horas dia mês dia_semana)
2. **Timezone:** Usa timezone do servidor (via NODE_TZ ou system)
3. **Background:** Jobs executam em background, não bloqueiam o servidor
4. **Logging:** Todos os jobs registram logs no banco para auditoria
5. **Paginação:** Logs suportam limit (max 100) e offset
6. **Cache:** Drop cache evita reprocessamento com hash SHA256

---

## 🎯 Métricas de Sucesso

- ✅ Backend compila sem erros
- ✅ Scheduler inicializa ao startup
- ✅ Jobs executam automaticamente
- ✅ Logs são registrados no banco
- ✅ API de controle funciona
- ✅ Execução manual de jobs funciona
- ✅ Status geral dos jobs disponível

---

**Status:** ✅ COMPLETO E PRONTO PARA PRODUÇÃO

Próximo Stage: 20 (Monitoring & Alertas)
