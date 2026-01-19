# ✅ CHECKLIST - SISTEMA DE JOBS

## 📋 FASE 1: PRÉ-REQUISITOS

- [ ] **Acesso ao Railway**
  - [ ] Login funcionando
  - [ ] Projeto MemoDrops visível
  - [ ] Serviço PostgreSQL ativo
  - [ ] Serviço Backend ativo

- [ ] **Configuração Local**
  - [ ] Projeto clonado
  - [ ] Node.js instalado
  - [ ] PowerShell disponível
  - [ ] Arquivo `.env` pronto

- [ ] **DATABASE_URL Configurada**
  - [ ] Copiada do Railway
  - [ ] Colada no arquivo `.env`
  - [ ] Formato correto verificado
  - [ ] Testada conexão

---

## 📋 FASE 2: EXECUÇÃO

### Opção A: PowerShell Script

- [ ] **Preparação**
  - [ ] Abrir PowerShell na raiz do projeto
  - [ ] Verificar arquivo `executar-migrations.ps1` existe
  - [ ] Permissões de execução OK

- [ ] **Executar**
  - [ ] Rodar: `.\executar-migrations.ps1`
  - [ ] Aguardar conclusão
  - [ ] Verificar mensagem de sucesso
  - [ ] Sem erros no output

### Opção B: SQL Direto

- [ ] **Preparação**
  - [ ] Acessar Railway → PostgreSQL → Query
  - [ ] Abrir arquivo `EXECUTAR_NO_RAILWAY.sql`
  - [ ] Copiar todo o conteúdo

- [ ] **Executar**
  - [ ] Colar no Query Editor
  - [ ] Clicar em "Run Query"
  - [ ] Aguardar conclusão
  - [ ] Verificar resultados

---

## 📋 FASE 3: VERIFICAÇÃO

- [ ] **Tabelas Criadas**
  - [ ] Tabela `jobs` existe
  - [ ] Tabela `job_schedules` existe
  - [ ] Tabela `job_logs` existe
  - [ ] Tabela `harvest_sources` existe
  - [ ] Tabela `harvested_content` existe

**SQL de verificação:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content');
```

- [ ] **Jobs Agendados Criados**
  - [ ] Daily Cleanup (4 registros esperados)
  - [ ] Daily Harvest
  - [ ] Weekly Stats Update
  - [ ] Weekly Embedding Generation

**SQL de verificação:**
```sql
SELECT name, enabled FROM job_schedules;
```

- [ ] **Índices Criados**
  - [ ] Verificar índices em jobs
  - [ ] Verificar índices em job_schedules
  - [ ] Verificar índices em job_logs

**SQL de verificação:**
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE '%job%';
```

---

## 📋 FASE 4: BACKEND

- [ ] **Reiniciar Backend**
  - [ ] Acessar Railway → Backend
  - [ ] Clicar em "Restart"
  - [ ] Aguardar deploy completo
  - [ ] Status = "Active"

- [ ] **Verificar Logs**
  - [ ] Acessar Railway → Backend → Logs
  - [ ] Procurar: "Conectado ao PostgreSQL"
  - [ ] Procurar: "Job worker iniciado"
  - [ ] Procurar: "Servidor rodando na porta"
  - [ ] SEM erros relacionados a "jobs"

**Logs esperados:**
```
✅ Conectado ao PostgreSQL
🚀 Job worker iniciado
✅ Servidor rodando na porta 3000
```

---

## 📋 FASE 5: TESTES

- [ ] **Health Check**
  ```bash
  curl https://seu-backend.railway.app/health
  ```
  - [ ] Status 200
  - [ ] Resposta JSON
  - [ ] Database: "connected"

- [ ] **Jobs Stats**
  ```bash
  curl https://seu-backend.railway.app/api/admin/jobs/stats
  ```
  - [ ] Status 200
  - [ ] Campos: total, pending, running, completed, failed
  - [ ] Valores numéricos

- [ ] **Listar Jobs**
  ```bash
  curl https://seu-backend.railway.app/api/admin/jobs
  ```
  - [ ] Status 200
  - [ ] Array de jobs (pode estar vazio)

- [ ] **Criar Job de Teste**
  ```bash
  curl -X POST https://seu-backend.railway.app/api/admin/jobs \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Job","type":"cleanup","priority":5}'
  ```
  - [ ] Status 201 ou 200
  - [ ] Retorna ID do job
  - [ ] Job criado no banco

- [ ] **Verificar Execução**
  ```sql
  SELECT * FROM jobs ORDER BY created_at DESC LIMIT 1;
  ```
  - [ ] Job aparece
  - [ ] Status mudou para "running" ou "completed"
  - [ ] Sem erros

---

## 📋 FASE 6: VALIDAÇÃO FINAL

