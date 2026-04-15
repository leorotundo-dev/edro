# Trello Real-Time Bidirectional Sync - Handoff Enxuto

## Objetivo

Implementar `Trello <-> Edro` em tempo real, sem big bang.

Meta operacional:

- mudanca feita no Trello aparece no Edro em segundos
- mudanca feita no Edro aparece no Trello em segundos
- sem loop de sincronizacao
- com retry e reconciliacao
- sem quebrar o read model atual baseado em:
  - `project_boards`
  - `project_lists`
  - `project_cards`
  - `project_card_members`
  - `project_card_checklists`
  - `project_card_comments`
  - `project_card_actions`

## Regra principal

Nao trocar o modelo de leitura do sistema.

O caminho correto e:

- `project_*` continua sendo o read model
- webhook vira o inbound principal
- outbox vira o outbound principal
- polling atual vira reconciliacao/fallback

## Estado atual

### Inbound Trello -> Edro

- polling em `apps/backend/src/jobs/trelloSyncWorker.ts`
- intervalo atual: `30 min`
- ingestao principal em `apps/backend/src/services/trelloSyncService.ts`
- analise posterior em `apps/backend/src/services/trelloHistoryAnalyzer.ts`

### Outbound Edro -> Trello

Ja existe, mas esta espalhado e direto:

- `apps/backend/src/routes/trello.ts`
- `apps/backend/src/routes/freelancers.ts`

Hoje varias rotas fazem `fetch` direto para a API do Trello.

## Consequencias sistemicas da mudanca

### Arquitetura

- `trelloSyncWorker` deixa de ser o fluxo principal
- webhook inbound passa a ser a fonte primaria
- reconciliacao continua existindo, mas como reparo

### Banco

Serao necessarias tabelas novas.

Minimo recomendado:

- `trello_webhooks`
  - `tenant_id`
  - `board_id`
  - `trello_webhook_id`
  - `model_id`
  - `callback_url`
  - `is_active`
  - `last_seen_at`
  - `last_error`

- `trello_webhook_events`
  - log bruto do inbound
  - dedupe por `tenant_id + trello_action_id` quando houver
  - `status`, `processed_at`, `error_message`
  - `payload jsonb`

- `trello_outbox`
  - fila confiavel de `Edro -> Trello`
  - `operation`
  - `payload`
  - `dedupe_key`
  - `status`
  - `attempts`
  - `next_retry_at`
  - `last_error`

- opcional:
  - `trello_sync_state`
  - para `last_webhook_at`, `last_reconciliation_at`, `last_outbound_at`

### Infra e seguranca

Novo webhook publico:

- `HEAD /webhook/trello`
- `POST /webhook/trello`

Observacoes:

- Trello exige `HEAD 200` na criacao do webhook
- callback deve responder rapido
- processamento pesado deve ser async

Referencia interna de padrao:

- `apps/backend/src/routes/webhookEvolution.ts`
- `apps/backend/src/routes/webhookRecall.ts`
- `apps/backend/src/services/webhookRetryService.ts`

### Idempotencia e anti-loop

Problema:

- Edro escreve no Trello
- Trello devolve webhook da mesma mudanca
- sem marca de origem, o sistema ecoa a propria acao

Regra:

- inbound usa `trello_action_id` como dedupe primaria quando existir
- outbound gera `dedupe_key`
- outbound deve marcar `origin = edro`
- projector inbound precisa reconhecer mudanca originada pelo Edro e apenas confirmar consistencia

### Reconciliacao

Mesmo com webhook, ainda precisa existir:

- webhook pode falhar
- Trello pode desativar webhook
- boards pesados podem gerar drift

Portanto:

- nao remover o worker atual na primeira fase
- reduzir ele para fallback depois

### Impacto em health

`apps/backend/src/routes/integrationHealthRoutes.ts` vai mudar.

Hoje o health olha:

- `last_synced_at`
- boards stale
- unmapped lists
- membros sem email

Depois deve olhar tambem:

- `last_webhook_at`
- backlog da `trello_outbox`
- backlog de `trello_webhook_events`
- boards sem webhook ativo
- `last_reconciliation_at`

### Impacto em IA e automacoes

Superficies afetadas:

- `apps/backend/src/services/jarvisDecisionEngine.ts`
- `apps/backend/src/services/ai/toolExecutor.ts`
- `apps/backend/src/services/briefingAutoPipelineService.ts`
- `apps/backend/src/services/trelloHistoryAnalyzer.ts`

