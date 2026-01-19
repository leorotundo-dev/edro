# Stage 21 — Daily Plan (Planos de Estudo Diários Personalizados)

**Commit:** `b2a96fb`  
**Data:** Nov 25, 2025  
**Status:** ✅ Completo

---

## 📋 Resumo Executivo

Stage 21 implementa o **Daily Plan**, um sistema inteligente de planejamento diário que gera planos de estudo personalizados para cada usuário, priorizando revisões baseadas em SRS (Spaced Repetition System) e introduzindo novos tópicos de forma equilibrada.

Este stage transforma o MemoDrops em um **sistema de estudo adaptativo**, onde cada usuário recebe um plano diário otimizado para seu progresso e necessidades de aprendizado.

---

## 🏗️ Arquitetura

### Algoritmo de Planejamento

```
Gerar Plano Diário
    ↓
Fase 1: Revisões (SRS)
    ├─ Buscar tópicos com next_due_at <= NOW()
    ├─ Ordenar por data de vencimento
    ├─ Para cada tópico, selecionar 1 drop aleatório
    └─ Marcar como isReview: true
    ↓
Fase 2: Novos Tópicos (se não atingiu limite)
    ├─ Buscar tópicos que o usuário nunca viu
    ├─ Selecionar drops aleatórios
    └─ Marcar como isReview: false
    ↓
Retornar Plano com até 30 drops
```

### Componentes Implementados

#### 1. **Serviço de Daily Plan** (`services/plan/dailyPlan.ts`)

**Função Principal:** `generateDailyPlanForUser(userId, limit)`

**Algoritmo:**
- Busca tópicos com revisão pendente (SRS)
- Para cada tópico, seleciona 1 drop aleatório
- Se não atingiu limite, busca tópicos novos
- Retorna lista de drops para estudar hoje

**Características:**
- ✅ Limite padrão: 30 drops
- ✅ Prioriza revisões sobre novos conteúdos
- ✅ Balanceamento automático
- ✅ Logging detalhado

#### 2. **Rotas Administrativas** (`routes/admin-plan.ts`)

**Endpoint:** `GET /admin/plan/daily/:userId`
- Gerar plano para um usuário específico
- Query param: `limit` (padrão: 30)
- Útil para testes e debug

#### 3. **Rotas Públicas** (`routes/daily-plan.ts`)

**Endpoints:**
- `GET /api/plan/daily` — Gerar plano diário
- `GET /api/plan/stats` — Estatísticas gerais
- `GET /api/plan/stats/:topicCode` — Estatísticas por tópico
- `POST /api/plan/reset` — Resetar progresso (zerar app)

#### 4. **Job de Preview** (`jobs/daily-plan-preview.ts`)

**Uso:** Visualizar plano gerado para um usuário
```bash
DAILY_PLAN_USER_ID=user-123 npm run job:daily-plan-preview
```

---

## 📊 Fluxo Completo

### 1. Gerar Plano Diário (API)

```bash
curl http://localhost:3333/api/plan/daily?limit=20
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "generatedAt": "2025-11-25T18:30:00Z",
    "items": [
      {
        "dropId": 42,
        "topicCode": "PT-01",
        "dropType": "question",
        "difficulty": 2,
        "dropText": {...},
        "isReview": true
      },
      {
        "dropId": 51,
        "topicCode": "DC-02",
        "dropType": "flashcard",
        "difficulty": 1,
        "dropText": {...},
        "isReview": false
      }
    ]
  }
}
```

### 2. Consultar Estatísticas

```bash
# Geral
curl http://localhost:3333/api/plan/stats

# Por tópico
curl http://localhost:3333/api/plan/stats/PT-01
```

