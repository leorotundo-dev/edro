# Jarvis Master Plan

## Visão

O Jarvis deve deixar de ser apenas um chat de apoio e virar o sistema operacional da Edro.

Ele precisa ser:

- onipresente: acessível de qualquer tela e contexto
- onisciente: com memória viva de cliente, operação, criação e performance
- operacional: capaz de executar ações reais no sistema
- coordenador: capaz de orquestrar pessoas, IAs e fluxos

No estado ideal, qualquer membro da equipe deve conseguir pedir uma intenção em linguagem natural e receber execução real:

- "cria um post para a Ciclus"
- "o que a cliente falou na reunião?"
- "quais DAs estão atrasados hoje?"
- "gera briefing, copy e manda para arte"
- "redistribui os jobs em risco"

---

## Estado atual — mapa técnico completo

### Backend — rotas existentes

```
routes/jarvis.ts
  GET  /jarvis/alerts               → lista alertas abertos (Sentinel)
  POST /jarvis/alerts/:id/dismiss   → dispensar alerta
  POST /jarvis/alerts/:id/snooze    → soneca 24h
  GET  /jarvis/feed                 → feed proativo (cards + alertas)
  POST /jarvis/alerts/run           → dispara engine de alertas manualmente

routes/planning.ts
  POST /clients/:clientId/planning/chat          → Brain #1 (foco: estratégia, cliente)
  GET  /clients/:clientId/planning/conversations → histórico de conversas
  POST /clients/:clientId/planning/health        → diagnóstico de saúde do cliente
  POST /clients/:clientId/planning/context       → contexto enriquecido do cliente
  POST /clients/:clientId/planning/opportunities/detect → detectar oportunidades
  POST /clients/:clientId/jarvis/upload          → upload de doc para memória Jarvis

routes/operations.ts
  POST /operations/chat   → Brain #2 (foco: ops, Trello, equipe)

routes/trello.ts (Action Layer parcial — já executa ações)
  GET  /trello/ops-feed                        → jobs ativos
  POST /trello/ops-cards/:cardId/status        → mover status de card
  POST /trello/ops-cards/:cardId/assign        → atribuir responsável
  GET  /trello/ops-suggest-owner/:cardId       → melhor DA para o job
  GET  /trello/ops-team-scores                 → score por membro
  GET  /trello/ops-sla                         → SLA da equipe
  GET  /trello/ops-planner                     → planner semanal
  GET  /trello/ops-calendar                    → calendário de entregas
```

### Frontend — componentes existentes

```
components/jarvis/
  JarvisDrawer.tsx          → drawer lateral direito (onipresente)
  JarvisCommandPalette.tsx  → Ctrl+J command palette
  JarvisChatPanel.tsx       → painel de chat reutilizável
  JarvisFab.tsx             → botão flutuante
  JarvisHomeSection.tsx     → seção na home

contexts/
  JarvisContext.tsx         → contexto global (estado do drawer, client_id ativo)

app/jarvis/
  JarvisFullClient.tsx      → página full-screen do Jarvis

app/edro/jarvis/
  JarvisProposalsClient.tsx → propostas geradas pelo Jarvis

components/operations/
  JarvisAlertsSectionClient.tsx  → alertas na Central de Operações
  OperationsJarvisDrawer.tsx     → drawer específico de ops
```

### Banco de dados — tabelas existentes

```sql
jarvis_alerts          → alertas cross-source (Sentinel)
  id, tenant_id, client_id, alert_type, title, body,
  source_refs JSONB, priority, status, snoozed_until

ai_opportunities       → oportunidades detectadas
  id, tenant_id, client_id, title, description,
  opportunity_hash, score, trending_up

edro_copy_versions     → memória de copy com deduplicação
  output_hash TEXT, embedding vector(1536), payload JSONB

-- Tabelas de memória parcial (usadas pelo planning)
meeting_transcripts    → transcrições de reuniões
whatsapp_messages      → mensagens WhatsApp capturadas
edro_briefings         → briefings com source_opportunity_id
```

### Serviços existentes

```
services/jarvisAlertEngine.ts     → detecta card_stalled, meeting_no_card,
                                     whatsapp_no_reply, contract_expiring
jobs/jarvisAlertWorker.ts         → worker periódico do Sentinel
services/groupJarvisReplyService.ts → resposta via WhatsApp group
```

### Limitações críticas atuais

