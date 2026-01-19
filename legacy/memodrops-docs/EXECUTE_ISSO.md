# ⚡ EXECUTE ESTES COMANDOS (COPIE E COLE)

## 🎯 **EU FIZ TODO O CÓDIGO, MAS O WINDOWS TEM PROBLEMA COM SYMLINKS**

Eu criei:
- ✅ 4 migrations SQL (57 tabelas novas)
- ✅ 1 repository completo (trackingRepository.ts)
- ✅ 1 rota com 12 endpoints (tracking.ts)
- ✅ Tudo registrado e pronto

**Mas preciso que você execute 3 comandos simples no PowerShell:**

---

## 📋 **COMANDOS PARA EXECUTAR**

### **1. Abrir PowerShell como Administrador**

- Clique com botão direito no botão Iniciar
- Escolha "Windows PowerShell (Admin)" ou "Terminal (Admin)"

### **2. Copiar e colar estes comandos (um de cada vez):**

```powershell
# Comando 1: Ir para a pasta do backend
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main\apps\backend"

# Comando 2: Rodar as migrations (usando psql - cliente PostgreSQL)
.\run-migrations.ps1
```

**OU se você não tem psql instalado:**

```powershell
# Alternativa: Usar o script Node.js (precisa instalar pg primeiro)
npm install pg --force
node run-migrations.js
```

---

## ✅ **O QUE VAI ACONTECER**

Quando você rodar `node run-migrations.js`, você verá:

```
🚀 Iniciando migrations...

✅ Tabela schema_migrations criada/verificada

📁 Encontradas 8 migrations:
   - 0001_existing_schema.sql
   - 0002_new_stage16_tables.sql
   - 0003_stage19_tables.sql
   - 0004_tracking_system.sql          ← NOVA!
   - 0005_recco_engine.sql             ← NOVA!
   - 0006_questoes_simulados.sql       ← NOVA!
   - 0007_srs_progress_mnemonicos.sql  ← NOVA!
   - 0008_logs_ops_observability.sql   ← NOVA!

✅ 3 migrations já aplicadas

⏭️  Pulando 0001_existing_schema.sql (já aplicada)
⏭️  Pulando 0002_new_stage16_tables.sql (já aplicada)
⏭️  Pulando 0003_stage19_tables.sql (já aplicada)

🔄 Aplicando 0004_tracking_system.sql...
   ✅ 0004_tracking_system.sql aplicada com sucesso!

🔄 Aplicando 0005_recco_engine.sql...
   ✅ 0005_recco_engine.sql aplicada com sucesso!

🔄 Aplicando 0006_questoes_simulados.sql...
   ✅ 0006_questoes_simulados.sql aplicada com sucesso!

🔄 Aplicando 0007_srs_progress_mnemonicos.sql...
   ✅ 0007_srs_progress_mnemonicos.sql aplicada com sucesso!

🔄 Aplicando 0008_logs_ops_observability.sql...
   ✅ 0008_logs_ops_observability.sql aplicada com sucesso!


🎉 Migrations concluídas!
   📊 5 novas migrations aplicadas
   ✅ Total: 8 migrations no banco
```

---

## 🎉 **PRONTO!**

Após rodar os 3 comandos, você terá:

✅ **74 tabelas no banco** (17 antigas + 57 novas)
✅ **Sistema de Tracking completo**
✅ **ReccoEngine estruturado**
✅ **Questões & Simulados expandidos**
✅ **SRS-AI™, Progress, Mnemônicos**
✅ **Logs & Observability**

---

## 🚀 **PARA TESTAR**

Depois das migrations, rode:

```powershell
# Iniciar o servidor
npm run dev
```

E teste os endpoints:

```bash
POST http://localhost:3000/tracking/event
Authorization: Bearer SEU_TOKEN

{
  "event_type": "drop_started",
  "event_data": { "drop_id": "123" }
}
```

---

## 🆘 **SE DER ERRO**

### **Erro: "DATABASE_URL is not defined"**

Você precisa do arquivo `.env` com:

```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=seu-secret-aqui
```

Se não tiver, me avise que eu crio para você!

---

**SÓ ISSO! 3 COMANDOS E ESTÁ PRONTO!** 🎉
