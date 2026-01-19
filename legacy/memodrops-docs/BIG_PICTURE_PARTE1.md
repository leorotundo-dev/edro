# 🌍 BIG PICTURE - MEMODROPS (Parte 1)

## 🎯 VISÃO GERAL DO SISTEMA

O MemoDrops é uma plataforma de estudos para concursos públicos com **10 sistemas integrados** que trabalham juntos para criar uma experiência de aprendizado personalizada e baseada em IA.

---

## 📊 ARQUITETURA EM CAMADAS

```
┌─────────────────────────────────────────────────────┐
│           CAMADA 1: FRONTEND (Next.js)              │
│  - Web Aluno (React)                                │
│  - Web Admin (React)                                │
│  - Mobile (React Native - futuro)                   │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│       CAMADA 2: API REST (Fastify/TypeScript)       │
│  - ~95 endpoints                                    │
│  - Autenticação JWT                                 │
│  - Rate limiting                                    │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│     CAMADA 3: BUSINESS LOGIC (Services)             │
│  - ReccoEngine V3                                   │
│  - Progress & Mastery                               │
│  - Simulados Adaptativos                            │
│  - Sistema de Questões                              │
│  - Mnemônicos                                       │
│  - Daily Plan                                       │
│  - SRS System                                       │
│  - Pipeline de Conteúdo                             │
│  - Tracking                                         │
│  - Reinforcement                                    │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│      CAMADA 4: DATA LAYER (PostgreSQL)              │
│  - 50+ tabelas                                      │
│  - 9 migrations                                     │
│  - Indexes otimizados                               │
└─────────────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────────────┐
│         CAMADA 5: AI & EXTERNAL SERVICES            │
│  - OpenAI GPT-4 (geração)                          │
│  - OpenAI Embeddings (RAG)                         │
│  - Web Scraping (coleta)                           │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO PRINCIPAL DO ALUNO

```
1. CADASTRO & SETUP
   │
   ├─→ Cria conta
   ├─→ Escolhe concurso/banca
   ├─→ Define tempo disponível
   └─→ Sistema cria perfil inicial
   
2. GERAÇÃO DO PLANO DIÁRIO
   │
   ├─→ ReccoEngine analisa 100+ variáveis
   ├─→ Aplica Gold Rule (priorização)
   ├─→ Gera Trilha do Dia (sequência pedagógica)
   └─→ Daily Plan com 8-10 atividades
   
3. EXECUÇÃO DO PLANO
   │
   ├─→ Estudar Drops (teoria)
   ├─→ Revisar SRS cards
   ├─→ Resolver Questões
   ├─→ Usar Mnemônicos
   └─→ Fazer Simulados
   
4. TRACKING & FEEDBACK
   │
   ├─→ Sistema registra tudo (tempo, acertos, NEC, NCA)
   ├─→ Atualiza Progress & Mastery
   ├─→ Detecta fraquezas
   └─→ Ajusta próximo plano
   
5. REFORÇO (se necessário)
   │
   ├─→ Reinforcement Engine detecta erros
   ├─→ Gera plano de reforço
   ├─→ Ajusta intervalos SRS
   └─→ Insere conteúdo extra
```

---

## 🧠 OS 10 SISTEMAS INTEGRADOS

### **1. ReccoEngine V3** 🎯
**O cérebro do sistema**
- Analisa 100+ variáveis do aluno
- Decide O QUE, QUANDO, COMO estudar
- Gera Trilha do Dia personalizada
- 5 engines integrados:
  - Inference (diagnóstico)
  - State Calculator (estados)
  - Prioritization (prioridades)
  - Sequencing (ordem pedagógica)
  - Reinforcement (reforço)

**Fluxo:**
```
Input → Análise → Priorização → Seleção → Sequenciamento → Trilha
```

---

### **2. Daily Plan System** 📅
**Plano de estudos diário**
- Recebe Trilha do ReccoEngine
- Converte em itens executáveis
- Adiciona intervalos de descanso
- Gerencia status (pending/in_progress/completed)
- Calcula progresso em tempo real

**Endpoints:**
- POST /api/plan/generate
- GET /api/plan/today
- POST /api/plan/item/complete

**Integração:**
```
ReccoEngine → Daily Plan → Execução → Progress
```

---

### **3. Progress & Mastery System** 📊
**Tracking de evolução**
- Progress Diário/Semanal/Mensal
- Mastery Score por subtópico (0-100%)
- 4 níveis: iniciante → intermediário → avançado → expert
- Timeline de evolução
- Top 10 melhores/fracos

**Componentes do Mastery:**
- 40% Taxa de acerto
- 30% Retenção SRS
- 20% Velocidade de resposta
- 10% Consistência

**Endpoints:**
- GET /api/progress/daily
- GET /api/mastery
- POST /api/progress/update

---

### **4. Sistema de Mnemônicos** 🧩
**Facilitação de memorização**
- 8 técnicas: acrônimo, história, imagem, etc
- 7 estilos cognitivos: visual, narrativo, lógico, etc
- Geração automática com IA
- Biblioteca pessoal
- Tracking de efetividade
- Recomendações personalizadas

**Fluxo:**
```
Conteúdo difícil → Gera mnemônico → Usa no SRS → Tracking → Ajusta
```

**Endpoints:**
- POST /api/mnemonics/generate
- GET /api/mnemonics/recommend/:topic

---

### **5. SRS System** 🔄
**Repetição espaçada**
- Algoritmo SM-2 modificado
- 7 variáveis personalizadas
- Ajuste automático de intervalos
- Integração com mnemônicos
- Tracking de retenção

**Fluxo:**
```
Novo card → Revisão 1 (1 dia) → Revisão 2 (3 dias) → ...
Se erro → Reduz intervalo
Se acerto → Aumenta intervalo
```

---

Continua na Parte 2...
