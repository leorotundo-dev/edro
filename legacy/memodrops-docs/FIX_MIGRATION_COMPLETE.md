# 🔧 FIX COMPLETO - MIGRAÇÕES DO MEMODROPS

## 🎯 Problema Identificado

A migração **0003_stage19_tables.sql** está falhando com o erro:
```
column "hash" does not exist
```

### Causa Raiz
A tabela `drop_cache` já existe no banco com a coluna `cache_key`, mas a migração 0003 espera uma coluna chamada `hash`. Quando tenta criar índices em `drop_cache(hash)`, falha porque a coluna não existe.

---

## ✅ SOLUÇÃO RÁPIDA (2 MINUTOS)

### Método 1: Executar SQL de Correção no Railway

1. **Acesse o Railway:**
   - Vá para https://railway.app
   - Abra o projeto MemoDrops
   - Clique no serviço **PostgreSQL**
   - Clique na aba **Query**

2. **Execute o SQL de correção:**
   - Copie todo o conteúdo do arquivo `FIX_MIGRATION_0003.sql`
   - Cole no Query Editor
   - Clique em **Run Query**

3. **Verificar sucesso:**
   - Você deve ver mensagens como:
     ```
     ✅ Coluna cache_key renomeada para hash
     ✅ Tabela drop_cache criada
     ✅ Índices criados
     ✅ MIGRAÇÃO 0003 COMPLETA!
     ```

4. **Reiniciar o Backend:**
   - Volte para a tela principal do Railway
   - Clique no serviço **Backend**
   - Clique em **Settings** → **Restart**
   - Aguarde 2 minutos

---

## 📋 O QUE O FIX FAZ

### Passo 1: Corrige drop_cache
- Renomeia `cache_key` → `hash`
- Adiciona coluna `topic_code` se não existir
- Garante compatibilidade com código existente

### Passo 2: Atualiza tabela drops
- Adiciona `blueprint_id`
- Adiciona `topic_code`
- Adiciona `drop_type`
- Adiciona `drop_text`

### Passo 3: Cria job_logs
- Sistema de logs de jobs
- Rastreamento de execuções

### Passo 4: Cria job_schedule
- Agendamento de jobs (cron)
- Controle de execução

### Passo 5: Cria Índices
- Performance otimizada
- Queries mais rápidas

### Passo 6: Agendamentos Default
- extract-blueprints (6/6h)
- generate-drops (diário)
- rag-feeder (diário)

### Passo 7: Marca Migração como Aplicada
- Registra 0003 no schema_migrations
- Permite que próximas migrações rodem

---

## 🔍 VERIFICAÇÃO PÓS-FIX

### 1. No Railway Query Editor:
```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('drop_cache', 'job_logs', 'job_schedule', 'jobs', 'job_schedules', 'harvest_sources', 'harvested_content')
ORDER BY table_name;
```

### 2. Verificar colunas de drop_cache:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drop_cache'
ORDER BY ordinal_position;
```

Deve mostrar:
- `id`
- `blueprint_id`
- `hash` ← **IMPORTANTE: deve ser 'hash', não 'cache_key'**
- `payload`
- `created_at`
- `topic_code`

### 3. Verificar migrações aplicadas:
```sql
SELECT name, run_at 
FROM schema_migrations 
ORDER BY run_at DESC;
```

Deve incluir:
- ✅ `0001_existing_schema.sql`
- ✅ `0002_new_stage16_tables.sql`
- ✅ `0003_stage19_tables.sql` ← **Deve aparecer!**

### 4. Verificar logs do backend:
- Deve mostrar:
  ```
  ✅ Migração 0003_stage19_tables.sql aplicada com sucesso!
  🔄 Executando migração 0004_tracking_system.sql...
  [jobs] 🚀 Job worker iniciado
  [cron] 🕐 Cron iniciado
  ```

- **NÃO** deve mostrar:
  ```
  ❌ column "hash" does not exist
  ❌ relation "jobs" does not exist
  ```

---

## 🚨 SE O FIX NÃO FUNCIONAR

### Opção 1: Reset Completo da Migração 0003

```sql
-- 1. Remover registro da migração
DELETE FROM schema_migrations WHERE name = '0003_stage19_tables.sql';

