# 🎯 ENDPOINTS DA DASHBOARD ADMIN - MemoDrops

**Base URL**: https://memodropsweb-production.up.railway.app

---

## 📊 DASHBOARD PRINCIPAL

### **Visão Geral (Overview)**
```
GET /admin/metrics/overview
```
**Retorna**: Contadores gerais (usuários, drops, disciplinas, reviews hoje)

**Link**: https://memodropsweb-production.up.railway.app/admin/metrics/overview

**Exemplo de Resposta**:
```json
{
  "success": true,
  "usersCount": 3,
  "dropsCount": 150,
  "disciplinesCount": 5,
  "reviewsToday": 42
}
```

---

## 👥 USUÁRIOS

### **Listar Usuários**
```
GET /admin/users
```
**Link**: https://memodropsweb-production.up.railway.app/admin/users

### **Buscar Usuário Específico**
```
GET /admin/users/:id
```
**Exemplo**: https://memodropsweb-production.up.railway.app/admin/users/UUID-DO-USUARIO

### **Debug de Usuários (com paginação)**
```
GET /admin/debug/users?limit=50&offset=0
```
**Link**: https://memodropsweb-production.up.railway.app/admin/debug/users

**Query Params**:
- `limit`: Quantidade (padrão: 50, máx: 200)
- `offset`: Pular registros (padrão: 0)

---

## 📝 DROPS (Conteúdo)

### **Listar Drops**
```
GET /admin/drops
```
**Link**: https://memodropsweb-production.up.railway.app/admin/drops

### **Debug de Drops**
```
GET /admin/debug/drops
```
**Link**: https://memodropsweb-production.up.railway.app/admin/debug/drops

### **Criar Drop**
```
POST /admin/drops
```
**Body**:
```json
{
  "discipline_id": "uuid",
  "title": "string",
  "content": "string"
}
```

---

## 🗺️ BLUEPRINTS (Estrutura de Exames)

### **Listar Blueprints**
```
GET /admin/blueprints
```
**Link**: https://memodropsweb-production.up.railway.app/admin/blueprints

### **Debug de Blueprints**
```
GET /admin/debug/blueprints
```
**Link**: https://memodropsweb-production.up.railway.app/admin/debug/blueprints

### **Buscar Blueprint Específico**
```
GET /admin/debug/blueprints/:id
```
**Exemplo**: https://memodropsweb-production.up.railway.app/admin/debug/blueprints/UUID

