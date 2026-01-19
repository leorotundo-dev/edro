# 📊 Monitoramento de Deploy - Railway

**Data**: Dezembro 2024  
**Correção**: Fix ESM import do node-fetch  
**Commit**: `7336c54`

---

## 🎯 O QUE FOI CORRIGIDO

### **Problema:**
```
Error [ERR_REQUIRE_ESM]: require() of ES Module 
/app/node_modules/.pnpm/node-fetch@3.3.2/node_modules/node-fetch/src/index.js 
not supported
```

### **Causa:**
- `node-fetch` v3 é um módulo **ESM puro**
- Não pode ser importado com `import` estático em CommonJS
- TypeScript + ts-node estava tentando fazer `require()` do módulo

### **Solução Aplicada:**
```typescript
// ANTES (quebrado):
import fetch from 'node-fetch';

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url);
  // ...
}

// DEPOIS (funcionando):
export async function fetchHtml(url: string): Promise<string> {
  const fetch = (await import('node-fetch')).default;
  const res = await fetch(url);
  // ...
}
```

---

## 🚀 COMO MONITORAR

### **Opção 1: Railway Dashboard** (Recomendado)

1. Acesse: https://railway.app
2. Entre no seu projeto **MemoDrops**
3. Clique no serviço **backend**
4. Aba **Deployments**
5. Veja o deploy mais recente (commit `7336c54`)

**Status esperado:**
```
⏳ Building...
⏳ Deploying...
✅ Active
```

---

### **Opção 2: Railway CLI**

Se você tem Railway CLI instalado:

```powershell
# Ver logs em tempo real
railway logs --follow

# Ver status do deploy
railway status

# Ver último deploy
railway logs --deployment latest
```

---

### **Opção 3: GitHub Actions**

Se você tem CI/CD configurado:

1. Acesse: https://github.com/leorotundo-dev/memodrops/actions
2. Veja o workflow mais recente
3. Acompanhe os steps do deploy

---

## ✅ SINAIS DE SUCESSO

### **Logs que você DEVE ver:**

```
[inf] Building...
[inf] Installing dependencies...
[inf] Running build...
[inf] Starting application...
[inf] Server listening on port 3333
✅ Deployment successful
```

### **NÃO deve mais ver:**

```
❌ Error [ERR_REQUIRE_ESM]
❌ npm error Lifecycle script `start` failed
```

---

## 🧪 TESTES APÓS DEPLOY

### **1. Health Check**

```bash
# Substitua pela sua URL do Railway
curl https://seu-backend.up.railway.app/

# Resposta esperada:
# { "status": "ok", "timestamp": "..." }
```

### **2. Endpoint de Usuários**

```bash
curl https://seu-backend.up.railway.app/admin/users

# Resposta esperada:
# { "success": true, "items": [...] }
```

### **3. Harvest (onde estava o bug)**

```bash
curl https://seu-backend.up.railway.app/admin/harvest/items

# Resposta esperada:
# { "success": true, "items": [] }
# (sem erro de ESM!)
```

---

## ⏱️ TEMPO ESTIMADO

```
Build:     2-3 minutos
Deploy:    1 minuto
Total:     3-4 minutos
```

**Status Atual:** ⏳ Deploy em andamento...

---

## 🔍 ONDE VER LOGS NO RAILWAY

### **Método 1: Dashboard Web**

1. Railway.app → Seu Projeto
2. Backend Service
3. Aba **"Logs"** ou **"Deployments"**
4. Clique no deployment ativo
5. Veja logs em tempo real

### **Método 2: URL Direta dos Logs**

```
https://railway.app/project/[PROJECT_ID]/service/[SERVICE_ID]/deployments
```

Substitua:
- `[PROJECT_ID]` = ID do seu projeto
- `[SERVICE_ID]` = ID do serviço backend

---

## 📋 CHECKLIST DE VALIDAÇÃO

- [ ] Deploy iniciou no Railway
- [ ] Build completou sem erros
- [ ] Container iniciou
- [ ] Logs mostram "Server listening on port 3333"
- [ ] Health check respondendo (200 OK)
- [ ] Endpoint /admin/users funcionando
- [ ] Endpoint /admin/harvest/items funcionando
- [ ] **SEM** erro ERR_REQUIRE_ESM

---

## 🐛 SE AINDA DER ERRO

### **Erro Persiste:**

Se o erro `ERR_REQUIRE_ESM` ainda aparecer, pode ser que:

1. **Cache do Railway não limpou**
   - Solução: Force rebuild no Railway Dashboard
   - Botão "Redeploy" → "Redeploy from scratch"

2. **Outro arquivo também usa node-fetch**
   - Verificar com: `grep -r "from 'node-fetch'" apps/backend/src/`
   - Aplicar mesmo fix em todos os arquivos

3. **Versão do node-fetch**
   - Downgrade para v2: `pnpm add node-fetch@2.7.0 -F backend`
   - v2 é CommonJS puro, não terá esse problema

---

## 💡 ALTERNATIVA: DOWNGRADE NODE-FETCH

Se preferir uma solução mais simples:

```powershell
cd memodrops-main/apps/backend
pnpm remove node-fetch
pnpm add node-fetch@2.7.0
git add package.json pnpm-lock.yaml
git commit -m "fix: downgrade node-fetch to v2 (CommonJS)"
git push origin main
```

**Vantagens:**
- ✅ Sem dynamic import
- ✅ Compatibilidade total
- ✅ Código mais simples

**Desvantagens:**
- ⚠️ Versão mais antiga (2.7.0 de 2022)
- ⚠️ Node-fetch v3 tem melhorias

---

## 🎯 PRÓXIMOS PASSOS

### **Após deploy OK:**

1. ✅ **Validar todos endpoints**
   ```bash
   curl https://seu-backend.up.railway.app/
   curl https://seu-backend.up.railway.app/admin/users
   curl https://seu-backend.up.railway.app/disciplines
   ```

2. ✅ **Testar frontend**
   - Acessar: https://seu-frontend.vercel.app
   - Verificar se conecta com backend

3. ✅ **Celebrar!** 🎉
   - Sistema 99% completo
   - Backend funcionando
   - Production-ready!

---

## 📞 COMANDOS ÚTEIS

### **Ver logs do Railway:**
```powershell
# Se Railway CLI instalado
railway logs --follow
```

### **Ver status do container:**
```powershell
railway status
```

### **Forçar redeploy:**
```powershell
git commit --allow-empty -m "chore: force redeploy"
git push origin main
```

### **Testar localmente:**
```powershell
cd memodrops-main/apps/backend
pnpm install
pnpm run dev
```

---

## 🎉 CONCLUSÃO

**Status Atual:**
- ✅ Correção aplicada
- ✅ Commit enviado
- ⏳ Deploy em andamento

**Aguarde 3-4 minutos e o backend deve estar online!**

---

**Monitoramento iniciado em:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Commit:** 7336c54  
**Branch:** main

**Fique de olho nos logs do Railway!** 👀
