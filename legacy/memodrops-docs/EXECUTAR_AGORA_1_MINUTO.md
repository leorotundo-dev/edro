# ⚡ EXECUTAR AGORA - 1 MINUTO

## 🎯 MÉTODO 1: SCRIPT POWERSHELL (Mais fácil)

### 1️⃣ Configure o `.env`:
```env
DATABASE_URL=postgresql://postgres:senha@host:porta/railway
```
👉 Pegue no Railway: PostgreSQL → Variables → DATABASE_URL

### 2️⃣ Execute:
```powershell
.\executar-migrations.ps1
```

### 3️⃣ Reinicie o backend no Railway

---

## 🎯 MÉTODO 2: SQL NO RAILWAY (Mais rápido)

### 1️⃣ Abra o Railway Query Editor:
https://railway.app → PostgreSQL → Query

### 2️⃣ Copie e cole o arquivo:
```
EXECUTAR_NO_RAILWAY.sql
```

### 3️⃣ Clique em "Run Query"

### 4️⃣ Reinicie o backend no Railway

---

## ✅ VERIFICAR SE FUNCIONOU

### SQL:
```sql
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM job_schedules;
```

### PowerShell:
```powershell
.\verificar-migrations.ps1
```

### API:
```
https://seu-backend.railway.app/api/admin/jobs/stats
```

---

## 📞 RESULTADO ESPERADO

✅ Tabelas: `jobs`, `job_schedules`, `job_logs` criadas  
✅ 4 jobs agendados ativos  
✅ Backend sem erros  
✅ Endpoint respondendo  

---

**Escolha um método e execute AGORA! ⚡**

Depois me diga: "Executei, o que fazer agora?" ou cole os logs!
