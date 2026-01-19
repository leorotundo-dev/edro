# 🚀 GUIA COMPLETO DE DEPLOY - MEMODROPS

**Data**: Janeiro 2025  
**Status**: Production-Ready  
**Plataformas**: Railway + GitHub Actions

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Deploy Railway (Backend)](#deploy-railway)
4. [Deploy Frontends no Railway](#deploy-frontends-no-railway)
5. [GitHub Actions (CI/CD)](#github-actions)
6. [Configuração de ENV](#configuração-env)
7. [Validação](#validação)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 VISÃO GERAL

```
+----------------------------------------------+
|           ARQUITETURA DE DEPLOY              |
+----------------------------------------------+

GitHub (codigo)
    |
    +--> GitHub Actions (CI/CD)
            |
            +--> Railway (Backend + Frontends)
                    |- PostgreSQL
                    |- Redis
                    |- Backend API
                    |- Frontend Admin (apps/web)
                    |- Frontend Aluno (apps/web-aluno)
```


---

## ✅ PRÉ-REQUISITOS

### **Contas Necessárias:**
- [ ] Conta GitHub (https://github.com)
- [ ] Conta Railway (https://railway.app)

### **Software Local:**
- [ ] Git instalado
- [ ] Node.js 20+ instalado
- [ ] Railway CLI (opcional): `npm install -g @railway/cli`

### **Dados Necessários:**
- [ ] Database URL (PostgreSQL)
- [ ] JWT Secret (32+ caracteres)
- [ ] OpenAI API Key (opcional)
- [ ] Redis URL (opcional)

---

## 🚂 DEPLOY RAILWAY (BACKEND)

### **Método 1: Pelo Dashboard (Recomendado)**

#### **1. Criar Novo Projeto**
```
1. Acesse: https://railway.app
2. Click: "New Project"
3. Escolha: "Deploy from GitHub repo"
4. Selecione: seu repositório MemoDrops
5. Click: "Deploy Now"
```

#### **2. Configurar Database PostgreSQL**
```
1. No projeto, click: "New Service"
2. Escolha: "Database"
3. Selecione: "PostgreSQL"
4. Aguarde provisioning (~2 min)
5. Copie: DATABASE_URL (será usado depois)
```

#### **3. Configurar Backend Service**
```
1. Click no service "memodrops-main"
2. Aba "Settings"
3. Root Directory: /apps/backend
4. Build Command: npm install && npm run build
5. Start Command: npm run start
```

#### **4. Configurar Variáveis de Ambiente**
```
1. Aba "Variables"
2. Adicionar variáveis:
```

**Variáveis Essenciais:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=seu_secret_muito_forte_aqui_32_chars_minimo
PORT=3333
NODE_ENV=production
ALLOWED_ORIGINS=https://admin.seu-dominio.com,https://aluno.seu-dominio.com
```

**Variáveis Opcionais:**
```env
OPENAI_API_KEY=sk-...
REDIS_URL=${{Redis.REDIS_URL}}
ENABLE_WORKERS=true
SENTRY_DSN=https://...
```

#### **5. Deploy!**
```
1. Click: "Deploy"
2. Aguarde build (~5 min)
3. Verifique logs
4. Copie a URL pública
```

---

### **Método 2: Pelo CLI**

```powershell
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Criar projeto
railway init

# 4. Adicionar PostgreSQL
railway add --plugin postgresql

# 5. Configurar variáveis
railway variables set DATABASE_URL=$RAILWAY_DATABASE_URL
railway variables set JWT_SECRET=seu_secret_aqui
railway variables set NODE_ENV=production

# 6. Deploy
cd apps/backend
railway up

# 7. Ver logs
railway logs

# 8. Abrir no browser
railway open
```

---

## 🌐 DEPLOY FRONTENDS NO RAILWAY

### Frontend Admin

#### Método 1: Pelo Dashboard

```
1. Acesse https://railway.app e abra o mesmo projeto usado pelo backend
2. Clique em "New Service" → "Deploy from GitHub repo"
3. Escolha o repositório MemoDrops e selecione o diretório apps/web
4. Configurações recomendadas:
   - Root Directory: apps/web
   - Build Command: pnpm install && pnpm run build
   - Start Command: pnpm start
   - Healthcheck Path: /
5. Em Variables, adicione:
   - NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
   - PORT=3000 (opcional, Railway detecta automaticamente)
6. Clique em "Deploy" e acompanhe os logs
```

#### Método 2: Pelo CLI

```
npm install -g @railway/cli
railway login
cd apps/web
railway up
```

### Frontend Aluno

O processo é o mesmo, mudando apenas o diretório do serviço.

```
Root Directory: apps/web-aluno
Build: pnpm install && pnpm run build (ou use o Dockerfile já incluso)
Start Command: pnpm start
Variables: NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

Para a CLI:

```
cd apps/web-aluno
railway up
```

---

### **Frontend Aluno**

#### **Mesmo processo, mas:**
```
Root Directory: apps/web-aluno
Project name: memodrops-aluno
ENV: NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

---

## 🤖 GITHUB ACTIONS (CI/CD)

### **Configuração Automática**

O projeto já tem workflows configurados em `.github/workflows/`.

#### **1. Configurar Secrets no GitHub**

```
1. GitHub repo → Settings → Secrets and variables → Actions
2. Adicionar secrets:
```

**Secrets necessários:**
```
RAILWAY_TOKEN=...        # Pegar em: railway.app/account/tokens
```

#### **2. Como Pegar os Tokens**

**Railway Token:**
```
1. https://railway.app/account/tokens
2. Click: "Create Token"
3. Nome: "GitHub Actions"
4. Copie o token
```


#### **3. Workflow Funcionamento**

**On push to main:**
```
1. Checkout código
2. Setup Node.js
3. Install dependencies
4. Run tests
5. Build backend e frontends
6. Deploy serviços no Railway (backend, admin e aluno)
7. Executar health checks
8. Notificar resultado
```


---

## 🔧 CONFIGURAÇÃO ENV COMPLETA

### **Railway (Backend)**
```env
# DATABASE (auto-configurado pelo Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# ESSENCIAIS
JWT_SECRET=seu_secret_muito_forte_minimo_32_caracteres_aqui
PORT=3333
NODE_ENV=production

# CORS (URLs dos seus frontends no Railway)
ALLOWED_ORIGINS=https://admin.seu-projeto.up.railway.app,https://aluno.seu-projeto.up.railway.app

# OPTIONAL
OPENAI_API_KEY=sk-proj-...
REDIS_URL=${{Redis.REDIS_URL}}
ENABLE_WORKERS=true
SENTRY_DSN=https://...@sentry.io/...
```

### **Frontends no Railway (Admin e Aluno)**
```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
PORT=3000
```
> Configure o mesmo conjunto de variáveis em cada serviço Railway (apps/web e apps/web-aluno).

---

## ✅ VALIDAÇÃO

### **1. Validar Backend (Railway)**

```bash
# Health check
curl https://seu-backend.railway.app/api/health

# Esperado:
{"status":"ok","timestamp":"..."}

# Ver logs
railway logs
```

### **2. Validar Admin (Railway)**

```
1. Abrir: https://admin.seu-projeto.up.railway.app
2. Verificar carregamento do dashboard
3. Testar navegação e chamadas à API
4. Conferir Console do navegador (sem erros de CORS)
```

### **3. Validar Aluno (Railway)**

```
1. Abrir: https://aluno.seu-projeto.up.railway.app
2. Conferir páginas do estudante (plano diário, questões etc.)
3. Validar chamadas ao backend
4. Conferir Console do navegador (sem erros de CORS)
```

### **4. Testar Integração**

```bash
# Do frontend, chamar backend
# No console do browser:
fetch('https://seu-backend.railway.app/api/disciplines')
  .then(r => r.json())
  .then(console.log)

# Deve retornar dados sem erro CORS
```

---

## 🔥 TROUBLESHOOTING

### **Problema: CORS Error**

**Sintoma:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solução:**
```
1. Railway → Variables
2. Verificar ALLOWED_ORIGINS contém as URLs do Railway
3. Formato: https://domain1.com,https://domain2.com
4. Redeploy backend
```

---

### **Problema: 502 Bad Gateway**

**Sintoma:**
```
Railway retorna 502
```

**Solução:**
```
1. Railway logs → verificar erro
2. Comum: DATABASE_URL incorreto
3. Verificar: todas env vars configuradas
4. Verificar: migrations rodaram
5. Redeploy
```

---

### **Problema: Build Failed (Railway - Frontends)**

**Sintoma:**
```
Error: Cannot find module '@edro/shared'
```

**Solução:**
```
1. Railway → Service do frontend (admin ou aluno)
2. Aba Settings → Build & Deploy
3. Confirmar Root Directory correto (apps/web ou apps/web-aluno)
4. Build Command: pnpm install && pnpm run build
5. Start Command: pnpm start
6. Clique em "Redeploy"
```

---

### **Problema: Database Connection Failed**

**Sintoma:**
```
Error: connect ECONNREFUSED
```

**Solução:**
```
1. Railway → PostgreSQL → Variables
2. Copiar DATABASE_URL
3. Railway → Backend → Variables
4. Atualizar DATABASE_URL
5. Redeploy
```

---

## 🚀 DEPLOY RÁPIDO (TL;DR)

```powershell
# 1. Push para GitHub
git add .
git commit -m "feat: Deploy ready"
git push origin main

# 2. Railway (Manual)
railway login
railway link
railway up

# 3. Railway - Frontend Admin
cd apps/web
railway up

# 4. Railway - Frontend Aluno
cd apps/web-aluno
railway up

# 5. Validar
curl https://seu-backend.railway.app/api/health
```

---

## 📚 DOCUMENTOS RELACIONADOS

- `deploy-completo.ps1` - Script automatizado
- `DEPLOY_RAILWAY.md` - Guia Railway detalhado
- `DEPLOY_RAILWAY_FRONTEND.md` - Guia de frontends no Railway
- `DEPLOY_GITHUB.md` - Guia GitHub Actions

---

## 🎉 RESULTADO ESPERADO

Após completar todos os passos:

```
✅ Backend rodando no Railway
✅ Database PostgreSQL configurado
✅ Frontend Admin rodando no Railway
✅ Frontend Aluno rodando no Railway
✅ CI/CD automático configurado
✅ Todas as integrações funcionando
✅ CORS configurado corretamente
✅ Logs e monitoring ativos
```

---

**Status**: Production-Ready! 🚀  
**Tempo estimado**: 1-2 horas  
**Dificuldade**: Intermediário
