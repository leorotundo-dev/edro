vdc # ⚡ EXECUTAR COM RAILWAY CLI - PASSO A PASSO

## 🎯 **MÉTODO MAIS RÁPIDO - 2 MINUTOS**

---

## 📋 **PASSO 1: BAIXAR RAILWAY CLI**

### **Opção A: Download Direto (Recomendado)**

1. Acesse: https://docs.railway.app/guides/cli#installation
2. Baixe a versão Windows
3. Ou baixe direto: https://github.com/railwayapp/cli/releases/latest

### **Opção B: Via PowerShell (se funcionar)**

```powershell
# PowerShell como Admin
iwr https://railway.app/install.ps1 -useb | iex
```

### **Opção C: Via npm (se tiver Node.js)**

```powershell
npm install -g @railway/cli
```

---

## 📋 **PASSO 2: FAZER LOGIN**

Abra PowerShell (não precisa ser Admin) e rode:

```powershell
railway login
```

Vai abrir o navegador para você fazer login. Confirme e volte ao terminal.

---

## 📋 **PASSO 3: IR PARA O PROJETO**

```powershell
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"
```

---

## 📋 **PASSO 4: LINKAR AO PROJETO**

```powershell
railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b
```

Deve mostrar:
```
✓ Linked to project memodrops-backend
```

---

## 📋 **PASSO 5: EXECUTAR AS MIGRATIONS** ⭐

```powershell
# Ir para o backend
cd apps\backend

# Instalar pg via Railway (conecta no ambiente Railway)
railway run npm install pg --no-save

# EXECUTAR MIGRATIONS (1 comando!)
railway run node migrate-simple.js
```

**Vai mostrar:**
```
🚀 Iniciando migrations...
✅ DATABASE_URL encontrada
🔧 Criando tabela schema_migrations...
✅ OK

📁 Encontradas 8 migrations

✅ 3 migrations já aplicadas

⏭️  0001_existing_schema.sql (já aplicada)
⏭️  0002_new_stage16_tables.sql (já aplicada)
⏭️  0003_stage19_tables.sql (já aplicada)

🔄 Aplicando 0004_tracking_system.sql...
   ✅ Sucesso!

🔄 Aplicando 0005_recco_engine.sql...
   ✅ Sucesso!

🔄 Aplicando 0006_questoes_simulados.sql...
   ✅ Sucesso!

🔄 Aplicando 0007_srs_progress_mnemonicos.sql...
   ✅ Sucesso!

🔄 Aplicando 0008_logs_ops_observability.sql...
   ✅ Sucesso!

🎉 CONCLUÍDO!
   📊 5 novas migrations aplicadas
   ✅ Total: 8 migrations no banco
```

---

## ✅ **PASSO 6: VERIFICAR**

```powershell
# Conectar no banco via Railway
railway run psql $DATABASE_URL

# Dentro do psql, rodar:
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
# Deve mostrar ~74

# Ver tabelas de tracking
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'tracking%';

# Sair
\q
```

---

## 🎊 **PRONTO!**

Agora você tem:
- ✅ 74 tabelas no banco
- ✅ 12 endpoints novos funcionando
- ✅ Sistema de Tracking completo

---

## 🚀 **TESTAR O BACKEND**

```powershell
# Rodar localmente via Railway
cd apps\backend
railway run npm run dev

# Vai rodar com as variáveis do Railway automaticamente!
```

**Ou acessar em produção:**
```
https://backend-production-61d0.up.railway.app/tracking/state
```

---

## 📝 **RESUMO DOS COMANDOS**

```powershell
# 1. Baixar CLI (uma vez)
# Download: https://docs.railway.app/guides/cli#installation

# 2. Login (uma vez)
railway login

# 3. Ir para o projeto
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"

# 4. Linkar (uma vez)
railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b

# 5. Executar migrations
cd apps\backend
railway run npm install pg --no-save
railway run node migrate-simple.js

# 6. Verificar
railway run psql $DATABASE_URL
```

---

## 🆘 **TROUBLESHOOTING**

### **Erro: "railway: command not found"**
- Reinicie o PowerShell depois de instalar
- Ou use o caminho completo: `C:\Users\SeuUsuario\.railway\bin\railway.exe`

### **Erro: "Project not found"**
- Verifique se fez login: `railway whoami`
- Tente linkar novamente: `railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b`

### **Erro: "Cannot find module 'pg'"**
- Rode primeiro: `railway run npm install pg --no-save`

---

## 🎯 **POR QUE RAILWAY CLI É MELHOR?**

✅ 1 comando executa tudo  
✅ Conecta automaticamente no ambiente Railway  
✅ Usa as variáveis de ambiente do Railway (DATABASE_URL)  
✅ Não precisa copiar/colar 5 vezes  
✅ Mais rápido (2 minutos)  

---

## 🌟 **DEPOIS DAS MIGRATIONS**

Você pode fazer muito mais com Railway CLI:

```powershell
# Ver variáveis de ambiente
railway variables

# Ver logs em tempo real
railway logs

# Rodar qualquer comando no ambiente Railway
railway run npm run dev

# Fazer deploy
railway up
```

---

**SIGA ESSES PASSOS E ESTÁ PRONTO!** 🚀

Tempo total: **2 minutos**
