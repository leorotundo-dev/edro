# 🚂 DEPLOY RAILWAY - MEMODROPS BACKEND

**Plataforma**: Railway.app  
**Componentes**: Backend API + PostgreSQL + Redis

---

## 🎯 O QUE VAI SER DEPLOYADO

```
Railway Project
├── PostgreSQL Database (plugin)
├── Redis (plugin) - opcional
└── Backend Service (Node.js)
    ├── API REST (148+ endpoints)
    ├── BullMQ Workers
    └── Cron Jobs
```

---

## 📋 PRÉ-REQUISITOS

- [ ] Conta no Railway (https://railway.app)
- [ ] Código no GitHub
- [ ] Railway CLI instalado (opcional)

---

## 🚀 MÉTODO 1: DEPLOY PELO DASHBOARD

### **Passo 1: Criar Projeto**

```
1. Acesse: https://railway.app/new
2. Click: "Deploy from GitHub repo"
3. Autorize: Railway acessar GitHub
4. Selecione: seu repositório memodrops
5. Click: "Deploy Now"
```

---

### **Passo 2: Adicionar PostgreSQL**

```
1. No projeto, click: "+ New"
2. Selecione: "Database"
3. Escolha: "Add PostgreSQL"
4. Aguarde: provisioning (~2 minutos)
5. Click no PostgreSQL → "Variables"
6. Copie: DATABASE_URL
```

**Formato da URL:**
```
postgresql://user:password@host:port/database
```

---

### **Passo 3: Adicionar Redis (Opcional)**

```
1. Click: "+ New"
2. Selecione: "Database"
3. Escolha: "Add Redis"
4. Aguarde: provisioning
5. Copie: REDIS_URL
```

---

### **Passo 4: Configurar Backend Service**

```
1. Click no service principal (memodrops-main)
2. Aba "Settings"
3. Configure:
```

**Build Settings:**
```
Root Directory: /apps/backend
Build Command: npm install && npm run build
Start Command: npm run start
```

**Watch Paths (opcional):**
```
apps/backend/**
packages/shared/**
```

---

### **Passo 5: Variáveis de Ambiente**

```
1. Click aba "Variables"
2. Adicionar variáveis uma por uma
```

**Variáveis Obrigatórias:**

```env
DATABASE_URL
# Usar referência: ${{Postgres.DATABASE_URL}}
# Ou colar valor copiado do PostgreSQL

JWT_SECRET
# Gerar um secret forte (32+ chars)
# Exemplo: openssl rand -base64 32

PORT
# Valor: 3333

NODE_ENV
# Valor: production
```

**Variáveis Recomendadas:**

```env
ALLOWED_ORIGINS
# Valor: https://admin.seu-dominio.vercel.app,https://aluno.seu-dominio.vercel.app

OPENAI_API_KEY
# Sua chave OpenAI (se tiver)
# Formato: sk-proj-...

REDIS_URL
# Usar referência: ${{Redis.REDIS_URL}}

ENABLE_WORKERS
# Valor: true (habilita BullMQ workers)
```

**Variáveis Opcionais:**

```env
SENTRY_DSN
# Para error tracking
# Formato: https://...@sentry.io/...

OPENAI_BASE_URL
# Default: https://api.openai.com/v1

OPENAI_MODEL
# Default: gpt-4o-mini
```

---

### **Passo 6: Deploy!**

```
1. Click: "Deploy"
2. Aguarde: build (~5-7 minutos)
3. Acompanhe: aba "Deployments"
4. Verifique: logs em tempo real
```

**Logs esperados:**
```
✓ Dependencies installed
✓ Build completed
✓ Server starting
✓ Registrando plugins...
✓ Registro de rotas concluído!
✓ Server listening at http://0.0.0.0:3333
```

---

### **Passo 7: Rodar Migrations**

**Opção A: Pelo Dashboard**
```
1. Aba "Settings"
2. Seção "Deploy"
3. Deploy Command: npm run db:migrate && npm run start
4. Redeploy
```

**Opção B: Pelo CLI**
```powershell
railway login
railway link
railway run npm run db:migrate
```

---

### **Passo 8: Pegar URL Pública**

```
1. Aba "Settings"
2. Seção "Networking"
3. Click: "Generate Domain"
4. Copie: https://seu-backend-production-xxxx.up.railway.app
```

**Essa URL será usada nos frontends!**

---

## 💻 MÉTODO 2: DEPLOY PELO CLI

```powershell
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login
# Abre browser para autenticar

# 3. Criar projeto
railway init
# Nome: memodrops-backend

# 4. Link ao código
railway link
# Selecionar projeto criado

# 5. Adicionar PostgreSQL
railway add --plugin postgresql

# 6. Adicionar Redis (opcional)
railway add --plugin redis

# 7. Configurar variáveis
railway variables set JWT_SECRET="seu_secret_forte_aqui"
railway variables set NODE_ENV="production"
railway variables set PORT="3333"
railway variables set ALLOWED_ORIGINS="https://seu-dominio.com"

# 8. Ver variáveis
railway variables

# 9. Deploy
cd apps/backend
railway up
# Aguarde build

# 10. Rodar migrations
railway run npm run db:migrate

# 11. Ver logs
railway logs

# 12. Abrir no browser
railway open

# 13. Ver variáveis do database
railway variables --service postgres
```

---

## 🔧 CONFIGURAÇÃO AVANÇADA

### **Custom Domain**

```
1. Aba "Settings"
2. Seção "Networking"
3. Custom Domains
4. Add: api.seu-dominio.com
5. Configure DNS:
   - Type: CNAME
   - Name: api
   - Value: seu-backend-production-xxxx.up.railway.app
```

---

### **Health Checks**

```
1. Aba "Settings"
2. Health Check Path: /api/health
3. Port: 3333
4. Timeout: 60 seconds
```

---

### **Auto-scaling**

```
1. Aba "Settings"
2. Seção "Resources"
3. Configure:
   - Min Replicas: 1
   - Max Replicas: 3 (para scale automático)
   - CPU: 1 vCPU
   - Memory: 2GB
```

---

### **Cron Jobs**

```
1. No código, cron jobs já estão configurados
2. Ativar com: ENABLE_WORKERS=true
3. Jobs rodam automaticamente:
   - Daily plan generation
   - Database cleanup
   - Cache warming
```

---

## ✅ VALIDAÇÃO

### **1. Health Check**

```bash
curl https://seu-backend.railway.app/api/health

# Esperado:
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 1234,
  "database": "connected"
}
```

---

### **2. Ver Logs**

```powershell
# Pelo CLI
railway logs

# Ou pelo Dashboard
# Aba "Deployments" → Click no deploy → "View Logs"
```

**Logs importantes:**
```
✅ "Server listening at..."
✅ "CORS habilitado para..."
✅ "Rotas registradas: 35"
✅ "PostgreSQL connected"
❌ Qualquer erro de conexão
```

---

### **3. Testar Endpoints**

```bash
# Disciplines
curl https://seu-backend.railway.app/api/disciplines

# Plans
curl https://seu-backend.railway.app/api/plans

# Auth (deve retornar 401)
curl https://seu-backend.railway.app/api/auth/me
```

---

### **4. Verificar Database**

```powershell
# Conectar ao database
railway connect postgres

# Listar tabelas
\dt

# Ver usuários
SELECT * FROM users LIMIT 5;

# Sair
\q
```

---

## 🔥 TROUBLESHOOTING

### **Build Failed**

**Erro:** `Cannot find module '@edro/shared'`

**Solução:**
```
1. Verificar Root Directory: /apps/backend
2. Build Command deve ser: npm install && npm run build
3. Redeploy
```

---

### **Database Connection Failed**

**Erro:** `Error: connect ECONNREFUSED`

**Solução:**
```
1. Verificar DATABASE_URL está configurado
2. Formato correto: postgresql://user:pass@host:port/db
3. Usar referência: ${{Postgres.DATABASE_URL}}
4. Redeploy
```

---

### **Port Already in Use**

**Erro:** `Port 3333 is already in use`

**Solução:**
```
1. Railway usa PORT automático
2. Código deve usar: process.env.PORT || 3333
3. Verificar em env.ts
```

---

### **CORS Error**

**Erro:** `CORS policy blocked`

**Solução:**
```
1. Adicionar ALLOWED_ORIGINS
2. Formato: https://domain1.com,https://domain2.com
3. Sem espaços, separado por vírgula
4. Redeploy
```

---

### **Migrations Not Running**

**Solução:**
```powershell
# Rodar manualmente
railway run npm run db:migrate

# Ou configurar no deploy
# Settings → Deploy Command: npm run db:migrate && npm run start
```

---

## 📊 MONITORAMENTO

### **Ver Métricas**

```
1. Dashboard → Aba "Metrics"
2. Verificar:
   - CPU Usage
   - Memory Usage
   - Network Traffic
   - Response Time
```

---

### **Alertas**

```
1. Settings → Notifications
2. Configurar webhooks/email para:
   - Deploy failures
   - High CPU
   - High Memory
   - Service down
```

---

## 💰 CUSTOS

### **Free Tier:**
```
- $5 crédito/mês grátis
- Suficiente para:
  - 1 backend service
  - 1 PostgreSQL
  - 1 Redis
  - Tráfego moderado
```

### **Paid Tiers:**
```
- Hobby: $20/mês
  - Mais recursos
  - Custom domains
  - Mais replicas

- Pro: $50/mês
  - Production-grade
  - SLA
  - Priority support
```

---

## 🎉 RESULTADO FINAL

Após completar todos os passos:

```
✅ Backend rodando: https://seu-backend.railway.app
✅ PostgreSQL conectado
✅ Redis ativo (se configurado)
✅ Migrations executadas
✅ Health check OK
✅ CORS configurado
✅ Logs acessíveis
✅ Metrics disponíveis
```

---

**URL Backend:** Anote para usar nos frontends!  
**Status:** Production-Ready! 🚀