1. **Dois chats separados** — `planning/chat` e `operations/chat` não se falam. O usuário precisa saber qual usar.
2. **Memória não unificada** — reuniões, WhatsApp, aprovações e performance vivem em tabelas separadas sem uma camada de consulta unificada.
3. **Action Layer incompleto** — o chat não consegue criar briefing, job ou campanha. Ele só responde texto.
4. **Contexto de tela não propagado** — o Jarvis não sabe em qual cliente/job/board o usuário está quando abre o drawer.
5. **Studio e DA engine desconectados** — o Jarvis não consegue acionar agentWriter, agentDiretorArte ou criar sessão criativa.

---

## Os 5 módulos do Jarvis

### 1. Jarvis Brain
Estratégia, planejamento, briefing, campanha, copy e raciocínio executivo.

Entradas: cliente, briefing, reuniões, WhatsApp, clipping, calendário, performance, biblioteca
Saídas: diagnóstico, plano estratégico, briefing, campanha, copy, próximo passo recomendado

### 2. Jarvis Memory
Memória viva da agência e do cliente. Consolida: reuniões, WhatsApp, clipping, library, calendário, brand memory, aprovações, rejeições, performance, jobs e operação.

### 3. Jarvis Creative Ops
Coordenador de produção criativa. Controla: fila de jobs, capacidade por DA, especialidade, prazo, risco, retrabalho, taxa de aprovação, redistribuição.

### 4. Jarvis Action Layer
Barramento único de execução. Aciona: tools estratégicas, operacionais, Studio, DA engine, publish/schedule, jobs, calendário, aprovações.

### 5. Jarvis Sentinel
Radar proativo. Avisa: job sem briefing, card parado, cliente sem resposta, reunião sem desdobramento, DA em risco, excesso de retrabalho.

---

## Roadmap de implementação

---

### FASE 1 — Unificação do barramento Jarvis

**Objetivo:** Uma única rota de chat que substitui `planning/chat` e `operations/chat`, com contexto de tela e roteamento inteligente para tools.

#### 1.1 — Novo endpoint unificado

**Arquivo:** `apps/backend/src/routes/jarvis.ts`

Adicionar:

```ts
POST /jarvis/chat
Body: {
  message: string
  client_id?: string       // contexto herdado da tela
  job_id?: string
  board_id?: string
  conversation_id?: string // para continuar thread
  context_hints?: string[] // ex: ['operacional', 'criativo']
}
Response: {
  reply: string
  tool_calls?: JarvisToolCall[]   // ações executadas
  memory_refs?: MemoryRef[]       // fontes usadas
  conversation_id: string
  suggested_actions?: SuggestedAction[]
}
```

**Lógica de roteamento interno:**
- mensagem contém "job", "DA", "equipe", "board", "prazo", "atraso" → aciona ops tools
- mensagem contém "post", "briefing", "copy", "campanha", "pauta" → aciona brain tools
- qualquer mensagem com `client_id` → carrega contexto do cliente automaticamente

#### 1.2 — Tabela de conversas unificada

**Arquivo novo:** `apps/backend/src/db/migrations/0310_jarvis_conversations.sql`

```sql
CREATE TABLE IF NOT EXISTS jarvis_conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    TEXT NOT NULL,
  user_id      UUID REFERENCES edro_users(id),
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  context      JSONB DEFAULT '{}',  -- { job_id, board_id, page }
  title        TEXT,                -- gerado automaticamente do primeiro turno
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jarvis_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES jarvis_conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
  content          TEXT NOT NULL,
  tool_calls       JSONB,   -- ações executadas nessa mensagem
  memory_refs      JSONB,   -- fontes citadas
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON jarvis_conversations(tenant_id, updated_at DESC);
CREATE INDEX ON jarvis_messages(conversation_id, created_at ASC);
```

#### 1.3 — Unificação da memória

**Arquivo novo:** `apps/backend/src/services/jarvisMemoryService.ts`

```ts
// Interface de consulta unificada — o Jarvis usa isso antes de responder
export async function buildClientMemoryContext(
  tenantId: string,
  clientId: string,
  query: string
): Promise<MemoryContext>

// Retorna objeto com:
// - recentMeetings: últimas 3 reuniões com sumário
// - recentWhatsapp: últimas mensagens relevantes
// - approvedCopy: copy aprovado recente (por formato)
// - rejections: feedbacks negativos recentes
// - performance: métricas de copy/performance
// - brandRules: regras de aprendizado do cliente
// - activeJobs: jobs abertos no Trello
```

**Fontes que deve consultar:**
- `meeting_transcripts WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5`
- `whatsapp_messages WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20`
- `edro_copy_versions JOIN edro_briefings WHERE client_id = $1 AND status = 'approved' LIMIT 10`
- `learning_rules WHERE client_id = $1`
- `project_cards JOIN project_boards WHERE client_id = $1 AND is_done = false`

