# 🚂 RAILWAY CLI - GUIA DE USO

**Status:** ✅ Railway CLI instalado (versão 4.12.0)  
**Próximo passo:** Login e monitoramento

---

## ✅ O QUE JÁ FOI FEITO

```
✅ Railway CLI instalado globalmente
✅ Versão 4.12.0 confirmada
✅ Comando 'railway' disponível
```

---

## 🔑 PASSO 1: FAZER LOGIN

Abra um PowerShell e execute:

```powershell
railway login
```

**O que vai acontecer:**
1. Um browser vai abrir automaticamente
2. Você faz login na sua conta Railway
3. Autoriza o CLI
4. Volta ao terminal
5. ✅ Login completo!

**Nota:** Precisa ser em um terminal interativo (não posso fazer por você).

---

## 📊 PASSO 2: LINK DO PROJETO

Depois do login, entre na pasta do projeto e linke:

```powershell
cd memodrops-main
railway link
```

**Você vai ver:**
```
? Select a project:
  > memodrops (e0ca0841-18bc-4c48-942e-d90a6b725a5b)
```

Selecione seu projeto e pressione Enter.

---

## 🔍 PASSO 3: MONITORAR DEPLOYS

### **Ver Status Geral:**
```powershell
railway status
```

### **Ver Logs do Backend:**
```powershell
railway logs
```

### **Ver Logs em Tempo Real:**
```powershell
railway logs --follow
```

### **Ver Variáveis de Ambiente:**
```powershell
railway variables
```

### **Ver Informações do Deploy:**
```powershell
railway up
```

---

## 🚀 COMANDOS ÚTEIS

### **Verificar Deployments:**
```powershell
# Listar todos os deployments
railway status

# Ver deployment específico
railway logs --deployment <deployment-id>
```

### **Abrir Dashboard:**
```powershell
railway open
```

### **Executar Comando no Container:**
```powershell
railway run <comando>

# Exemplos:
railway run npm run migrate
railway run node --version
railway run ls -la
```

### **Ver Informações do Projeto:**
```powershell
railway whoami        # Verificar usuário logado
railway environment   # Ver environment atual
railway service       # Ver serviço atual
```

---

## 📋 SCRIPT DE MONITORAMENTO

Criei um script para você monitorar tudo. Execute:

```powershell
.\MONITORAR_DEPLOY.ps1
```

**O script vai:**
- ✅ Verificar se está logado
- ✅ Mostrar status do projeto
- ✅ Exibir logs recentes
- ✅ Atualizar a cada 30 segundos

---

## 🎯 CHECKLIST DE SETUP

Execute estes comandos em ordem:

```powershell
# 1. Verificar instalação
railway --version
# Esperado: railway 4.12.0

# 2. Fazer login
railway login
# Vai abrir o browser

# 3. Entrar na pasta do projeto
cd memodrops-main

# 4. Linkar o projeto
railway link
# Selecione: memodrops

# 5. Verificar status
railway status

# 6. Ver logs
railway logs
```

---

## 📊 EXEMPLO DE OUTPUT

### **railway status:**
```
╔════════════════════════════════════════════╗
║              MemoDrops                     ║
╠════════════════════════════════════════════╣
║ Project ID: e0ca0841-18bc-4c48-942e       ║
║ Environment: production                    ║
║                                            ║
║ Services:                                  ║
║   ✅ backend     - Active                  ║
║   ⏳ ai          - Deploying               ║
║   ⏳ web         - Building                ║
║   ⏳ scrapers    - Building                ║
╚════════════════════════════════════════════╝
```

### **railway logs:**
```
2025-01-XX 12:00:00 | [backend] Server started on port 3000
2025-01-XX 12:00:01 | [backend] Database connected
2025-01-XX 12:00:02 | [backend] ✅ All routes registered
2025-01-XX 12:00:03 | [ai] Installing dependencies...
2025-01-XX 12:00:10 | [ai] Building project...
```

---

## 🔧 TROUBLESHOOTING

### **Erro: "Cannot login in non-interactive mode"**
```
Solução: Execute railway login em um terminal normal,
não através de scripts automatizados.
```

### **Erro: "No project linked"**
```
Solução: Execute railway link e selecione seu projeto
```

### **Erro: "Unauthorized"**
```
Solução: Execute railway login novamente
```

### **Logs não aparecem:**
```
Solução: 
1. Verifique se está na pasta correta
2. Execute railway link novamente
3. Tente railway logs --tail 100
```

---

## 🎯 APÓS O LOGIN, EXECUTE ISTO:

```powershell
# Vai para pasta do projeto
cd memodrops-main

# Link o projeto
railway link

# Monitora em tempo real
railway logs --follow
```

**Você vai ver os deploys acontecendo ao vivo!** 🔥

---

## 📞 COMANDOS PARA VERIFICAR O DEPLOY ATUAL

```powershell
# Status geral
railway status

# Logs do backend
railway logs --service backend

# Logs do AI
railway logs --service ai

# Logs do scraper
railway logs --service scrapers

# Ver todas as variáveis
railway variables

# Abrir dashboard no browser
railway open
```

---

## 🚀 DEPOIS DO SETUP

Com o Railway CLI configurado, você pode:

1. **Monitorar deploys em tempo real**
   ```powershell
   railway logs --follow
   ```

2. **Deploy manual direto**
   ```powershell
   railway up
   ```

3. **Executar migrations remotamente**
   ```powershell
   railway run npm run migrate
   ```

4. **Ver métricas de uso**
   ```powershell
   railway status
   ```

5. **Debug de problemas**
   ```powershell
   railway shell
   ```

---

## 📝 RESUMO

**O que fazer agora:**

1. Abra um PowerShell normal (não como administrador)
2. Execute: `railway login`
3. Faça login no browser
4. Execute: `cd memodrops-main`
5. Execute: `railway link`
6. Execute: `railway logs --follow`
7. Assista os deploys acontecerem! 🎉

---

## 🎉 BENEFÍCIOS DO CLI

- ✅ Ver logs em tempo real
- ✅ Deploy manual quando quiser
- ✅ Executar comandos remotamente
- ✅ Ver status de todos os serviços
- ✅ Gerenciar variáveis de ambiente
- ✅ Debug mais fácil
- ✅ Monitoramento contínuo

---

**Pronto! Execute `railway login` agora e depois me avise!** 🚂
