# 📚 SISTEMA DE JOBS - DOCUMENTAÇÃO COMPLETA

## 📋 ÍNDICE DE ARQUIVOS

### 🚀 INÍCIO RÁPIDO
1. **[EXECUTAR_AGORA_1_MINUTO.md](./EXECUTAR_AGORA_1_MINUTO.md)** ⚡  
   → Comece aqui! Guia ultra-rápido de 1 minuto

2. **[COMECE_AQUI_JOBS.md](./COMECE_AQUI_JOBS.md)** 📖  
   → Guia completo para iniciantes

### 🛠️ EXECUTAR MIGRAÇÕES
3. **[EXECUTAR_MIGRATIONS.md](./EXECUTAR_MIGRATIONS.md)** 📝  
   → Instruções detalhadas de todas as opções

4. **[EXECUTAR_NO_RAILWAY.sql](./EXECUTAR_NO_RAILWAY.sql)** 🗄️  
   → SQL pronto para copiar e colar no Railway

5. **[executar-migrations.ps1](./executar-migrations.ps1)** 💻  
   → Script PowerShell automatizado

### ✅ VERIFICAÇÃO
6. **[verificar-migrations.ps1](./verificar-migrations.ps1)** 🔍  
   → Script para verificar se tudo funcionou

### 📚 REFERÊNCIA
7. **[REFERENCIA_RAPIDA_JOBS.md](./REFERENCIA_RAPIDA_JOBS.md)** 📖  
   → Comandos SQL, endpoints, troubleshooting

---

## 🎯 QUAL ARQUIVO DEVO LER?

### Se você tem **1 minuto**:
👉 Leia: **EXECUTAR_AGORA_1_MINUTO.md**

### Se você é **iniciante**:
👉 Leia: **COMECE_AQUI_JOBS.md**

### Se você quer **detalhes técnicos**:
👉 Leia: **EXECUTAR_MIGRATIONS.md**

### Se você quer **executar SQL direto**:
👉 Abra: **EXECUTAR_NO_RAILWAY.sql**

### Se você quer **automatizar**:
👉 Execute: **executar-migrations.ps1**

### Se você quer **verificar**:
👉 Execute: **verificar-migrations.ps1**

### Se você precisa de **referência rápida**:
👉 Consulte: **REFERENCIA_RAPIDA_JOBS.md**

---

## 📊 RESUMO DO PROBLEMA

### ❌ SITUAÇÃO ATUAL:
- Backend conectando ao PostgreSQL ✅
- Tabelas `jobs` e `job_schedules` **NÃO EXISTEM** ❌
- Erro: `relation "jobs" does not exist`

### ✅ SOLUÇÃO:
- Executar as migrações SQL
- Criar as tabelas necessárias
- Reiniciar o backend

### 🎯 RESULTADO:
- 5 novas tabelas criadas
- 4 jobs agendados ativos
- Sistema de jobs funcionando 100%

---

## 🗂️ ESTRUTURA DO SISTEMA

### Tabelas Criadas:
1. **jobs** - Armazena jobs para execução
2. **job_schedules** - Jobs agendados (cron-like)
3. **job_logs** - Logs de execução
4. **harvest_sources** - Fontes de conteúdo
5. **harvested_content** - Conteúdo coletado

### Jobs Agendados Padrão:
1. **Daily Cleanup** - Limpa dados antigos (3h)
2. **Daily Harvest** - Busca conteúdo (2h)
3. **Weekly Stats Update** - Atualiza stats (domingo 4h)
4. **Weekly Embedding Generation** - Gera embeddings (sábado 1h)

### Tipos de Jobs:
- `harvest` - Buscar conteúdo externo
- `generate_embeddings` - Gerar embeddings
- `generate_drops` - Gerar drops com IA
- `generate_questions` - Gerar questões com IA
- `cleanup` - Limpar dados antigos
- `update_stats` - Atualizar estatísticas

---

## 🔄 FLUXO DE EXECUÇÃO

```
1. EXECUTAR MIGRAÇÕES
   ↓
2. TABELAS CRIADAS
   ↓
3. REINICIAR BACKEND
   ↓
4. JOB WORKER INICIA
   ↓
5. SISTEMA FUNCIONANDO ✅
```

---

## 🎯 MÉTODOS DE EXECUÇÃO

### Método 1: PowerShell Script ⚡
```powershell
.\executar-migrations.ps1
```
**Vantagens:**
- ✅ Automatizado
- ✅ Verifica erros
- ✅ Mostra progresso
- ✅ Funciona local e Railway

### Método 2: SQL Direto 🗄️
```sql
-- Copiar EXECUTAR_NO_RAILWAY.sql
-- Colar no Railway Query Editor
-- Run Query
```
**Vantagens:**
- ✅ Mais rápido
- ✅ Sem dependências
- ✅ Visual no Railway
- ✅ Feedback imediato

### Método 3: NPM Command 💻
```bash
cd apps/backend
npm run db:migrate
```
**Vantagens:**
- ✅ Via código
- ✅ Controle de versão
- ✅ Rollback possível
- ✅ Melhor para produção

---

