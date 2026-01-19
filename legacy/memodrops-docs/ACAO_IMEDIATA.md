# ⚡ AÇÃO IMEDIATA - 3 Passos Rápidos

## ✅ Situação Atual
- **Backend:** 🟢 Online
- **Postgres:** 🟢 Online  
- **Web:** 🔴 Build Failed
- **AI:** 🔴 Crashed
- **Web-Aluno:** 🔴 Build Failed
- **Scrapers:** 🔴 Build Failed

---

## 🎯 O QUE FAZER AGORA (15 minutos)

### **PASSO 1: Commit e Push (2 min)**

```bash
cd memodrops-main

# Adicionar as correções
git add .

# Commit
git commit -m "fix: remove VACUUM from migration 0009 + Railway configs"

# Push
git push origin main
```

✅ **Isso vai triggerar novo deploy automático no Railway**

---

### **PASSO 2: Configurar Variáveis de Ambiente (5 min)**

#### 🌐 **Web (Admin Dashboard)**

No Railway Dashboard:
1. Clique em **@edro/web**
2. Vá em **Variables**
3. Adicione:

```env
NEXT_PUBLIC_API_URL=https://sua-url-do-backend.railway.app
NODE_ENV=production
```

> **Como pegar a URL do backend:**
> Dashboard → @edro/backend → Settings → Domains → Copiar URL

---

#### 🤖 **AI Service**

1. Clique em **@edro/ai**
2. Vá em **Variables**
3. Adicione:

```env
OPENAI_API_KEY=sk-...
BACKEND_URL=https://sua-url-do-backend.railway.app
PORT=5000
NODE_ENV=production
```

> **Importante:** Substitua `sk-...` pela sua chave real da OpenAI

---

#### 👨‍🎓 **Web-Aluno**

1. Clique em **@edro/web-aluno**
2. Vá em **Variables**
3. Adicione:

```env
NEXT_PUBLIC_API_URL=https://sua-url-do-backend.railway.app
NODE_ENV=production
```

---

#### 🕷️ **Scrapers**

1. Clique em **scrapers**
2. Vá em **Variables**
3. Adicione:

```env
BACKEND_URL=https://sua-url-do-backend.railway.app
NODE_ENV=production
```

---

### **PASSO 3: Forçar Redeploy (5 min)**

Para cada serviço que falhou:

1. **No Railway Dashboard**, clique no serviço
2. Vá em **Deployments**
3. Clique nos **3 pontinhos** (...) do último deployment
4. Selecione **"Redeploy"**

**Ordem sugerida:**
1. ✅ Backend (já está online, não precisa)
2. 🔴 Web → Redeploy
3. 🔴 AI → Redeploy  
4. 🔴 Web-Aluno → Redeploy
5. 🔴 Scrapers → Redeploy

---

## 📊 Como Verificar Se Funcionou

### ✅ **Web (Admin)**

Aguarde o deploy e verifique:
- Status: **Deployed** (verde)
- Abra a URL: `https://sua-web.railway.app`
- Deve carregar sem erros 404

**Se continuar falhando:**
- Clique no deployment → Ver **logs**
- Copie os últimos erros e envie aqui

---

### ✅ **AI Service**

Aguarde o deploy e verifique:
- Status: **Deployed** (verde)
- Logs mostram: "AI service started" ou similar

**Se crashar:**
- Ver logs → Copiar erro e enviar aqui

---

## 🚨 Se Ainda Houver Erros

**Me envie:**

1. **Screenshot do Railway** mostrando status dos serviços
2. **Logs de erro** (últimas 30-50 linhas) de cada serviço que falhou
3. **Output** de testar build localmente:

```bash
# Testar Web localmente
cd apps/web
npm install
npm run build

# Se der erro, copie e cole aqui
```

---

## 💡 Comandos Úteis

### Ver logs no terminal (Railway CLI)
```bash
# Instalar
npm install -g @railway/cli

# Login
railway login

# Ver logs
railway logs --service web
railway logs --service ai
railway logs --service backend
```

### Testar builds localmente
```bash
# Windows (PowerShell)
.\test-builds.sh

# Linux/Mac
chmod +x test-builds.sh
./test-builds.sh
```

---

## ⏱️ Timeline Esperada

- **0-2 min:** Git push completo ✅
- **2-5 min:** Configurar variáveis ✅
- **5-10 min:** Redeployments rodando ⏳
- **10-15 min:** Verificar status final ✅

---

## 📞 Próximo Contato

**Após executar os 3 passos, me envie:**

```
✅ Status dos serviços:
- Backend: 🟢
- Web: 🟢 ou 🔴
- AI: 🟢 ou 🔴
- Web-Aluno: 🟢 ou 🔴
- Scrapers: 🟢 ou 🔴

❌ Se algum falhou, envie:
- [ ] Screenshot
- [ ] Logs de erro
- [ ] Output do build local
```

---

**🎯 Meta:** Todos os serviços 🟢 em 15 minutos!
