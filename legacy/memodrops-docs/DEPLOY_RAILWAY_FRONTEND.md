# 🚀 Deploy Frontend Admin no Railway

## 📊 Situação Atual
- ✅ Backend rodando no Railway
- ❌ Frontend tentando na Vercel (falhando)
- 🎯 Solução: Deployar frontend também no Railway

---

## 🔧 PASSO 1: Criar Novo Serviço no Railway

1. **Acesse**: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b

2. **Clique em**: "+ New Service"

3. **Selecione**: "GitHub Repo"

4. **Configure o Repo**:
   - Repository: `leorotundo-dev/memodrops`
   - Branch: `main`

5. **Clique em "Add Service"**

---

## ⚙️ PASSO 2: Configurar o Serviço

Depois de criar, configure:

### **Settings → General**
```
Service Name: web-admin
```

### **Settings → Source**
```
Root Directory: apps/web
```

### **Settings → Build**
```
Build Command: pnpm install && pnpm build
Start Command: pnpm start
```

### **Settings → Variables**
Adicione estas variáveis:

```env
NEXT_PUBLIC_API_URL=https://memodropsweb-production.up.railway.app
NODE_ENV=production
PORT=3000
```

### **Settings → Networking**
```
Generate Domain: ✓ (marque essa opção)
```

---

## 🎯 PASSO 3: Deploy

Depois de configurar tudo:

1. Railway vai fazer deploy automaticamente
2. Aguarde 3-5 minutos
3. Anote a URL gerada (exemplo: `web-admin-production-xxx.up.railway.app`)

---

## ✅ PASSO 4: Atualizar CORS no Backend

Depois de obter a URL do frontend:

1. Vá no serviço **backend** no Railway
2. **Variables** → Adicione/Edite:
   ```
   ALLOWED_ORIGINS=https://web-admin-production-xxx.up.railway.app
   ```
3. **Redeploy** o backend

---

## 📋 Checklist

- [ ] Criar serviço no Railway
- [ ] Configurar Root Directory: `apps/web`
- [ ] Adicionar variáveis de ambiente
- [ ] Aguardar deploy completar
- [ ] Anotar URL gerada
- [ ] Atualizar CORS no backend
- [ ] Testar acesso

---

## 🎉 Resultado Esperado

Você terá:

```
✅ Backend:  https://memodropsweb-production.up.railway.app
✅ Admin:    https://web-admin-production-xxx.up.railway.app
✅ Database: PostgreSQL (Railway)
✅ Tudo funcionando junto!
```

---

**Comece agora pelo PASSO 1!** 🚀
