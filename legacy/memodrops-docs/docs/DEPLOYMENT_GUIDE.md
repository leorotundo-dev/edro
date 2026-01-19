# 🚀 Guia de Deployment — MemoDrops

**Data:** Nov 25, 2025  
**Status:** ✅ Pronto para Produção  
**Plataforma:** Railway  
**CI/CD:** GitHub Actions

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Deployment Manual](#deployment-manual)
4. [Deployment Automático](#deployment-automático)
5. [Monitoramento](#monitoramento)
6. [Troubleshooting](#troubleshooting)
7. [Rollback](#rollback)

---

## 🔧 Pré-requisitos

### Contas Necessárias
- [Railway.app](https://railway.app) — Plataforma de deploy
- [GitHub](https://github.com) — Controle de versão
- [OpenAI](https://openai.com) — API de IA

### Ferramentas Locais
```bash
# Node.js 20+
node --version

# npm 10+
npm --version

# Railway CLI
npm install -g @railway/cli

# Git
git --version
```

### Variáveis de Ambiente

**Railway:**
- `DATABASE_URL` — PostgreSQL connection string
- `OPENAI_API_KEY` — Chave da API OpenAI
- `JWT_SECRET` — Secret para JWT
- `NODE_ENV` — production

**GitHub Secrets:**
- `RAILWAY_TOKEN` — Token de autenticação Railway

---

## ⚙️ Configuração Inicial

### 1. Criar Projeto no Railway

```bash
# Login no Railway
railway login

# Criar novo projeto
railway init

# Selecionar banco de dados PostgreSQL
# Selecionar Node.js como runtime
```

### 2. Configurar Variáveis de Ambiente

```bash
# Adicionar variáveis no Railway
railway variables set DATABASE_URL="postgresql://..."
railway variables set OPENAI_API_KEY="sk-..."
railway variables set JWT_SECRET="seu-secret-aqui"
railway variables set NODE_ENV="production"
```

### 3. Configurar GitHub Secrets

```bash
# Ir para: GitHub → Settings → Secrets and variables → Actions
# Adicionar novo secret:
# - Name: RAILWAY_TOKEN
# - Value: seu-token-railway
```

### 4. Fazer Push Inicial

```bash
cd /home/ubuntu/memodrops
git push origin main
```

---

## 🔄 Deployment Manual

### 1. Build Local

```bash
# Instalar dependências
npm install

# Compilar
npm run build

# Testar
npm run test
```

### 2. Deploy via Railway CLI

```bash
# Login
railway login --token $RAILWAY_TOKEN

# Executar migrações
railway run "npm run db:migrate --workspace backend"

# Deploy
railway up --service backend --detach
```

### 3. Verificar Status

```bash
# Ver logs
railway logs

# Ver status
railway status

# Ver URL
railway domain
```

---

## 🤖 Deployment Automático

### Workflow de Deploy (CI/CD)

**Arquivo:** `.github/workflows/deploy.yml`

**Trigger:** Push na branch `main`

**Passos:**
1. Checkout do código
2. Setup Node.js 20
3. npm install
4. npm run build (backend)
5. npm run build (web)
6. Login no Railway
7. Executar migrações
8. Deploy no Railway

**Exemplo de Execução:**
```
✓ Checkout
✓ Setup Node.js
✓ npm install
✓ npm run build --workspace backend
✓ npm run build --workspace web
✓ railway login
✓ railway run "npm run db:migrate"
✓ railway up --service backend
```

### Workflow de Crons

**Arquivo:** `.github/workflows/crons.yml`

**Agendamento:**
- **A cada 2 horas:** extract-blueprints
- **Diariamente às 3h:** generate-drops
- **Diariamente às 4h:** rag-feeder

**Exemplo de Execução:**
```
[00:00] extract-blueprints iniciado
[02:00] extract-blueprints concluído
[02:00] extract-blueprints iniciado
[04:00] extract-blueprints concluído
[03:00] generate-drops iniciado
[03:30] generate-drops concluído
[04:00] rag-feeder iniciado
[04:30] rag-feeder concluído
```

---

## 📊 Monitoramento

### Logs

```bash
# Ver últimos logs
railway logs --tail

# Ver logs de um serviço específico
railway logs --service backend

# Filtrar por erro
railway logs | grep ERROR
```

### Métricas

```bash
# CPU e memória
railway status

# Conectar ao banco
railway connect --database

# Executar query
SELECT COUNT(*) FROM drops;
```

### Alertas

Configure alertas no Railway:
1. Ir para: Project → Settings → Alerts
2. Adicionar alertas para:
   - CPU > 80%
   - Memória > 80%
   - Erros > 10/min
   - Downtime

---

## 🔍 Troubleshooting

### Deploy Falha

**Erro:** `npm run build failed`

**Solução:**
```bash
# Verificar dependências
npm install

# Limpar cache
npm cache clean --force

# Tentar novamente
npm run build
```

### Banco de Dados Não Conecta

**Erro:** `ECONNREFUSED`

**Solução:**
```bash
# Verificar variável DATABASE_URL
railway variables

# Reconectar
railway connect --database

# Testar conexão
psql $DATABASE_URL -c "SELECT 1"
```

### Migrações Falham

**Erro:** `Migration failed`

**Solução:**
```bash
# Ver status das migrações
railway run "npm run db:status --workspace backend"

# Rollback
railway run "npm run db:rollback --workspace backend"

# Tentar novamente
railway run "npm run db:migrate --workspace backend"
```

### Serviço Não Inicia

**Erro:** `Service failed to start`

**Solução:**
```bash
# Ver logs detalhados
railway logs --tail

# Verificar variáveis de ambiente
railway variables

# Reiniciar serviço
railway up --service backend --detach
```

---

## ↩️ Rollback

### Rollback de Código

```bash
# Ver histórico
git log --oneline

# Reverter para commit anterior
git revert HEAD

# Push
git push origin main

# Deploy automático será acionado
```

### Rollback de Banco de Dados

```bash
# Ver migrações
railway run "npm run db:status --workspace backend"

# Rollback
railway run "npm run db:rollback --workspace backend"

# Verificar
railway run "npm run db:status --workspace backend"
```

---

## 📋 Checklist de Deploy

- [ ] Todas as mudanças commitadas
- [ ] Testes passando localmente
- [ ] Build sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Railway token configurado no GitHub
- [ ] Migrações testadas
- [ ] Logs monitorados
- [ ] Alertas configurados
- [ ] Backup do banco realizado
- [ ] Plano de rollback pronto

---

## 🔗 Recursos Úteis

- [Railway Docs](https://docs.railway.app)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-performance-best-practices/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 📞 Suporte

**Problemas com Railway:**
- Email: support@railway.app
- Docs: https://docs.railway.app

**Problemas com GitHub Actions:**
- Docs: https://docs.github.com/en/actions

**Problemas com MemoDrops:**
- Issues: https://github.com/leorotundo-dev/memodrops/issues

---

**Status:** ✅ PRONTO PARA PRODUÇÃO

Última atualização: Nov 25, 2025
