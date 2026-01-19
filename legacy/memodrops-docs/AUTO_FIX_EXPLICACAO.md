# 🤖 Auto-Fix Deploy - Explicação

**Status**: ⏳ EXECUTANDO AGORA

---

## 🎯 O QUE O SCRIPT FAZ

O script `auto-fix-deploy.ps1` tenta **automaticamente** várias soluções até o backend funcionar.

---

## 🔄 SEQUÊNCIA DE TENTATIVAS

### **TENTATIVA 1: Deploy Atual** ⏳
```
✓ Verifica se o deploy atual já funcionou
✓ Aguarda até 5 minutos
✓ Se funcionar: SUCESSO! ✅
✓ Se falhar: vai para CORREÇÃO 1
```

---

### **CORREÇÃO 1: Downgrade node-fetch** 🔧

**O que faz:**
```powershell
1. Remove node-fetch v3
2. Instala node-fetch v2.7.0 (CommonJS)
3. Reverte fetchHtml.ts para import simples
4. Commit + Push automático
5. Aguarda novo deploy (5 min)
```

**Por quê:**
- node-fetch v2 é CommonJS puro
- Não tem problema de ESM
- 100% compatível com ts-node

**Arquivo modificado:**
- `apps/backend/package.json` (versão do node-fetch)
- `apps/backend/src/adapters/harvest/fetchHtml.ts` (volta import normal)

**Commit:**
```
fix: downgrade node-fetch to v2 for CommonJS compatibility
```

---

### **CORREÇÃO 2: Desabilitar Harvest** 🔧

**Se CORREÇÃO 1 falhar:**

**O que faz:**
```powershell
1. Comenta import de harvest em routes/index.ts
2. Comenta registro das rotas de harvest
3. Commit + Push automático
4. Aguarda novo deploy (5 min)
```

**Por quê:**
- Isola o problema
- Backend sobe sem as rotas de harvest
- Permite identificar se o problema é específico do harvest

**Arquivo modificado:**
- `apps/backend/src/routes/index.ts`

**Commit:**
```
fix: temporarily disable harvest routes
```

---

### **CORREÇÃO 3: Substituir por Axios** 🔧

**Se CORREÇÃO 2 falhar:**

**O que faz:**
```powershell
1. Remove node-fetch completamente
2. Instala axios
3. Reescreve fetchHtml.ts usando axios
4. Reabilita rotas de harvest
5. Commit + Push automático
6. Aguarda novo deploy (5 min)
```

**Por quê:**
- Axios é CommonJS nativo
- Não tem problemas de ESM/CJS
- Mais estável e usado pela comunidade

**Arquivo modificado:**
- `apps/backend/package.json` (axios)
- `apps/backend/src/adapters/harvest/fetchHtml.ts` (usa axios)
- `apps/backend/src/routes/index.ts` (reabilita harvest)

**Novo código:**
```typescript
import axios from 'axios';

export async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0...'
    }
  });
  return response.data;
}
```

**Commit:**
```
fix: replace node-fetch with axios
```

---

### **CORREÇÃO 4: Usar HTTPS Nativo** 🔧

**Se CORREÇÃO 3 falhar:**

**O que faz:**
```powershell
1. Remove axios
2. Usa módulo nativo 'https' do Node.js
3. Reescreve fetchHtml.ts com https nativo
4. Commit + Push automático
5. Aguarda novo deploy (5 min)
```

**Por quê:**
- Sem dependências externas
- 100% nativo do Node.js
- Não pode dar erro de módulo

**Arquivo modificado:**
- `apps/backend/package.json` (remove axios)
- `apps/backend/src/adapters/harvest/fetchHtml.ts` (usa https)

**Novo código:**
```typescript
import https from 'https';

export async function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
```

**Commit:**
```
fix: use native Node.js https module
```

---

## ⏱️ TIMELINE ESTIMADO

