
# ✅ PRÓXIMOS PASSOS - Depois de Instalar Node v20

## 📋 CHECKLIST

```
┌────────────────────────────────────────────┐
│  ETAPA                         │  STATUS   │
├────────────────────────────────────────────┤
│  1. Baixar Node v20 LTS        │  [ ]      │
│  2. Instalar Node v20          │  [ ]      │
│  3. Reiniciar PowerShell       │  [ ]      │
│  4. Verificar versão           │  [ ]      │
│  5. Executar FIX_TUDO.ps1      │  [ ]      │
│  6. Testar servidor            │  [ ]      │
└────────────────────────────────────────────┘
```

---

## 🎯 PASSO A PASSO

### **1. Depois de Instalar Node v20**

**Feche e reabra o PowerShell**, depois execute:

```powershell
# Verificar versão
node --version
# Deve mostrar: v20.x.x
```

---

### **2. Executar Script de Verificação**

```powershell
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"
.\VERIFICAR_INSTALACAO.ps1
```

Este script vai mostrar o que está faltando.

---

### **3. Executar Script de Correção**

```powershell
.\FIX_TUDO.ps1
```

Quando perguntar se quer continuar, digite: **`s`**

O script vai:
- ✅ Criar `.npmrc`
- ✅ Limpar `node_modules` antigos
- ✅ Instalar todas as dependências
- ✅ Instalar `ts-node-dev`
- ✅ Criar `.env` básico

**Aguarde:** Pode demorar 5-10 minutos (instalação de dependências)

---

### **4. Configurar .env (IMPORTANTE)**

Depois que o script terminar, configure suas variáveis:

```powershell
notepad apps\backend\.env
```

**Exemplo de .env:**
```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/memodrops
PORT=3333
JWT_SECRET=seu-secret-super-secreto-aqui
OPENAI_API_KEY=sk-sua-chave-openai-aqui
NODE_ENV=development
```

⚠️ **IMPORTANTE:** Configure especialmente a `DATABASE_URL` com suas credenciais corretas!

---

### **5. Testar o Servidor**

```powershell
cd apps\backend
npm run dev
```

**Se tudo estiver OK, você verá:**
```
✅ Sistema de migrações finalizado!
🔌 Registrando plugins...
✅ Plugins registrados!
🛣️  Iniciando registro de rotas...
✅ Registro de rotas concluído!
🚀 MemoDrops backend rodando na porta 3333
```

**Acesse no navegador:**
- http://localhost:3333 (API)
- http://localhost:3333/health (Health check)

---

## 🚨 ERROS COMUNS

### **Erro: "Cannot connect to database"**

**Causa:** PostgreSQL não está rodando ou credenciais incorretas

**Solução:**
```powershell
# Verificar se PostgreSQL está rodando
Get-Service postgresql* | Select-Object Status, Name

# Se não estiver rodando, iniciar:
Start-Service postgresql-x64-XX
```

Ou configure a `DATABASE_URL` no `.env` com o servidor correto.

---

### **Erro: "Port 3333 is already in use"**

**Causa:** Outra aplicação está usando a porta 3333

**Solução:**
```powershell
# Ver o que está usando a porta
Get-NetTCPConnection -LocalPort 3333 | Select-Object OwningProcess

# Matar o processo (substitua PID pelo número):
Stop-Process -Id PID -Force

# Ou mude a porta no .env:
PORT=3334
```

---

### **Erro: "ts-node-dev not found"**

**Causa:** ts-node-dev não foi instalado corretamente

**Solução:**
```powershell
cd apps\backend
npm install --save-dev ts-node-dev
npm run dev
```

---

### **Erro: Module not found**

**Causa:** Dependências não foram instaladas

**Solução:**
```powershell
# Na raiz do projeto
npm install

# No backend
cd apps\backend
npm install
```

---

## 📞 COMANDOS ÚTEIS

### **Verificar Status**
```powershell
.\VERIFICAR_INSTALACAO.ps1
```

### **Ver Logs em Tempo Real**
```powershell
cd apps\backend
npm run dev 2>&1 | Tee-Object -FilePath logs.txt
```

### **Rodar Migrations**
```powershell
cd apps\backend
npm run db:migrate
```

### **Limpar Tudo e Recomeçar**
```powershell
Remove-Item -Recurse -Force node_modules, apps\backend\node_modules
.\FIX_TUDO.ps1
```

---

## ✅ QUANDO TUDO ESTIVER OK

Você poderá:

1. **Acessar a API:** http://localhost:3333
2. **Ver endpoints:** http://localhost:3333/health
3. **Desenvolver:** Editar código com hot-reload
4. **Testar:** Usar Postman/Insomnia para testar endpoints

---

## 🎉 SUCESSO?

Se o servidor iniciou com sucesso, marque aqui:

- [ ] ✅ Node v20 instalado
- [ ] ✅ Dependências instaladas
- [ ] ✅ .env configurado
- [ ] ✅ Servidor rodando
- [ ] ✅ API acessível

**PARABÉNS!** Seu ambiente está pronto! 🚀

---

## 📚 PRÓXIMOS PASSOS (DESENVOLVIMENTO)

Agora que está tudo funcionando:

1. **Explore os endpoints:** Ver `memodrops-main/apps/backend/src/routes/`
2. **Configure o frontend:** `cd apps/web && npm install && npm run dev`
3. **Veja a documentação:** Arquivos `.md` na raiz do projeto
4. **Comece a desenvolver!**

---

**Criado por:** Claude AI  
**Data:** 05/12/2024  
**Status:** Guia completo pronto!
