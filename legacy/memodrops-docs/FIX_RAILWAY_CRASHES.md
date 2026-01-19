# 🚨 FIX: Railway Services Crashing

## 📊 SITUAÇÃO ATUAL

### Serviços Crashando:
- ❌ `@edro/web` (Frontend Admin) - Crashed 2h ago
- ❌ `@edro/ai` - Crashed 8h ago  
- ❌ `@edro/web-aluno` (Frontend Aluno) - Crashed 1h ago

### Serviços OK:
- ✅ `@edro/backend` - Online
- ✅ `scrapers` - Online
- ✅ `Postgres` - Online

---

## 🔍 DIAGNÓSTICO DAS CAUSAS

### 1. Frontend Admin (@edro/web)

**Possíveis causas:**
- Falta variável `NEXT_PUBLIC_API_URL`
- Build do Next.js falhando
- Memória insuficiente
- Start command incorreto

### 2. Frontend Aluno (@edro/web-aluno)

**Possíveis causas:**
- Mesmos problemas do Admin
- Workspace dependencies não resolvidas
- `@edro/shared` não builou

### 3. AI Service (@edro/ai)

**Possíveis causas:**
- Falta `OPENAI_API_KEY`
- Falta `DATABASE_URL`
- Port binding incorreto

---

## 🛠️ SOLUÇÕES

### SOLUÇÃO 1: Usar Docker (RECOMENDADO)

O Railway funciona MUITO melhor com Docker!

#### Para Frontend Admin:

**1. Criar `apps/web/Dockerfile.railway`:**
```dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@9

# Dependencies stage
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared first
WORKDIR /app/packages/shared
RUN pnpm run build

# Build web
WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm run build

# Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT 3000

CMD ["node", "apps/web/server.js"]
```

**2. Configurar Railway:**
- Service: `@edro/web`
- Root Directory: `/`
- Dockerfile Path: `apps/web/Dockerfile.railway`
- Variáveis de ambiente:
  ```
  NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
  NODE_ENV=production
  ```

#### Para Frontend Aluno:

Use o Dockerfile que já criamos! (`apps/web-aluno/Dockerfile`)

**Configurar Railway:**
- Service: `@edro/web-aluno`
- Root Directory: `/`
- Dockerfile Path: `apps/web-aluno/Dockerfile`
- Variáveis:
  ```
  NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
  NODE_ENV=production
  ```

#### Para AI Service:

**1. Criar `apps/ai/Dockerfile.railway`:**
```dockerfile
FROM node:18-alpine

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy package.json files
COPY apps/ai/package.json ./apps/ai/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter "@edro/ai"

# Copy source code
COPY apps/ai ./apps/ai

# Build
WORKDIR /app/apps/ai
RUN pnpm run build || echo "No build script"

EXPOSE 3334
ENV PORT 3334

CMD ["pnpm", "run", "start"]
```

**2. Configurar Railway:**
- Dockerfile Path: `apps/ai/Dockerfile.railway`
- Variáveis:
  ```
  OPENAI_API_KEY=sk-...
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  PORT=3334
  NODE_ENV=production
  ```

---

### SOLUÇÃO 2: Nixpacks (Alternativa)

Se preferir usar Nixpacks (padrão do Railway):

#### Para cada serviço, criar `railway.json`:

