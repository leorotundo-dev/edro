# 🚨 URGENTE: Remover Start Command Manual do Railway

## ❌ PROBLEMA

O Railway está usando `npm` ao invés do Dockerfile porque há uma **configuração manual** no dashboard que está sobrescrevendo tudo.

---

## ✅ SOLUÇÃO

### **Passo 1: Acessar Settings**

1. Acesse: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b
2. Clique no serviço **@edro/backend**
3. Clique na aba **"Settings"** (ícone de engrenagem)

---

### **Passo 2: Procurar Start Command**

Role a página até encontrar uma dessas seções:
- **"Start Command"**
- **"Custom Start Command"**
- **"Deploy"** → **"Start Command"**

---

### **Passo 3: Remover o Comando**

Se você ver algo como:
```
npm run start --workspace=@edro/backend
```

**APAGUE completamente** esse texto e deixe o campo **VAZIO**.

---

### **Passo 4: Procurar Build Command**

Também procure por:
- **"Build Command"**
- **"Custom Build Command"**

Se houver algo preenchido, **APAGUE também**.

---

### **Passo 5: Salvar**

1. Clique em **"Save"** ou **"Update"**
2. Volte para a aba **"Deployments"**
3. Clique nos 3 pontinhos (...) do último deployment
4. Selecione **"Redeploy"**

---

## 📊 O QUE DEVE ACONTECER

### **ANTES (Errado):**
```
Railway usa: Start Command manual (npm)
Ignora: Dockerfile
Ignora: railway.json
Resultado: CRASH com npm
```

### **DEPOIS (Correto):**
```
Railway usa: Dockerfile
Dockerfile usa: pnpm
CMD: pnpm start
Resultado: FUNCIONA!
```

---

## 🔍 COMO VERIFICAR SE DEU CERTO

Depois do redeploy, os logs devem mostrar:

```
✅ "pnpm install" (ao invés de npm)
✅ Container inicia sem erros
✅ Nenhuma mensagem "No workspaces found"
```

---

## 🎯 RESUMO VISUAL

```
┌─────────────────────────────────────────┐
│  Railway Dashboard                      │
├─────────────────────────────────────────┤
│  1. Serviço: @edro/backend         │
│  2. Settings                            │
│  3. Start Command: [APAGAR TUDO]       │
│  4. Build Command: [APAGAR TUDO]       │
│  5. Save                                │
│  6. Redeploy                            │
└─────────────────────────────────────────┘
```

---

## ⚠️ SE NÃO ENCONTRAR

Se não encontrar "Start Command" nas Settings, procure em:
- **Variables** (variáveis de ambiente)
- **Service** → **Settings**
- **Build & Deploy** → **Settings**

O importante é encontrar e **REMOVER** qualquer comando customizado que esteja usando `npm`.

---

## 📞 CONFIRMAÇÃO

Depois de fazer isso, me avise e eu verifico se os próximos logs estão corretos!

---

**IMPORTANTE:** O Dockerfile está correto. O problema é só essa configuração manual no Railway que está sobrescrevendo tudo.
