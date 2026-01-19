# 🚀 COMECE AQUI - DEPLOY DO MEMODROPS

**Situação**: você já tem deploys rodando.  
**Objetivo**: atualizar tudo para o código 100% integrado **rodando apenas no Railway**.  
**Tempo estimado**: 30-45 minutos

---

## ⚡ OPÇÃO RÁPIDA (Recomendada)

```powershell
# Execute este script
.tualizar-deploy-existente.ps1

# Escolha a opção 1 (Atualizar TUDO)
# O script faz commit/push e roda os deploys no Railway
```

**O script faz automaticamente:**
- ✅ Commit das mudanças locais
- ✅ Push para o GitHub
- ✅ Redeploy do backend (Railway)
- ✅ Redeploy do frontend Admin (Railway)
- ✅ Criação/redeploy do frontend Aluno (Railway)

---

## 🌐 SEUS SERVIÇOS

| Serviço            | Plataforma | Status atual |
|--------------------|------------|--------------|
| Backend API        | Railway    | Online       |
| Frontend Admin     | Railway    | Precisa garantir deploy ✅ |
| Frontend Aluno     | Railway    | Precisa criar/deploy ✅ |

> Os frontends não usam mais Vercel. Tudo roda dentro do mesmo projeto Railway.

---

## ✅ PASSO 1 – Atualizar Backend (Railway)

**Variáveis necessárias:**
```env
ALLOWED_ORIGINS=https://admin.seu-projeto.up.railway.app,https://aluno.seu-projeto.up.railway.app
OPENAI_API_KEY=sk-fob56csE7BhkDb6AEKzKKX
OPENAI_BASE_URL=https://api.openai.com/v1
ENABLE_WORKERS=true
```

**Como atualizar:**
```
1. Abra https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b
2. Entre no serviço do backend → aba Variables
3. Ajuste/adicione as variáveis acima
4. Vá em Deployments → clique em Redeploy
```

---

## ✅ PASSO 2 – Deploy Frontend Admin no Railway

### Pelo dashboard
```
1. No mesmo projeto Railway, clique em “New Service” → “Deploy from GitHub repo”
2. Escolha este repositório
3. Configure:
   - Root Directory: apps/web
   - Build Command: pnpm install && pnpm run build
   - Start Command: pnpm start
   - Healthcheck Path: /
4. Em Variables, defina:
   - NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app
5. Clique em Deploy e aguarde
```

### Pelo CLI
```powershell
cd apps/web
railway up
```

---

## ✅ PASSO 3 – Deploy Frontend Aluno no Railway

O projeto já tem `apps/web-aluno/railway.json` com Dockerfile configurado.

### Dashboard
```
1. “New Service” → “Deploy from GitHub repo”
2. Root Directory: apps/web-aluno
3. Builder: Dockerfile (Railway detecta automaticamente)
4. Variables:
   - NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app
5. Deploy e anote a URL gerada
```

### CLI
```powershell
cd apps/web-aluno
railway up
```

---

## ✅ PASSO 4 – Atualizar CORS

Depois de obter as URLs (admin e aluno):
```
1. Volte ao serviço do backend no Railway
2. Atualize ALLOWED_ORIGINS com as novas URLs
3. Redeploy o backend
```

---

## ✅ PASSO 5 – Push do Código

```powershell
git add .
git commit -m "feat: deploy 100% Railway"
git push origin main
```

O GitHub Actions vai rodar testes/migrations e disparar os deploys do backend/admin/aluno no Railway.

---

## 🔧 FERRAMENTAS NECESSÁRIAS

```powershell
# Railway CLI (se quiser executar deploy manual)
npm install -g @railway/cli
```

---

## ✅ VALIDAÇÃO RÁPIDA

### Backend
```bash
curl https://backend-production-61d0.up.railway.app/api/health
```

### Admin
```
Abrir https://admin.seu-projeto.up.railway.app
- Dashboard carrega
- Console do navegador sem erros
```

### Aluno
```
Abrir https://aluno.seu-projeto.up.railway.app
- Telas do aluno carregam
- Console sem erros CORS
```

---

## 📚 DOCUMENTAÇÃO ÚTIL

1. `DEPLOY_ATUALIZAR_EXISTENTE.md` – passo a passo completo
2. `DEPLOY_COMPLETO_GUIA.md` – visão geral (Railway only)
3. `DEPLOY_RAILWAY.md` – detalhes do backend
4. `DEPLOY_RAILWAY_FRONTEND.md` – detalhes dos frontends

*(o antigo `DEPLOY_VERCEL.md` ficou como material legado)*

---

## 🧰 SE DER PROBLEMA

### Build falhou
```
- Confirme Root Directory, Build e Start Command
- Veja os logs do serviço no Railway
```

### CORS error
```
- Revise ALLOWED_ORIGINS no backend
- Garanta URLs corretas (sem espaços) e redeploy
```

### 502 Bad Gateway
```
- Verifique DATABASE_URL/variáveis
- Veja logs do backend
- Rode migrations novamente se preciso
```

---

## ⏱️ ATAJOS

```powershell
# Ver logs (serviço atual linkado)
railway logs

# Redeploy rápido
railway up
```

---

## 🎯 RESULTADO ESPERADO

```
+----------------------------------------------+
|                                              |
|  ✅ Backend atualizado no Railway            |
|  ✅ Admin rodando no Railway                 |
|  ✅ Aluno rodando no Railway                 |
|  ✅ CORS configurado entre os serviços       |
|  ✅ Código em produção 100% integrado        |
|                                              |
+----------------------------------------------+
```

---

## 🤖 COMO QUER CONTINUAR?

Escolha:
- **A** – Rodar o script automático (`atualizar-deploy-existente.ps1`)
- **B** – Seguir o guia manual (`DEPLOY_ATUALIZAR_EXISTENTE.md`)
- **C** – Me pedir para guiar passo a passo
- **?** – Tirar dúvidas