**apps/web/railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && pnpm install && pnpm --filter @edro/web build"
  },
  "deploy": {
    "startCommand": "cd apps/web && pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**apps/web-aluno/railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && pnpm install && pnpm --filter @edro/web-aluno build"
  },
  "deploy": {
    "startCommand": "cd apps/web-aluno && pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

### SOLUÇÃO 3: Variáveis de Ambiente

**CRÍTICO:** Configurar variáveis no Railway:

#### Frontend Admin:
```bash
NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

#### Frontend Aluno:
```bash
NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

#### AI Service:
```bash
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3334
NODE_ENV=production
```

---

## 🚀 PLANO DE AÇÃO IMEDIATO

### PASSO 1: Redeploy com Docker (15 minutos)

```bash
# 1. Commit Dockerfiles
git add apps/web/Dockerfile.railway apps/ai/Dockerfile.railway
git commit -m "fix: add Railway Dockerfiles"
git push

# 2. No Railway Dashboard:
# Para cada serviço crashado:
# - Settings > Build > Dockerfile Path > Set path
# - Settings > Environment > Add variables
# - Deploy > Redeploy

# 3. Aguardar builds
```

### PASSO 2: Configurar Variáveis (5 minutos)

No Railway, para cada serviço:

1. **Frontend Admin:**
   - `NEXT_PUBLIC_API_URL` = URL do backend

2. **Frontend Aluno:**
   - `NEXT_PUBLIC_API_URL` = URL do backend

3. **AI Service:**
   - `OPENAI_API_KEY` = sua chave
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`

### PASSO 3: Redeploy Todos (5 minutos)

- Clicar em "Deploy" em cada serviço
- Aguardar builds completarem
- Verificar logs

---

## 📋 CHECKLIST DE VERIFICAÇÃO

Depois do redeploy, verificar cada serviço:

### Frontend Admin:
- [ ] Build completa sem erros
- [ ] Service mostra "Deployed"
- [ ] URL acessível no navegador
- [ ] Console sem erros de CORS
- [ ] Conecta com backend

### Frontend Aluno:
- [ ] Build completa sem erros
- [ ] Service mostra "Deployed"
- [ ] URL acessível
- [ ] API calls funcionando

### AI Service:
- [ ] Build completa
- [ ] Service "Deployed"
- [ ] Logs mostram "Server running"
- [ ] Endpoints respondem

---

## 🔧 TROUBLESHOOTING

### Se continuar crashando:

#### 1. Ver Logs no Railway:
```
Railway Dashboard > Service > Deployments > View Logs
```

#### 2. Erros Comuns:

**"Module not found"**
- Adicionar ao Dockerfile: `RUN pnpm install --frozen-lockfile`

**"Port already in use"**
- Remover `PORT` do .env
- Deixar Railway definir automaticamente

**"Out of memory"**
- Aumentar memória no Railway
- Otimizar build (multi-stage)

**"Failed to bind to port"**
```dockerfile
# Adicionar ao Dockerfile:
ENV PORT 3000
EXPOSE 3000
```

---

## 💰 CUSTO NO RAILWAY

Com 6 serviços:
- **Hobby Plan:** $5/mês (limite de 5 serviços)
- **Pro Plan:** $20/mês (ilimitado)

**Recomendação:** Consolidar serviços se possível

---

## 🎯 RESULTADO ESPERADO

Depois de seguir este guia:

```
✅ @edro/web - Online
✅ @edro/web-aluno - Online  
✅ @edro/ai - Online
✅ @edro/backend - Online (já está)
✅ scrapers - Online (já está)
✅ Postgres - Online (já está)

= TODOS OS 6 SERVIÇOS ONLINE! 🎉
```

---

## 📞 COMANDOS RÁPIDOS

```bash
# 1. Criar Dockerfiles
cd memodrops-main

# Frontend Admin
cat > apps/web/Dockerfile.railway << 'EOF'
FROM node:18-alpine
RUN npm install -g pnpm@9
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY . .
WORKDIR /app/packages/shared
RUN pnpm run build
WORKDIR /app/apps/web
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "start"]
EOF

# AI Service  
cat > apps/ai/Dockerfile.railway << 'EOF'
FROM node:18-alpine
RUN npm install -g pnpm@9
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/ai/package.json ./apps/ai/
RUN pnpm install --frozen-lockfile
COPY apps/ai ./apps/ai
WORKDIR /app/apps/ai
EXPOSE 3334
CMD ["pnpm", "start"]
EOF

# 2. Commit e Push
git add .
git commit -m "fix: add Railway Dockerfiles for crashed services"
git push

# 3. Configure no Railway Dashboard
# 4. Redeploy cada serviço
```

---

**IMPORTANTE:** Depois de fazer os testes locais (que estamos fazendo agora), vamos aplicar essas correções no Railway para deixar tudo online! 🚀
