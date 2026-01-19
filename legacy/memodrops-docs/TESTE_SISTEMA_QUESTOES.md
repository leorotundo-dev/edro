# 🧪 Guia de Teste - Sistema de Questões

**Objetivo**: Validar todos os endpoints do sistema de questões

---

## 📋 PRÉ-REQUISITOS

1. ✅ Backend rodando (local ou Railway)
2. ✅ Migration `0009` executada
3. ✅ `OPENAI_API_KEY` configurada
4. ✅ Banco de dados com dados de teste

---

## 🔧 SETUP INICIAL

### **1. Rodar Migration**

```bash
cd memodrops-main/apps/backend

# Local
npm run migrate

# Railway (se necessário)
railway run npm run migrate
```

### **2. Verificar Tabelas**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'questoes'
ORDER BY ordinal_position;
```

Deve conter as colunas:
- `question_text`
- `question_type`
- `alternatives`
- `correct_answer`
- `explanation`
- `concepts`
- `cognitive_level`
- `estimated_time_seconds`
- `quality_score`
- `ai_generated`
- `status`
- `discipline`
- `topic`
- `exam_board`
- `difficulty`

---

## 🧪 TESTES DOS ENDPOINTS

### **Endpoint Base**
```bash
# Local
BASE_URL="http://localhost:3333"

# Produção (Railway)
BASE_URL="https://memodrops-backend.up.railway.app"
```

---

### **1. Gerar 1 Questão**

**Endpoint**: `POST /ai/questions/generate`

```bash
curl -X POST $BASE_URL/ai/questions/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Regência Verbal",
    "discipline": "Português",
    "examBoard": "CESPE",
    "difficulty": 3,
    "context": "Foco em erros comuns de regência",
    "saveToDatabase": true
  }' | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "question": {
      "question_text": "...",
      "question_type": "true_false",
      "alternatives": [...],
      "correct_answer": "...",
      "explanation": "...",
      "concepts": [...],
      "cognitive_level": "...",
      "estimated_time_seconds": 120,
      "difficulty_score": 3
    },
    "validation": {
      "valid": true,
      "errors": []
    },
    "questionId": "uuid-aqui"
  }
}
```

---

### **2. Gerar Batch de Questões**

**Endpoint**: `POST /ai/questions/generate-batch`

```bash
curl -X POST $BASE_URL/ai/questions/generate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Concordância Verbal",
    "discipline": "Português",
    "examBoard": "FCC",
    "difficulty": 4,
    "count": 3,
    "saveToDatabase": true
  }' | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "count": 3,
    "questionIds": ["uuid1", "uuid2", "uuid3"]
  }
}
```

---

### **3. Analisar Questão**

**Endpoint**: `POST /ai/questions/analyze`

```bash
curl -X POST $BASE_URL/ai/questions/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "O pronome oblíquo em \"Vou encontrá-lo\" está correto?",
    "alternatives": [
      {"letter": "a", "text": "Certo", "is_correct": true},
      {"letter": "b", "text": "Errado", "is_correct": false}
    ],
    "correctAnswer": "a"
  }' | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "quality_score": 8.5,
    "difficulty_level": 3,
    "cognitive_level": "apply",
    "concepts": [...],
    "strengths": [...],
    "weaknesses": [...]
  }
}
```

---

### **4. Listar Questões**

**Endpoint**: `GET /questions`

```bash
# Todas as questões
curl "$BASE_URL/questions?limit=10" | jq

# Filtrar por disciplina
curl "$BASE_URL/questions?discipline=Português&limit=5" | jq

# Filtrar por banca
curl "$BASE_URL/questions?examBoard=CESPE&status=active" | jq

# Filtrar por dificuldade
curl "$BASE_URL/questions?difficulty=3&limit=10" | jq

# Apenas geradas por IA
curl "$BASE_URL/questions?aiGenerated=true" | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "total": 50,
    "limit": 10,
    "offset": 0
  }
}
```

---

### **5. Buscar Questão por ID**

**Endpoint**: `GET /questions/:id`

```bash
# Substituir {id} pelo UUID de uma questão
QUESTION_ID="uuid-da-questao"

curl "$BASE_URL/questions/$QUESTION_ID" | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "question": {
      "id": "...",
      "question_text": "...",
      "alternatives": [...],
      "status": "active"
    },
    "statistics": {
      "total_attempts": 10,
      "correct_attempts": 6,
      "wrong_attempts": 4,
      "average_time_seconds": 45
    }
  }
}
```

---

### **6. Responder Questão**

**Endpoint**: `POST /questions/:id/answer`

```bash
QUESTION_ID="uuid-da-questao"

curl -X POST "$BASE_URL/questions/$QUESTION_ID/answer" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "selectedAnswer": "b",
    "timeSpent": 45
  }' | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "isCorrect": true,
    "correctAnswer": "b",
    "explanation": "Explicação detalhada..."
  }
}
```

---

### **7. Buscar por Conceito**

**Endpoint**: `GET /questions/search`

```bash
curl "$BASE_URL/questions/search?concept=regência&limit=5" | jq

curl "$BASE_URL/questions/search?concept=concordância&limit=10" | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "count": 5
  }
}
```

---

### **8. Questões Similares**

**Endpoint**: `GET /questions/:id/similar`

```bash
QUESTION_ID="uuid-da-questao"