**Retorna**: 
```json
{
  "id": "uuid",
  "harvest_item_id": "uuid",
  "exam_code": "string",
  "banca": "string",
  "cargo": "string",
  "disciplina": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

## 🌾 HARVEST (Coleta de Conteúdo)

### **Listar Items de Harvest**
```
GET /admin/harvest/items
```
**Link**: https://memodropsweb-production.up.railway.app/admin/harvest/items

### **Buscar Item Específico**
```
GET /admin/harvest/items/:id
```
**Exemplo**: https://memodropsweb-production.up.railway.app/admin/harvest/items/UUID

**Retorna**:
```json
{
  "id": "uuid",
  "source": "string",
  "url": "string",
  "status": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

## 🧠 RAG BLOCKS (Blocos de Conhecimento)

### **Listar Blocos RAG**
```
GET /admin/rag/blocks?disciplina=*&topicCode=*
```
**Link**: https://memodropsweb-production.up.railway.app/admin/rag/blocks

**Query Params**:
- `disciplina`: Filtrar por disciplina (padrão: `*` = todas)
- `topicCode`: Filtrar por código do tópico (padrão: `*` = todos)

### **Buscar Bloco Específico**
```
GET /admin/rag/blocks/:id
```
**Exemplo**: https://memodropsweb-production.up.railway.app/admin/rag/blocks/UUID

**Retorna**:
```json
{
  "id": "uuid",
  "disciplina": "string",
  "topic_code": "string",
  "summary": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

## 💰 CUSTOS

### **Visão Geral de Custos**
```
GET /admin/costs/real/overview
```
**Link**: https://memodropsweb-production.up.railway.app/admin/costs/real/overview

### **Custos Railway**
```
GET /admin/costs/real/railway
```
**Link**: https://memodropsweb-production.up.railway.app/admin/costs/real/railway

### **Custos Vercel**
```
GET /admin/costs/real/vercel
```
**Link**: https://memodropsweb-production.up.railway.app/admin/costs/real/vercel

### **Custos OpenAI**
```
GET /admin/costs/real/openai
```
**Link**: https://memodropsweb-production.up.railway.app/admin/costs/real/openai

---

## 📊 MÉTRICAS

### **Resumo de QA**
```
GET /admin/metrics/qa/summary
```
**Link**: https://memodropsweb-production.up.railway.app/admin/metrics/qa/summary

**Retorna**: Contagem de QA reviews por status

### **Métricas Diárias**
```
GET /admin/metrics/daily?metricName=&days=30
```
**Link**: https://memodropsweb-production.up.railway.app/admin/metrics/daily

**Query Params**:
- `metricName`: Nome da métrica (opcional)
- `days`: Número de dias (padrão: 30, máx: 365)

**Retorna**:
```json
{
  "success": true,
  "items": [
    {
      "date": "2025-01-01",
      "metric_name": "users_active",
      "metric_value": "42"
    }
  ]
}
```

---

## 🤖 IA (AI Admin)

### **Extrair Blueprint**
```
POST /admin/extract-blueprint
```
**Body**: Dados do edital/PDF

### **Gerar Drops**
```
POST /admin/generate-drops
```
**Body**: Parâmetros de geração

---

## 🔧 JOBS (Tarefas Agendadas)

### **Status dos Jobs**
```
GET /api/jobs-admin
```
**Link**: https://memodropsweb-production.up.railway.app/api/jobs-admin

---

## 🔍 MONITORAMENTO

### **Status Geral**
```
GET /api/monitoring
```
**Link**: https://memodropsweb-production.up.railway.app/api/monitoring

### **Saúde do Banco**
```
GET /api/database-health
```
**Link**: https://memodropsweb-production.up.railway.app/api/database-health

### **Status de Backups**
```
GET /api/backup
```
**Link**: https://memodropsweb-production.up.railway.app/api/backup

### **Status de Segurança**
```
GET /api/security
```
**Link**: https://memodropsweb-production.up.railway.app/api/security

---

## 📄 OUTROS RECURSOS

### **Editais**
```
GET /api/editais
```
**Link**: https://memodropsweb-production.up.railway.app/api/editais

### **Questões**
```
GET /api/questions
```
**Link**: https://memodropsweb-production.up.railway.app/api/questions

### **Simulados**
```
GET /api/simulados
```
**Link**: https://memodropsweb-production.up.railway.app/api/simulados

### **Disciplinas**
```
GET /api/disciplines
```
**Link**: https://memodropsweb-production.up.railway.app/api/disciplines

---

## 🧪 TESTANDO ENDPOINTS

### **Via Browser**
Simplesmente cole a URL no navegador

### **Via curl**
```bash
# Health check
curl https://memodropsweb-production.up.railway.app/

# Listar usuários
curl https://memodropsweb-production.up.railway.app/admin/users

# Overview de métricas
curl https://memodropsweb-production.up.railway.app/admin/metrics/overview
```

### **Via PowerShell**
```powershell
# Invoke-RestMethod
Invoke-RestMethod -Uri "https://memodropsweb-production.up.railway.app/admin/users"

# Invoke-WebRequest
Invoke-WebRequest -Uri "https://memodropsweb-production.up.railway.app/admin/metrics/overview"
```

---

## 📱 FRONTEND VISUAL (Dashboard UI)

Para ter uma interface visual bonita, você precisa do **Frontend Admin** deployado na Vercel.

O frontend consome esses endpoints e mostra:
- 📊 Gráficos
- 📈 Tabelas
- 🎨 Dashboard bonito
- 🖱️ Controles interativos

**Para deployar o frontend**: Veja arquivo `DEPLOY_AGORA.md`

---

## 🔑 AUTENTICAÇÃO

⚠️ **Importante**: Alguns endpoints podem requerer autenticação JWT.

Se receber erro `401 Unauthorized`:
```bash
# Fazer login primeiro
curl -X POST https://memodropsweb-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"senha"}'

# Usar token retornado
curl https://memodropsweb-production.up.railway.app/admin/users \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- **Arquitetura**: `docs/architecture.md`
- **Deploy Guide**: `DEPLOY_AGORA.md`
- **Auditoria de Endpoints**: `AUDITORIA_ENDPOINTS_MEMODROPS.md`

---

**Atualizado**: Janeiro 2025  
**Base URL**: https://memodropsweb-production.up.railway.app
