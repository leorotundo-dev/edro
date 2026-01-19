# 🚀 DEPLOY RAILWAY - EXECUTAR AGORA

## 🎯 OBJETIVO

Corrigir os 3 serviços crashados no Railway e deixar TUDO online!

---

## 📊 STATUS ATUAL

### Crashados (3):
- ❌ @edro/web (Frontend Admin)
- ❌ @edro/web-aluno (Frontend Aluno)
- ❌ @edro/ai (AI Service)

### Online (3):
- ✅ @edro/backend
- ✅ scrapers
- ✅ Postgres

---

## ✅ DOCKERFILES CRIADOS

- ✅ `apps/web/Dockerfile` - Frontend Admin
- ✅ `apps/web-aluno/Dockerfile` - Frontend Aluno
- ✅ `apps/ai/Dockerfile` - AI Service (NOVO!)

---

## 🚀 PASSO A PASSO

### PASSO 1: Commit e Push (5 min)

```bash
cd memodrops-main

# Add Dockerfiles
git add apps/web/Dockerfile
git add apps/web-aluno/Dockerfile
git add apps/ai/Dockerfile

# Add .env do backend
git add apps/backend/.env.example

# Commit
git commit -m "fix(railway): add Dockerfiles for all services"

# Push
git push origin main
```

---

### PASSO 2: Configurar Frontend Admin no Railway (5 min)

#### 2.1 Acessar Railway Dashboard
- Vá para: https://railway.app
- Selecione seu projeto: **memodrops**
- Clique no serviço: **@edro/web**

#### 2.2 Settings > Build
- **Builder:** Docker
- **Dockerfile Path:** `apps/web/Dockerfile`
- **Docker Build Context:** `/` (raiz)

#### 2.3 Settings > Environment Variables
Adicionar:
```
NEXT_PUBLIC_API_URL=${{memodrops-backend.PUBLIC_DOMAIN}}
NODE_ENV=production
PORT=3000
```

**Dica:** Use `${{service-name.PUBLIC_DOMAIN}}` para referenciar URL de outros serviços

#### 2.4 Deploy
- Clique em: **Deploy**
- Aguarde o build completar (~5 min)
- Verifique logs para erros

---

### PASSO 3: Configurar Frontend Aluno no Railway (5 min)

#### 3.1 Acessar Serviço
- No projeto Railway
- Clique em: **@edro/web-aluno**

#### 3.2 Settings > Build
- **Builder:** Docker
- **Dockerfile Path:** `apps/web-aluno/Dockerfile`
- **Docker Build Context:** `/`

#### 3.3 Settings > Environment Variables
```
NEXT_PUBLIC_API_URL=${{memodrops-backend.PUBLIC_DOMAIN}}
NODE_ENV=production
PORT=3000
```

#### 3.4 Deploy
- Clique em: **Deploy**
- Aguarde build

---

### PASSO 4: Configurar AI Service no Railway (5 min)

#### 4.1 Acessar Serviço
- Clique em: **@edro/ai**

#### 4.2 Settings > Build
- **Builder:** Docker
- **Dockerfile Path:** `apps/ai/Dockerfile`
- **Docker Build Context:** `/`

#### 4.3 Settings > Environment Variables
```
OPENAI_API_KEY=sk-proj-XXXXX
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3334
NODE_ENV=production
```

**IMPORTANTE:** Substitua `OPENAI_API_KEY` pela sua chave real!

#### 4.4 Deploy
- Clique em: **Deploy**
- Aguarde build

---

### PASSO 5: Monitorar Deploys (10 min)

#### Para cada serviço:

1. **Ver Logs:**
   - Railway Dashboard > Service > Deployments
   - Clique no deployment ativo
   - Ver "Build Logs" e "Deploy Logs"

2. **Verificar Status:**
   - Aguarde aparecer: **"Deployed"** (verde)
   - Se vermelho: ver logs e corrigir

3. **Testar URL:**
   - Clicar no serviço
   - Ver "Public Domain"
   - Abrir URL no navegador

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### Frontend Admin:
- [ ] Build completo sem erros
- [ ] Status: "Deployed" (verde)
- [ ] URL pública acessível
- [ ] Página carrega no navegador
- [ ] Console sem erros 404

### Frontend Aluno:
- [ ] Build completo sem erros
- [ ] Status: "Deployed"
- [ ] URL acessível
- [ ] Landing page renderiza

### AI Service:
- [ ] Build completo
- [ ] Status: "Deployed"
- [ ] Logs mostram "Server running"
- [ ] Sem crashes

---

## 🔧 TROUBLESHOOTING

