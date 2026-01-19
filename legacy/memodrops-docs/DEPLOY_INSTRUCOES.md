# 🚀 DEPLOY - Instruções

## ⚠️ PROBLEMA DETECTADO

O build está falhando no Windows devido a symlinks do monorepo.

**Erro**: `EISDIR: illegal operation on a directory, symlink`

---

## ✅ SOLUÇÃO: Deploy via Git Push

### **Opção 1: Deploy no Railway (Backend já está lá)** ⭐ RECOMENDADO

```bash
# 1. Commit as mudanças do HeroUI
git add .
git commit -m "feat: Add HeroUI theme and update to light mode"

# 2. Push para GitHub
git push origin main

# 3. Railway fará deploy automático
# Acompanhe em: https://railway.app
```

---

### **Opção 2: Deploy no Vercel (Frontend)** ⭐ ALTERNATIVA

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd apps/web
vercel --prod
```

---

## 📦 O QUE FOI MODIFICADO (Pronto para Deploy)

### **Arquivos Adicionados:**
- ✅ `app/providers.tsx` - HeroUI Provider
- ✅ `app/test-heroui/page.tsx` - Página de teste

### **Arquivos Modificados:**
- ✅ `tailwind.config.js` - Configuração HeroUI + tema azul
- ✅ `app/layout.tsx` - Provider e light theme
- ✅ `app/globals.css` - Cores light
- ✅ `package.json` - Dependências HeroUI

### **Dependências Novas:**
- ✅ @heroui/react@^2.8.5
- ✅ framer-motion@^12.23.25

---

## 🎯 CHECKLIST PRE-DEPLOY

- [x] HeroUI instalado
- [x] Tema azul configurado
- [x] Light theme ativado
- [x] Provider criado
- [x] Layout atualizado
- [ ] Commit feito
- [ ] Push para GitHub
- [ ] Verificar Railway/Vercel

---

## 🚀 COMANDOS RÁPIDOS

### **Para fazer deploy AGORA:**

```bash
# Windows PowerShell
cd D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main

# 1. Commit
git add .
git commit -m "feat: HeroUI light theme with blue color scheme"

# 2. Push
git push origin main

# 3. Acompanhar
# Railway: https://railway.app
# Vercel: https://vercel.com/dashboard
```

---

## 📊 AMBIENTES DE DEPLOY

### **Backend (Railway)**
- URL: https://backend-production-61d0.up.railway.app
- Status: ✅ Online
- Auto-deploy: ✅ Ativo

### **Frontend Admin (Railway/Vercel)**
- Atual: Vercel
- Status: ⚠️ Precisa atualizar
- Deploy: Via Git Push

---

## 🔧 TROUBLESHOOTING

### **Erro: EISDIR illegal operation on directory**

**Causa**: Symlinks do pnpm workspace não funcionam no Windows

**Solução**: 
1. Fazer commit local
2. Push para GitHub
3. Deixar CI/CD fazer build no Linux

### **Erro: Module not found @heroui/react**

**Solução**:
```bash
cd apps/web
pnpm install --force
```

### **Erro: Build failed**

**Solução**:
```bash
# Limpar cache
rm -rf .next
rm -rf node_modules/.cache

# Reinstalar
pnpm install

# Rebuild
pnpm build
```

---

## 🎯 DEPLOY AUTOMÁTICO

### **Railway**

1. Conecta ao GitHub ✅
2. Detecta mudanças no `apps/web` ✅
3. Faz build automaticamente ✅
4. Deploy em produção ✅

**Nada a fazer manualmente!** Só fazer push.

### **Vercel**

1. Conecta ao GitHub ✅
2. Detecta mudanças no `apps/web` ✅
3. Faz build automaticamente ✅
4. Deploy em produção ✅

**Nada a fazer manualmente!** Só fazer push.

---

## ✅ PRÓXIMO PASSO

```bash
# Execute agora:
git add .
git commit -m "feat: Add HeroUI with blue light theme"
git push origin main
```

Depois acompanhe o deploy em:
- Railway: https://railway.app
- Vercel: https://vercel.com

---

## 📞 STATUS

- ✅ Código pronto
- ✅ HeroUI configurado
- ✅ Tema azul ativo
- ⏳ Aguardando commit/push
- ⏳ Aguardando deploy automático

**Tempo estimado de deploy**: 3-5 minutos após push

---

**Preparado por**: Claude AI  
**Data**: 2025-01-22  
**Status**: ✅ Pronto para deploy