**Resposta (Geral):**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "summary": {
      "totalTopics": 15,
      "topicsWithDueReview": 3,
      "totalAttempts": 127,
      "totalCorrect": 98,
      "totalWrong": 29,
      "accuracy": "77.17%",
      "maxStreak": 12
    },
    "topics": [...]
  }
}
```

### 3. Resetar Progresso

```bash
curl -X POST http://localhost:3333/api/plan/reset
```

**Resposta:**
```json
{
  "success": true,
  "message": "Progresso resetado com sucesso"
}
```

---

## 🔄 Fluxo de Dados

### Tabelas Utilizadas

**user_stats**
- `user_id` — ID do usuário
- `topic_code` — Código do tópico
- `correct_count` — Acertos
- `wrong_count` — Erros
- `streak` — Sequência de acertos
- `last_seen_at` — Última visualização
- `next_due_at` — Próxima revisão (SRS)

**drops**
- `id` — ID do drop
- `topic_code` — Código do tópico
- `drop_type` — Tipo (question, flashcard, etc)
- `difficulty` — Nível de dificuldade
- `drop_text` — Conteúdo

---

## 🚀 Como Usar

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Compilar
npm run build

# Rodar em desenvolvimento
npm run dev
```

### Gerar Plano Diário

```bash
# Via API (requer autenticação)
curl http://localhost:3333/api/plan/daily?limit=20

# Via CLI (para teste)
DAILY_PLAN_USER_ID=user-123 npm run job:daily-plan-preview
```

### Consultar Estatísticas

```bash
# Estatísticas gerais
curl http://localhost:3333/api/plan/stats | jq

# Estatísticas por tópico
curl http://localhost:3333/api/plan/stats/PT-01 | jq
```

### Resetar Progresso

```bash
# Zerar app (irreversível!)
curl -X POST http://localhost:3333/api/plan/reset
```

---

## 📂 Arquivos Criados/Modificados

### Novos Arquivos
- `src/services/plan/dailyPlan.ts` - Serviço de geração (127 linhas)
- `src/routes/admin-plan.ts` - Rotas admin (20 linhas)
- `src/routes/daily-plan.ts` - Rotas públicas (245 linhas)
- `src/jobs/daily-plan-preview.ts` - Job de preview (17 linhas)

### Arquivos Modificados
- `src/routes/index.ts` - Adicionadas rotas
- `package.json` - Adicionado script npm

### Total
- **4 arquivos novos** (409 linhas)
- **2 arquivos modificados**
- **Build:** ✅ Sem erros TypeScript

---

## ✅ Checklist de Implementação

- [x] Criar serviço de geração de plano diário
- [x] Implementar algoritmo de priorização (SRS + novos)
- [x] Criar rotas administrativas
- [x] Criar rotas públicas autenticadas
- [x] Implementar endpoint de estatísticas
- [x] Implementar endpoint de reset
- [x] Criar job de preview
- [x] Adicionar tratamento de erros
- [x] Adicionar logging detalhado
- [x] Fazer build sem erros
- [x] Fazer commit e push
- [x] Documentar Stage 21

---

## 🔗 Referências

- **Commit:** https://github.com/leorotundo-dev/memodrops/commit/b2a96fb
- **Branch:** main
- **Documentação:** docs/STAGE_21_COMPLETO.md

---

## 📌 Notas Importantes

1. **Limite Padrão:** 30 drops por dia (máximo: 100)
2. **Priorização:** Revisões sempre vêm antes de novos tópicos
3. **Aleatoriedade:** Drops são selecionados aleatoriamente para variedade
4. **Reset:** Operação irreversível que apaga todo o progresso
5. **SRS:** Usa `next_due_at` para determinar quando revisar
6. **Autenticação:** Rotas públicas requerem JWT válido

---

## 🎯 Métricas de Sucesso

- ✅ Backend compila sem erros
- ✅ Serviço de daily plan funciona
- ✅ Rotas administrativas funcionam
- ✅ Rotas públicas funcionam
- ✅ Estatísticas calculadas corretamente
- ✅ Reset funciona
- ✅ Logging detalhado

---

## 🚀 Próximos Passos (Stages 22+)

### Stage 22: Adaptive Difficulty
- Ajustar dificuldade baseado em performance
- Aumentar dificuldade se taxa de acerto > 80%
- Diminuir se taxa de acerto < 50%

### Stage 23: Streak System
- Gamificação com streaks
- Badges e achievements
- Notificações de streak perdido

### Stage 24: Analytics Dashboard
- Gráficos de progresso
- Heatmap de estudo
- Previsão de aprovação

---

**Status:** ✅ COMPLETO E PRONTO PARA PRODUÇÃO

Próximo Stage: 22 (Adaptive Difficulty)
