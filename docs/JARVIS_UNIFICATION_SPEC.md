# Jarvis Unification Spec

## Objetivo

Transformar o Jarvis de um conjunto de assistentes adjacentes em um único sistema operacional da Edro.

Este documento é o complemento técnico ao [JARVIS_MASTER_PLAN.md](./JARVIS_MASTER_PLAN.md).
O master plan define a ambição de produto. Este documento define a arquitetura de runtime, os contratos, o plano de migração e os alertas de implementação para o Codex.

---

## LEIA ANTES DE IMPLEMENTAR — O que já existe e deve ser reutilizado

> O maior risco de implementação é o Codex recriar infraestrutura que já funciona.
> Leia esta seção inteira antes de escrever qualquer código novo.

### `toolExecutor.ts` — Action Layer já é unificado

**Arquivo:** `apps/backend/src/services/ai/toolExecutor.ts` (2709 linhas)

O `executeTool()` já faz fall-through automático de strategy tools para ops tools:

```ts
export async function executeTool(toolName, args, ctx: ToolContext) {
  const handler = TOOL_MAP[toolName];
  if (!handler) {
    const opsHandler = OPS_TOOL_MAP[toolName];
    if (opsHandler) return executeOperationsTool(toolName, args, ctx);
    return { success: false, error: `Tool '${toolName}' not found` };
  }
  // ...
}
```

**Conclusão:** Não criar `jarvisToolRegistry.ts`. Usar `executeTool` + `getAllToolDefinitions()` diretamente.

### `toolDefinitions.ts` — 60+ tools já implementadas

**Arquivo:** `apps/backend/src/services/ai/toolDefinitions.ts`

```ts
export function getAllToolDefinitions(): ToolDefinition[] {
  return [...TOOLS, ...OPERATIONS_TOOLS]; // combina os dois registros
}
```

`TOOLS` (strategy): briefings, copy, calendar, clipping, social, library, campaigns, WhatsApp, opportunities, approval, scheduling, pauta, learning rules, web research.

`OPERATIONS_TOOLS` (ops): jobs, team, risks, signals, status changes, assignment, allocation, briefing fill/approve, creative drafts.

**Conclusão:** `getAllToolDefinitions()` retorna tudo. Usar no novo handler sem modificação.

### `toolUseLoop.ts` — Loop de agente já existe

**Arquivo:** `apps/backend/src/services/ai/toolUseLoop.ts`

```ts
export async function runToolUseLoop(params: ToolUseLoopParams): Promise<ToolUseLoopResult>

type ToolUseLoopParams = {
  messages: LoopMessage[];
  systemPrompt: string;
  tools: ToolDefinition[];
  provider: CopyProvider;
  toolContext: ToolContext | Record<string, any>;
  maxIterations?: number;
  temperature?: number;
  maxTokens?: number;
  toolExecutorFn?: ToolExecutorFn;
}
```

Ambos `planning/chat` e `operations/chat` já usam `runToolUseLoop`. O novo `/jarvis/chat` deve usar o mesmo.

### `buildAgentSystemPrompt()` — O prompt de qualidade já existe

**Arquivo:** `apps/backend/src/routes/planning.ts` — função `buildAgentSystemPrompt()`

Este prompt contém: Fogg Model, 7 gatilhos mentais, PNL (Pacing/Leading/VAK), AMD × Gatilho Ideal, Carga Cognitiva por plataforma (Lc), Bio-sincronismo, Story Brand (Miller), Posicionamento (Ries & Trout + April Dunford).

**Ação necessária:** Extrair `buildAgentSystemPrompt()` de `planning.ts` para um arquivo separado antes de implementar o handler unificado. Não criar um prompt novo — regrediria a qualidade.

**Arquivo destino:** `apps/backend/src/services/jarvis/jarvisSystemPrompt.ts`

### `ToolContext` — Tipo existente satisfaz ambos os executores

