# Edro Rooms Implementation Kit

## Objetivo

`Rooms` e a camada de conversa contextual da Edro.

Nao e um clone de Gather. O produto correto para a Edro e:

- salas persistentes por tenant
- contexto explicito de `studio`, `cliente`, `job`, `briefing`, `meeting` e `time`
- chat em tempo real
- presenca basica
- unread por usuario
- integracao progressiva com Jarvis

O objetivo deste kit e reduzir a implementacao futura a trabalho mecanico.

Para a versao forte de produto, com `Context Rooms`, `Jarvis In The Room` e `Bridges`, seguir tambem `EDRO_ROOMS_NEXT_LEVEL_SPEC.md`.

---

## Reuso obrigatorio

Nao recriar infraestrutura que ja existe:

- auth e tenant scoping: `apps/backend/src/auth/`
- shell do Studio: `apps/web/app/studio/layout.tsx`
- contexto do Jarvis: `apps/web/contexts/JarvisContext.tsx`
- historico de conversa do Jarvis: `apps/backend/src/services/jarvisPolicyService.ts`
- permissoes e escopo por cliente/reuniao: `apps/backend/src/routes/meetings.ts`
- notificacoes in-app: `apps/backend/src/routes/notifications.ts`

`Rooms` nao deve reutilizar `planning_conversations` nem `operations_conversations` como storage principal.
Essas tabelas sao historico de chat com IA, nao sala colaborativa multiusuario.

---

## Decisoes fechadas

### Transporte

Usar `SSE` para leitura e `HTTP POST/PUT` para escrita.

Motivos:

- menor risco que abrir WebSocket agora
- encaixa melhor no backend Fastify atual
- suficiente para mensagem, presenca, unread e eventos de sistema
- simplifica deploy e observabilidade

### Escopo

O modelo deve suportar desde o inicio:

- `global`
- `team`
- `studio`
- `client`
- `job`
- `briefing`
- `meeting`
- `direct`

### Modelagem de contexto

Usar `context_type` + `context_id` em `TEXT`.

Nao criar foreign key polimorfica. O monorepo mistura ids `TEXT` e `UUID`.
Para integracao com Jarvis, guardar tambem:

- `client_id TEXT NULL`
- `edro_client_id UUID NULL`

### Autorizacao

Todo acesso e tenant-scoped.

Regra base:

- usuario so ve a sala se for membro
- salas `global/team/studio` podem ser acessadas via membership lazy
- salas contextuais devem validar o mesmo escopo das rotas de origem

### Jarvis

Fase 1:

- Jarvis le `roomId`, `roomName`, `roomScope`, `contextType`, `contextId`
- Jarvis nao responde automaticamente no Room
- Jarvis nao cria briefing nem tarefa a partir de mensagem de room sem acao explicita

Fase 2+:

- resumo da sala
- memoria por sala
- converter mensagem em briefing, risco ou proximo passo

---

## Modelo de dados

### `rooms`

Colunas:

- `id UUID PK`
- `tenant_id TEXT NOT NULL`
- `name TEXT NOT NULL`
- `description TEXT NULL`
- `scope TEXT NOT NULL`
- `context_type TEXT NULL`
- `context_id TEXT NULL`
- `client_id TEXT NULL`
- `edro_client_id UUID NULL`
- `created_by TEXT NULL`
- `is_archived BOOLEAN NOT NULL DEFAULT false`
- `last_message_at TIMESTAMPTZ NULL`
- `last_message_preview TEXT NULL`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Indices:

- `(tenant_id, scope, updated_at DESC)`
- `(tenant_id, context_type, context_id)`
- `(tenant_id, client_id)`
- unique parcial em `(tenant_id, scope, context_type, context_id)` quando `context_id IS NOT NULL`

### `room_members`

Colunas:

