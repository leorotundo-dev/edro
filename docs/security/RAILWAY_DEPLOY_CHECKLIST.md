# Railway Deploy Checklist

## Fluxo padrao — Auto-deploy em producao

1. Merge do PR em `main`
2. GitHub roda:
   - `Security Gates`
   - `Secret Scan`
   - `CodeQL`
3. Se todos passarem, o workflow `Deploy Production` publica automaticamente:
   - `edro-backend`
   - `edro-web`
   - `edro-web-cliente`
   - `edro-web-freelancer`

### Pre-requisito de infraestrutura

No GitHub, configurar o secret:

```bash
RAILWAY_TOKEN=<project-token-ou-account-token-com-permissao-de-deploy>
```

Pode ser:
- repo secret `RAILWAY_TOKEN`
- ou environment secret `production`

O workflow le `projectId` e `environment` diretamente de `.railway/config.json`.

### Guard rail de migrations

Se o merge alterar qualquer arquivo em:

```bash
apps/backend/src/db/migrations/**
```

o auto-deploy falha de proposito.

Nesses casos:
1. rode as migrations em producao
2. valide o banco
3. reexecute `Deploy Production` via `workflow_dispatch`
4. marque `skip_migration_guard=true`

---

## Fallback manual — Apenas emergencia

Use deploy manual so quando:
- o GitHub Actions estiver indisponivel
- for necessario redeploy pontual fora do fluxo normal
- houver autorizacao explicita para sobrescrever a versao em prod

Antes do deploy manual:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/railway-version-lock.ps1 -Mode check
```

Depois de um deploy manual autorizado:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/railway-version-lock.ps1 -Mode set
```

---

## Passo 2 — Variáveis de ambiente no Railway

No painel do Railway, vá em **Variables** do serviço `backend` e adicione/atualize:

```
# MFA — habilita enforcement para admins em prod
EDRO_ENFORCE_PRIVILEGED_MFA=true

# Publisher webhook — gere um valor seguro com:
#   openssl rand -hex 32
GATEWAY_SHARED_SECRET=<gere com openssl rand -hex 32>

# D4Sign (se ainda não estiver setado)
D4SIGN_TOKEN_API=<token da conta D4Sign>
D4SIGN_HMAC_SECRET=<chave HMAC da conta D4Sign>
D4SIGN_WEBHOOK_SECRET=<gere com openssl rand -hex 32>

# Redis (para rate limiting distribuído entre réplicas)
# Se não tiver Redis no Railway, adicione um serviço Redis e copie a URL
REDIS_URL=<URL do Redis Railway>
```

Para gerar os valores aleatórios no terminal:
```bash
openssl rand -hex 32
```

---

## Passo 3 — Migrations no banco de produção

Execute nesta ordem exata no psql da prod (Railway → banco → Connect):

```sql
-- 1. audit_log + refresh_tokens (base de segurança)
\i apps/backend/src/db/migrations/0108_security_audit_publish.sql

-- 2. Contrato D4Sign nos perfis de freelancer
\i apps/backend/src/db/migrations/0293_freelancer_contract.sql

-- 3. Campos de representante no tenant_config (necessário para contratos)
\i apps/backend/src/db/migrations/0294_tenant_config_representative.sql

-- 4. skills_json no perfil do freelancer
\i apps/backend/src/db/migrations/0295_freelancer_skills_json.sql

-- 5. MFA — tabela edro_user_mfa + coluna mfa_verified em refresh_tokens
\i apps/backend/src/db/migrations/0296_user_mfa.sql
```

Ou se preferir rodar direto pelo psql como string:

```bash
# Conectar no banco do Railway
psql "postgresql://..." -f apps/backend/src/db/migrations/0108_security_audit_publish.sql
psql "postgresql://..." -f apps/backend/src/db/migrations/0293_freelancer_contract.sql
psql "postgresql://..." -f apps/backend/src/db/migrations/0294_tenant_config_representative.sql
psql "postgresql://..." -f apps/backend/src/db/migrations/0295_freelancer_skills_json.sql
psql "postgresql://..." -f apps/backend/src/db/migrations/0296_user_mfa.sql
```

Todas as migrations usam `IF NOT EXISTS` — são seguras para rodar mesmo se já aplicadas parcialmente.

---

## Passo 4 — Validação pós-deploy

Após o deploy, verifique:

- `[server] Servidor iniciado` (sem erros de `Configuração insegura de ambiente`)
- Login normal funcionando
- `GET /api/health` retorna 200

No fluxo automatico, consulte tambem:
- summary do workflow `Deploy Production`
- artifact `railway-deployment-lock`

Se aparecer `GATEWAY_SHARED_SECRET é obrigatório em produção/staging`, a variável não foi setada.

---

## O que este deploy entrega

| Frente | O que muda em prod |
|---|---|
| MFA | Admins bloqueados até ativar TOTP (quando `EDRO_ENFORCE_PRIVILEGED_MFA=true`) |
| IDOR | 8 endpoints de mutação agora exigem `tenant_id` correto no banco |
| Webhooks | D4Sign, Evolution, Recall, WhatsApp, Publisher → fail-closed |
| Rate limiting | AI gen (20/min), export (10/min), public approval (30/min), body caps |
| Audit log | Role changes, permissões, exports → auditáveis na tabela `audit_log` |