- [ ] **Sistema Operacional**
  - [ ] Jobs sendo criados
  - [ ] Jobs sendo executados
  - [ ] Jobs sendo completados
  - [ ] Logs sendo registrados
  - [ ] Worker rodando continuamente

- [ ] **Performance**
  - [ ] Backend responde em <1s
  - [ ] Jobs executam em tempo razoável
  - [ ] Sem travamentos
  - [ ] Sem memory leaks

- [ ] **Monitoramento**
  - [ ] Dashboard acessível
  - [ ] Estatísticas corretas
  - [ ] Logs visíveis
  - [ ] Métricas OK

---

## 📋 FASE 7: CONFIGURAÇÃO AVANÇADA (Opcional)

- [ ] **Ajustar Schedules**
  - [ ] Revisar horários dos jobs
  - [ ] Ativar/desativar conforme necessário
  - [ ] Adicionar novos jobs agendados

- [ ] **Otimizações**
  - [ ] Configurar alertas
  - [ ] Configurar backup automático
  - [ ] Ajustar retention policies

- [ ] **Documentação**
  - [ ] Documentar jobs customizados
  - [ ] Atualizar README se necessário
  - [ ] Registrar mudanças

---

## 📋 FASE 8: PRODUÇÃO

- [ ] **Monitoramento Contínuo**
  - [ ] Verificar logs diariamente
  - [ ] Acompanhar taxa de sucesso
  - [ ] Identificar jobs lentos
  - [ ] Limpar jobs antigos semanalmente

- [ ] **Manutenção**
  - [ ] Backup regular
  - [ ] Atualizar documentação
  - [ ] Revisar performance
  - [ ] Otimizar queries

- [ ] **Escalabilidade**
  - [ ] Planejar crescimento
  - [ ] Considerar workers adicionais
  - [ ] Otimizar recursos
  - [ ] Monitorar custos

---

## ✅ CHECKLIST RÁPIDO (TL;DR)

### Antes de Começar
- [ ] DATABASE_URL configurada
- [ ] Acesso ao Railway

### Executar
- [ ] Rodar `.\executar-migrations.ps1` OU executar SQL no Railway
- [ ] Verificar mensagem de sucesso

### Verificar
- [ ] 5 tabelas criadas
- [ ] 4 jobs agendados ativos
- [ ] Backend reiniciado

### Testar
- [ ] Endpoint `/health` OK
- [ ] Endpoint `/api/admin/jobs/stats` OK
- [ ] Criar job de teste OK

### Finalizar
- [ ] Logs sem erros
- [ ] Sistema funcionando
- [ ] Documentação lida

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Sistema OK se:
- Todas as tabelas criadas ✅
- Backend sem erros ✅
- Worker iniciado ✅
- Endpoints respondendo ✅
- Job de teste executado ✅

### ⚠️ Revisar se:
- Alguma tabela faltando
- Erros nos logs
- Endpoints não respondendo
- Jobs não executando
- Worker não iniciando

### ❌ Falhou se:
- Migrações com erro
- Backend não inicia
- Tabelas não criadas
- Endpoints 500
- Jobs sempre em pending

---

## 📊 PROGRESSO GERAL

```
FASE 1: Pré-requisitos      [ ] 0%
FASE 2: Execução            [ ] 0%
FASE 3: Verificação         [ ] 0%
FASE 4: Backend             [ ] 0%
FASE 5: Testes              [ ] 0%
FASE 6: Validação Final     [ ] 0%
FASE 7: Config Avançada     [ ] 0%
FASE 8: Produção            [ ] 0%

TOTAL:                      [ ] 0%
```

**Meta:** 100% ✅

---

## 🎉 CELEBRAÇÃO

Quando completar 100% deste checklist:

✨ **Parabéns!** ✨

Você implementou com sucesso o Sistema de Jobs do MemoDrops!

**O que você conseguiu:**
- ✅ 5 tabelas criadas
- ✅ 4 jobs agendados
- ✅ Sistema de automação funcionando
- ✅ Monitoramento ativo
- ✅ API completa

**Próximos passos:**
- 🚀 Adicionar mais jobs customizados
- 🚀 Configurar alertas
- 🚀 Otimizar performance
- 🚀 Escalar o sistema

---

## 📞 SUPORTE

**Se travou em algum passo:**
1. Marque onde parou
2. Anote o erro (se houver)
3. Me avise mencionando a FASE e o PASSO
4. Cole logs/erros relevantes

**Exemplo:** 
"Travei na FASE 3, passo 'Tabelas Criadas'. SQL retornou apenas 3 tabelas ao invés de 5."

---

**💡 Dica:** Marque cada checkbox conforme avança. Isso ajuda a acompanhar o progresso!

**🚀 Pronto? Comece pela FASE 1!**