```ts
// apps/backend/src/services/ai/toolExecutor.ts
export type ToolContext = {
  tenantId: string;
  clientId: string;        // TEXT id from clients table
  edroClientId: string | null; // UUID from edro_clients table
  userId?: string;
  userEmail?: string;
};

export type OperationsToolContext = {
  tenantId: string;
  userId?: string;
  userEmail?: string;
};
```

`ToolContext` já satisfaz `OperationsToolContext` (tem `tenantId`, `userId`, `userEmail`). O `executeTool` já aceita `ToolContext` para ambos os mapas. **Não criar `UnifiedToolContext`** — apenas garantir que o handler monta `ToolContext` corretamente.

Quando não há `client_id` na requisição (modo agência/global), usar:
```ts
const ctx: ToolContext = {
  tenantId,
  clientId: '',        // string vazia — as tools de ops não usam este campo
  edroClientId: null,
  userId: request.user?.id,
  userEmail: request.user?.email,
};
```

### `JarvisContext.tsx` — Page context já existe no frontend

**Arquivo:** `apps/web/contexts/JarvisContext.tsx`

```ts
pageContext: { type: 'client' | 'job' | 'global'; id: string | null; label: string | null }
```

Já rastreia o contexto da tela ativa. **Não criar `JarvisPageContext`** — usar este diretamente.

### Tabelas de conversa existentes

Existem duas tabelas de histórico já em produção:

```sql
planning_conversations    -- client_id UUID (FK para edro_clients), messages JSONB
operations_conversations  -- sem client_id, messages JSONB
```

A nova tabela `jarvis_conversations` deve ser criada como tabela nova (não substituir as existentes), com compatibilidade retroativa.

### Feature flags — sistema já existe

**Arquivo:** `apps/backend/src/flags/flags.ts`

```ts
export async function isEnabled(tenantId: string, key: string): Promise<boolean>
```

Usar `await isEnabled(tenantId, 'jarvis_unified_chat')` como feature flag para o drawer no frontend.

---

## Estado atual — mapa de superfícies

### Endpoints de chat hoje

| Superfície | Endpoint atual | Arquivo frontend |
|---|---|---|
| Drawer / full page (estratégia) | `POST /clients/:clientId/planning/chat` | `JarvisChatPanel.tsx:364` |
| Drawer de operações | `POST /operations/chat` | `OperationsJarvisDrawer.tsx:169` |
| Sentinel/alertas | `GET /jarvis/alerts`, `GET /jarvis/feed` | `JarvisAlertsSectionClient.tsx` |

### Arquivos de backend relevantes

```
routes/jarvis.ts              → Sentinel: alerts, feed, alerts/run
routes/planning.ts            → Brain estratégico (planning/chat)
routes/operations.ts          → Brain operacional (operations/chat)
services/ai/toolDefinitions.ts → Registro de todas as tools
services/ai/toolExecutor.ts   → Execução de tools (TOOL_MAP + OPS_TOOL_MAP)
services/ai/toolUseLoop.ts    → Loop de agente multi-iteração
services/ai/toolUseLoop.ts    → Loop multi-provider (Claude, OpenAI, Gemini)
flags/flags.ts                → Feature flags
```

### Arquivos de frontend relevantes

```
contexts/JarvisContext.tsx              → Estado global (clientId, pageContext)
components/jarvis/JarvisChatPanel.tsx   → Chat panel reutilizável
components/jarvis/JarvisDrawer.tsx      → Drawer global
components/jarvis/JarvisCommandPalette.tsx → Command palette (Ctrl+J)
app/jarvis/JarvisFullClient.tsx         → Página full-screen
components/operations/OperationsJarvisDrawer.tsx → Drawer de ops
```

---

## Problemas centrais

### 1. Split Brain

O produto apresenta um Jarvis, mas o runtime ainda está dividido:
- `planning/chat` conhece estratégia, memória de cliente, copy, oportunidades
- `operations/chat` conhece jobs, Trello, carga da equipe, risco de prazo
- alertas e feed são separados dos dois

