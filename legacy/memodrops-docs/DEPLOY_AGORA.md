# 🚀 DEPLOY MEMODROPS - AGORA

## 📊 Situação Atual

**Erro na Vercel**: `404: DEPLOYMENT_NOT_FOUND`
- O deployment anterior foi removido ou não existe mais
- Precisamos criar um novo deployment

**Mudanças Pendentes**:
- ✅ 18 arquivos modificados (tema azul aplicado)
- ✅ 19 arquivos novos (scrapers e documentação)

---

## 🎯 SOLUÇÃO: Fazer Deploy Novo

### **PASSO 1: Commit das Mudanças**

```powershell
cd memodrops-main

git add .
git commit -m "feat: aplicar tema azul e adicionar scrapers completos"
git push origin main
```

---

### **PASSO 2: Deploy Frontend Admin na Vercel**

#### **Opção A: Via Dashboard (Recomendado)**

1. Acesse: https://vercel.com/new
2. Clique em **"Import Git Repository"**
3. Selecione: `leorotundo-dev/memodrops`
4. Configure:
   - **Project Name**: `memodrops-web-admin`
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app
   ```

6. Clique em **"Deploy"**

---

#### **Opção B: Via CLI (Se tiver Vercel CLI)**

```powershell
cd apps/web

# Login (se ainda não fez)
vercel login

# Deploy para produção
vercel --prod

# Adicionar variável de ambiente
vercel env add NEXT_PUBLIC_API_URL production
# Cole: https://backend-production-61d0.up.railway.app
```

---

### **PASSO 3: Deploy Frontend Aluno na Vercel**

#### **Via Dashboard:**

1. Acesse: https://vercel.com/new
2. Selecione: `leorotundo-dev/memodrops` (mesmo repo)
3. Configure:
   - **Project Name**: `memodrops-web-aluno`
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web-aluno`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://backend-production-61d0.up.railway.app
   ```

5. Clique em **"Deploy"**

---

#### **Via CLI:**

```powershell
cd apps/web-aluno
vercel --prod
vercel env add NEXT_PUBLIC_API_URL production
```

---

### **PASSO 4: Atualizar CORS no Backend**

Após obter as URLs da Vercel (exemplo):
- Admin: `https://memodrops-web-admin.vercel.app`
- Aluno: `https://memodrops-web-aluno.vercel.app`

1. Acesse Railway: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b
2. Clique no serviço **backend**
3. Vá em **Variables**
4. Adicione/Edite:
   ```
   ALLOWED_ORIGINS=https://memodrops-web-admin.vercel.app,https://memodrops-web-aluno.vercel.app
   ```
5. Clique em **Redeploy**

---

## 📋 Checklist de Deploy

### **Antes de Começar:**
- [ ] Git instalado
- [ ] Credenciais GitHub configuradas
- [ ] Conta Vercel ativa
- [ ] Token Vercel (se usar CLI)

### **Deploy:**
- [ ] Commit e push das mudanças
- [ ] Deploy Frontend Admin na Vercel
- [ ] Deploy Frontend Aluno na Vercel
- [ ] Anotar URLs geradas
- [ ] Atualizar ALLOWED_ORIGINS no Railway
- [ ] Redeploy do backend

### **Validação:**
- [ ] Admin carrega sem erros
- [ ] Aluno carrega sem erros
- [ ] Sem erros CORS
- [ ] API responde
- [ ] Dashboard funciona

---

## 🔗 Links Importantes

- **GitHub Repo**: https://github.com/leorotundo-dev/memodrops
- **Railway Backend**: https://backend-production-61d0.up.railway.app
- **Railway Dashboard**: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## ⚡ Script Rápido (Commit + Push)

```powershell
# Copie e cole tudo de uma vez:

cd memodrops-main
git add .
git commit -m "feat: aplicar tema azul e adicionar scrapers completos"
git push origin main
Write-Host "✅ Push completo! Agora faça deploy na Vercel" -ForegroundColor Green
```

---

## 🆘 Troubleshooting

### **Erro: Not logged in to Vercel**
```powershell
vercel login
# Siga instruções no browser
```

### **Erro: Git authentication failed**
```powershell
# Configure token GitHub
git config --global credential.helper store
git push origin main
# Digite token quando solicitado
```

### **Erro: Build failed na Vercel**
- Verifique se Root Directory está correto: `apps/web` ou `apps/web-aluno`
- Verifique se Build Command é: `npm run build`
- Veja logs completos no dashboard da Vercel

---

## ✅ Depois do Deploy

Você terá:

```
✅ Admin Online:  https://memodrops-web-admin.vercel.app
✅ Aluno Online:  https://memodrops-web-aluno.vercel.app
✅ Backend Online: https://backend-production-61d0.up.railway.app
✅ CORS Configurado entre todos
✅ Sistema 100% funcional
```

---

**Começe agora executando o PASSO 1! 🚀**
