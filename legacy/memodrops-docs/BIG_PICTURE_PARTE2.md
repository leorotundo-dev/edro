# 🌍 BIG PICTURE - MEMODROPS (Parte 2)

## 🧠 OS 10 SISTEMAS INTEGRADOS (continuação)

### **6. Sistema de Questões** ❓
**Banco de questões inteligente**
- CRUD completo de questões
- Análise com IA (dificuldade, tópicos, etc)
- Geração em lote
- Filtros avançados
- Tracking de respostas
- Estatísticas por tópico/banca

**Campos:**
- statement, options, correct_answer
- explanation, difficulty (1-5)
- subtopicos[], bancas[]
- exam_year, source_url

**Endpoints:**
- POST /api/questions (criar)
- GET /api/questions (listar)
- POST /api/questions/:id/answer (responder)

---

### **7. Simulados Adaptativos** 🎯
**Simulados que se adaptam ao aluno**
- Motor adaptativo em tempo real
- 3 acertos → aumenta dificuldade
- 3 erros → diminui dificuldade
- 10 mapas de análise automática
- Predição de nota
- Comparação com outros alunos

**10 Mapas:**
1. Resumo Geral
2. Performance por Dificuldade
3. Performance por Tópico
4. Mapa de Calor
5. Evolução
6. Pontos Fortes
7. Pontos Fracos
8. Comparação
9. Predição de Nota
10. Recomendações

**Fluxo:**
```
Cria simulado → Inicia → Responde Q1 → Ajusta dificuldade → Q2 → ... → Finaliza → Análise
```

---

### **8. Pipeline de Conteúdo** 🏭
**Automação de coleta e processamento**

#### **8.1 Harvest (Coleta)**
- Coleta de fontes externas
- Parsing de HTML
- Extração de metadados
- Batch processing

#### **8.2 Blueprint (Editais)**
- Extração de estrutura com IA
- Análise de disciplinas/tópicos
- Comparação entre editais
- Peso por tópico

#### **8.3 Gold Rule (Priorização)**
- 35% Frequência em provas
- 25% Peso no edital
- 25% Taxa de erro do aluno
- 10% Última cobrança
- 5% Tendência da banca
- Score 0-100

#### **8.4 RAG (Busca Semântica)**
- Embeddings (1536 dims)
- Busca por similaridade
- Sumarização com IA
- Cache de conteúdo

**Fluxo Completo:**
```
Harvest → Parse → Blueprint → Gold Rule → RAG → Drops
```

---

### **9. Tracking System** 📈
**Monitoramento em tempo real**
- 12 endpoints de tracking
- NEC (Estado Cognitivo)
- NCA (Estado Emocional)
- Tempo por atividade
- Padrões de estudo
- Análise de performance

**Dados coletados:**
- Tipo de atividade
- Duração
- Acertos/erros
- Estados cognitivo/emocional
- Contexto (hora, dia, local)

---

### **10. Reinforcement Engine** 💪
**Sistema de reforço inteligente**
- Detecta fraquezas (erros consecutivos)
- Gera planos de reforço
- Ajusta intervalos SRS
- Insere conteúdo extra

**Níveis de Fraqueza:**
- Crítico: 5+ erros ou 70%+ erro
- Alto: 3+ erros ou 50%+ erro
- Médio: 30%+ erro
- Baixo: < 30% erro

**Plano de Reforço:**
1. Revisar Drop (teoria)
2. Criar mnemônico
3. 3 questões fáceis
4. Revisão SRS extra
5. 3 questões médias

---

## 🔗 INTEGRAÇÕES ENTRE SISTEMAS

```
┌────────────────────────────────────────────────────┐
│                  RECCO ENGINE V3                    │
│              (Orquestrador Central)                 │
└────────────────────────────────────────────────────┘
         ↓          ↓          ↓          ↓
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ Daily  │ │Progress│ │  SRS   │ │Tracking│
    │  Plan  │ │Mastery │ │ System │ │ System │
    └────────┘ └────────┘ └────────┘ └────────┘
         ↓          ↓          ↓          ↓
    ┌────────────────────────────────────────┐
    │         EXECUTION LAYER                │
    │  Drops | Questões | Simulados | SRS    │
    └────────────────────────────────────────┘
         ↓          ↓          ↓          ↓
    ┌────────────────────────────────────────┐
    │        REINFORCEMENT ENGINE            │
    │   (Detecta fraquezas e ajusta)         │
    └────────────────────────────────────────┘
```

---

## 🎭 EXEMPLO PRÁTICO - DIA DO ALUNO

### **Manhã (8:00)**
1. Aluno abre app
2. Sistema mostra Daily Plan
3. ReccoEngine já analisou:
   - Performance de ontem
   - Revisões SRS vencidas
   - Tópicos fracos
   - Estado cognitivo esperado (manhã = alto)

### **Plano Gerado:**
```
📅 Plano de Hoje (60 min)

1. 🔄 Revisar 5 SRS cards (10 min)
   - Regência Verbal
   - Concordância Nominal
   
2. 📖 Estudar Drop: "Crase" (10 min)
   Motivo: Erro recorrente, cai muito no CESPE

3. ❓ Resolver 3 questões de Crase (15 min)
   Dificuldade: Fácil → Médio

4. ☕ Intervalo (5 min)

5. 🧩 Criar mnemônico para Crase (5 min)

6. ❓ Resolver 3 questões de Concordância (15 min)
   Dificuldade: Médio → Difícil

TOTAL: 60 minutos | 6 atividades
```

### **Durante o Estudo:**
- Tracking registra tudo
- Aluno erra 2 questões de Crase seguidas
- Reinforcement detecta fraqueza
- Sistema ajusta próximo plano

### **Fim do Dia:**
- Progress atualizado
- Mastery recalculado
- ReccoEngine prepara plano de amanhã
- Se erro crítico → Plano de reforço

---

## 💾 ESTRUTURA DO BANCO DE DADOS

### **Principais Tabelas:**

#### **Core:**
- users, disciplines, plans, blueprints

#### **Conteúdo:**
- drops, rag_blocks, harvested_content, mnemonicos

#### **Questões:**
- questions, exam_log, simulados, simulado_executions

#### **SRS:**
- srs_cards, srs_reviews, srs_user_intervals

#### **Progress:**
- progress_diario, progress_semanal, progress_mensal
- mastery_subtopicos, progress_evolucao

#### **ReccoEngine:**
- recco_inputs, recco_states, recco_prioridades
- recco_selecao, recco_sequencia, recco_reforco

#### **Tracking:**
- tracking_sessions, tracking_events, tracking_patterns

#### **Daily Plan:**
- daily_plans

---

Continua na Parte 3...