O usuário ou a UI precisam implicitamente escolher o brain correto.

### 2. Memória parcial

Fontes de memória hoje: reuniões, WhatsApp, conversas de planning, contexto de inteligência, jobs e boards, histórico de copy, alertas, brand memory, DA memory.

Não existe um objeto de runtime único que diga: "para este cliente, nesta tela, para este pedido, aqui está o melhor contexto de memória."

### 3. Action Layer incompleto no chat

O Jarvis já cria briefings e campanhas via tools. O que falta não é qualidade de AI — é o wiring de ações:
- Studio/DA já existem como rotas
- sessões criativas já existem
- fluxos de publish/schedule já existem
- mas o Jarvis não os expõe como cadeia coerente de ações

### 4. Creative Ops não centralizado

O usuário espera que o Jarvis controle DAs, entenda risco de prazo, saiba quem está sobrecarregado, recomende realocação. Isso exige um modelo de Creative Ops dedicado, não apenas consultas a cards do Trello.

---

## Arquitetura alvo

### 1. Jarvis Chat Gateway — `POST /jarvis/chat`

Único ponto de entrada para todas as requisições conversacionais.

Responsabilidades:
- aceitar mensagens de drawer, full page, palette e superfícies de ops
- resolver identidade e contexto de tela
- construir contexto de memória unificado
- selecionar tools pelo modo detectado
- rodar o loop de agente via `runToolUseLoop`
- retornar reply, evidências, resultados de tools e próximas ações

### 2. Jarvis Memory Resolver

Serviço responsável por hidratar memória antes de cada resposta.

### 3. Jarvis Tool Registry

Já existe via `getAllToolDefinitions()`. Fase 1 não requer mudança aqui.

### 4. Jarvis Creative Ops Engine

Camada dedicada para orquestração de DAs e controle de prazos. Fase 2.

### 5. Jarvis Sentinel

Continua como camada proativa, alimentando a mesma superfície de comando unificada.

---

## Contratos unificados

### Request

```ts
type JarvisChatRequest = {
  message: string;
  conversation_id?: string | null;
  client_id?: string | null;       // TEXT id (clients table)
  edro_client_id?: string | null;  // UUID (edro_clients table) — para tools estratégicas
  job_id?: string | null;
  board_id?: string | null;
  page?: string | null;            // ex: 'operacoes', 'cliente', 'studio'
  context_hints?: string[];
  mode?: 'auto' | 'strategy' | 'operations' | 'creative' | 'creative_ops';
  attachments?: Array<{
    id: string;
    type: 'text' | 'audio' | 'document' | 'image';
    name?: string | null;
    extracted_text?: string | null;
  }>;
};
```

### Response

```ts
type JarvisChatResponse = {
  success: true;
  data: {
    conversation_id: string;
    reply: string;
    mode: 'strategy' | 'operations' | 'creative' | 'creative_ops';
    tool_calls: Array<{
      tool: string;
      status: 'ok' | 'error';
      summary: string;
      payload?: Record<string, unknown>;
    }>;
    evidence: Array<{
      source_type: 'meeting' | 'whatsapp' | 'briefing' | 'job' | 'board' | 'alert' | 'copy' | 'brand' | 'da_memory';
      source_id?: string | null;
      title: string;
      summary: string;
      timestamp?: string | null;
    }>;
    suggested_actions: Array<{
      id: string;
      label: string;
      kind: 'tool' | 'navigate' | 'confirm';
      payload?: Record<string, unknown>;
    }>;
  };
};
```

---

## Intent Router

Classificação interna por palavras-chave — sem chamada ao LLM. Rápido e previsível.

**Arquivo:** `apps/backend/src/services/jarvis/jarvisIntentRouter.ts`