### Build falha com "Module not found"

**Solução:**
```dockerfile
# Adicionar no Dockerfile:
RUN pnpm install --frozen-lockfile --no-optional
```

### Build falha com "Out of memory"

**Solução:**
- Railway Settings > Memory
- Aumentar para 2GB ou 4GB
- Ou otimizar Dockerfile (multi-stage)

### Deploy falha com "Port binding"

**Solução:**
```dockerfile
# Garantir no Dockerfile:
ENV PORT=3000
EXPOSE 3000
```

### Serviço crashando após deploy

**Ver logs:**
```
Railway Dashboard > Service > Logs
```

**Causas comuns:**
- Variável de ambiente faltando
- DATABASE_URL incorreta
- OPENAI_API_KEY inválida

---

## 📊 RESULTADO ESPERADO

Após seguir todos os passos:

```
✅ @edro/backend - Online
✅ @edro/web - Online (era crashed)
✅ @edro/web-aluno - Online (era crashed)
✅ @edro/ai - Online (era crashed)
✅ scrapers - Online
✅ Postgres - Online

= 6/6 SERVIÇOS ONLINE! 🎉
```

---

## 🌐 URLs PÚBLICAS

Após deploy, você terá:

### Backend:
```
https://memodrops-backend-production.up.railway.app
```

### Frontend Admin:
```
https://memodrops-admin-production.up.railway.app
```

### Frontend Aluno:
```
https://memodrops-app-production.up.railway.app
```

### AI Service:
```
https://memodrops-ai-production.up.railway.app
```

---

## 🎯 VALIDAÇÃO FINAL

### Teste cada URL:

```bash
# Backend
curl https://seu-backend.railway.app/health

# Frontend Admin
# Abrir no navegador

# Frontend Aluno
# Abrir no navegador

# AI Service
curl https://seu-ai.railway.app/health
```

---

## 💰 CUSTO ESTIMADO

**Railway Hobby Plan:** $5/mês
- 5 serviços incluídos
- 500 horas de execução
- $0.000231/min adicional

**Railway Pro Plan:** $20/mês
- Serviços ilimitados
- Uso ilimitado
- Prioridade no suporte

**Recomendação:** Pro Plan se tiver 6 serviços

---

## 📝 COMANDOS GIT COMPLETOS

```bash
cd D:\WORK\DESIGN` ROTUNDO\MEMODROPS\memodrops-main\memodrops-main

# Ver status
git status

# Add arquivos
git add apps/web/Dockerfile
git add apps/web-aluno/Dockerfile
git add apps/ai/Dockerfile
git add apps/backend/.env

# Commit
git commit -m "fix(railway): add optimized Dockerfiles for crashed services

- Add Frontend Admin Dockerfile with multi-stage build
- Add AI Service Dockerfile
- Update Frontend Aluno Dockerfile
- Configure proper ports and environment variables
- Fix crashes in Railway deployment

This should fix the 3 crashed services:
- @edro/web
- @edro/web-aluno
- @edro/ai
"

# Push
git push origin main

# Verificar
git log -1
```

---

## 🚀 TIMELINE

```
00:00 - Commit e push (5 min)
00:05 - Configurar Frontend Admin (5 min)
00:10 - Configurar Frontend Aluno (5 min)
00:15 - Configurar AI Service (5 min)
00:20 - Aguardar builds (5 min)
00:25 - Testar e validar (5 min)
00:30 - TUDO ONLINE! 🎉
```

---

## ✅ APÓS CONCLUSÃO

Você terá:
- ✅ Sistema 100% online
- ✅ Todos os 6 serviços funcionando
- ✅ URLs públicas acessíveis
- ✅ Zero crashes
- ✅ **MEMODROPS COMPLETO!**

---

## 📞 SUPORTE

Se algo não funcionar:

1. **Ver logs no Railway**
2. **Verificar variáveis de ambiente**
3. **Testar Dockerfiles localmente:**
   ```bash
   cd memodrops-main
   docker build -f apps/web/Dockerfile -t test-admin .
   docker build -f apps/web-aluno/Dockerfile -t test-aluno .
   docker build -f apps/ai/Dockerfile -t test-ai .
   ```

---

**IMPORTANTE:** 
- Configure sua `OPENAI_API_KEY` real no AI Service
- Use `${{service.PUBLIC_DOMAIN}}` para referenciar serviços
- Aguarde builds completarem (~5 min cada)

---

**BOA SORTE! 🚀**

Tempo estimado: 30 minutos  
Dificuldade: Média  
Resultado: Sistema 100% online na nuvem!