#### 1.4 — Migração do frontend

**Arquivo:** `apps/web/components/jarvis/JarvisChatPanel.tsx`

- Trocar endpoint de `planning/chat` ou `operations/chat` para `/jarvis/chat`
- Passar `client_id`, `board_id`, `job_id` do `JarvisContext`

**Arquivo:** `apps/web/contexts/JarvisContext.tsx`

- Adicionar `pageContext: { client_id?, job_id?, board_id?, page: string }`
- Propagado automaticamente a partir da URL e do estado da página

**Arquivo:** `apps/web/components/jarvis/JarvisDrawer.tsx`

- Remover a lógica de escolher entre "planning" e "operations" — agora é sempre `/jarvis/chat`
- Passar `pageContext` em cada mensagem

---

### FASE 2 — Creative Ops (Jarvis como PM de DAs)

**Objetivo:** O Jarvis consegue responder e agir sobre capacidade de DAs, risco de prazo e redistribuição.

#### 2.1 — Endpoint de capacidade em tempo real

**Arquivo:** `apps/backend/src/routes/jarvis.ts`

```ts
GET /jarvis/ops/capacity
Response: {
  members: Array<{
    name: string
    active_jobs: number
    capacity_pct: number      // % da capacidade semanal usada
    risk_jobs: Array<{ title, due_date, client }> // vence em < 48h
    specialty: string
    score: number
  }>
  overloaded: string[]        // nomes com > 90% capacidade
  available: string[]         // nomes com < 50% capacidade
  at_risk_count: number       // jobs que vencem em < 48h sem dono confirmado
}
```

**Fonte de dados:** combina `/trello/ops-team-scores` + `/trello/ops-feed` + `freelancer_profiles`

#### 2.2 — Tool de redistribuição

**Arquivo:** `apps/backend/src/services/jarvisCreativeOpsService.ts`

```ts
export async function suggestRedistribution(
  tenantId: string
): Promise<RedistributionPlan>
// Retorna: jobs em risco + DA recomendado para cada um (por capacidade + especialidade)

export async function executeRedistribution(
  tenantId: string,
  assignments: Array<{ card_id: string; member_trello_id: string }>
): Promise<void>
// Executa via POST /trello/ops-cards/:cardId/assign
```

#### 2.3 — Integrar tools ao chat

No handler de `/jarvis/chat`, adicionar tools chamáveis via function calling:

```ts
const JARVIS_TOOLS = [
  {
    name: 'get_team_capacity',
    description: 'Retorna capacidade atual da equipe de DAs, jobs ativos e riscos',
    parameters: {}
  },
  {
    name: 'suggest_redistribution',
    description: 'Sugere redistribuição de jobs sobrecarregados',
    parameters: {}
  },
  {
    name: 'assign_job',
    description: 'Atribui um job a um DA específico',
    parameters: {
      card_id: 'string',
      member_name: 'string'
    }
  },
  {
    name: 'get_jobs_at_risk',
    description: 'Lista jobs com prazo em risco (vencimento < 48h)',
    parameters: { hours_ahead: 'number' }
  }
]
```

---

### FASE 3 — Execução criativa ponta a ponta

**Objetivo:** Uma mensagem como "cria um post para a Ciclus" resulta em briefing + copy + aprovação criados automaticamente.

#### 3.1 — Tools de criação no Action Layer

Adicionar ao `JARVIS_TOOLS`:

```ts
{
  name: 'create_briefing',
  description: 'Cria um briefing para o cliente com base no contexto',
  parameters: {
    client_id: 'string',
    objective: 'string',
    format: 'string',         // post, stories, carrossel, reels...
    platform: 'string',
    notes: 'string'
  }
}
// Implementação: POST /briefings (já existe em routes/edroBriefings.ts ou similar)

{
  name: 'generate_copy',
  description: 'Gera copy para um briefing existente',
  parameters: {
    briefing_id: 'string',
    tone_override?: 'string'
  }
}
// Implementação: aciona agentWriter via POST /campaigns/:id/behavioral-copy

{
  name: 'create_job',
  description: 'Cria um job no Trello para produção',
  parameters: {
    client_id: 'string',
    title: 'string',
    job_type: 'string',
    due_date?: 'string',
    assign_to?: 'string'
  }
}
// Implementação: POST /trello/project-boards/:boardId/cards (criar ou usar endpoint de jobs)

{
  name: 'create_approval_link',
  description: 'Gera link de aprovação para uma peça',
  parameters: {
    briefing_id: 'string',
    copy_version_id: 'string'
  }
}
```

#### 3.2 — Fluxo ponta a ponta no handler

