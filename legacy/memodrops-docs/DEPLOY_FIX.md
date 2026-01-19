# 🔧 Correção do Deploy no Railway

**Data**: Dezembro 2024  
**Status**: ✅ CORRIGIDO

---

## ❌ Problema Anterior

O build estava falhando com o erro:

```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Causa**: O projeto usa **pnpm** (com `pnpm-lock.yaml`), mas o Dockerfile estava configurado para usar **npm**.

---

## ✅ Correções Aplicadas

### 1. **Dockerfile Atualizado**

✅ Instala `pnpm` globalmente  
✅ Usa `pnpm install --frozen-lockfile`  
✅ Usa `pnpm run build --filter`  
✅ Copia arquivos em camadas otimizadas  
✅ Cache de dependências melhorado

### 2. **railway.toml Atualizado**

✅ Mudou de `nixpacks` para `dockerfile`  
✅ Aponta para o Dockerfile correto

### 3. **.dockerignore Criado**

✅ Ignora node_modules  
✅ Ignora arquivos de build antigos  
✅ Ignora cache e logs  
✅ Build mais rápido

---

## 🚀 Como Fazer Deploy

### Opção 1: Push Automático (Recomendado)

```bash
cd memodrops-main
git add .
git commit -m "fix: corrigir Dockerfile para usar pnpm"
git push origin main
```

O Railway detectará as mudanças e fará deploy automático.

---

### Opção 2: Deploy Manual via CLI

```bash
# Instalar Railway CLI (se não tiver)
npm install -g @railway/cli

# Login
railway login

# Link ao projeto
railway link

# Deploy
railway up
```

---

## 📋 Checklist Pré-Deploy

- [x] Dockerfile corrigido para usar pnpm
- [x] railway.toml configurado para usar Dockerfile
- [x] .dockerignore criado
- [ ] **Variáveis de ambiente configuradas no Railway**

---

## ⚙️ Variáveis de Ambiente Necessárias

Configure estas variáveis no Railway Dashboard:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/memodrops

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# JWT
JWT_SECRET=sua-chave-secreta-aqui

# Opcional: Sentry
SENTRY_DSN=https://...

# Opcional: Node Environment
NODE_ENV=production
```

---

## 🧪 Testar Após Deploy

```bash
# 1. Health Check
curl https://SEU-PROJETO.up.railway.app/health

# 2. Verificar usuários
curl https://SEU-PROJETO.up.railway.app/admin/users

# 3. Verificar drops
curl https://SEU-PROJETO.up.railway.app/admin/drops
```

---

## 📊 Estrutura do Build

```
Dockerfile:
  1. Instala pnpm
  2. Copia package.json e lock files
  3. Instala dependências (com cache)
  4. Copia código fonte
  5. Build de @edro/shared
  6. Build de @edro/ai
  7. Build de @edro/backend
  8. Start do backend na porta 3000
```

---

## 🔍 Troubleshooting

### Build falha com "pnpm not found"

**Solução**: Certifique-se que o Dockerfile tem `RUN npm install -g pnpm`

### Build falha com "workspace not found"

**Solução**: Verifique que `pnpm-workspace.yaml` existe e lista os workspaces

### Runtime error após deploy

**Solução**: Verifique as variáveis de ambiente no Railway Dashboard

### Migrations não rodaram

**Solução**: Execute manualmente:
```bash
railway run npm run migrate --workspace=@edro/backend
```

---

## ✅ Status Final

```
╔═══════════════════════════════════════════╗
║                                           ║
║   ✅ DOCKERFILE CORRIGIDO                ║
║   ✅ RAILWAY.TOML ATUALIZADO             ║
║   ✅ .DOCKERIGNORE CRIADO                ║
║   ✅ PRONTO PARA DEPLOY                  ║
║                                           ║
╚═══════════════════════════════════════════╝
```

**Próximo passo**: `git push origin main`

---

**Corrigido por**: Claude AI  
**Data**: Dezembro 2024  
**Status**: ✅ Pronto para deploy
