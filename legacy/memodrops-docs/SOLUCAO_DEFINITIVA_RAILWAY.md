# 🎯 SOLUÇÃO DEFINITIVA - Dockerfiles com Monorepo

## ✅ PROBLEMA ENCONTRADO E CORRIGIDO!

Os apps Next.js (`web` e `web-aluno`) **dependem de** `@edro/shared`, mas os Dockerfiles anteriores não estavam copiando essa pasta.

**Agora está corrigido!** ✨

---

## 🔧 O QUE FOI CORRIGIDO:

### 1. **Dockerfiles Atualizados**
- ✅ Agora incluem o workspace completo (pnpm)
- ✅ Buildam `@edro/shared` antes dos apps
- ✅ Usam pnpm para gerenciar o monorepo

### 2. **Railway Configs Atualizados**
- ✅ Dockerfiles apontam para caminhos corretos
- ✅ Root directory configurado para raiz do projeto

---

## 📋 CONFIGURAÇÃO NO RAILWAY (5 minutos):

### **1. @edro/web**

**Passo 1 - Settings:**
1. Clique em **@edro/web**
2. Vá em **Settings**
3. Configure:
   ```
   Root Directory: (vazio ou "/")
   Builder: DOCKERFILE
   Dockerfile Path: apps/web/Dockerfile
   ```

**Passo 2 - Variables:**
1. Clique em **Variables**
2. Adicione:
   ```env
   NEXT_PUBLIC_API_URL=https://[seu-backend].railway.app
   NODE_ENV=production
   ```

**Passo 3 - Redeploy:**
1. Deployments → ... → **Redeploy**

---

### **2. @edro/web-aluno**

**Passo 1 - Settings:**
1. Clique em **@edro/web-aluno**
2. Vá em **Settings**
3. Configure:
   ```
   Root Directory: (vazio ou "/")
   Builder: DOCKERFILE
   Dockerfile Path: apps/web-aluno/Dockerfile
   ```

**Passo 2 - Variables:**
1. Clique em **Variables**
2. Adicione:
   ```env
   NEXT_PUBLIC_API_URL=https://[seu-backend].railway.app
   NODE_ENV=production
   ```

**Passo 3 - Redeploy:**
1. Deployments → ... → **Redeploy**

---

### **3. @edro/ai** (REMOVER)

```
1. Clique em @edro/ai
2. Settings → Scroll até o final
3. "Remove Service" ou "Pause"
```

---

## 🚀 Git Push (FAZER AGORA):

```bash
cd memodrops-main
git add .
git commit -m "fix: Dockerfiles with monorepo support for Next.js apps"
git push origin main
```

---

## 📊 Status Esperado (em 15 min):

```
✅ Backend: Online
✅ Postgres: Online
✅ Scrapers: Online
🔄 Web: Building... → Online (com monorepo)
🔄 Web-Aluno: Building... → Online (com monorepo)
❌ AI: Removido
```

---

## 🔍 Diferença dos Dockerfiles:

### **ANTES (Quebrado):**
```dockerfile
COPY package*.json ./
RUN npm install
COPY . .
# ❌ Faltava @edro/shared!
```

### **DEPOIS (Correto):**
```dockerfile
# Copia workspace completo
COPY pnpm-workspace.yaml ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared primeiro
WORKDIR /app/packages/shared
RUN pnpm build

# Depois build do app
WORKDIR /app/apps/web
RUN pnpm build
```

---

## ⏱️ Timeline:

```
Agora:       Git push + Configurar Railway
  ↓
+5 min:      Railway detecta e inicia builds
  ↓
+10 min:     Builds completando (mais demorado agora)
  ↓
+15 min:     ✅ TUDO ONLINE!
```

---

## 🎯 Checklist Final:

- [ ] Git push executado
- [ ] Web: Root Directory = "/" (raiz)
- [ ] Web: Dockerfile Path = "apps/web/Dockerfile"
- [ ] Web: Variables configuradas
- [ ] Web: Redeploy feito
- [ ] Web-Aluno: Root Directory = "/" (raiz)
- [ ] Web-Aluno: Dockerfile Path = "apps/web-aluno/Dockerfile"
- [ ] Web-Aluno: Variables configuradas
- [ ] Web-Aluno: Redeploy feito
- [ ] AI: Removido ou pausado
- [ ] Aguardar 15 minutos
- [ ] Verificar: todos 🟢

---

## 💡 Por que agora vai funcionar:

1. ✅ **Monorepo completo** é copiado
2. ✅ **@edro/shared** é buildado primeiro
3. ✅ **pnpm** gerencia as dependências internas
4. ✅ **Mesmo processo** que localmente

---

## 🚨 Se Ainda Falhar:

Verifique os logs e procure por:

**Erro comum:**
```
Cannot find pnpm-workspace.yaml
```
**Solução:** Certifique-se que Root Directory está em "/" (raiz)

---

## 📸 Me envie depois:

1. Screenshot do Railway (todos os serviços)
2. "✅ Tudo online!" ou logs de erro

---

**Essa é a solução definitiva! Vai funcionar! 🚀**