```ts
export type JarvisRuntimeMode = 'strategy' | 'operations' | 'creative' | 'creative_ops' | 'auto';

export function resolveJarvisMode(input: JarvisChatRequest): JarvisRuntimeMode {
  const m = input.message.toLowerCase();
  if (input.mode && input.mode !== 'auto') return input.mode;

  // Creative ops — DAs, carga, prazo, realocação
  if (/\b(da|das|designer|redator|equipe|time)\b.*\b(atras|sobrecarreg|risco|prazo|realocar|redistribuir)\b/.test(m)) return 'creative_ops';
  if (/\b(quem|qual da|melhor da)\b/.test(m) && /\b(job|peça|carrossel|post)\b/.test(m)) return 'creative_ops';

  // Operations — jobs, kanban, status, board
  if (/\b(job|jobs|card|trello|status|prazo|atras|bloqueado|entreg)\b/.test(m) && !/(cria|escreve|gera)\b/.test(m)) return 'operations';
  if (/\b(mover|mova|atribui|atribuir|fechar|resolver|criar job)\b/.test(m)) return 'operations';

  // Creative — criar conteúdo
  if (/\b(cria|escreve|gera|faz|produz)\b.*\b(post|copy|texto|campanha|briefing|pauta|carrossel|reels|stories)\b/.test(m)) return 'creative';

  // Strategy — memória, análise, planejamento
  if (/\b(reuni[aã]o|whatsapp|cliente disse|falou|aprovou|rejeitou|hist[oó]rico|tom de voz|posicionamento)\b/.test(m)) return 'strategy';

  return 'auto'; // blend: strategy + ops tools habilitados
}
```

### Seleção de tools por modo

```ts
// auto e strategy → getAllToolDefinitions() (todas as tools)
// operations      → OPERATIONS_TOOLS apenas
// creative        → TOOLS apenas (inclui create_briefing, generate_copy, etc.)
// creative_ops    → OPERATIONS_TOOLS + subset de ops com DA/workload focus
```

---

## Unified Memory Resolver

**Arquivo:** `apps/backend/src/services/jarvis/jarvisMemoryService.ts`

> Criar pasta `apps/backend/src/services/jarvis/` — verificar que `tsconfig.json` do backend cobre `src/**/*` (já cobre por padrão com `rootDir: src`).

```ts
export type JarvisMemoryContext = {
  client?: { id: string; name: string; status?: string | null; segment?: string | null } | null;
  brand: { tone?: string | null; rules: string[]; visual_identity?: Record<string, unknown> | null };
  meetings: MemoryItem[];
  whatsapp: MemoryItem[];
  briefings: MemoryItem[];
  copy_history: MemoryItem[];
  jobs: MemoryItem[];
  alerts: MemoryItem[];
  performance: MemoryItem[];
  references: Array<{
    source_type: string;
    source_id?: string | null;
    title: string;
    summary: string;
    timestamp?: string | null;
  }>;
};

export type MemoryItem = {
  id?: string;
  title: string;
  summary: string;
  timestamp?: string | null;
  source_type: string;
};

export async function buildJarvisMemoryContext(
  tenantId: string,
  clientId: string | null,
  query: string,
): Promise<JarvisMemoryContext>
```

### Fontes e limites

| Fonte | Tabela | Limite | Condição |
|---|---|---|---|
| Reuniões | `meeting_transcripts` | 3 mais recentes | `client_id = $1` |
| WhatsApp | `whatsapp_messages` | 10 mais recentes | `client_id = $1` |
| Briefings | `edro_briefings` | 5 mais recentes | `client_id = $1` |
| Copy aprovado | `edro_copy_versions` | 5 mais recentes | `status = 'approved'` |
| Jobs ativos | `project_cards + project_boards` | 10 | `client_id, not done list` |
| Alertas | `jarvis_alerts` | 3 urgentes | `status = 'open'` |
| Regras de marca | `learning_rules` | todos | `client_id = $1` |

Regra: preferir evidências recentes e de alto sinal. Não despejar todo o histórico no prompt.

---

## Novo endpoint — implementação detalhada

