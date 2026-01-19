# 🔄 ATUALIZAR DEPLOY EXISTENTE

**Situação**: Você já tem deploys rodando!  
**Objetivo**: Atualizar com código 100% integrado

---

## 📊 SITUAÇÃO ATUAL

### **Backend Railway**
```
URL: https://backend-production-61d0.up.railway.app
Project ID: e0ca0841-18bc-4c48-942e-d90a6b725a5b
Status: ✅ Online
```

### **Frontend Vercel**
```
URL: https://memodrops-web.vercel.app
Project ID: prj_kBfCd0oCVTEEsfrlm2nCNnlFJKVA
Team ID: team_AAKdibSvyJYdKctKISN526zx
Status: ✅ Ready
```

### **GitHub**
```
Repo: leorotundo-dev/memodrops
Branch: main
Último commit: Fix mobile menu detection
```

---

## 🚀 PLANO DE ATUALIZAÇÃO

### **1. Preparar Código Local**
```powershell
# 1. Garantir que está na branch main
git checkout main

# 2. Pull das últimas mudanças
git pull origin main

# 3. Verificar status
git status

# 4. Se tiver mudanças locais não commitadas
git add .
git commit -m "feat: Update to 100% integration + all improvements"
```

---

### **2. Atualizar Backend Railway**

#### **A. Verificar Variáveis de Ambiente**

Acesse: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b

**Variáveis necessárias:**
```env
# Essenciais (verificar se existem)
DATABASE_URL=postgresql://...
JWT_SECRET=[seu secret forte]
PORT=3333
NODE_ENV=production

# Adicionar/Atualizar
ALLOWED_ORIGINS=https://memodrops-web.vercel.app,https://memodrops-web-memo-drops.vercel.app
OPENAI_API_KEY=sk-fob56csE7BhkDb6AEKzKKX
OPENAI_BASE_URL=https://api.openai.com/v1
REDIS_URL=[se tiver Redis]
ENABLE_WORKERS=true
```

#### **B. Atualizar Build Config**

```
Settings → Build:
  Root Directory: /apps/backend
  Build Command: npm install && npm run build
  Start Command: npm run db:migrate && npm run start
```

#### **C. Trigger Redeploy**

```
1. Aba "Deployments"
2. Click "Deploy" (novo deployment)
3. Aguardar ~5 minutos
4. Verificar logs
```

---

### **3. Atualizar Frontend Vercel**

#### **Atualizar Admin (apps/web)**

Acesse: https://vercel.com/memo-drops/memodrops-web

**A. Verificar Environment Variables:**
```
Settings → Environment Variables

Adicionar/Atualizar:
Key: NEXT_PUBLIC_API_URL
Value: https://backend-production-61d0.up.railway.app
Environment: Production, Preview, Development
```

**B. Verificar Build Settings:**
```
Settings → General → Build & Development

Root Directory: apps/web
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Node.js Version: 22.x
```

**C. Trigger Redeploy:**
```
1. Deployments → Latest
2. ⋯ Menu → Redeploy
3. Aguardar ~3 minutos
```

---

### **4. Criar Deploy Frontend Aluno (NOVO!)**

Como você só tem o admin deployado, vamos criar o aluno:

**A. Pelo Dashboard:**
```
1. https://vercel.com/new
2. Import: leorotundo-dev/memodrops
3. Configure:
   - Project Name: memodrops-aluno
   - Framework: Next.js
   - Root Directory: apps/web-aluno
   - Build Command: npm run build
   - Output Directory: .next
   
4. Environment Variables:
   - NEXT_PUBLIC_API_URL: https://backend-production-61d0.up.railway.app
   
5. Deploy
```

**B. Pelo CLI (Alternativa):**
```powershell
cd apps/web-aluno

vercel

# Responder:
# Project name: memodrops-aluno
# Root Directory: ./
# Build Command: npm run build
# Output Directory: .next

# Adicionar ENV
vercel env add NEXT_PUBLIC_API_URL production
# Valor: https://backend-production-61d0.up.railway.app

# Deploy produção
vercel --prod
```

