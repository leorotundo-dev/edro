# 🧪 Guia de Teste Local - ReccoEngine V3

**Data**: Dezembro 2024  
**Objetivo**: Testar o ReccoEngine V3 localmente antes do deploy

---

## 📋 PRÉ-REQUISITOS

Antes de começar, verifique se você tem:

- [x] Node.js instalado (v18+)
- [x] PostgreSQL instalado e rodando
- [x] Arquivo `.env` configurado em `apps/backend/`

### **.env deve conter:**

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/memodrops
JWT_SECRET=seu-secret-aqui
OPENAI_API_KEY=sk-... (opcional para testes básicos)
NODE_ENV=development
PORT=3333
```

---

## 🚀 PASSO A PASSO

### **1. Instalar Dependências**

```bash
cd memodrops-main
npm install

# Ou se preferir instalar só o backend
cd apps/backend
npm install
```

### **2. Executar Migrations**

```bash
# Ainda em apps/backend
npm run db:migrate
```

**O que isso faz:**
- Cria/atualiza todas as 74 tabelas
- Inclui as 11 novas tabelas do ReccoEngine
- Executa migrations 0001 até 0008

**Saída esperada:**
```
✅ Migration 0001_existing_schema.sql - OK
✅ Migration 0002_new_stage16_tables.sql - OK
✅ Migration 0003_stage19_tables.sql - OK
✅ Migration 0004_tracking_system.sql - OK
✅ Migration 0005_recco_engine.sql - OK
✅ Migration 0006_questoes_simulados.sql - OK
✅ Migration 0007_srs_progress_mnemonicos.sql - OK
✅ Migration 0008_logs_ops_observability.sql - OK
```

### **3. Rodar Script de Teste**

```bash
# Ainda em apps/backend
npx ts-node test-recco-engine.ts
```

**O que esse script testa:**

1. ✅ Conexão com banco de dados
2. ✅ Existência das 11 tabelas do ReccoEngine
3. ✅ Criação/busca de usuário de teste
4. ✅ Diagnóstico completo (3 estados)
5. ✅ Geração de trilha diária
6. ✅ Motor completo (pipeline end-to-end)

**Saída esperada:**
```
============================================================
🧪 TESTE DO RECCOENGINE V3
============================================================

📊 TESTE 1: Conexão com Banco
------------------------------------------------------------
✅ Banco conectado: 2024-12-01T10:00:00.000Z

📋 TESTE 2: Verificar Tabelas do ReccoEngine
------------------------------------------------------------
✅ recco_inputs
✅ recco_states
✅ recco_prioridades
✅ recco_selecao
✅ recco_sequencia
✅ recco_reforco
✅ recco_feedback
✅ recco_versions
✅ recco_predictions
✅ recco_cognitive_flags
✅ recco_emotional_flags

👤 TESTE 3: Buscar Usuário de Teste
------------------------------------------------------------
✅ Usuário encontrado: uuid-aqui

🔬 TESTE 4: Executar Diagnóstico
------------------------------------------------------------
✅ Diagnóstico executado com sucesso!

Resultados:
  Estado Cognitivo: medio
  Estado Emocional: neutro
  Estado Pedagógico: iniciante
  Prob. Acerto: 50.0%
  Prob. Retenção: 75.0%
  Prob. Saturação: 20.0%
  Tempo Ótimo: 60 min

🎯 TESTE 5: Gerar Trilha Diária
------------------------------------------------------------
⏳ Gerando trilha do dia...
✅ Trilha gerada com sucesso!

  12 itens para estudar
  Duração total: 58 min
  Curva de dificuldade: progressiva

  Primeiros 3 itens:
    1. drop (5 min, dif: 2)
    2. questao (3 min, dif: 3)
    3. drop (5 min, dif: 3)

⚙️  TESTE 6: Motor Completo
------------------------------------------------------------
⏳ Executando motor completo...
✅ Motor executado com sucesso!

  Tempo de processamento: 342ms
  Itens gerados: 9
  Duração total: 45 min
  Estado cognitivo: medio
  Estado emocional: neutro

============================================================
🎉 TODOS OS TESTES PASSARAM!
============================================================

✅ ReccoEngine V3 está funcionando perfeitamente!
```

### **4. Iniciar o Servidor**

```bash
# Ainda em apps/backend
npm run dev
```

**Saída esperada:**
```
[fastify] Server listening at http://localhost:3333
```

### **5. Testar Endpoints da API**

Abra outro terminal e execute:

```bash
# Teste 1: Health Check
curl http://localhost:3333/health

# Teste 2: Admin Stats
curl http://localhost:3333/recco/admin/stats

# Teste 3: Diagnóstico (use o userId do teste)
curl http://localhost:3333/recco/diagnosis/SEU-USER-ID-AQUI

# Teste 4: Trilha Diária
curl http://localhost:3333/recco/trail/daily/SEU-USER-ID-AQUI

# Teste 5: Teste Completo Admin
curl -X POST http://localhost:3333/recco/admin/test/SEU-USER-ID-AQUI
```

---

## ⚠️ TROUBLESHOOTING

### **Erro: "Cannot find module"**

```bash
cd apps/backend
npm install
```

### **Erro: "database does not exist"**

Crie o banco de dados:

```bash
# PostgreSQL
createdb memodrops

# Ou via SQL
psql -U postgres
CREATE DATABASE memodrops;
```

### **Erro: "relation does not exist"**

Execute as migrations:

```bash
npm run db:migrate
```

### **Erro: "connection refused"**

Verifique se PostgreSQL está rodando:

```bash
# Windows
# Abra Services.msc e veja se PostgreSQL está ativo

# Linux/Mac
sudo systemctl status postgresql
```

### **Erro: "Cannot connect to DATABASE_URL"**

Verifique seu `.env`:

```env
# Formato correto:
DATABASE_URL=postgresql://usuario:senha@localhost:5432/memodrops
```

### **Erro TypeScript**

Compile o projeto:

```bash
npm run build
```

---

## ✅ CHECKLIST FINAL

Antes de fazer deploy, confirme:

- [ ] Migrations executaram sem erro
- [ ] Script de teste passou 100%
- [ ] Servidor inicia sem erros
- [ ] Health check responde (200 OK)
- [ ] Endpoints do ReccoEngine respondem
- [ ] Diagnóstico retorna dados válidos
- [ ] Trilha é gerada com sucesso
- [ ] Sem erros no console do servidor

---

## 🚀 PRÓXIMO PASSO: DEPLOY

Quando todos os testes passarem:

```bash
# 1. Commit
git add .
git commit -m "feat: ReccoEngine V3 - testado e funcionando"

# 2. Push
git push origin main

# 3. Deploy automático no Railway (se configurado)
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs detalhados
2. Consulte a documentação: `docs/RECCO_ENGINE_V3.md`
3. Revise o código de exemplo
4. Execute o script de teste com mais detalhes

---

**Boa sorte com os testes! 🚀**
