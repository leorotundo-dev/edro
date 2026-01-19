# Sistema de Migrações - Edro

## Estrutura

```
apps/backend/src/db/
├── db.ts              # Pool de conexão PostgreSQL
├── index.ts           # Re-exports
├── migrate.ts         # Runner de migrações
├── migrations/        # Arquivos SQL de migração
│   ├── 0001_existing_schema.sql
│   └── 0002_new_stage16_tables.sql
└── README.md          # Este arquivo
```

## Como funciona

O sistema de migrações usa a tabela `schema_migrations` para controlar quais migrações já foram aplicadas.

### Tabela de controle

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Fluxo de execução

1. `migrate.ts` verifica se `schema_migrations` existe
2. Lista todos os arquivos `.sql` em `migrations/`
3. Compara com as migrações já aplicadas
4. Executa apenas as novas migrações em ordem
5. Registra cada migração aplicada

## Como usar

### Desenvolvimento

```bash
npm run db:migrate --workspace @edro/backend
```

### Produção (Railway)

```bash
node dist/db/migrate.js
```

## Migrações existentes

### 0001_existing_schema.sql
- Registra o estado inicial do banco
- NÃO cria tabelas (já existem)
- Tabelas: users, disciplines, drops, user_drops, srs_cards, srs_reviews, rag_blocks, drop_cache

### 0002_new_stage16_tables.sql
- Cria tabelas novas do Stage 16
- Tabelas: harvest_items (legado), harvest_sources, harvested_content, exam_blueprints, qa_reviews, metrics_daily, user_stats, topic_prereqs, exam_logs

## Criar nova migração

1. Criar arquivo `migrations/XXXX_description.sql`
2. Usar numeração sequencial (0003, 0004, etc)
3. Sempre usar `CREATE TABLE IF NOT EXISTS`
4. Usar transações (BEGIN/COMMIT) para operações complexas
5. Testar localmente antes de fazer deploy

## Segurança

- ✅ Cada migração roda em uma transação
- ✅ Rollback automático em caso de erro
- ✅ Migrações são idempotentes (podem rodar múltiplas vezes)
- ✅ Ordem garantida por ordenação alfabética dos nomes