## 📈 ENDPOINTS DA API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/jobs/stats` | Estatísticas gerais |
| GET | `/api/admin/jobs` | Listar todos os jobs |
| GET | `/api/admin/jobs/:id` | Ver job específico |
| POST | `/api/admin/jobs` | Criar novo job |
| POST | `/api/admin/jobs/:id/execute` | Executar job manualmente |
| POST | `/api/admin/jobs/:id/cancel` | Cancelar job |
| GET | `/api/admin/jobs/schedules` | Listar jobs agendados |
| PATCH | `/api/admin/jobs/schedules/:id` | Atualizar schedule |
| GET | `/api/admin/jobs/:id/logs` | Ver logs do job |

---

## 🔍 COMANDOS SQL ÚTEIS

### Verificar Tabelas:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%job%';
```

### Ver Jobs:
```sql
SELECT * FROM jobs ORDER BY created_at DESC;
```

### Ver Jobs Agendados:
```sql
SELECT * FROM job_schedules WHERE enabled = true;
```

### Ver Logs:
```sql
SELECT * FROM job_logs ORDER BY timestamp DESC LIMIT 10;
```

### Estatísticas:
```sql
SELECT status, COUNT(*) FROM jobs GROUP BY status;
```

---

## 🐛 TROUBLESHOOTING

### ❌ "relation 'jobs' does not exist"
**Solução:** Execute as migrações
```powershell
.\executar-migrations.ps1
```

### ❌ "DATABASE_URL não encontrada"
**Solução:** Configure o `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:port/db
```

### ❌ "Job worker não inicia"
**Solução:** 
1. Verifique logs do backend
2. Reinicie o backend no Railway
3. Verifique se as tabelas existem

### ⚠️ "Jobs ficam em pending"
**Solução:**
1. Verificar se backend está rodando
2. Verificar se worker está iniciado (logs)
3. Reiniciar backend

---

## ✅ CHECKLIST COMPLETO

- [ ] **ANTES:**
  - [ ] DATABASE_URL configurada
  - [ ] Acesso ao Railway
  - [ ] Backend deployado

- [ ] **EXECUTAR:**
  - [ ] Migrações executadas
  - [ ] Sem erros no processo
  - [ ] Confirmação visual

- [ ] **VERIFICAR:**
  - [ ] Tabelas criadas
  - [ ] Jobs agendados ativos
  - [ ] Backend reiniciado
  - [ ] Logs sem erros

- [ ] **TESTAR:**
  - [ ] Endpoint `/api/admin/jobs/stats` respondendo
  - [ ] Job de teste criado
  - [ ] Job executado com sucesso
  - [ ] Logs visíveis

- [ ] **PRODUÇÃO:**
  - [ ] Monitoramento ativo
  - [ ] Backups configurados
  - [ ] Alertas configurados
  - [ ] Documentação atualizada

---

## 🎉 RESULTADO FINAL

Após completar todos os passos:

✅ **5 tabelas criadas**  
✅ **4 jobs agendados ativos**  
✅ **Sistema de jobs funcionando**  
✅ **API respondendo**  
✅ **Worker processando**  
✅ **Logs registrados**  

---

## 📞 SUPORTE

Se você encontrar problemas:

1. **Verifique os logs:**
   - Railway → Backend → Logs
   - Procure por erros

2. **Execute verificação:**
   ```powershell
   .\verificar-migrations.ps1
   ```

3. **Consulte referência:**
   - `REFERENCIA_RAPIDA_JOBS.md`

4. **Me avise:**
   - "Executei mas deu erro X"
   - "Preciso de ajuda com Y"
   - Cole os logs/erros

---

## 📚 ARQUITETURA

```
┌─────────────────────────────────────────────┐
│           CRONSERVICE.TS                    │
│  (Verifica job_schedules periodicamente)    │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           TABELA: jobs                      │
│  (pending, running, completed, failed)      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           JOBSERVICE.TS                     │
│  (Worker que processa a fila)               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           JOB HANDLERS                      │
│  - harvestService                           │
│  - openaiService                            │
│  - embeddingsService                        │
│  - etc                                      │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           TABELA: job_logs                  │
│  (Registros de execução)                    │
└─────────────────────────────────────────────┘
```

---

## 🔐 SEGURANÇA

- ✅ Transações SQL para atomicidade
- ✅ Índices para performance
- ✅ Logs de auditoria
- ✅ Retry automático em falhas
- ✅ Cleanup de dados antigos
- ✅ Rate limiting (futuro)

---

## 📊 MÉTRICAS

Após o sistema em produção:

- **Jobs/dia:** ~100-500
- **Taxa de sucesso:** >95%
- **Tempo médio:** <30s
- **Retenção de logs:** 60 dias
- **Retenção de jobs:** 30 dias

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ **Executar migrações**
2. ✅ **Verificar funcionamento**
3. 🔄 **Monitorar performance**
4. 🔄 **Ajustar schedules**
5. 🔄 **Adicionar novos jobs**
6. 🔄 **Configurar alertas**

---

## 📖 HISTÓRICO DE VERSÕES

- **v1.0** - Sistema básico de jobs
- **v1.1** - Jobs agendados (cron)
- **v1.2** - Logs de execução
- **v1.3** - Harvest sources
- **v1.4** - Retry automático

---

**🎯 Pronto para começar? Abra: [EXECUTAR_AGORA_1_MINUTO.md](./EXECUTAR_AGORA_1_MINUTO.md)**
