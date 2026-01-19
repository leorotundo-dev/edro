# 🚀 GUIA DE DEPLOY - SISTEMA DE EDITAIS

## 📋 PRÉ-REQUISITOS

### 1. Ferramentas Necessárias

```bash
# Railway CLI
npm install -g @railway/cli

# Vercel CLI (opcional)
npm install -g vercel

# Git
# Certifique-se que está instalado
git --version
```

### 2. Autenticação

```bash
# Login no Railway
railway login

# Login no Vercel (se for usar)
vercel login
```

---

## 🎯 OPÇÕES DE DEPLOY

### Opção 1: Deploy Automático (Recomendado)

```powershell
# Execute o script automatizado
cd memodrops-main
./DEPLOY_EDITAIS_AGORA.ps1

# Escolha:
# 1 = Backend apenas
# 2 = Frontend apenas  
# 3 = Completo (Backend + Frontend)
```

### Opção 2: Deploy Manual

---

## 🔧 DEPLOY BACKEND (Railway)

### Passo 1: Preparar Backend

```powershell
cd memodrops-main/apps/backend

# Verificar arquivos importantes
ls src/routes/editais.ts
ls src/repositories/editalRepository.ts
ls src/types/edital.ts
ls src/db/migrations/0014_editais_system.sql
```

### Passo 2: Verificar Configuração Railway

Arquivo `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Passo 3: Deploy

```bash
# Link com projeto Railway (se não estiver linkado)
railway link

# Fazer deploy
railway up

# Verificar logs
railway logs
```

### Passo 4: Verificar Endpoints

```powershell
# Testar endpoints
cd ../../
./apps/web/app/admin/editais/test-editais-system.ps1
```

---

## 🌐 DEPLOY FRONTEND

### Opção A: Vercel (Recomendado para Next.js)

#### Passo 1: Preparar Frontend

```powershell
cd memodrops-main/apps/web

# Verificar arquivos
ls app/admin/editais/[id]/editar/page.tsx
ls components/ui/Toast.tsx
ls lib/toast.ts
ls lib/validation.ts
ls lib/export.ts
```

#### Passo 2: Criar vercel.json (se não existir)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://seu-backend.railway.app"
  }
}
```

#### Passo 3: Deploy

```bash
# Link com projeto Vercel (primeira vez)
vercel link

# Deploy para produção
vercel --prod

# Anotar URL fornecida
```

### Opção B: Railway

```bash
cd apps/web
railway link
railway up
```

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

### 1. Backend Health Check

```bash
# Via Railway CLI
cd apps/backend
railway logs

# Buscar por:
# ✓ Server listening on port...
# ✓ Database connected
# ✓ Routes registered
```

### 2. Frontend Health Check

```bash
# Acessar URLs
https://seu-frontend.vercel.app/admin/editais
https://seu-frontend.vercel.app/admin/editais/novo

# Verificar:
# ✓ Página carrega
# ✓ Toasts aparecem
# ✓ Filtros funcionam
# ✓ Exportação funciona
```

### 3. Teste de Integração

Execute o script de teste:

```powershell
cd memodrops-main
$API_URL = "https://seu-backend.railway.app"
./apps/web/app/admin/editais/test-editais-system.ps1
```

---

## 🔧 CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE

### Backend (Railway)

```bash
cd apps/backend

# Configurar variáveis
railway variables set DATABASE_URL="postgresql://..."
railway variables set PORT=3001
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="seu-secret-aqui"
```

### Frontend (Vercel)

Via Dashboard Vercel:
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Settings → Environment Variables
4. Adicione:

```
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

Ou via CLI:

```bash
vercel env add NEXT_PUBLIC_API_URL production
# Cole: https://seu-backend.railway.app
```

---

## 📊 MONITORAMENTO

### Railway Dashboard

```
1. Acesse: https://railway.app
2. Selecione projeto Backend
3. Veja:
   • Logs em tempo real
   • Uso de recursos (CPU, RAM)
   • Health checks
   • Deployments
```

### Vercel Dashboard

```
1. Acesse: https://vercel.com
2. Selecione projeto Frontend
3. Veja:
   • Analytics
   • Build logs
   • Function logs
   • Performance
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Railway not logged in"

```bash
railway login
# Siga instruções no navegador
```

### Erro: "Build failed"

```bash
# Ver logs detalhados
railway logs

# Causas comuns:
# - Dependências faltando
# - Erro de TypeScript
# - Variáveis de ambiente faltando
```

### Erro: "Health check failed"

```bash
# Verificar se endpoint /health existe
curl https://seu-backend.railway.app/health

# Deve retornar:
# {"status": "ok", "timestamp": "..."}
```

### Erro: "Cannot connect to backend"

1. Verificar variável `NEXT_PUBLIC_API_URL` no Vercel
2. Verificar se backend está online (Railway)
3. Verificar CORS no backend

---

## 🔄 ATUALIZAR DEPLOY

### Backend

```bash
cd apps/backend
railway up
```

### Frontend

```bash
cd apps/web
vercel --prod
```

---

## 📝 CHECKLIST DE DEPLOY

### Antes do Deploy

- [ ] Código commitado no Git
- [ ] Tests passando
- [ ] Variáveis de ambiente configuradas
- [ ] Railway CLI instalado e autenticado
- [ ] Vercel CLI instalado e autenticado (se usar)

### Backend

- [ ] Deploy realizado
- [ ] Health check ok
- [ ] Logs sem erros
- [ ] Endpoints respondendo
- [ ] Database migrations executadas

### Frontend

- [ ] Deploy realizado
- [ ] Páginas carregando
- [ ] Toasts funcionando
- [ ] Filtros funcionando
- [ ] Exportação funcionando
- [ ] API conectada

### Pós-Deploy

- [ ] Teste completo executado
- [ ] Documentação atualizada
- [ ] Equipe notificada
- [ ] Monitoramento ativo

---

## 🎯 COMANDOS RÁPIDOS

```bash
# Backend
cd apps/backend
railway up                    # Deploy
railway logs                  # Ver logs
railway logs --follow         # Logs em tempo real
railway open                  # Abrir no navegador
railway status                # Status do projeto

# Frontend
cd apps/web
vercel --prod                 # Deploy produção
vercel logs                   # Ver logs
vercel domains                # Ver domínios
vercel --force                # Force redeploy
```

---

## 📞 SUPORTE

### Documentação

- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Next.js: https://nextjs.org/docs

### Logs de Deploy

- Railway: `railway logs`
- Vercel: Dashboard → Deployments → View Function Logs

### Status dos Serviços

- Railway Status: https://status.railway.app
- Vercel Status: https://vercel-status.com

---

## 🎉 DEPLOY COMPLETO!

Após seguir todos os passos, seu sistema estará online:

```
✅ Backend:  https://seu-backend.railway.app
✅ Frontend: https://seu-frontend.vercel.app
✅ Editais:  https://seu-frontend.vercel.app/admin/editais
```

### URLs de Teste:

1. **Listagem:** `/admin/editais`
2. **Criar:** `/admin/editais/novo`
3. **Detalhes:** `/admin/editais/1`
4. **Editar:** `/admin/editais/1/editar`

---

**SISTEMA PRONTO E ONLINE! 🚀**