---

### **5. Atualizar CORS Backend**

Depois de ter a URL do aluno, voltar ao Railway:

```
1. Railway → Variables
2. Editar ALLOWED_ORIGINS:
   
   Valor: https://memodrops-web.vercel.app,https://memodrops-web-memo-drops.vercel.app,https://memodrops-aluno-xxx.vercel.app

3. Redeploy backend
```

---

### **6. Push Código Atualizado**

```powershell
# 1. Adicionar todas as mudanças
git add .

# 2. Commit com todas as melhorias
git commit -m "feat: 100% Integration complete

- Unified API Client in shared package
- CORS using ENV vars
- All routes registered (35 total)
- Backend imports cleaned
- Frontend Admin 100%
- Frontend Aluno 100%
- Production ready"

# 3. Push para main
git push origin main

# Isso vai:
# - Trigger Vercel deploy automático
# - Railway pode ter auto-deploy se configurado
```

---

## ✅ VALIDAÇÃO

### **1. Backend Health Check**
```bash
curl https://backend-production-61d0.up.railway.app/api/health

# Esperado:
{"status":"ok","timestamp":"..."}
```

### **2. Backend CORS**
```bash
curl -H "Origin: https://memodrops-web.vercel.app" \
  https://backend-production-61d0.up.railway.app/api/disciplines

# Deve retornar dados sem erro CORS
```

### **3. Frontend Admin**
```
1. Abrir: https://memodrops-web.vercel.app
2. F12 → Console (sem erros)
3. Verificar navegação funciona
4. Testar API calls
```

### **4. Frontend Aluno (Novo)**
```
1. Abrir: https://memodrops-aluno-xxx.vercel.app
2. Dashboard deve carregar
3. Sem erros CORS
4. API calls funcionam
```

---

## 🔧 COMANDOS RÁPIDOS

### **Ver Logs Railway:**
```powershell
# Se tiver Railway CLI
railway login
railway link
railway logs
```

### **Ver Logs Vercel:**
```powershell
# Se tiver Vercel CLI
vercel login
vercel logs https://memodrops-web.vercel.app
```

### **Redeploy Rápido:**
```powershell
# Backend Railway
railway up

# Frontend Vercel Admin
cd apps/web
vercel --prod

# Frontend Vercel Aluno
cd apps/web-aluno
vercel --prod
```

---

## 📋 CHECKLIST FINAL

```
[ ] Variáveis Railway atualizadas
[ ] Backend redeployado
[ ] Logs backend sem erros
[ ] Health check OK
[ ] Frontend Admin ENV atualizado
[ ] Frontend Admin redeployado
[ ] Frontend Aluno criado e deployado
[ ] CORS atualizado com ambas URLs
[ ] Backend redeployado (após CORS)
[ ] Ambos frontends funcionando
[ ] API calls sem erro CORS
[ ] Push código para GitHub
```

---

## 🎯 URLs FINAIS

Após completar tudo:

```
Backend:
https://backend-production-61d0.up.railway.app

Admin:
https://memodrops-web.vercel.app

Aluno:
https://memodrops-aluno-[xxx].vercel.app (anotar após criar)
```

---

## 💡 PRÓXIMOS PASSOS

1. **Testar Sistema Completo**
   - Criar conta
   - Login
   - Testar features

2. **Monitorar**
   - Railway → Metrics
   - Vercel → Analytics

3. **Configurar CI/CD** (opcional)
   - GitHub Actions
   - Auto-deploy on push

4. **Custom Domains** (opcional)
   - admin.seu-dominio.com
   - aluno.seu-dominio.com
   - api.seu-dominio.com

---

**Status:** Pronto para atualizar! 🚀  
**Tempo:** 30-45 minutos  
**Resultado:** Sistema 100% atualizado em produção!