- `id UUID PK`
- `tenant_id TEXT NOT NULL`
- `room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE`
- `user_id TEXT NOT NULL`
- `membership_role TEXT NOT NULL DEFAULT 'member'`
- `notification_level TEXT NOT NULL DEFAULT 'all'`
- `is_hidden BOOLEAN NOT NULL DEFAULT false`
- `pinned_at TIMESTAMPTZ NULL`
- `last_read_message_id UUID NULL`
- `last_read_at TIMESTAMPTZ NULL`
- `last_seen_at TIMESTAMPTZ NULL`
- `joined_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Indices:

- unique `(room_id, user_id)`
- `(tenant_id, user_id, updated_at DESC)`

### `room_messages`

Colunas:

- `id UUID PK`
- `tenant_id TEXT NOT NULL`
- `room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE`
- `parent_message_id UUID NULL REFERENCES room_messages(id) ON DELETE SET NULL`
- `author_user_id TEXT NULL`
- `author_kind TEXT NOT NULL`
- `message_type TEXT NOT NULL DEFAULT 'message'`
- `body TEXT NOT NULL`
- `body_format TEXT NOT NULL DEFAULT 'plain'`
- `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
- `client_id TEXT NULL`
- `edro_client_id UUID NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `edited_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`

Indices:

- `(room_id, created_at ASC)`
- `(tenant_id, room_id, created_at DESC)`

### `room_presence`

Soft-state de presenca.

Colunas:

- `tenant_id TEXT NOT NULL`
- `room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE`
- `user_id TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'online'`
- `pathname TEXT NULL`
- `page_context JSONB NOT NULL DEFAULT '{}'::jsonb`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

Indices:

- unique `(room_id, user_id)`
- `(tenant_id, room_id, updated_at DESC)`

Presenca ativa = `updated_at > now() - interval '90 seconds'`.

---

## API alvo

Todas as rotas com `authGuard + tenantGuard()`.

### REST

- `GET /api/rooms`
- `POST /api/rooms`
- `GET /api/rooms/:roomId`
- `PATCH /api/rooms/:roomId`
- `GET /api/rooms/:roomId/messages?cursor=...&limit=...`
- `POST /api/rooms/:roomId/messages`
- `PUT /api/rooms/:roomId/read`
- `PUT /api/rooms/:roomId/presence`
- `POST /api/rooms/:roomId/join`
- `POST /api/rooms/:roomId/leave`

### Stream

- `GET /api/rooms/:roomId/stream`

Resposta `text/event-stream`.

Eventos:

- `snapshot`
- `message.created`
- `message.updated`
- `message.deleted`
- `presence.updated`
- `read.updated`
- `room.updated`
- `keepalive`

Nao multiplexar varias salas no mesmo stream na primeira versao.

---

## Comportamento de membership

### Salas default

Primeiro acesso do tenant a `Rooms` deve garantir:

- `Studio Geral`
- `Time Criativo`

Funcao sugerida: `ensureDefaultRooms(tenantId, userId)`.

### Salas contextuais

Criacao automatica futura:

- `client`: ao abrir pagina de cliente ou acao explicita
- `job`: ao entrar em job com colaboracao
- `briefing`: ao iniciar execucao criativa
- `meeting`: ao registrar ou agendar reuniao

Nome sugerido:

- `Cliente: {clientName}`
- `Job: {jobTitle}`
- `Briefing: {briefingTitle}`
- `Meeting: {meetingTitle}`

---

## Integracao com o Studio

Adicionar `/studio/rooms` ao grupo Criativo.

Tela alvo:

- sidebar de salas
- header com nome, escopo e participantes online
- thread principal
- composer
- painel lateral opcional de contexto

Estado local minimo:

- `activeRoomId`
- `messages`
- `presence`
- `members`
- `unreadByRoom`
- `cursor`
- `composer`

Persistencias locais:

- ultimo `roomId` por usuario
- preferencias de sidebar

Nao persistir mensagens do room em `localStorage`.

---

## Integracao com o Jarvis

Ao abrir um Room, registrar em `useJarvisPage()`:

- `roomId`
- `roomName`
- `roomScope`
- `roomContextType`
- `roomContextId`
- `clientId`
- `edroClientId`

Prompt esperado:

- Jarvis deve tratar o room como contexto de colaboracao
- nao agir automaticamente
- resumir a discussao quando solicitado
- usar `clientId` e `edroClientId` para recuperar memoria existente

Nao salvar mensagens humanas do Room dentro de `planning_conversations`.
Se no futuro houver memoria de room, usar pipeline proprio.

---

## Mapa de arquivos sugerido

Backend:

- `apps/backend/src/db/migrations/XXXX_rooms.sql`
- `apps/backend/src/services/roomsService.ts`
- `apps/backend/src/routes/rooms.ts`
- `apps/backend/src/routes/index.ts`

Frontend:

- `apps/web/app/studio/rooms/page.tsx`
- `apps/web/app/studio/rooms/RoomsClient.tsx`
- `apps/web/app/studio/layout.tsx`
- `apps/web/components/layout/sidebar/MenuItems.ts`

Shared:

- `packages/shared/src/rooms.ts`
- `packages/shared/src/index.ts`

---

## Nao fazer

- nao abrir WebSocket custom na primeira versao
- nao usar tabela do Jarvis como storage de Room
- nao criar foreign keys polimorficas de contexto
- nao acoplar mensagens do Room ao WhatsApp
- nao deixar o Jarvis responder sozinho na Fase 1
- nao misturar `client_id TEXT` com `edro_client_id UUID`

---

## Ordem recomendada de implementacao

1. tipos compartilhados
2. migration
3. service backend
4. rotas REST
5. stream SSE
6. tela `/studio/rooms`
7. link de navegacao
8. contexto do Jarvis
9. testes de contrato

---

## Criterio de pronto da Fase 1

- usuario autenticado acessa `/studio/rooms`
- tenant recebe salas default sem duplicacao
- consegue listar salas, entrar e mandar mensagem
- outra aba conectada recebe a mensagem por SSE
- unread e `last_read_at` funcionam
- presenca basica aparece
- Jarvis recebe contexto da sala atual
