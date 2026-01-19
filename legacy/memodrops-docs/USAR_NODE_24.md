# ✅ SOLUÇÃO: Usar Node v24 (Sem Downgrade)

## 🎯 O QUE FAZER

Já que você não consegue fazer downgrade para Node v20, vamos **forçar** o funcionamento com Node v24.

---

## 🚀 SOLUÇÃO RÁPIDA

Execute este comando:

```powershell
.\FIX_NODE_24.ps1
```

Este script vai:
1. ✅ Criar `.npmrc` com configurações para Node v24
2. ✅ Limpar `node_modules` antigos
3. ✅ Instalar dependências com `--force` (ignora avisos)
4. ✅ Atualizar `package.json` para aceitar Node v24
5. ✅ Instalar `ts-node-dev`
6. ✅ Criar `.env` básico

⏱️ **Tempo:** ~10 minutos

---

## ⚠️ AVISOS QUE VÃO APARECER (NORMAL!)

Durante a instalação, você vai ver muitos avisos como:

```
npm WARN EBADENGINE Unsupported engine...
npm WARN deprecated...
```

**ISSO É NORMAL!** Estamos forçando a instalação mesmo com avisos.

---

## 📋 O QUE MUDAMOS

### **1. Arquivo .npmrc**
```
symlinks=false
legacy-peer-deps=true
engine-strict=false    ← NOVO: Ignora verificação de versão
force=true             ← NOVO: Força instalação
```

### **2. Package.json do Backend**
```json
{
  "engines": {
    "node": ">=18.0.0"  ← MUDOU: Aceita Node 18+
  }
}
```

### **3. Comandos de Instalação**
```bash
npm install --force --legacy-peer-deps
```

---

## 🎯 EXECUTE AGORA

```powershell
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"
.\FIX_NODE_24.ps1
```

Quando perguntar se quer rodar, digite: **`s`**

---

## 🐛 SE DER ERRO

### **Erro: "Cannot find module"**

```powershell
cd apps\backend
npm install --force
npm run dev
```

### **Erro: "ECONNREFUSED" (Banco)**

Configure o `.env` corretamente:

```powershell
notepad apps\backend\.env
```

Exemplo:
```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/memodrops
PORT=3333
JWT_SECRET=seu-secret-super-secreto
OPENAI_API_KEY=sk-sua-chave-aqui
```

### **Erro: "Port 3333 in use"**

```powershell
# Ver o que está usando
Get-NetTCPConnection -LocalPort 3333

# Matar processo (substitua PID)
Stop-Process -Id PID -Force
```

---

## ✅ QUANDO FUNCIONAR

Você verá:

```
✅ Sistema de migrações finalizado!
🔌 Registrando plugins...
✅ Plugins registrados!
🚀 MemoDrops backend rodando na porta 3333
```

**Acesse:**
- http://localhost:3333
- http://localhost:3333/health

---

## 📞 ALTERNATIVAS

Se mesmo com `--force` não funcionar:

### **Opção 1: Usar Docker**

```powershell
# Se tiver Docker instalado
docker-compose up
```

### **Opção 2: Usar WSL2 (Linux no Windows)**

```powershell
# Instalar WSL2
wsl --install

# Depois, dentro do WSL:
cd /mnt/d/WORK/...
npm install
npm run dev
```

### **Opção 3: Usar NVM (Gerenciador de Versões)**

Se NVM permitir:
1. Instale NVM: https://github.com/coreybutler/nvm-windows
2. Execute:
```powershell
nvm install 20
nvm use 20
```

---

## 🎯 RESUMO

```
Problema:  Node v24 incompatível
Solução:   Forçar instalação com --force
Script:    .\FIX_NODE_24.ps1
Tempo:     ~10 minutos
Resultado: Deve funcionar (com avisos)
```

---

**Execute agora:**
```powershell
.\FIX_NODE_24.ps1
```

E me avise se der algum erro!