-- 2. Dropar objetos criados pela 0003
DROP TABLE IF EXISTS job_schedule CASCADE;
DROP TABLE IF EXISTS job_logs CASCADE;
DROP INDEX IF EXISTS idx_drop_cache_blueprint;
DROP INDEX IF EXISTS idx_drop_cache_hash;
DROP INDEX IF EXISTS idx_drops_blueprint;
DROP INDEX IF EXISTS idx_drops_topic_code;

-- 3. Recriar drop_cache do zero
DROP TABLE IF EXISTS drop_cache CASCADE;
CREATE TABLE drop_cache (
  id SERIAL PRIMARY KEY,
  blueprint_id INTEGER REFERENCES exam_blueprints(id) ON DELETE CASCADE,
  hash VARCHAR(64) NOT NULL,
  payload JSONB,
  topic_code VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blueprint_id, hash)
);

-- 4. Executar FIX_MIGRATION_0003.sql novamente
```

### Opção 2: Migração Manual de Dados

Se houver dados na tabela `drop_cache` que você quer preservar:

```sql
-- 1. Backup dos dados
CREATE TABLE drop_cache_backup AS SELECT * FROM drop_cache;

-- 2. Recriar tabela
DROP TABLE drop_cache CASCADE;
CREATE TABLE drop_cache (
  id SERIAL PRIMARY KEY,
  blueprint_id INTEGER REFERENCES exam_blueprints(id) ON DELETE CASCADE,
  hash VARCHAR(64) NOT NULL,
  payload JSONB,
  topic_code VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blueprint_id, hash)
);

-- 3. Restaurar dados (ajustando cache_key → hash)
INSERT INTO drop_cache (id, blueprint_id, hash, payload, topic_code, created_at)
SELECT id, blueprint_id, cache_key, payload, topic_code, created_at 
FROM drop_cache_backup;

-- 4. Ajustar sequence
SELECT setval('drop_cache_id_seq', (SELECT MAX(id) FROM drop_cache));

-- 5. Executar FIX_MIGRATION_0003.sql
```

---

## 📊 PRÓXIMAS MIGRAÇÕES

Depois que 0003 estiver ok, as próximas migrações vão rodar automaticamente:

- ✅ **0004_tracking_system.sql** - Sistema de tracking
- ✅ **0005_recco_engine.sql** - Recommendation Engine
- ✅ **0006_questoes_simulados.sql** - Sistema de questões
- ✅ **0007_srs_progress_mnemonicos.sql** - SRS e progresso
- ✅ **0008_logs_ops_observability.sql** - Logs e observabilidade
- ✅ **0009_questoes_english_columns.sql** - Suporte inglês
- ✅ **0010_auth_advanced.sql** - Auth avançado
- ✅ **0011_jobs_system.sql** - Sistema de jobs completo
- ✅ **0012_backup_system.sql** - Sistema de backup

---

## 🎯 RESUMO EXECUTIVO

| Item | Status | Ação |
|------|--------|------|
| Problema | ❌ Coluna 'hash' não existe | Identificado |
| Causa | ❌ Tabela tem 'cache_key' | Identificado |
| Solução | ✅ FIX_MIGRATION_0003.sql | Pronto |
| Execução | ⏳ Aguardando | Execute no Railway |
| Teste | ⏳ Aguardando | Verificar logs |

---

## 📞 PRÓXIMOS PASSOS

1. ✅ **VOCÊ:** Execute `FIX_MIGRATION_0003.sql` no Railway
2. ✅ **VOCÊ:** Reinicie o backend no Railway
3. ✅ **VOCÊ:** Copie os logs do backend e me envie
4. ✅ **EU:** Verifico se está tudo ok ou ajudo com próximos passos

---

## 💡 DICA PRO

Para evitar problemas futuros, sempre que adicionar uma migração:

1. Use `IF NOT EXISTS` para criar tabelas
2. Use `IF NOT EXISTS` para criar colunas (via DO blocks)
3. Use `ON CONFLICT DO NOTHING` para inserções
4. Teste localmente antes de aplicar em produção
5. Faça backup antes de rodar migrações grandes

---

## 🚀 BORA EXECUTAR!

Copie o SQL de `FIX_MIGRATION_0003.sql` e execute no Railway Query Editor.

Me avise quando terminar! 💪