```ts
// POST /jarvis/chat — exemplo de orquestração
// User: "cria um post para a Ciclus sobre coleta seletiva"

// Passo 1: Jarvis identifica client_id da Ciclus via memória
// Passo 2: buildClientMemoryContext(tenantId, clientId, query)
// Passo 3: Claude gera function call: create_briefing(...)
// Passo 4: Sistema executa a tool e retorna briefing_id
// Passo 5: Claude gera function call: generate_copy(briefing_id)
// Passo 6: Retorna copy + link para edição
// Passo 7: Jarvis pergunta: "Quer abrir para aprovação?"
```

---

### FASE 4 — Proatividade plena (Sentinel avançado)

**Objetivo:** Jarvis detecta e age proativamente, sem o usuário pedir.

#### 4.1 — Novos tipos de alerta no jarvisAlertEngine.ts

Adicionar aos existentes (`card_stalled`, `meeting_no_card`, `whatsapp_no_reply`):

```ts
'da_overload'         // DA com > 90% capacidade
'sla_risk'            // job vence em < 24h sem confirmação
'approval_stuck'      // peça aguardando aprovação > 48h
'no_content_week'     // cliente sem conteúdo publicado na semana
'brief_without_job'   // briefing criado há > 24h sem job correspondente
```

#### 4.2 — Digest executivo diário

**Arquivo novo:** `apps/backend/src/services/jarvisDigestService.ts`

```ts
// Roda todo dia às 8h via cron
export async function generateDailyDigest(tenantId: string): Promise<DigestReport>
// Retorna:
// - jobs em risco hoje
// - DAs sobrecarregados
// - clientes sem resposta > 48h
// - copy pendente de aprovação
// - oportunidades detectadas ontem
```

**Novo endpoint:**
```ts
GET /jarvis/digest → DigestReport (cache de 1h)
```

#### 4.3 — Push de alertas proativos no frontend

**Arquivo:** `apps/web/contexts/JarvisContext.tsx`
- Polling a cada 5 min em `GET /jarvis/alerts?limit=5&status=open`
- Exibe badge no JarvisFab quando há alertas novos
- Ao abrir o drawer, mostra alertas no topo antes do chat

---

## Princípios de implementação para o Codex

### Ordem de execução obrigatória

```
Fase 1.2 (migration) → Fase 1.3 (memory service) → Fase 1.1 (endpoint) → Fase 1.4 (frontend)
Fase 2.1 → Fase 2.2 → Fase 2.3
Fase 3.1 → Fase 3.2
Fase 4.1 → Fase 4.2 → Fase 4.3
```

### Padrões do projeto — obrigatório seguir

- Backend: Fastify v5, TypeScript strict, `query<T>()` do `../db` para SQL direto
- Auth: `{ preHandler: [authGuard] }` em todas as rotas, `request.user.tenant_id`
- AI: usar `claudeService.generateCompletion({ prompt, temperature, maxTokens })` → retorna `{ text, usage, model }`
- Function calling: usar `claude-opus-4-6` com `tools` array no formato Anthropic
- Frontend: Next.js 16 App Router, MUI v7 sx props, named imports (`import Button from '@mui/material/Button'`)
- Sem mock de banco: todas as queries devem bater no PostgreSQL real

### Arquivos-chave para o Codex ler antes de implementar

```
apps/backend/src/routes/jarvis.ts          → estrutura atual do Sentinel
apps/backend/src/routes/planning.ts        → Brain #1 atual (ver POST /planning/chat)
apps/backend/src/routes/operations.ts      → Brain #2 atual (ver POST /operations/chat)
apps/backend/src/services/jarvisAlertEngine.ts → padrão do Sentinel
apps/web/contexts/JarvisContext.tsx        → estado global do Jarvis
apps/web/components/jarvis/JarvisDrawer.tsx → drawer atual
apps/web/components/jarvis/JarvisChatPanel.tsx → chat panel atual
```

### Não fazer

- Não apagar `planning/chat` e `operations/chat` ainda — manter retrocompatibilidade na Fase 1
- Não criar nova tabela de memória — usar `jarvisMemoryService.ts` para agregar as existentes
- Não usar `due_complete` para detectar jobs concluídos — usar `lower(list_name) ~* 'conclu|done|finaliz|publicad'`
- Não hardcodar `tenant_id` — sempre extrair de `request.user.tenant_id`

---

## Definição final

O Jarvis não deve ser apenas uma feature.

Ele deve ser:
- o cérebro da conta
- o coordenador da criação
- o gerente da operação
- a memória viva da agência
- o centro de comando da Edro

**Jarvis é o sistema operacional da Edro, capaz de transformar intenção em execução.**
