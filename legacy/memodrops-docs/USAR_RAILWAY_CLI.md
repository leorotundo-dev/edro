# 🚀 COMO USAR RAILWAY CLI - MAIS RÁPIDO!

## 🎯 **POR QUE USAR RAILWAY CLI?**

✅ Mais rápido que copiar/colar 5 SQLs  
✅ Executa tudo automaticamente  
✅ Conecta direto no banco interno  
✅ 1 comando por migration  

---

## 📋 **PASSO 1: INSTALAR RAILWAY CLI**

### **Windows (PowerShell como Admin):**

```powershell
# Abra PowerShell como Administrador
# Copie e cole este comando:
iwr https://railway.app/install.ps1 -useb | iex
```

**OU baixe direto:** https://railway.app/cli

---

## 📋 **PASSO 2: FAZER LOGIN**

```powershell
railway login
```

Vai abrir o navegador para você fazer login.

---

## 📋 **PASSO 3: LINKAR AO PROJETO**

```powershell
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"

railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b
```

---

## 📋 **PASSO 4: EXECUTAR AS MIGRATIONS** ⭐

### **Opção A: Via Script Node.js (RECOMENDADO)**

```powershell
cd apps\backend

# Instalar pg localmente via Railway
railway run npm install pg --no-save

# Executar migrations
railway run node migrate-simple.js
```

Vai mostrar:
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

### **Opção B: Via psql (se preferir)**

```powershell
cd apps\backend\src\db\migrations

railway run psql $DATABASE_URL -f 0004_tracking_system.sql
railway run psql $DATABASE_URL -f 0005_recco_engine.sql
railway run psql $DATABASE_URL -f 0006_questoes_simulados.sql
railway run psql $DATABASE_URL -f 0007_srs_progress_mnemonicos.sql
railway run psql $DATABASE_URL -f 0008_logs_ops_observability.sql
```

---

## ✅ **VERIFICAR SE FUNCIONOU**

```powershell
# Conectar no banco via Railway CLI
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

## 🎯 **RESUMO DOS COMANDOS**

```powershell
# 1. Instalar CLI (uma vez só)
iwr https://railway.app/install.ps1 -useb | iex

# 2. Login (uma vez só)
railway login

# 3. Ir para o projeto
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"

# 4. Linkar (uma vez só)
railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b

# 5. Executar migrations
cd apps\backend
railway run npm install pg --no-save
railway run node migrate-simple.js
```

**PRONTO!** ✅

---

## 🆚 **RAILWAY CLI vs Railway Web**

| Método | Tempo | Vantagens |
|--------|-------|-----------|
| **Railway CLI** | 2 min | Automático, 1 comando |
| **Railway Web** | 5 min | Não precisa instalar nada |

---

## 🎊 **MINHA RECOMENDAÇÃO**

Se você já usa Railway frequentemente → **Use CLI**  
Se é só para essa vez → **Use Railway Web** (copiar/colar SQLs)

---

## 📁 **ARQUIVOS NECESSÁRIOS**

Todos já criados:
- ✅ `apps/backend/.env` (com DATABASE_URL)
- ✅ `apps/backend/migrate-simple.js` (script de migration)
- ✅ `apps/backend/src/db/migrations/*.sql` (5 arquivos SQL)

---

## 🚀 **DEPOIS DAS MIGRATIONS**

```powershell
# Rodar backend localmente
cd apps\backend
railway run npm run dev

# Ou acessar o backend em produção
https://backend-production-61d0.up.railway.app/tracking/state
```

---

**É ISSO! ESCOLHA SEU MÉTODO PREFERIDO!** 🎉

CLI = 2 minutos automático  
Web = 5 minutos manual (mas não precisa instalar nada)
