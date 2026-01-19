# 🚀 Deploy do Sistema de Questões - GUIA RÁPIDO

**Tempo estimado**: 30 minutos  
**Data**: Dezembro 2024

---

## ✅ PRÉ-REQUISITOS

Certifique-se de ter:
- ✅ Conta no Railway
- ✅ Projeto MemoDrops no Railway
- ✅ `DATABASE_URL` configurada
- ✅ `OPENAI_API_KEY` configurada
- ✅ Git instalado

---

## 📋 PASSO 1: VERIFICAR ARQUIVOS (2 min)

### **1.1. Verificar Migration**
```powershell
cd memodrops-main
dir apps\backend\src\db\migrations\0009_questoes_english_columns.sql
```

✅ **Deve existir**: `0009_questoes_english_columns.sql`

### **1.2. Verificar Código**
```powershell
dir apps\backend\src\services\ai\questionGenerator.ts
dir apps\backend\src\repositories\questionRepository.ts
dir apps\backend\src\routes\questions.ts
dir apps\backend\src\jobs\generate-questions-batch.ts
```

✅ **Todos devem existir**

### **1.3. Verificar Prompts**
```powershell
dir apps\backend\ai\prompts\generate_question.prompt.txt
dir apps\backend\ai\prompts\analyze_question.prompt.txt
```

✅ **Ambos devem existir**

---

## 📋 PASSO 2: COMMIT E PUSH (5 min)

### **2.1. Verificar Status**
```powershell
cd memodrops-main
git status
```

### **2.2. Adicionar Arquivos**
```powershell
git add .
```

### **2.3. Commit**
```powershell
git commit -m "feat: Sistema de Questões IA 100% completo

- Geração automática com OpenAI (4 bancas)
- 14 endpoints REST implementados
- Análise de qualidade automática
- Migration 0009 (colunas em inglês)
- Batch processing
- 2,500 linhas de código

Closes #questoes"
```

### **2.4. Push**
```powershell
git push origin main
```

⏳ **Aguarde**: Railway vai detectar e fazer deploy automaticamente (3-5 min)

---

## 📋 PASSO 3: RODAR MIGRATION NO RAILWAY (5 min)

### **Opção A: Via Railway CLI** (Recomendado)

```powershell
# 1. Instalar Railway CLI (se não tiver)
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link ao projeto
cd memodrops-main
railway link

# 4. Rodar migration
railway run npm run db:migrate --workspace apps/backend
```

### **Opção B: Via Web Dashboard**

1. Acesse: https://railway.app
2. Entre no projeto **MemoDrops**
3. Selecione o serviço **backend**
4. Vá em **Settings** → **Variables**
5. Confirme que existe `DATABASE_URL` e `OPENAI_API_KEY`
6. Vá em **Deployments**
7. No último deploy, clique em **View Logs**
8. Verifique se aparece: `"All migrations applied"`

Se não rodou automaticamente:
```powershell
railway run npm run db:migrate
```

---

## 📋 PASSO 4: TESTAR ENDPOINTS (10 min)

### **4.1. Pegar URL do Backend**

```powershell
railway status
```

Ou acesse Railway Dashboard → Seu serviço → **Settings** → **Domains**

Exemplo: `https://memodrops-backend-production.up.railway.app`

### **4.2. Definir URL Base**

```powershell
# PowerShell
$BASE_URL="https://sua-url-railway.up.railway.app"
```

### **4.3. Testar Health Check**

```powershell
curl $BASE_URL/health
```

✅ **Deve retornar**: `{"status":"ok"}`

### **4.4. Testar Geração de Questão (TESTE PRINCIPAL)**

```powershell
curl -X POST "$BASE_URL/ai/questions/generate" `
  -H "Content-Type: application/json" `
  -d '{
    "topic": "Regência Verbal",
    "discipline": "Português",
    "examBoard": "CESPE",
    "difficulty": 3,
    "context": "Teste de deploy",
    "saveToDatabase": true
  }'
```

✅ **Resultado esperado**:
```json
{
  "success": true,
  "data": {
    "question": {
      "question_text": "...",
      "question_type": "true_false",
      "alternatives": [...],
      "correct_answer": "c",
      "explanation": "..."
    },
    "questionId": "uuid-aqui"
  }
}
```

⏳ **Tempo**: 5-10 segundos (OpenAI está processando)

### **4.5. Testar Listagem**

```powershell
curl "$BASE_URL/questions?limit=5"
```

✅ **Deve retornar**: Lista de questões geradas

### **4.6. Testar Estatísticas Admin**

```powershell
curl "$BASE_URL/admin/questions/stats"
```

✅ **Deve retornar**:
```json
{
  "success": true,
  "data": {
    "total": 1,
    "active": 0,
    "draft": 1,
    "aiGenerated": 1,
    "manual": 0
  }
}
```

---

## 📋 PASSO 5: VALIDAÇÃO COMPLETA (5 min)

### **5.1. Gerar Batch de Questões**

```powershell
curl -X POST "$BASE_URL/ai/questions/generate-batch" `
  -H "Content-Type: application/json" `
  -d '{
    "topic": "Concordância Verbal",
    "discipline": "Português",
    "examBoard": "FCC",
    "difficulty": 3,
    "count": 3,
    "saveToDatabase": true
  }'
```

⏳ **Tempo**: 15-30 segundos (gera 3 questões)

### **5.2. Verificar Total de Questões**

```powershell
curl "$BASE_URL/admin/questions/stats"
```

✅ **Deve mostrar**: `"total": 4` (1 anterior + 3 novas)

