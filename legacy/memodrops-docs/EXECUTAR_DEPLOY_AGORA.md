# 🚀 EXECUTAR DEPLOY AGORA - CHECKLIST

**Tempo estimado:** 1-2 horas  
**Dificuldade:** Intermediária  
**Pré-requisito:** código 100% pronto ✅

---

## ⚡ DEPLOY RÁPIDO (30 MIN)

### Opção 1 – Script automatizado (recomendado)

```powershell
.\deploy-completo.ps1
# Escolha a opção 1 (Deploy completo)
```

O script verifica pré-requisitos, commita, faz push e dispara o CI/CD que:
- constrói backend/frontends
- roda migrations
- faz deploy dos 3 serviços no Railway

### Opção 2 – Manual rápido (com Railway CLI)

```powershell
# 1. Push
git add .
git commit -m "feat: deploy production-ready"
git push origin main

# 2. Deploy backend
cd apps/backend
railway up
cd ../..

# 3. Deploy admin
cd apps/web
railway up
cd ../..

# 4. Deploy aluno
cd apps/web-aluno
railway up
cd ../..

# 5. Validar
curl https://backend-production-61d0.up.railway.app/api/health
```

---

## ✅ CHECKLIST COMPLETO

### Antes de começar
```
[ ] Código integrado
[ ] Testes locais ok
[ ] .env local configurado
[ ] Git working tree limpo
[ ] Conta Railway com projeto criado
[ ] Railway CLI instalada (se for usar manual)
```

### Passo 1 – Backend no Railway

1. Projeto → serviço backend → aba **Variables**
2. Configure:
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=gerar_secret_forte
PORT=3333
NODE_ENV=production
ALLOWED_ORIGINS=https://admin.seu-projeto.up.railway.app,https://aluno.seu-projeto.up.railway.app
OPENAI_API_KEY=...
ENABLE_WORKERS=true
```
3. Settings → Root Directory `apps/backend`
4. Build Command `pnpm install && pnpm run build`
5. Start Command `pnpm start`
6. Deploy e anote a URL gerada
7. Rode migrations (`railway run pnpm run db:migrate`)

### Passo 2 – Frontend Admin no Railway

1. New Service → Deploy from GitHub → escolher repo
2. Root Directory `apps/web`
3. Build `pnpm install && pnpm run build`
4. Start `pnpm start`
5. Variáveis:
```env
NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app
```
6. Deploy e anotar URL `https://admin.seu-projeto.up.railway.app`

### Passo 3 – Frontend Aluno no Railway

1. Repetir processo usando Root `apps/web-aluno`
2. O `railway.json` já aponta para o Dockerfile; só confirmar variáveis:
```env
NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app
```
3. Deploy e anotar URL `https://aluno.seu-projeto.up.railway.app`

### Passo 4 – Atualizar CORS

Atualize `ALLOWED_ORIGINS` do backend com as URLs reais do admin/aluno e redeploy o backend.

### Passo 5 – Validação

- `curl https://backend.../api/health`
- Abrir as duas URLs dos frontends e testar navegação
- No console do browser: `fetch('https://backend.../api/disciplines').then(r => r.json()).then(console.log)`

### Passo 6 – CI/CD (opcional)

No GitHub → Settings → Secrets → Actions:
```env
RAILWAY_TOKEN=<token da Railway>
```
O workflow já sabe usar esse token para rodar deploy multi-ambiente.

---

## 🛠️ TROUBLESHOOTING

| Problema | Causa comum | Como resolver |
|----------|-------------|----------------|
| Build falhou | Root/Build/Start incorretos | Ajustar settings do serviço no Railway |
| CORS error | ALLOWED_ORIGINS sem URLs novas | Atualizar variável e redeployar backend |
| 502 | Variáveis DB erradas / migrations faltando | Ver logs, revisar DATABASE_URL e rodar migrations |

---

## 📋 TL;DR / Scripts úteis

```powershell
# Ver logs do serviço atual
railway logs

# Redeploy rápido do diretório atual
railway up
```

URLs finais esperadas:
```
Backend:  https://backend-production-61d0.up.railway.app
Admin:    https://admin.seu-projeto.up.railway.app
Aluno:    https://aluno.seu-projeto.up.railway.app
```

Quando tudo estiver verde:
```
+--------------------------------------+
| ✅ Backend no Railway                |
| ✅ Admin no Railway                 |
| ✅ Aluno no Railway                 |
| ✅ CORS configurado                 |
| ✅ API + Frontends funcionando      |
+--------------------------------------+
```