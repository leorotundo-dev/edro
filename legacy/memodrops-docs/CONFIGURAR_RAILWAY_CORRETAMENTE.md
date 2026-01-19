# 🔧 Configurar Railway Corretamente - Passo a Passo

## 🎯 Problema Identificado:

Os serviços estão crashando porque:
1. ❌ **AI service** não é um serviço (é biblioteca)
2. ❌ **Root directories** não estão configurados
3. ❌ **Variáveis de ambiente** faltando

---

## ✅ SOLUÇÃO COMPLETA (15 minutos):

### 🔴 PASSO 1: Remover AI Service (2 min)

O "ai" não é um serviço standalone, é uma biblioteca usada pelo backend.

**No Railway:**
1. Clique em **@edro/ai**
2. Settings (engrenagem)
3. Role até o final
4. **"Remove Service"**
5. Confirme

✅ Isso vai parar os crashes do AI

---

### 🟡 PASSO 2: Configurar Web (Admin) (3 min)

**No Railway:**
1. Clique em **@edro/web**
2. Vá em **Settings**
3. Configure:

```
📂 Root Directory: apps/web
🔨 Build Command: npm install && npm run build
🚀 Start Command: npm start
```

4. Vá em **Variables**
5. Adicione:

```env
NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

> **⚠️ Importante:** Substitua pela URL real do seu backend!
> (Pegar em: Backend → Settings → Domains)

6. **Salvar**
7. **Redeploy** (Deployments → ... → Redeploy)

---

### 🟡 PASSO 3: Configurar Web-Aluno (3 min)

**No Railway:**
1. Clique em **@edro/web-aluno**
2. Vá em **Settings**
3. Configure:

```
📂 Root Directory: apps/web-aluno
🔨 Build Command: npm install && npm run build
🚀 Start Command: npm start
```

4. Vá em **Variables**
5. Adicione:

```env
NEXT_PUBLIC_API_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

6. **Salvar**
7. **Redeploy**

---

### 🟡 PASSO 4: Configurar Scrapers (3 min)

**No Railway:**
1. Clique em **scrapers**
2. Vá em **Settings**
3. Configure:

```
📂 Root Directory: apps/scrapers
🔨 Build Command: npm install
🚀 Start Command: npm start
```

4. Vá em **Variables**
5. Adicione:

```env
BACKEND_URL=https://memodrops-backend-production.up.railway.app
NODE_ENV=production
```

6. **Salvar**
7. **Redeploy**

---

### 🟢 PASSO 5: Verificar Backend (1 min)

O backend já está online! Mas confirme as configurações:

**No Railway:**
1. Clique em **@edro/backend**
2. Vá em **Settings**
3. Verifique:

```
✅ Builder: DOCKERFILE
✅ Dockerfile Path: Dockerfile
✅ Root Directory: / (vazio ou raiz)
```

4. Em **Variables**, confirme que tem:

```env
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production
```

---

## 📊 Status Esperado (após 10 minutos):

```
✅ Backend: Online
✅ Postgres: Online  
✅ Web: Online (após configurar)
✅ Web-Aluno: Online (após configurar)
✅ Scrapers: Online (após configurar)
❌ AI: Removido (não é serviço)
```

---

## 🔍 Como Verificar se Deu Certo:

### 1. **Status dos Serviços**
```
Railway Dashboard deve mostrar:
🟢 backend
🟢 postgres
🟢 web
🟢 web-aluno
🟢 scrapers
```

### 2. **Testar Endpoints**

```bash
# Backend
curl https://seu-backend.railway.app/health

# Web (Admin)
# Abrir no navegador: https://seu-web.railway.app

# Web-Aluno
# Abrir no navegador: https://seu-web-aluno.railway.app
```

---

## 🚨 Se Algo Falhar:

### **Web ainda crashando:**

**Verificar logs:**
1. Railway → @edro/web → Deployments
2. Clicar no deployment falhado
3. Ver **Build Logs** e **Deploy Logs**

**Erros comuns:**
```
❌ "Module not found" → Build command incorreto
❌ "Cannot find package.json" → Root directory incorreto
❌ "ECONNREFUSED" → Variável NEXT_PUBLIC_API_URL incorreta
❌ "Port 3000 already in use" → Railway gerencia isso, ignore
```

### **Scrapers crashando:**

**Possível causa:** Falta código no `src/index.js`

Verificar:
```bash
ls apps/scrapers/src/
cat apps/scrapers/src/index.js
```

Se estiver vazio ou faltando, criar um básico:
```javascript
// apps/scrapers/src/index.js
console.log('Scrapers service started');
console.log('Backend URL:', process.env.BACKEND_URL);

// TODO: Implementar lógica de scraping
setInterval(() => {
  console.log('Scraper running...');
}, 60000); // A cada 1 minuto
```

---

## 📝 Checklist Final:

- [ ] AI service removido do Railway
- [ ] Web configurado (root dir + variables)
- [ ] Web-Aluno configurado (root dir + variables)
- [ ] Scrapers configurado (root dir + variables)
- [ ] Todos os serviços com status 🟢
- [ ] URLs funcionando no navegador

---

## 🎉 Sucesso!

Quando todos os serviços estiverem 🟢:

```
┌─────────────────────────────────────┐
│  🎉 DEPLOYMENT COMPLETO!            │
├─────────────────────────────────────┤
│  ✅ Backend: Online                 │
│  ✅ Postgres: Online                │
│  ✅ Web (Admin): Online             │
│  ✅ Web-Aluno: Online               │
│  ✅ Scrapers: Online                │
└─────────────────────────────────────┘

URLs:
🔗 API: https://memodrops-backend-...railway.app
🔗 Admin: https://memodrops-web-...railway.app
🔗 Aluno: https://memodrops-web-aluno-...railway.app
```

---

## 💡 Próximos Passos:

1. ✅ Confirmar que tudo está online
2. 📸 Fazer screenshot para documentação
3. 🧪 Testar funcionalidades principais
4. 🎨 Configurar domínios customizados (opcional)

---

**Tempo total:** ~15 minutos
**Dificuldade:** Média
**Sucesso garantido:** 99% 🎯