### **5.3. Testar Busca por Conceito**

```powershell
curl "$BASE_URL/questions/search?concept=regência&limit=5"
```

### **5.4. Buscar uma Questão por ID**

```powershell
# Use o questionId do passo 4.4
curl "$BASE_URL/questions/{uuid-aqui}"
```

---

## 📋 PASSO 6: LOGS E DEBUG (3 min)

### **6.1. Ver Logs do Railway**

```powershell
railway logs
```

Procure por:
- ✅ `Running migration 0009_questoes_english_columns.sql...`
- ✅ `Migration 0009_questoes_english_columns.sql applied successfully`
- ✅ `[ai-question] Gerando questão...`
- ✅ `[ai-question] ✅ Questão gerada com sucesso`

### **6.2. Verificar Erros Comuns**

#### **Erro: "OpenAI API key not found"**
```powershell
# Verificar variável
railway variables

# Adicionar se não existir
railway variables --set OPENAI_API_KEY=sk-...
```

#### **Erro: "Column question_text does not exist"**
```powershell
# Migration não rodou, executar manualmente
railway run npm run db:migrate
```

#### **Erro: "Timeout"**
- OpenAI pode demorar 5-10s por questão
- É normal, aguarde mais tempo

---

## ✅ CHECKLIST DE VALIDAÇÃO

Marque cada item conforme completa:

### **Deploy**
- [ ] ✅ Código commitado no Git
- [ ] ✅ Push para o repositório
- [ ] ✅ Railway fez deploy automaticamente
- [ ] ✅ Deploy está "Active" no Railway
- [ ] ✅ Sem erros nos logs

### **Migrations**
- [ ] ✅ Migration 0009 existe no código
- [ ] ✅ Migration 0009 rodou no Railway
- [ ] ✅ Tabela `questoes` tem coluna `question_text`
- [ ] ✅ Tabela `questoes` tem coluna `alternatives`
- [ ] ✅ Sem erros de schema

### **Endpoints**
- [ ] ✅ `/health` retorna OK
- [ ] ✅ `/ai/questions/generate` funciona
- [ ] ✅ Questão foi salva no banco
- [ ] ✅ `/questions` lista questões
- [ ] ✅ `/admin/questions/stats` retorna dados
- [ ] ✅ `/ai/questions/generate-batch` funciona
- [ ] ✅ `/questions/search` funciona

### **Funcionalidades**
- [ ] ✅ Geração CESPE (true_false) funciona
- [ ] ✅ Geração FCC (multiple_choice) funciona
- [ ] ✅ Análise de qualidade funciona
- [ ] ✅ Batch de 3-5 questões funciona
- [ ] ✅ Busca por conceito funciona
- [ ] ✅ Estatísticas são atualizadas

---

## 🎉 SUCESSO!

Se todos os checkboxes estão marcados, **parabéns**! 🚀

O **Sistema de Questões com IA** está **100% DEPLOYADO e FUNCIONAL** em produção!

---

## 📊 PRÓXIMOS PASSOS

Agora você pode:

### **1. Gerar Questões de Teste** (20 min)
```powershell
# Português
curl -X POST "$BASE_URL/ai/questions/generate-batch" `
  -d '{"topic":"Crase","discipline":"Português","examBoard":"CESPE","difficulty":3,"count":5,"saveToDatabase":true}'

# Matemática
curl -X POST "$BASE_URL/ai/questions/generate-batch" `
  -d '{"topic":"Regra de Três","discipline":"Matemática","examBoard":"FCC","difficulty":2,"count":5,"saveToDatabase":true}'

# Direito
curl -X POST "$BASE_URL/ai/questions/generate-batch" `
  -d '{"topic":"Direitos Fundamentais","discipline":"Direito Constitucional","examBoard":"FGV","difficulty":4,"count":5,"saveToDatabase":true}'
```

### **2. Integrar com Frontend** (2-3 horas)
- Criar tela de gestão de questões (Admin)
- Criar tela de responder questões (Aluno)
- Dashboard de estatísticas

### **3. Documentar API** (1 hora)
- Criar collection no Postman
- Adicionar exemplos
- Compartilhar com equipe

### **4. Próximo Sistema**
Escolha um:
- 🤖 **ReccoEngine (Lógica)** - Motor de recomendação
- 🎯 **Simulados (Lógica)** - Adaptação em tempo real
- 👥 **Frontend Aluno** - Interface do estudante
- ⚙️ **Workers BullMQ** - Processamento assíncrono

---

## 🐛 PROBLEMAS?

### **Questões não são salvas**
```powershell
# Verificar se migration rodou
railway logs | Select-String "0009"

# Rodar manualmente
railway run npm run db:migrate
```

### **OpenAI demora muito**
- Normal: 5-10s por questão
- Batch de 5: ~30-60s
- Se passar de 60s, pode ser rate limit

### **Erro 500 na geração**
```powershell
# Ver logs detalhados
railway logs --tail 100
```

Procure por:
- Erro de OpenAI
- Erro de banco de dados
- Erro de schema

---

## 📞 SUPORTE

Se encontrar problemas:

1. ✅ Verifique os logs: `railway logs`
2. ✅ Verifique variáveis: `railway variables`
3. ✅ Consulte: `TESTE_SISTEMA_QUESTOES.md`
4. ✅ Rode migrations: `railway run npm run db:migrate`

---

**Última atualização**: Dezembro 2024  
**Status**: ✅ Pronto para deploy!  
**Tempo total**: ~30 minutos
