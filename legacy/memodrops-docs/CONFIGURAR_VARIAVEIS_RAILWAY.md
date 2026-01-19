# 🔧 CONFIGURAR VARIÁVEIS DE AMBIENTE NO RAILWAY

## ✅ PROGRESSO: BUILD FUNCIONOU!

O Dockerfile está funcionando perfeitamente! Agora só falta configurar as variáveis de ambiente.

---

## 🎯 VARIÁVEIS NECESSÁRIAS

### **1. DATABASE_URL**
```
Valor: ${{Postgres.DATABASE_URL}}
```
Se você já tem um serviço Postgres no projeto Railway, use essa referência mágica.

**OU** se você tem a URL do banco em outro lugar:
```
postgresql://usuario:senha@host:5432/database
```

---

### **2. JWT_SECRET**
```
Valor: memodrops-jwt-secret-production-2024-change-in-prod
```
Qualquer string aleatória serve. Em produção real, troque por algo mais seguro.

---

### **3. NODE_ENV** (opcional mas recomendado)
```
Valor: production
```

---

### **4. PORT** (opcional)
```
Valor: 3000
```
O Railway injeta automaticamente, mas não custa adicionar.

---

### **5. OPENAI_API_KEY** (se você usa)
```
Valor: sk-fob56csE7BhkDb6AEKzKKX
```
(Você mencionou essa key antes)

---

### **6. OPENAI_BASE_URL** (se você usa)
```
Valor: https://api.openai.com/v1
```

---

## 📋 PASSO A PASSO NO RAILWAY

### **Opção 1: Via Dashboard (Mais Fácil)**

1. Acesse: https://railway.app/project/e0ca0841-18bc-4c48-942e-d90a6b725a5b

2. Clique no serviço **backend** (ou @edro/backend)

3. Clique na aba **"Variables"**

4. Para cada variável:
   - Clique em **"+ New Variable"**
   - Nome: `DATABASE_URL`
   - Valor: `${{Postgres.DATABASE_URL}}` (ou sua URL)
   - Clique em **"Add"**

5. Repita para:
   - `JWT_SECRET`
   - `NODE_ENV`
   - `PORT`
   - `OPENAI_API_KEY` (se usar)
   - `OPENAI_BASE_URL` (se usar)

6. O Railway vai **redeploy automaticamente** após salvar

---

### **Opção 2: Via Raw Editor (Mais Rápido)**

1. Na aba **Variables**, clique em **"RAW Editor"** (ícone de código)

2. Cole isto (ajuste os valores):

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=memodrops-jwt-secret-production-2024
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=sk-fob56csE7BhkDb6AEKzKKX
OPENAI_BASE_URL=https://api.openai.com/v1
```

3. Clique em **"Update Variables"**

4. Aguarde o redeploy automático

---

## 🔍 COMO SABER SE TEM POSTGRES NO PROJETO?

Na página do projeto Railway, você deve ver:
- Um card/serviço chamado **"Postgres"** ou **"PostgreSQL"**
- Se vir, pode usar `${{Postgres.DATABASE_URL}}`
- Se NÃO vir, precisa adicionar um banco ou usar um externo

### **Para adicionar Postgres no Railway:**
1. No projeto, clique em **"+ New"**
2. Selecione **"Database"**
3. Escolha **"Add PostgreSQL"**
4. Depois volte nas variáveis e use `${{Postgres.DATABASE_URL}}`

---

## ⏰ TEMPO ESPERADO

Após adicionar as variáveis:
```
00:00 - Salvar variáveis
00:10 - Railway detecta mudança
00:30 - Redeploy inicia
03:00 - Build completo (vai rápido, já buildou antes)
05:00 - Container inicia
05:30 - ✅ Backend ONLINE!
```

---

## 📊 LOGS ESPERADOS APÓS CONFIGURAR

```
✅ Starting Container
✅ 🚀 Iniciando sistema de migrações...
✅ Executando migration: 0001_existing_schema.sql
✅ Executando migration: 0002_new_stage16_tables.sql
✅ ...
✅ ✅ Sistema de migrações finalizado!
✅ 🚀 MemoDrops backend rodando na porta 3000
✅ Server listening at http://0.0.0.0:3000
```

**SEM erros de:**
```
❌ DATABASE_URL Required
❌ JWT_SECRET Required
```

---

## 🎯 CHECKLIST

- [ ] Adicionar `DATABASE_URL`
- [ ] Adicionar `JWT_SECRET`
- [ ] Adicionar `NODE_ENV` (opcional)
- [ ] Adicionar `PORT` (opcional)
- [ ] Adicionar `OPENAI_API_KEY` (se usar)
- [ ] Adicionar `OPENAI_BASE_URL` (se usar)
- [ ] Salvar variáveis
- [ ] Aguardar redeploy (~5 min)
- [ ] Verificar logs
- [ ] ✅ Backend ONLINE!

---

## 💡 DICA

Se você não souber a `DATABASE_URL`, procure em:
- Railway → Postgres service → Connect → Copy DATABASE_URL
- Ou use `${{Postgres.DATABASE_URL}}` que é automático

---

**Faça isso agora e em 5 minutos está tudo funcionando!** 🚀
