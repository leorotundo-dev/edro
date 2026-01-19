# 🚀 GUIA RÁPIDO - RODAR FASE 1

## ✅ O QUE FOI CRIADO

1. ✅ **4 Migrations SQL** (57 tabelas novas)
2. ✅ **1 Repository** (trackingRepository.ts)
3. ✅ **1 Route** (tracking.ts com 12 endpoints)
4. ✅ **Routes registradas** (index.ts atualizado)

---

## 📋 PASSOS PARA RODAR

### **1. Instalar Dependências**

```bash
# No root do monorepo
cd "D:\WORK\DESIGN ROTUNDO\MEMODROPS\memodrops-main\memodrops-main"
npm install
```

### **2. Configurar .env**

Certifique-se de ter o `.env` configurado no backend:

```
DATABASE_URL=postgresql://...
JWT_SECRET=seu-secret-aqui
PORT=3000
NODE_ENV=development
```

### **3. Rodar as Migrations**

```bash
# Rodar migrations
cd apps/backend
npm run db:migrate
```

**Isso vai criar 57 tabelas novas:**
- 7 tabelas de Tracking
- 11 tabelas de ReccoEngine
- 12 tabelas de Questões/Simulados
- 15 tabelas de SRS/Progress/Mnemônicos
- 12 tabelas de Logs/Ops

### **4. Iniciar o Backend**

```bash
# No root do monorepo
npm run dev:backend

# OU diretamente no backend
cd apps/backend
npm run dev
```

### **5. Testar os Endpoints**

#### **5.1. Registrar usuário** (se não tiver)
```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "name": "Teste",
  "email": "teste@test.com",
  "password": "123456"
}

# Resposta: { "token": "..." }
```

#### **5.2. Iniciar Sessão de Tracking**
```bash
POST http://localhost:3000/tracking/session/start
Authorization: Bearer SEU_TOKEN_AQUI

# Resposta: { "session": { "id": "uuid", ... } }
```

#### **5.3. Registrar Evento de Telemetria**
```bash
POST http://localhost:3000/tracking/event
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json

{
  "event_type": "drop_started",
  "event_data": { "drop_id": "123", "title": "Regência Verbal" },
  "session_id": "UUID_DA_SESSAO"
}

# Resposta: { "event": {...}, "state": { "nec": 75, "nca": 0.8 } }
```

#### **5.4. Salvar Estado Cognitivo**
```bash
POST http://localhost:3000/tracking/cognitive
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json

{
  "session_id": "UUID_DA_SESSAO",
  "foco": 80,
  "energia": 70,
  "velocidade": 250,
  "tempo_por_drop": 300
}

# Resposta: 
# {
#   "cognitiveState": {
#     "foco": 80,
#     "energia": 70,
#     "nec": 75,        ← Calculado automaticamente
#     "nca": 50,        ← Calculado automaticamente
#     ...
#   }
# }
```

#### **5.5. Salvar Estado Emocional**
```bash
POST http://localhost:3000/tracking/emotional
Authorization: Bearer SEU_TOKEN_AQUI
Content-Type: application/json

{
  "session_id": "UUID_DA_SESSAO",
  "humor_auto_reportado": 4,
  "frustracao_inferida": false,
  "ansiedade_inferida": false,
  "motivacao_inferida": true
}
```

#### **5.6. Ver Estado Atual (Dashboard)**
```bash
GET http://localhost:3000/tracking/state
Authorization: Bearer SEU_TOKEN_AQUI

# Resposta:
# {
#   "state": {
#     "cognitive": { "foco": 80, "energia": 70, "nec": 75, "nca": 50 },
#     "emotional": { "humor_auto_reportado": 4, ... },
#     "nec": 75,
#     "nca": 50
#   },
#   "timestamp": "2024-12-03T18:20:00Z"
# }
```

#### **5.7. Dashboard Agregado do Dia**
```bash
GET http://localhost:3000/tracking/dashboard
Authorization: Bearer SEU_TOKEN_AQUI

# Resposta:
# {
#   "date": "2024-12-03",
#   "cognitive": {
#     "avg_foco": 78.5,
#     "avg_energia": 72.3,
#     "avg_nec": 75.4,
#     "total_sessions": 3,
#     "total_drops": 12,
#     "total_minutes": 145
#   },
#   "emotional": {
#     "avg_humor": 4.2,
#     "frustracao_count": 1,
#     "ansiedade_count": 0,
#     "motivacao_alta_count": 8
#   }
# }
```

