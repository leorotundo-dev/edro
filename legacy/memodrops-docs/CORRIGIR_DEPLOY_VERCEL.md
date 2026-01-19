# 🔧 CORRIGIR DEPLOY NA VERCEL

## ❌ Problema Atual

Você deployou o **backend** na Vercel:
- URL: `memodrops-backend-1wa728m20-memodrop-vercel.vercel.app`

Mas deveria deployer o **frontend (web)**!

---

## ✅ SOLUÇÃO: Deletar e Recriar

### **PASSO 1: Deletar Projeto Incorreto**

1. Acesse: https://vercel.com/dashboard
2. Encontre o projeto: `memodrops-backend`
3. Clique nele
4. Settings → General → Delete Project
5. Digite o nome e confirme

---

### **PASSO 2: Criar Projeto Correto**

1. **Acesse**: https://vercel.com/new

2. **Import Git Repository**:
   - Clique em "Import Git Repository"
   - Selecione: `leorotundo-dev/memodrops`

3. **⚠️ CONFIGURE CORRETAMENTE**:
   ```
   Project Name: memodrops-web-admin
   Framework Preset: Next.js
   Root Directory: apps/web  ⬅️ IMPORTANTE!
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Environment Variables**:
   - Clique em "Add Environment Variable"
   - Nome: `NEXT_PUBLIC_API_URL`
   - Valor: `https://memodropsweb-production.up.railway.app`

5. **Deploy**:
   - Clique em "Deploy"
   - Aguarde 3-5 minutos

---

## 📋 CHECKLIST

Certifique-se de:

- [ ] Root Directory = `apps/web` (NÃO `apps/backend`!)
- [ ] Framework = Next.js
- [ ] Environment Variable NEXT_PUBLIC_API_URL adicionada
- [ ] Build iniciou sem erros

---

## 🎯 Resultado Esperado

Após o deploy você terá:

```
✅ URL: https://memodrops-web-admin-xxx.vercel.app
✅ Dashboard: https://memodrops-web-admin-xxx.vercel.app/admin
✅ Conectado ao backend Railway
```

---

## 🔍 Verificação

Teste a URL gerada:

```bash
# Deve retornar HTML do Next.js
curl https://memodrops-web-admin-xxx.vercel.app

# Dashboard admin deve carregar
# Browser: https://memodrops-web-admin-xxx.vercel.app/admin
```

---

## 💡 Por que deu errado?

A Vercel tentou fazer deploy do backend porque:
- Root Directory estava incorreto (raiz do repo)
- Vercel detectou código TypeScript do backend
- Tentou buildar como Next.js mas era Fastify

---

## 🗂️ Estrutura Correta

```
memodrops/
├── apps/
│   ├── backend/     ← Deploy no Railway (já está lá!)
│   ├── web/         ← Deploy na Vercel (fazer agora!)
│   └── web-aluno/   ← Deploy na Vercel (opcional)
```

---

## ⚡ ATALHO VIA CLI

Se tiver Vercel CLI instalado:

```powershell
cd apps/web
vercel --prod
vercel env add NEXT_PUBLIC_API_URL production
# Cole: https://memodropsweb-production.up.railway.app
```

---

**Execute agora**: Delete o projeto incorreto e crie o correto! 🚀