**Arquivo:** `apps/backend/src/routes/jarvis.ts` — adicionar ao final do arquivo existente

```ts
// POST /jarvis/chat — barramento unificado Jarvis
app.post('/jarvis/chat', { preHandler: [authGuard] }, async (request: any, reply) => {
  const tenantId: string = request.user.tenant_id;
  const userId: string = request.user.id;
  const userEmail: string = request.user.email;
  const body = request.body as JarvisChatRequest;

  const clientId = body.client_id ?? null;          // TEXT id (clients table)
  const edroClientId = body.edro_client_id ?? null; // UUID (edro_clients)

  // 1. Detectar modo
  const mode = resolveJarvisMode(body);

  // 2. Carregar memória
  const memory = await buildJarvisMemoryContext(tenantId, clientId, body.message);

  // 3. Montar system prompt
  // buildAgentSystemPrompt está em services/jarvis/jarvisSystemPrompt.ts após extração
  const systemPrompt = buildUnifiedJarvisSystemPrompt(memory, mode, body.page ?? null);

  // 4. Recuperar ou criar conversa
  const conversationId = body.conversation_id ?? null;
  const previousMessages = conversationId
    ? await loadJarvisConversationMessages(conversationId, tenantId)
    : [];

  // 5. Montar messages
  const messages: LoopMessage[] = [
    ...previousMessages,
    { role: 'user', content: body.message },
  ];

  // 6. Selecionar tools
  const tools = selectToolsForMode(mode); // getAllToolDefinitions() para auto/strategy

  // 7. Montar ToolContext
  const toolCtx: ToolContext = {
    tenantId,
    clientId: clientId ?? '',
    edroClientId,
    userId,
    userEmail,
  };

  // 8. Rodar loop de agente
  const result = await runToolUseLoop({
    messages,
    systemPrompt,
    tools,
    provider: 'anthropic',           // Claude Opus 4.6 por padrão
    toolContext: toolCtx,
    maxIterations: 6,
    temperature: 0.7,
    maxTokens: 4096,
  });

  // 9. Persistir conversa
  const newConversationId = await upsertJarvisConversation({
    tenantId, userId, clientId,
    conversationId,
    userMessage: body.message,
    assistantReply: result.finalText,
    toolResults: result.toolResults,
    pageContext: { page: body.page, job_id: body.job_id, board_id: body.board_id },
  });

  // 10. Retornar
  return reply.send({
    success: true,
    data: {
      conversation_id: newConversationId,
      reply: result.finalText,
      mode,
      tool_calls: result.toolResults.map((t) => ({
        tool: t.toolName,
        status: t.success ? 'ok' : 'error',
        summary: t.success ? 'executado' : (t.data?.error ?? 'erro'),
        payload: t.data,
      })),
      evidence: memory.references,
      suggested_actions: [],
    },
  });
});
```

---

## Nova tabela de conversas

**Arquivo:** `apps/backend/src/db/migrations/0310_jarvis_conversations.sql`

> Não substituir `planning_conversations` nem `operations_conversations` — estas permanecem para retrocompatibilidade.

```sql
CREATE TABLE IF NOT EXISTS jarvis_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL,
  user_id      TEXT,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  page_context JSONB DEFAULT '{}'::jsonb,
  title        TEXT,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jarvis_messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES jarvis_conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content          TEXT NOT NULL,
  tool_results     JSONB DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON jarvis_conversations(tenant_id, updated_at DESC);
CREATE INDEX ON jarvis_conversations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX ON jarvis_messages(conversation_id, created_at ASC);
```

**Atenção:** `client_id` referencia `clients(id)` (TEXT), não `edro_clients(id)` (UUID). São tabelas diferentes. Verificar qual FK é correta para o contexto de uso antes de executar a migration.

---

## Correções críticas no schema de Creative Ops

**Arquivo:** `apps/backend/src/db/migrations/0311_jarvis_creative_ops.sql`