curl "$BASE_URL/questions/$QUESTION_ID/similar?limit=3" | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "count": 3
  }
}
```

---

### **9. Atualizar Questão**

**Endpoint**: `PATCH /questions/:id`

```bash
QUESTION_ID="uuid-da-questao"

curl -X PATCH "$BASE_URL/questions/$QUESTION_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "quality_score": 9.5
  }' | jq
```

---

### **10. Deletar Questão (Soft Delete)**

**Endpoint**: `DELETE /questions/:id`

```bash
QUESTION_ID="uuid-da-questao"

curl -X DELETE "$BASE_URL/questions/$QUESTION_ID" | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "message": "Questão arquivada com sucesso"
}
```

---

### **11. Estatísticas Admin**

**Endpoint**: `GET /admin/questions/stats`

```bash
curl "$BASE_URL/admin/questions/stats" | jq
```

**Resultado Esperado**:
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 120,
    "draft": 25,
    "aiGenerated": 130,
    "manual": 20
  }
}
```

---

## 🎯 TESTES FUNCIONAIS

### **Cenário 1: Gerar questões para múltiplas bancas**

```bash
# CESPE (Certo/Errado)
curl -X POST $BASE_URL/ai/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Crase","discipline":"Português","examBoard":"CESPE","difficulty":3,"saveToDatabase":true}' | jq '.data.question.question_type'

# FCC (Múltipla Escolha)
curl -X POST $BASE_URL/ai/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Crase","discipline":"Português","examBoard":"FCC","difficulty":3,"saveToDatabase":true}' | jq '.data.question.question_type'

# FGV
curl -X POST $BASE_URL/ai/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Crase","discipline":"Português","examBoard":"FGV","difficulty":3,"saveToDatabase":true}' | jq '.data.question.question_type'
```

**Validar**: CESPE deve retornar `true_false`, outras `multiple_choice`

---

### **Cenário 2: Batch generation**

```bash
curl -X POST $BASE_URL/ai/questions/generate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Verbos Irregulares",
    "discipline": "Português",
    "examBoard": "FCC",
    "difficulty": 2,
    "count": 5,
    "saveToDatabase": true
  }' | jq '.data.count'
```

**Validar**: Deve retornar `count: 5` e `questionIds` com 5 UUIDs

---

### **Cenário 3: Workflow completo**

```bash
# 1. Gerar questão
RESPONSE=$(curl -s -X POST $BASE_URL/ai/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"Pontuação","discipline":"Português","examBoard":"CESPE","difficulty":3,"saveToDatabase":true}')

# 2. Extrair ID
QUESTION_ID=$(echo $RESPONSE | jq -r '.data.questionId')
echo "Questão criada: $QUESTION_ID"

# 3. Buscar questão
curl "$BASE_URL/questions/$QUESTION_ID" | jq '.data.question.status'

# 4. Responder
curl -X POST "$BASE_URL/questions/$QUESTION_ID/answer" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-123","selectedAnswer":"a","timeSpent":30}' | jq '.data.isCorrect'

# 5. Ver estatísticas
curl "$BASE_URL/questions/$QUESTION_ID" | jq '.data.statistics'

# 6. Atualizar para ativa
curl -X PATCH "$BASE_URL/questions/$QUESTION_ID" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}' | jq '.data.status'

# 7. Arquivar
curl -X DELETE "$BASE_URL/questions/$QUESTION_ID" | jq '.success'
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] ✅ Endpoint `/ai/questions/generate` funciona
- [ ] ✅ Endpoint `/ai/questions/generate-batch` funciona
- [ ] ✅ Endpoint `/ai/questions/analyze` funciona
- [ ] ✅ Endpoint `/questions` lista corretamente
- [ ] ✅ Filtros por disciplina/banca/dificuldade funcionam
- [ ] ✅ Endpoint `/questions/:id` retorna detalhes
- [ ] ✅ Endpoint `/questions/:id/answer` registra tentativa
- [ ] ✅ Estatísticas são atualizadas corretamente
- [ ] ✅ Busca por conceito funciona
- [ ] ✅ Questões similares funcionam
- [ ] ✅ PATCH atualiza questão
- [ ] ✅ DELETE arquiva questão
- [ ] ✅ Admin stats retorna números corretos
- [ ] ✅ CESPE gera true_false
- [ ] ✅ FCC/FGV/VUNESP geram multiple_choice

---

## 🐛 PROBLEMAS COMUNS

### **1. Erro: "OpenAI API key not found"**
```bash
# Verificar variável de ambiente
echo $OPENAI_API_KEY

# Railway
railway variables
```

### **2. Erro: "Column question_text does not exist"**
```bash
# Rodar migration 0009
npm run migrate
```

### **3. Erro: "Cannot read property of null"**
- Verificar se o banco tem dados
- Verificar se o ID da questão existe

### **4. Timeout na geração**
- Modelo GPT pode demorar 5-10s por questão
- Batch de 5 questões pode levar ~30-60s

---

## 📊 MÉTRICAS DE SUCESSO

- ✅ **Taxa de sucesso de geração**: > 95%
- ✅ **Tempo médio de geração**: < 10s por questão
- ✅ **Quality score médio**: > 7.0
- ✅ **Validação**: 100% das questões geradas são válidas

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Todos os testes passam
2. ✅ Gerar 20-50 questões de exemplo
3. ✅ Integrar com frontend
4. ✅ Dashboard de estatísticas
5. ✅ Exportação em PDF

---

**Última atualização**: Dezembro 2024  
**Status**: Pronto para testes! 🧪