Regra:

- `operational_signals` nao pode depender apenas do sync batch
- precisa de atualizacao incremental por evento/card

### Impacto em UI

Superficies principais:

- `apps/web/app/projetos/[boardId]/ProjectBoardClient.tsx`
- `apps/web/app/admin/trello/TrelloAdminClient.tsx`
- `apps/web/app/DashboardClient.tsx`
- `apps/web/app/clients/ClientsListClient.tsx`
- `apps/web/app/admin/solicitacoes/BriefingRequestsClient.tsx`

Conflito esperado:

- a UI pode fazer optimistic update
- o webhook pode chegar logo depois com estado levemente diferente

Regra:

- manter optimistic update simples
- confirmar por refresh/webhook
- rollback se outbound falhar

## Plano em fases

## Fase 1 - Inbound realtime

Objetivo:

- fazer o que e alterado no Trello refletir no Edro em segundos

Entrega minima:

- migration com `trello_webhooks` e `trello_webhook_events`
- `HEAD /webhook/trello`
- `POST /webhook/trello`
- servico para registrar webhook por board importado
- projector incremental para atualizar `project_*`
- idempotencia por `trello_action_id`
- manter `trelloSyncWorker` como fallback

Arquivos provaveis:

- `apps/backend/src/routes/trelloWebhook.ts`
- `apps/backend/src/services/trelloWebhookService.ts`
- `apps/backend/src/services/trelloProjectorService.ts`
- `apps/backend/src/routes/index.ts`
- migration nova em `apps/backend/src/db/migrations/`

Aceite:

- mover card no Trello aparece no Edro em segundos
- comentar no Trello aparece no Edro em segundos
- checklist alterado no Trello aparece no Edro em segundos
- sem duplicidade de comentario/action

Rollback:

- desligar webhook
- manter polling atual como unico inbound

## Fase 2 - Outbox realtime

Objetivo:

- fazer o que e alterado no Edro refletir no Trello em segundos com confiabilidade

Entrega minima:

- migration com `trello_outbox`
- worker da outbox
- mover sync-back direto das rotas para fila

Arquivos principais:

- `apps/backend/src/routes/trello.ts`
- `apps/backend/src/routes/freelancers.ts`
- `apps/backend/src/services/trelloOutboxService.ts`
- `apps/backend/src/jobs/trelloOutboxWorker.ts`
- `apps/backend/src/jobs/jobsRunner.ts`

Aceite:

- mover card no Edro aparece no Trello em segundos
- comentar no Edro aparece no Trello em segundos
- atribuir membro no Edro aparece no Trello em segundos
- retry em falha outbound

## Fase 3 - Anti-loop e derivacoes incrementais

Objetivo:

- impedir eco
- atualizar sinais e derivados sem sync full

Entrega minima:

- `origin metadata`
- dedupe inbound/outbound
- update incremental de `operational_signals`

## Fase 4 - Reconciliacao leve e health novo

Objetivo:

- corrigir drift e fechar operacao

Entrega minima:

- reduzir peso do polling atual
- reconciliacao por board
- health baseado em webhook + outbox + reconciliacao

## Ordem exata para executar

1. Fase 1 inteira
2. validar
3. Fase 2 inteira
4. validar
5. Fase 3
6. Fase 4

Nao pular fase.

## Regras de execucao para economizar tokens

Use este arquivo como fonte principal de verdade.

Obrigatorio:

- nao repetir contexto ja descrito aqui
- nao reanalisar o repo inteiro a cada passo
- abrir apenas os arquivos da fase atual
- evitar `rg` amplo fora do escopo da fase
- nao escrever explicacoes longas se a resposta puder ser curta
- reportar cada fase apenas no formato:
  1. o que foi feito
  2. arquivos alterados
  3. como validar
  4. status do deploy
- se houver duvida de produto, parar; se for duvida tecnica resolvivel pelo repo, assumir e seguir

## Fontes oficiais do Trello

- Webhooks: https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/
- API intro: https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
- Cards API: https://developer.atlassian.com/cloud/trello/rest/api-group-cards/
- Object definitions: https://developer.atlassian.com/cloud/trello/guides/rest-api/object-definitions/

## Comando de inicio recomendado

Comece pela `Fase 1 - Inbound realtime`.

Nao avance para a Fase 2 antes de fechar e validar a Fase 1.
