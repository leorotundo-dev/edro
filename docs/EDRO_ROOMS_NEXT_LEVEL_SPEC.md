# Edro Rooms Next-Level Spec

Este documento complementa `EDRO_ROOMS_IMPLEMENTATION_KIT.md`.
O kit cobre a Fase 1. Esta spec fecha a arquitetura para transformar `Rooms` na camada operacional forte da Edro.

## North Star

`Rooms` nao e um chat generico.

`Rooms` deve virar:

- a sala contextual de cada assunto real da operacao
- a memoria colaborativa viva do cliente, job, briefing, meeting e time
- o ponto em que o Jarvis entende a conversa e devolve valor operacional

Se algo foi discutido, decidido, bloqueado, resumido ou convertido em proximo passo, o melhor lugar para isso existir e o Room daquele contexto.

---

## Escopo de produto

### Fase 1 — Core

- listagem de salas
- mensagens persistentes
- SSE por sala
- presence
- unread
- rooms default de tenant
- `/studio/rooms`

### Fase 2 — Context Rooms

- `ensure room` por `client`, `job`, `briefing`, `meeting`
- criacao automatica ou lazy
- ACL herdada do contexto
- entrada no Room a partir das telas de cliente, jobs, briefings e reunioes
- mensagens de sistema para eventos-chave do contexto

### Fase 3 — Jarvis In The Room

- resumo sob demanda
- extracao de decisoes, tarefas e riscos
- mensagens de artefato postadas no proprio Room
- leitura da sala como contexto vivo para o Jarvis
- memoria de sala separada do historico de chat do Jarvis

### Fase 4 — Bridges

- resumo de reunioes cai no Room certo
- sinais operacionais e eventos de sistema geram mensagens de sistema
- entrada manual de resumos de WhatsApp ou digest, sem acoplar o Room ao inbox

---

## Servicos backend que o Claude deve separar

### `roomsService.ts`

Responsavel por persistencia e regras centrais:

- `ensureDefaultRooms`
- `ensureContextRoom`
- `listRoomsForUser`
- `getRoomForUser`
- `listRoomMessages`
- `postRoomMessage`
- `markRoomRead`
- `upsertRoomPresence`
- `listActivePresence`

### `roomAclService.ts`

Resolve se um usuario pode acessar uma sala com base em:

- membership
- escopo contextual
- permissoes herdadas de cliente, meeting e briefing

### `roomFanoutService.ts`

Camada em memoria para publicar eventos SSE por `roomId`.
Na Fase 1 nao usar broker externo.
Projetar a interface de forma que depois seja possivel trocar por Redis/pubsub.

### `roomJarvisService.ts`

Responsavel por:

- carregar ultimas mensagens da sala
- montar contexto para o Jarvis
- pedir resumo
- pedir extracao de artefatos
- publicar resposta do Jarvis como `room_messages`

### `roomContextResolverService.ts`

Recebe `contextType + contextId` e devolve:

- nome canonico da sala
- `client_id`
- `edro_client_id`
- label amigavel
- regra de ACL herdada

---

## Contrato exato com Jarvis

Ao abrir um Room, a tela deve chamar `useJarvisPage()` com:

- `screen: 'studio_rooms'`
- `roomId`
- `roomName`
- `roomScope`
- `roomContextType`
- `roomContextId`
- `clientId`
- `edroClientId`

O backend do Jarvis ja sabe usar `page_data`.
O Claude nao deve criar outro canal de contexto paralelo.

### Regras

- Jarvis nao responde sozinho no Room
- Jarvis so publica mensagem se o usuario pedir
- resumo vira `authorKind='jarvis'` e `messageType='summary'`
- decisao, tarefa, briefing e risco viram `messageType='artifact'`, `decision`, `task` ou `alert`
- nada de salvar mensagem humana de Room em `planning_conversations` ou `operations_conversations`

### Operacoes explicitas da Fase 3

- `POST /api/rooms/:roomId/jarvis/summary`
- `POST /api/rooms/:roomId/jarvis/extract`

`extract` deve devolver candidatos estruturados para:

- `decision`
- `task`
- `risk`
- `briefing`

O usuario confirma antes de promover qualquer artefato para outro modulo.

---

## Mensagens de sistema que realmente importam

O Room fica poderoso quando o contexto aparece sem trabalho manual.

Eventos que valem mensagem de sistema:

- briefing criado
- briefing aceito ou recusado
- job entrou em risco
- job mudou de status
- reuniao registrada ou concluida
- resumo de reuniao anexado
- membro entrou ou saiu da sala

Nao postar ruido operacional irrelevante.

---

## UI certa para a primeira versao forte

### Entrada principal

- `/studio/rooms`

### Entradas contextuais

- cliente: CTA `Abrir room do cliente`
- briefing: CTA `Discutir neste room`
- meeting: CTA `Abrir room da reuniao`
- job: CTA `Abrir room do job`

### Estrutura da tela

- coluna 1: lista de salas
- coluna 2: thread
- coluna 3 opcional: contexto do room

Painel lateral mostra:

- contexto vinculado
- participantes
- ultimas decisoes
- ultimas tarefas extraidas pelo Jarvis

---

## Guardrails de produto

- sem thread complexa na Fase 1
- sem emoji reaction agora
- sem chat privado irrestrito fora de `direct`
- sem editar historico em massa
- sem apagar mensagem fisicamente; usar `deleted_at`

---

## Sequencia de implementacao recomendada

1. Fase 1 do kit atual
2. `ensureContextRoom` + `roomAclService`
3. CTA contextual nas telas de cliente/job/briefing/meeting
4. `roomJarvisService`
5. rotas `/jarvis/summary` e `/jarvis/extract`
6. mensagens de sistema por eventos de contexto
7. bridge com reuniao

---

## Definition of Powerful

`Rooms` chega no proximo nivel quando:

- cada contexto relevante tem uma sala canonica
- a equipe trabalha no Room sem perder contexto
- o Jarvis consegue resumir a conversa certa
- decisao, tarefa e risco podem nascer dali
- a reuniao e a operacao convergem para o mesmo historico

Se o Room so troca mensagens, ele e util.
Se o Room vira memoria operacional com Jarvis, ele passa a ser central.