O spec original tinha dois erros de FK. Versão corrigida:

```sql
-- Perfil de capacidade por freelancer
CREATE TABLE IF NOT EXISTS creative_workload_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  -- CORREÇÃO: a tabela se chama freelancer_profiles, não team_members
  freelancer_id UUID NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  preferred_formats TEXT[] NOT NULL DEFAULT '{}',
  preferred_clients TEXT[] NOT NULL DEFAULT '{}',
  weekly_capacity_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  reliability_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  quality_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  speed_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Score de risco por job (baseado em cards do Trello)
CREATE TABLE IF NOT EXISTS creative_job_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  -- CORREÇÃO: jobs ativos vêm de project_cards, não de uma tabela 'jobs'
  card_id UUID NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  board_id UUID REFERENCES project_boards(id) ON DELETE SET NULL,
  assignee_freelancer_id UUID REFERENCES freelancer_profiles(id) ON DELETE SET NULL,
  complexity_points NUMERIC(10,2) NOT NULL DEFAULT 1,
  urgency_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  risk_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  retrabalho_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  expected_delivery_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_workload_tenant
  ON creative_workload_profiles(tenant_id, freelancer_id);

CREATE INDEX IF NOT EXISTS idx_creative_job_scores_risk
  ON creative_job_scores(tenant_id, risk_score DESC, expected_delivery_at ASC);
```

---

## Migração do frontend

### Fase 1 — trocar endpoint, manter superfícies

**`JarvisChatPanel.tsx` (linha 364):**

```ts
// ANTES
const res = await apiPost(`/clients/${cid}/planning/chat`, { ... });

// DEPOIS (com feature flag)
const useUnified = await checkFeatureFlag('jarvis_unified_chat'); // ou via contexto
const endpoint = useUnified ? '/jarvis/chat' : `/clients/${cid}/planning/chat`;
const res = await apiPost(endpoint, {
  message,
  client_id: cid,
  edro_client_id: edroClientId,   // passar se disponível no contexto
  conversation_id: conversationId, // persistir entre aberturas do drawer
  page: pageContext.type,
});
```

**`OperationsJarvisDrawer.tsx` (linha 169):**

```ts
// ANTES
const res = await apiPost('/operations/chat', { ... });

// DEPOIS
const res = await apiPost('/jarvis/chat', {
  message,
  mode: 'operations',
  page: 'operacoes',
  conversation_id: conversationId,
});
```

**`JarvisContext.tsx` — adicionar persistência de `conversation_id`:**

```ts
// Adicionar ao contexto:
const [conversationId, setConversationId] = useState<string | null>(() => {
  try { return localStorage.getItem('edro_jarvis_conv_id'); } catch { return null; }
});

// Ao receber resposta do chat:
const handleNewConversationId = (id: string) => {
  setConversationId(id);
  try { localStorage.setItem('edro_jarvis_conv_id', id); } catch {}
};

// Ao trocar de cliente: limpar conversa
const handleClientChange = (id: string) => {
  setConversationId(null);
  try { localStorage.removeItem('edro_jarvis_conv_id'); } catch {}
  setClientId(id);
};
```

### Feature flag

Inserir no banco para ativar por tenant:

```sql
INSERT INTO feature_flags (tenant_id, key, enabled)
VALUES ('seu-tenant-id', 'jarvis_unified_chat', true)
ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = true;
```

---

## System Prompt unificado

**Arquivo a criar:** `apps/backend/src/services/jarvis/jarvisSystemPrompt.ts`

Extrair `buildAgentSystemPrompt()` de `planning.ts` e transformar em:

```ts
export function buildUnifiedJarvisSystemPrompt(
  memory: JarvisMemoryContext,
  mode: JarvisRuntimeMode,
  page: string | null,
): string
```