---

## 🎯 ENDPOINTS DISPONÍVEIS

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/tracking/event` | Registra evento |
| POST | `/tracking/cognitive` | Salva estado cognitivo |
| POST | `/tracking/emotional` | Salva estado emocional |
| POST | `/tracking/behavioral` | Salva estado comportamental |
| POST | `/tracking/session/start` | Inicia sessão |
| POST | `/tracking/session/end` | Finaliza sessão |
| GET | `/tracking/state` | Estado atual (NEC/NCA) |
| GET | `/tracking/events` | Eventos recentes |
| GET | `/tracking/session/active` | Sessão ativa |
| GET | `/tracking/sessions` | Histórico |
| GET | `/tracking/cognitive/session/:id` | Estados por sessão |
| GET | `/tracking/dashboard` | Dashboard agregado |

---

## 📊 VERIFICAR SE FUNCIONOU

### **1. Verificar Migrations**

Conecte-se ao seu banco PostgreSQL e rode:

```sql
-- Ver todas as migrations aplicadas
SELECT * FROM schema_migrations ORDER BY id DESC;

-- Deve mostrar:
-- 0008_logs_ops_observability.sql
-- 0007_srs_progress_mnemonicos.sql
-- 0006_questoes_simulados.sql
-- 0005_recco_engine.sql
-- 0004_tracking_system.sql
-- ... (migrations antigas)
```

### **2. Verificar Tabelas Criadas**

```sql
-- Ver todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve ter:
-- tracking_events
-- tracking_cognitive
-- tracking_emotional
-- tracking_behavioral
-- tracking_sessions
-- cognitive_states
-- emotional_states
-- recco_inputs
-- recco_states
-- ... (total 74 tabelas)
```

### **3. Verificar Dados de Tracking**

```sql
-- Ver eventos recentes
SELECT * FROM tracking_events ORDER BY timestamp DESC LIMIT 10;

-- Ver estados cognitivos
SELECT * FROM tracking_cognitive ORDER BY timestamp DESC LIMIT 10;

-- Ver sessões
SELECT * FROM tracking_sessions ORDER BY started_at DESC LIMIT 10;
```

---

## 🐛 TROUBLESHOOTING

### **Erro: "ts-node não reconhecido"**

```bash
# Instalar ts-node localmente
npm install --save-dev ts-node

# OU usar npx
npx ts-node --transpile-only src/db/migrate.ts
```

### **Erro: "Cannot find module 'dotenv'"**

```bash
npm install dotenv
```

### **Erro: "Cannot connect to database"**

Verifique o `.env`:
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### **Erro: "JWT_SECRET is required"**

Adicione no `.env`:
```
JWT_SECRET=seu-secret-muito-seguro-aqui
```

---

## 🎉 SUCESSO!

Se tudo funcionou, você agora tem:

✅ **74 tabelas no banco** (17 antigas + 57 novas)
✅ **Sistema de Tracking funcional** (15 sinais, NEC/NCA)
✅ **12 endpoints novos** de tracking
✅ **Cálculo automático de NEC/NCA**
✅ **Estrutura completa para ReccoEngine V3**
✅ **Sistema de Questões expandido**
✅ **Sistema de Simulados estruturado**
✅ **SRS-AI™ com 7 variáveis**
✅ **Progress & Mastery**
✅ **Mnemônicos estruturados**
✅ **Observability com logs**

---

## 🔜 PRÓXIMO PASSO (Fase 2)

Com a Fase 1 rodando, podemos começar a Fase 2:

1. **ReccoEngine V3 - Lógica completa**
2. **Workers BullMQ** (processar tracking, gerar recomendações)
3. **SDK de Tracking Frontend** (React Hook)
4. **IA para Geração de Questões**
5. **Simulados Adaptativos**

---

**Fase 1 COMPLETA!** 🎉

Qualquer problema, me avise que eu ajudo a resolver!
