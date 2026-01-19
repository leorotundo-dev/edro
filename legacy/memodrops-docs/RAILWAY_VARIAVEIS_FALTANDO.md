# 🔧 RAILWAY - VARIÁVEIS FALTANDO (SOLUÇÃO)

## ❌ PROBLEMA IDENTIFICADO

```
ZodError: JWT_SECRET
expected: "string"
received: "undefined"
```

**Causa:** Variáveis de ambiente não configuradas no Railway!

---

## ✅ SOLUÇÃO (5 MINUTOS)

### PASSO 1: Configurar @edro/backend

1. **Railway Dashboard** > **@edro/backend**

2. **Settings > Variables**

3. **Adicionar estas variáveis:**

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=memodrops-super-secret-jwt-key-2024-production-railway
OPENAI_API_KEY=sk-proj-XXXXX
NODE_ENV=production
PORT=3333
ALLOWED_ORIGINS=https://memodrops-admin.railway.app,https://memodrops-app.railway.app
```

**IMPORTANTE:**
- `DATABASE_URL` use exatamente: `${{Postgres.DATABASE_URL}}`
- `OPENAI_API_KEY` coloque sua chave real da OpenAI
- `ALLOWED_ORIGINS` ajuste com as URLs reais dos seus frontends

4. **Redeploy** o backend

---

### PASSO 2: Configurar @edro/web (Frontend Admin)

1. **Railway Dashboard** > **@edro/web**

2. **Settings > Variables**

3. **Adicionar:**

```bash
NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

**IMPORTANTE:** Use a URL pública real do seu backend

4. **Redeploy**

---

### PASSO 3: Configurar @edro/web-aluno (Frontend Aluno)

1. **Railway Dashboard** > **@edro/web-aluno**

2. **Settings > Variables**

3. **Adicionar:**

```bash
NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

4. **Redeploy**

---

### PASSO 4: Configurar @edro/ai

1. **Railway Dashboard** > **@edro/ai**

2. **Settings > Variables**

3. **Adicionar:**

```bash
OPENAI_API_KEY=sk-proj-XXXXX
DATABASE_URL=${{Postgres.DATABASE_URL}}
PORT=3334
NODE_ENV=production
```

4. **Redeploy**

---

## 📋 CHECKLIST

### Backend (@edro/backend):
- [ ] DATABASE_URL = ${{Postgres.DATABASE_URL}}
- [ ] JWT_SECRET = (qualquer string longa)
- [ ] OPENAI_API_KEY = (sua chave)
- [ ] NODE_ENV = production
- [ ] PORT = 3333
- [ ] ALLOWED_ORIGINS = (URLs dos frontends)
- [ ] Redeploy executado

### Frontend Admin (@edro/web):
- [ ] NEXT_PUBLIC_API_URL = (URL do backend)
- [ ] NODE_ENV = production
- [ ] Redeploy executado

### Frontend Aluno (@edro/web-aluno):
- [ ] NEXT_PUBLIC_API_URL = (URL do backend)
- [ ] NODE_ENV = production
- [ ] Redeploy executado

### AI Service (@edro/ai):
- [ ] OPENAI_API_KEY = (sua chave)
- [ ] DATABASE_URL = ${{Postgres.DATABASE_URL}}
- [ ] PORT = 3334
- [ ] NODE_ENV = production
- [ ] Redeploy executado

---

## 🎯 COMO ADICIONAR VARIÁVEIS NO RAILWAY

### Método Visual:

1. Clicar no serviço
2. Ir em "Settings"
3. Rolar até "Variables"
4. Clicar em "New Variable"
5. Digitar o nome (ex: JWT_SECRET)
6. Digitar o valor
7. Clicar em "Add"
8. Repetir para cada variável
9. Ir em "Deployments" > "Redeploy"

---

## 🔑 VARIÁVEIS IMPORTANTES

### JWT_SECRET
**O que é:** Chave para assinar tokens JWT  
**Exemplo:** `memodrops-jwt-secret-production-2024-super-secure`  
**Regra:** Qualquer string longa e aleatória

### DATABASE_URL
**O que é:** URL de conexão com PostgreSQL  
**Valor:** `${{Postgres.DATABASE_URL}}`  
**Regra:** Use exatamente assim (Railway substitui automaticamente)

### OPENAI_API_KEY
**O que é:** Sua chave da API OpenAI  
**Onde pegar:** https://platform.openai.com/api-keys  
**Formato:** `sk-proj-...`

### NEXT_PUBLIC_API_URL
**O que é:** URL pública do backend  
**Onde pegar:** Railway > @edro/backend > Settings (ver Public Domain)  
**Formato:** `https://memodrops-backend-production.up.railway.app`

---

## ⏱️ TIMELINE

```
00:00 - Configurar variáveis do backend (2 min)
00:02 - Redeploy backend (5 min build)
00:07 - Backend online!
00:07 - Configurar variáveis frontend admin (1 min)
00:08 - Redeploy admin (5 min build)
00:13 - Configurar variáveis frontend aluno (1 min)
00:14 - Redeploy aluno (5 min build)
00:19 - Configurar variáveis AI (1 min)
00:20 - Redeploy AI (3 min build)
00:23 - TODOS ONLINE! 🎉
```

---

## ✅ RESULTADO ESPERADO

Após configurar todas as variáveis e fazer redeploy:

```
✅ @edro/backend - Online (sem erro de JWT_SECRET)
✅ @edro/web - Online
✅ @edro/web-aluno - Online
✅ @edro/ai - Online
✅ scrapers - Online (já estava)
✅ Postgres - Online (já estava)

= 6/6 SERVIÇOS ONLINE! 🎉
```

---

## 🚨 SE AINDA CRASHAR

Depois de adicionar variáveis, se ainda crashar:

1. **Ver logs novamente**
2. **Procurar qual variável ainda está faltando**
3. **Adicionar e redeploy**

---

## 💡 DICA PRO

Você pode adicionar TODAS as variáveis de uma vez:

1. Settings > Variables
2. Clicar em "Raw Editor"
3. Colar todas de uma vez (formato KEY=VALUE, uma por linha)
4. Salvar
5. Redeploy

---

**COMECE AGORA:**
1. Railway > @edro/backend > Settings > Variables
2. Adicionar JWT_SECRET primeiro
3. Redeploy
4. Verificar se sobe

**Tempo total:** 25 minutos  
**Dificuldade:** Fácil  
**Resultado:** 100% online! 🚀