O corpo do prompt deve:
1. Preservar integralmente o conteúdo atual de `buildAgentSystemPrompt()` — Fogg, gatilhos, PNL, AMD, etc.
2. Adicionar bloco de memória no início, formatado por seção (`REUNIÕES RECENTES`, `WHATSAPP`, `JOBS ATIVOS`, etc.)
3. Adicionar instrução de modo ao final:
   - `strategy`: priorizar análise, briefings, copy
   - `operations`: priorizar jobs, kanban, equipe
   - `creative_ops`: priorizar DAs, carga, risco de prazo
   - `creative`: priorizar criação end-to-end
   - `auto`: usar todas as ferramentas disponíveis com julgamento próprio
4. Incluir instrução de evidência: "Quando citar algo de reunião, WhatsApp ou aprovação, indique a fonte."

---

## Ordem de implementação obrigatória

```
1. Extrair buildAgentSystemPrompt() → services/jarvis/jarvisSystemPrompt.ts
2. Criar services/jarvis/jarvisIntentRouter.ts
3. Criar services/jarvis/jarvisMemoryService.ts
4. Rodar migration 0310_jarvis_conversations.sql
5. Rodar migration 0311_jarvis_creative_ops.sql (corrigida)
6. Adicionar POST /jarvis/chat em routes/jarvis.ts
7. Atualizar JarvisContext.tsx (conversation_id persistente)
8. Atualizar JarvisChatPanel.tsx (novo endpoint com flag)
9. Atualizar OperationsJarvisDrawer.tsx (novo endpoint)
10. Inserir feature flag no banco para testar
```

Não pular etapas. Cada etapa depende da anterior.

---

## Plano de compatibilidade

### Fase 0 (feito)
Documentar a arquitetura split e definir contratos alvo.

### Fase 1 — Unificação de transporte
- criar `POST /jarvis/chat`
- manter `planning/chat` e `operations/chat` funcionando
- trocar drawer e full page para o endpoint unificado via feature flag
- verificar paridade de respostas antes de escalar

### Fase 2 — Memory Resolver e evidências
- implementar `buildJarvisMemoryContext` com todas as fontes
- renderizar blocos de evidência no frontend (reunião, WhatsApp, job, alerta)
- preservar histórico de `planning_conversations` — não migrar forçadamente

### Fase 3 — Studio e DA como tools criativas
- expor `create_post_workflow` como tool que chama studioCreative.ts
- expor `run_art_direction` que chama agentDiretorArte
- resultado: "cria um post pra mim" vira cadeia real, não só sugestão

### Fase 4 — Creative Ops scoring
- popular `creative_workload_profiles` e `creative_job_scores`
- Jarvis controla prazos, risco, carga, realocação de DAs
- responde "quem pega esse job?" com recomendação baseada em dados reais

### Fase 5 — Deprecar rotas split
Condições:
- drawer, full page, ops drawer e palette usam `/jarvis/chat` em produção
- evidências e tool results renderizando estável
- Studio/DA tools em produção-safe

---

## Não fazer

- Não apagar `planning/chat` e `operations/chat` antes da Fase 5
- Não usar `due_complete = true` para detectar jobs concluídos — usar `lower(list_name) ~* 'conclu|done|finaliz|publicad'`
- Não criar `jarvisToolRegistry.ts` — `getAllToolDefinitions()` já existe e funciona
- Não criar um system prompt novo do zero — extrair e estender o `buildAgentSystemPrompt()` existente
- Não hardcodar `tenant_id` — sempre `request.user.tenant_id`
- Não confundir `clients.id` (TEXT) com `edro_clients.id` (UUID) — são tabelas diferentes usadas por partes diferentes do sistema

---

## Critérios de sucesso

A unificação está completa quando:

1. O usuário não precisa saber se o pedido é "planning" ou "operações"
2. O Jarvis responde perguntas de memória com evidência citando a fonte
3. O Jarvis cria um workflow de post end-to-end a partir de um pedido simples
4. O Jarvis explica carga de DA e risco de prazo
5. O Jarvis sugere ou executa ações operacionais da mesma superfície que responde perguntas estratégicas
