# ⚡ EXECUTE AGORA - COM SENHA INCLUÍDA

## 🔑 **CREDENCIAIS DO POSTGRESQL**

```
Host: postgres.railway.internal (ou a URL pública do Railway)
Port: 5432
Database: railway
User: postgres
Password: hFvHjgFMJgbGrnfVNAUSnESOCnrZyPvv
```

**DATABASE_URL completa:**
```
postgresql://postgres:hFvHjgFMJgbGrnfVNAUSnESOCnrZyPvv@postgres.railway.internal:5432/railway
```

---

## 🎯 **OPÇÃO 1: RAILWAY WEB** ⭐ **MAIS FÁCIL**

### **Passo 1: Acessar o Banco**

1. Abra: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b
2. Procure pelo serviço **"Postgres"** ou **"PostgreSQL"** (ícone de elefante 🐘)
3. Clique nele
4. Vá na aba **"Data"** ou **"Query"**

### **Passo 2: Executar os SQLs (um por um)**

**Cole TODO o conteúdo de cada arquivo e clique em "Run":**

#### **1º - Tracking System:**
```
📁 Arquivo: apps\backend\src\db\migrations\0004_tracking_system.sql
```
Abra com Notepad → Copie tudo → Cole no Railway → Run

#### **2º - ReccoEngine:**
```
📁 Arquivo: apps\backend\src\db\migrations\0005_recco_engine.sql
```

#### **3º - Questões & Simulados:**
```
📁 Arquivo: apps\backend\src\db\migrations\0006_questoes_simulados.sql
```

#### **4º - SRS, Progress & Mnemônicos:**
```
📁 Arquivo: apps\backend\src\db\migrations\0007_srs_progress_mnemonicos.sql
```

#### **5º - Logs & Observability:**
```
📁 Arquivo: apps\backend\src\db\migrations\0008_logs_ops_observability.sql
```

### **Passo 3: Verificar**

No Railway Query, rode:
```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
```
**Resultado esperado:** ~74 tabelas ✅

---

## 🎯 **OPÇÃO 2: RAILWAY CLI** ⭐ **MAIS RÁPIDO**

### **Comandos completos:**

```powershell
# 1. Instalar Railway CLI (PowerShell como Admin)
iwr https://railway.app/install.ps1 -useb | iex

# 2. Login
railway login

# 3. Ir para o projeto
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"

# 4. Linkar ao projeto
railway link e0ca0841-18bc-4c48-942e-d90a6b725a5b

# 5. Ir para backend
cd apps\backend

# 6. Instalar pg via Railway
railway run npm install pg --no-save

# 7. EXECUTAR MIGRATIONS (1 comando!)
railway run node migrate-simple.js
```

**Vai executar os 5 SQLs automaticamente!** ✅

---

## 🎯 **OPÇÃO 3: PSQL DIRETO**

Se você tem `psql` instalado:

### **1. Pegar a URL pública do Railway:**

1. No Railway, clique no PostgreSQL
2. Vá em **"Settings"** ou **"Connect"**
3. Copie a **"Public URL"** (exemplo):
   ```
   postgresql://postgres:hFvHjgFMJgbGrnfVNAUSnESOCnrZyPvv@containers-us-west-123.railway.app:5432/railway
   ```

### **2. Executar via psql:**

```powershell
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main\apps\backend\src\db\migrations"

# Substitua pela URL pública do Railway
$DB_URL = "postgresql://postgres:hFvHjgFMJgbGrnfVNAUSnESOCnrZyPvv@SEU-HOST-AQUI.railway.app:5432/railway"

psql $DB_URL -f 0004_tracking_system.sql
psql $DB_URL -f 0005_recco_engine.sql
psql $DB_URL -f 0006_questoes_simulados.sql
psql $DB_URL -f 0007_srs_progress_mnemonicos.sql
psql $DB_URL -f 0008_logs_ops_observability.sql
```

---

## 🎯 **OPÇÃO 4: PGADMIN / DBEAVER**

### **Criar conexão:**

```
Nome: MemoDrops Railway
Host: [pegar a URL pública do Railway - veja abaixo]
Port: 5432
Database: railway
Username: postgres
Password: hFvHjgFMJgbGrnfVNAUSnESOCnrZyPvv
```

### **Como pegar o Host público:**

1. Railway → PostgreSQL → Settings → Public Networking
2. Copie o host (exemplo: `containers-us-west-123.railway.app`)

### **Executar SQLs:**

Abra cada arquivo SQL e execute na ordem (1-5).

---

## ✅ **VERIFICAÇÃO FINAL**

Depois de executar, rode:

```sql
-- Ver tabelas de tracking (7 tabelas)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'tracking%'
ORDER BY table_name;

-- Ver tabelas de recco (11 tabelas)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'recco%'
ORDER BY table_name;

-- Total geral (~74 tabelas)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## 🚀 **DEPOIS DAS MIGRATIONS**

### **Testar endpoints:**

```
https://backend-production-61d0.up.railway.app/tracking/state
```

### **Ou rodar localmente:**

```powershell
cd apps\backend
railway run npm run dev
```

---

## 🎊 **RESUMO**

**Você tem 4 opções:**

| Opção | Tempo | Complexidade |
|-------|-------|--------------|
| **Railway Web** | 5 min | ⭐ Fácil |
| **Railway CLI** | 2 min | ⭐⭐ Precisa instalar CLI |
| **psql** | 3 min | ⭐⭐ Precisa psql + host público |
| **pgAdmin/DBeaver** | 3 min | ⭐⭐ Precisa cliente SQL |

---

## 🌟 **MINHA RECOMENDAÇÃO**

### **Primeira vez?**
→ Use **Railway Web** (não precisa instalar nada)

### **Quer automatizar?**
→ Use **Railway CLI** (1 comando executa tudo)

---

**CREDENCIAIS:**
```
User: postgres
Password: hFvHjgFMJgbGrnfVNAUSnESOCnrZyPvv
Database: railway
```

**ESCOLHA SUA OPÇÃO E EXECUTE!** 🚀
