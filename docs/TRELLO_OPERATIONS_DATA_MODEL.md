# Trello -> Central de Operacoes

## Resumo

Este documento fecha a regra correta para a `Central de Operacoes` do Edro:

- `Trello` e a fonte operacional
- a `planilha` nao e fonte de dados
- a planilha serve como `modelo mental`, `taxonomia` e `especificacao operacional`
- o `Edro` deve puxar direto do Trello e reinterpretar os dados segundo essa logica

Em outras palavras:

- `Trello -> Edro`
- nao `Trello -> Planilha -> Edro`

O papel da Central de Operacoes e:

- consolidar o que existe em `boards`, `lists`, `cards`, `members`, `labels`, `due dates`, `comments`, `checklists` e `history`
- transformar isso em visoes operacionais da agencia
- expor um `OperationsJob` canonico para o front
- permitir que o `Jarvis` atue sobre esse contexto de forma continua

## Source Of Truth

As tabelas e objetos canonicos que alimentam a Central de Operacoes sao:

- `project_boards`
  - board Trello espelhado no Edro
  - principal uso: `cliente`, `carteira`, `origem da demanda`

- `project_lists`
  - listas do board
  - principal uso: `etapa operacional`

- `project_cards`
  - card Trello espelhado no Edro
  - principal uso: `job operacional`

- `project_card_members`
  - membros do card
  - principal uso: `responsavel`, `pauta por pessoa`, `capacidade`

- `trello_list_status_map`
  - override explicito de lista -> status operacional
  - principal uso: `normalizar status`

- `project_card_activity`
  - historico de mudancas do card
  - principal uso: `timeline`, `SLA`, `transicoes`

- `project_card_comments`
  - comentarios locais/espelhados
  - principal uso: `contexto`, `handoff`, `observacao operacional`

- `project_card_checklists`
  - checklists do card
  - principal uso: `espelho Trello`, `progresso`, `completude`

- `project_card_analytics`
  - analytics derivados do card
  - principal uso: `calendar`, `SLA`, `tipo de entrega`

## Objeto Canonico do Front

O front da Central trabalha sobre `OperationsJob` em:

- [model.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/web/components/operations/model.ts)

Campos principais:

- `id`
- `client_id`
- `client_name`
- `title`
- `summary`
- `job_type`
- `status`
- `priority_band`
- `owner_id`
- `owner_name`
- `deadline_at`
- `metadata`
- `history`
- `comments`
- `checklists`

Esse objeto hoje nasce principalmente em:

- `_cardToJob()` em [trello.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/trello.ts)

## Semantica Operacional Aplicada ao Trello

### 1. Cliente

Origem:

- `project_boards.client_id`
- `project_boards.name`

Regra:

- `board = conta/cliente`
- todo card precisa ser lido dentro de um board
- a `Pauta Geral` antiga corresponde a uma leitura agregada por board/cliente

Campos usados:

- `board_id`
- `board_name`
- `client_id`
- `client_name`

### 2. Job

Origem:

- `project_cards`

Campos brutos do Trello:

- `title`
- `description`
- `due_date`
- `due_complete`
- `labels`
- `trello_card_id`
- `trello_url`
- `created_at`
- `updated_at`
- `list_id`
- `board_id`

Interpretacao no Edro:

- `title` -> nome do job
- `description` -> resumo operacional / briefing curto
- `due_date` -> prazo
- `due_complete` -> concluido de fato no Trello
- `labels` -> tipo, canal, urgencia, handoff
- `list_id` -> etapa atual

### 3. Etapa

Origem:

- `project_lists.name`
- `trello_list_status_map.ops_status`

Regra:

- se existir override em `trello_list_status_map`, ele vence
- senao o Edro deduz via `listNameToOpsStatus()`

Implementacao:

- [trello.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/trello.ts)

Mapeamento base:

- listas com `bloqueado` -> `blocked`
- listas com `concluido/done/fechado` -> `done`
- listas com `publicado/entregue` -> `published`
- listas com `aprovado` -> `approved`
- listas com `aprovacao/aguardando approval` -> `awaiting_approval`
- listas com `revisao/review` -> `in_review`
- listas com `producao/andamento/fazendo` -> `in_progress`
- listas com `alocado` -> `allocated`
- listas com `pronto` -> `ready`
- listas com `planejamento/classificacao` -> `planned`
- resto -> `intake`

### 4. Criticidade

Origem:

- `due_date`
- `due_complete`
- `owner_id`
- `status`

Regra:

- o Edro deriva `priority_band` com `computePriorityBand()`
- a visao de risco do front cruza isso com:
  - atraso
  - ausencia de responsavel
  - status aberto

Implementacao:

- prioridade em [trello.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/trello.ts)
- risco em [model.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/web/components/operations/model.ts)

Faixas:

- `p0`
  - vencido ou vence em ate 24h
- `p1`
  - vence em ate 72h
- `p2`
  - vence em ate 7 dias
- `p3`
  - backlog ou sem prazo
- `p4`
  - concluido / solto

### 5. Responsabilidade

Origem:

- `project_card_members`
- cruzamento com `edro_users`

Regra:

- primeiro membro = responsavel principal do card nas views principais
- multiplos membros = trabalho compartilhado
- sem membro = `Sem responsavel`

Essa leitura alimenta:

- `Fila`
- `Pessoas`
- `Planner`
- `Agenda`

### 6. Handoff

Origem:

- `list_name`
- `labels`
- `description`
- `comments`
- `checklists`

Regra:

- o handoff operacional nao deve vir da planilha
- ele deve ser inferido do Trello e explicitado no Edro

Estados que a planilha revela e que o Edro precisa reconhecer:

- `AGUARDANDO BRIEFING`
- `AGUARDANDO INFOS`
- `ADICIONAR PRAZO`
- `FAZER REDACAO`
- `PARA APROVAR`
- `EM ALTERACAO`
- `PRIORIDADE`
- `SEM ETIQUETA`

Esses estados nao sao hoje uma maquina de estados propria.
Eles devem ser interpretados a partir de:

- `labels`
- `list_name`
- `due_date`
- presenca/ausencia de responsavel
- presenca/ausencia de briefing/descricao

## Visoes da Central de Operacoes

## 1. Hoje

Rota/fonte:

- `GET /trello/ops-feed`
- `GET /trello/ops-planner`
- `GET /trello/ops-calendar`

Leitura:

- `o que vence hoje`
- `o que esta sem dono`
- `o que esta esperando cliente`
- `o que precisa entrar na IA`
- `o que precisa de disparo/diario`

Campos minimos do Trello:

- `title`
- `client_name`
- `due_date`
- `list_name`
- `members`
- `labels`

Transformacoes do Edro:

- `jobsForToday()`
- `criticalAlerts()`
- `jobsByAttentionClient()`

## 2. Fila

Rota/fonte:

- `GET /trello/ops-feed`

Views:

- `Lista`
- `Tabela`
- `Quadro`

Leitura:

- `fonte mestre achatada`
- `mesa operacional principal`

Campos minimos do Trello:

- `card id`
- `title`
- `description`
- `due_date`
- `labels`
- `list_name`
- `members`
- `board/client`

Transformacoes do Edro:

- `OperationsJob`
- ordenacao por `priority_band`
- agrupamento por `status`
- filtros por dono, cliente, prioridade, risco

## 3. Radar / Sinais

Fonte:

- `ops-feed`
- regras de risco do front
- sinais operacionais complementares

Leitura:

- excecao
- crise
- o que precisa de intervencao

Campos minimos:

- `due_date`
- `owner`
- `status`
- `list_name`
- `labels`
- `description`

Regras que reproduzem a planilha:

- `MÁXIMA`
- `ATRASADO`
- `ATRASO (HORA)`
- `STAND-BY`
- `SEM RESPONSAVEL`
- `SEM PRAZO`
- `AGUARDANDO INFO`

## 4. Pessoas

Fonte:

- `GET /trello/ops-planner`

Leitura:

- pauta por responsavel
- carga da semana
- jobs sem dono

Campos minimos:

- `project_card_members`
- `due_date`
- `status`
- `estimated_minutes` ou heuristica

Transformacoes do Edro:

- `ownerAllocableMinutes()`
- `ownerCommittedMinutes()`
- `ownerTentativeMinutes()`

## 5. Agenda

Fonte:

- `GET /trello/ops-calendar`
- `GET /trello/ops-planner`
- `GET /trello/calendar`

Leitura:

- cards agrupados por prazo
- producao, aprovacoes, publicacoes, riscos

Campos minimos:

- `due_date`
- `job_type`
- `status`
- `labels`
- `members`

Transformacoes do Edro:

- `agendaLayer()`
- janela de 7 dias para tras e 28 para frente no ops-calendar

## 6. SLA

Fonte:

- `GET /trello/ops-sla`
- `project_card_activity`
- `project_card_analytics`

Leitura:

- prazo prometido x entrega real
- categorias de entrega
- comportamento por tipo

Campos minimos:

- `due_date`
- `updated_at`
- `due_complete`
- `labels`
- `title`
- `list_name`

Transformacoes do Edro:

- `inferSlaDeliveryType()`
  - `Posts`
  - `Videos`
  - `Projetos`
  - `Materiais avulsos`

Gap importante:

- a planilha mede `mao na massa`
- o Edro ainda precisa explicitar melhor o congelamento de espera de cliente/aprovacao

## 7. Carteira / Pauta Geral

Fonte:

- `GET /trello/project-boards`
- agregacoes sobre `project_cards`

Leitura:

- pauta da agencia por conta
- conjunto de demandas por cliente

Campos minimos:

- `board`
- `client`
- `cards ativos`
- `in_progress_count`

Gap importante:

- essa visao ainda existe de forma dispersa no Edro
- a planilha continua mais obvia como leitura por conta

## Espelho Trello no Popup

Fonte:

- `GET /trello/ops-cards/:cardId`

O popup deve refletir o card real do Trello com:

- `title`
- `desc`
- `due`
- `list`
- `labels`
- `members`
- `checklists`
- `actions/comments`
- `trello_url`

Isso ja esta implementado no popup da operacao via:

- [trello.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/trello.ts)
- [JobWorkbenchDrawer.tsx](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/web/components/operations/JobWorkbenchDrawer.tsx)

## O Que a Planilha Revela e Precisa Virar Regra

A planilha antiga mostrou quais filtros a operacao usa de verdade.
Esses filtros devem virar contrato da Central:

- `Sem responsavel`
- `Sem prazo`
- `Aguardando briefing`
- `Aguardando infos`
- `Sem etiqueta`
- `Fazer redacao`
- `Para aprovar`
- `Prioridade`
- `Stand-by`

Esses filtros devem ser interpretados pelo Edro direto do Trello a partir de:

- `list_name`
- `labels`
- `due_date`
- `members`
- `description`
- `comments/checklists`

## Papel do Jarvis

O Jarvis deve estar presente em toda a Central sobre esse mesmo modelo de dados.

Ele precisa sempre receber:

- `job atual`
- `cliente atual`
- `board/list atual`
- `responsavel atual`
- `prazo`
- `labels`
- `comments`
- `checklists`
- `history`

Capacidades minimas do Jarvis na operacao:

- resumir o job atual
- sugerir proximo passo
- transformar card em briefing
- preparar copy
- explicar por que esta em risco
- sugerir redistribuicao
- preparar envio para cliente ou DA

Regra:

- `um Jarvis so`
- `mesmo modelo de dados`
- `qualquer tela da Central`

## Decisao Arquitetural

O modelo final e:

- `Trello` = fonte operacional
- `Edro` = interpretador operacional + governanca + automacao + Jarvis
- `Planilha` = referencia de logica, nao de dado

Portanto:

- toda regra da planilha que importa deve ser codificada como filtro, agrupamento, semantica ou handoff no Edro
- nenhum fluxo novo deve depender da planilha para funcionar