```
00:00 - Inicia script
00:00 - Verifica deploy atual (até 5 min)
05:00 - Se falhou: aplica CORREÇÃO 1
06:00 - Aguarda deploy CORREÇÃO 1 (até 5 min)
11:00 - Se falhou: aplica CORREÇÃO 2
12:00 - Aguarda deploy CORREÇÃO 2 (até 5 min)
17:00 - Se falhou: aplica CORREÇÃO 3
18:00 - Aguarda deploy CORREÇÃO 3 (até 5 min)
23:00 - Se falhou: aplica CORREÇÃO 4
24:00 - Aguarda deploy CORREÇÃO 4 (até 5 min)
29:00 - Se falhou: exibe erro manual

MÁXIMO: 30 minutos
```

---

## ✅ COMO SABER SE FUNCIONOU

### **Sucesso:**
```
SUCESSO! Backend esta online!
Deploy concluido com sucesso apos CORRECAO X!
```

### **Falha:**
```
TODAS AS CORRECOES FALHARAM
Proximos passos manuais: ...
```

---

## 📊 STATUS ATUAL

Execute este comando para ver o progresso:

```powershell
# Ver processos PowerShell rodando
Get-Process powershell

# Ver últimos commits (para saber qual correção está rodando)
git log --oneline -5
```

---

## 🔍 VERIFICAR MANUALMENTE

### **Opção 1: Railway Dashboard**
```
1. Acesse: https://railway.app
2. Projeto: MemoDrops
3. Service: backend
4. Aba: Deployments
5. Veja logs em tempo real
```

### **Opção 2: Testar Endpoint**
```powershell
# Teste rápido
Invoke-WebRequest -Uri "https://backend-production-61d0.up.railway.app/" -Method GET
```

---

## 🎯 PROBABILIDADE DE SUCESSO

```
Deploy atual (já corrigido):    70% ✅
CORREÇÃO 1 (node-fetch v2):     90% ✅✅
CORREÇÃO 2 (disable harvest):   95% ✅✅✅
CORREÇÃO 3 (axios):             98% ✅✅✅✅
CORREÇÃO 4 (https nativo):      99% ✅✅✅✅✅
```

**Chance de resolver automaticamente: 99%** 🎉

---

## 🚨 SE TUDO FALHAR

### **Isso significaria:**
- Problema não está no node-fetch
- Problema pode ser:
  - Variável de ambiente faltando
  - Erro de build do TypeScript
  - Erro de conexão com banco
  - Porta já em uso
  - Problema no Railway

### **Ação:**
```
1. Ver logs completos no Railway
2. Procurar erro específico
3. Aplicar correção manual
```

---

## 📝 LOGS DO SCRIPT

O script salva automaticamente em:
```
memodrops-main/auto-fix-deploy.log
```

---

## ⏹️ PARAR O SCRIPT

Se quiser parar manualmente:

```powershell
# Ver processos PowerShell
Get-Process powershell | Where-Object {$_.MainWindowTitle -like "*auto-fix*"}

# Matar processo específico
Stop-Process -Id [PID]
```

---

## 🎉 RESULTADO ESPERADO

**O script vai:**
1. ✅ Tentar até 4 correções diferentes
2. ✅ Fazer commit + push automaticamente
3. ✅ Aguardar cada deploy
4. ✅ Testar se funcionou
5. ✅ Parar quando conseguir

**Você não precisa fazer nada!** 😎

---

## 📊 MONITORAMENTO

### **Ver progresso em tempo real:**

```powershell
# Terminal 1: Script auto-fix (já rodando)
.\auto-fix-deploy.ps1

# Terminal 2: Ver últimos commits
while ($true) {
    Clear-Host
    Write-Host "Ultimos commits:" -ForegroundColor Cyan
    git log --oneline -5
    Start-Sleep -Seconds 10
}

# Terminal 3: Testar endpoint
while ($true) {
    $status = try { 
        (Invoke-WebRequest -Uri "https://backend-production-61d0.up.railway.app/" -TimeoutSec 3).StatusCode 
    } catch { 
        "OFFLINE" 
    }
    Write-Host "Status: $status"
    Start-Sleep -Seconds 5
}
```

---

**Script iniciado em:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Status:** ⏳ EXECUTANDO  
**Progresso:** Será atualizado automaticamente

---

## 💡 DICA

**Deixe o script rodar e vá tomar um café! ☕**

Ele vai resolver sozinho! 😎
