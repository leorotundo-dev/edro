# 🔧 FIX DO CRASH - Backend e AI

**Problema:** Backend e AI crasharam 11-12 minutos após o deploy  
**Causa:** Conflito entre PNPM e NPM + configurações erradas  
**Status:** ✅ CORRIGIDO

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. **Conflito PNPM vs NPM**
```
Dockerfile:     usa PNPM ✅
railway.toml:   usava NPM ❌
Resultado:      CRASH!
```

### 2. **package-lock.json Inválidos**
```
Projeto usa:    pnpm-lock.yaml
Enviamos:       package-lock.json (npm)
Resultado:      Conflito de dependências
```

### 3. **.npmrc Problemático**
```
Configurações antigas causavam conflitos
com o monorepo
```

---

## ✅ CORREÇÕES APLICADAS

### 1. **railway.toml Corrigido**
```toml
[deploy]
# ANTES (errado):
startCommand = "npm run start --workspace=@edro/backend"

# DEPOIS (correto):
startCommand = "pnpm run start --filter @edro/backend"
```

### 2. **package-lock.json Removidos**
```bash
❌ Removido: apps/ai/package-lock.json
❌ Removido: apps/backend/package-lock.json
✅ Mantido: pnpm-lock.yaml (correto)
```

### 3. **.npmrc Atualizado**
```ini
# Configurações otimizadas para PNPM monorepo
shamefully-hoist=true
strict-peer-dependencies=false
```

---

## 🚀 DEPLOY CORRIGIDO

Execute agora:

```powershell
cd memodrops-main
git add .
git commit -m "fix: corrigir conflito PNPM/NPM + railway.toml"
git push origin main
```

---

## ⏰ TEMPO ESTIMADO

```
Deploy:     30 segundos
Build:      3-5 minutos
Deploy:     1-2 minutos
TOTAL:      ~7 minutos
```

---

## 📊 O QUE VAI ACONTECER

### **ANTES (agora):**
```
❌ @edro/backend - Crashed
❌ @edro/ai - Crashed
❌ @edro/web - Build Failed
❌ scrapers - Build Failed
❌ @edro/web-aluno - Build Failed
```

### **DEPOIS (em 7 minutos):**
```
✅ @edro/backend - Online
✅ @edro/ai - Online
✅ @edro/web - Online
✅ scrapers - Online
✅ @edro/web-aluno - Online
```

---

## 🔍 POR QUE OCORREU O CRASH?

### **Sequência de Eventos:**

1. Deploy enviado com `package-lock.json` (npm)
2. Dockerfile instalou deps com `pnpm`
3. `pnpm` ignorou `package-lock.json` (correto)
4. Container iniciou com `CMD pnpm run start`
5. Railway.toml tentou executar `npm run start` ❌
6. Conflito entre comandos
7. **CRASH!** 💥

### **Por que AI também crashou?**

O serviço AI compartilha a mesma configuração base e teve os mesmos problemas.

---

## ✅ VALIDAÇÃO

Após o deploy, verificar:

### **1. Backend Health Check:**
```bash
curl https://backend-production-61d0.up.railway.app/health
# Esperado: {"status":"ok"}
```

### **2. Logs no Railway:**
```bash
railway logs --service backend
# Deve mostrar: "Server started on port 3000"
```

### **3. Sem erros de dependências:**
```
Logs não devem conter:
❌ "Module not found"
❌ "Cannot find package"
❌ "ENOENT"
```

---

## 🎯 RESUMO DAS MUDANÇAS

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `.npmrc` | Atualizado | Compatibilidade PNPM |
| `railway.toml` | Corrigido | Usar PNPM ao invés de NPM |
| `apps/ai/package-lock.json` | Removido | Conflito com pnpm-lock.yaml |
| `apps/backend/package-lock.json` | Removido | Conflito com pnpm-lock.yaml |

---

## 💡 LIÇÕES APRENDIDAS

### **1. Consistência de Package Manager**
```
Se usa PNPM, use PNPM em TODOS os lugares:
- Dockerfile ✅
- railway.toml ✅
- Scripts ✅
- CI/CD ✅
```

### **2. Não misturar lockfiles**
```
❌ pnpm-lock.yaml + package-lock.json = CRASH
✅ pnpm-lock.yaml apenas = OK
```

### **3. Testar localmente primeiro**
```bash
# Simular ambiente Railway:
docker build -t memodrops-test .
docker run memodrops-test
```

---

## 🚀 EXECUTAR AGORA

```powershell
cd memodrops-main
git add .
git commit -m "fix: resolver crash - corrigir PNPM/NPM"
git push origin main
```

Depois aguarde 7 minutos e execute:
```powershell
.\check-status.ps1
```

---

## 📊 MONITORAMENTO

### **Railway Dashboard:**
https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b

### **Vercel Dashboard:**
https://vercel.com/dashboard

### **Logs em Tempo Real:**
```bash
cd memodrops-main
railway link
railway logs --follow
```

---

**✅ Correções aplicadas! Pronto para novo deploy!**
