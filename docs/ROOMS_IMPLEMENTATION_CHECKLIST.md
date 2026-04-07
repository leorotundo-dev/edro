# Rooms Implementation Checklist

Complementar a `EDRO_ROOMS_IMPLEMENTATION_KIT.md` com `EDRO_ROOMS_NEXT_LEVEL_SPEC.md`.

## Sequencia exata para implementar

### Fase 1 — Core

1. Criar `packages/shared/src/rooms.ts` e usar esses tipos no backend e web.
2. Criar migration unica para `rooms`, `room_members`, `room_messages`, `room_presence`.
3. Criar `roomsService.ts` com funcoes puras e pequenas:
   - `ensureDefaultRooms`
   - `listRoomsForUser`
   - `getRoomForUser`
   - `listRoomMessages`
   - `postRoomMessage`
   - `markRoomRead`
   - `upsertRoomPresence`
   - `listActivePresence`
4. Criar `routes/rooms.ts`.
5. Registrar a rota em `routes/index.ts`.
6. Implementar `/studio/rooms`.
7. Adicionar item de menu.
8. Registrar contexto da sala no Jarvis.

### Fase 2 — Context Rooms

9. Criar `roomContextResolverService.ts`.
10. Criar `roomAclService.ts`.
11. Implementar `ensureContextRoom`.
12. Adicionar CTA de Room em cliente, briefing, meeting e job.
13. Publicar mensagens de sistema para eventos importantes do contexto.

### Fase 3 — Jarvis In The Room

14. Criar `roomJarvisService.ts`.
15. Implementar `POST /api/rooms/:roomId/jarvis/summary`.
16. Implementar `POST /api/rooms/:roomId/jarvis/extract`.
17. Publicar artefatos do Jarvis como `room_messages`, nunca em tabelas de conversa do Jarvis.

## Regras de integracao

- sempre filtrar por `tenant_id`
- sempre validar membership antes de ler ou escrever
- sempre devolver `403` em vez de `404` para sala existente sem acesso
- sempre ordenar mensagens por `created_at ASC`
- sempre usar cursor por `created_at + id` para paginacao estavel
- sempre atualizar `rooms.last_message_at` e `rooms.last_message_preview` ao enviar mensagem
- sempre atualizar `room_members.last_seen_at` ao abrir stream ou fazer heartbeat
- sempre limitar payload de mensagem em texto puro na Fase 1
- sempre tratar `Rooms` como modulo proprio, nao como extensao de `notifications`

## Contratos HTTP

- `POST /api/rooms/:roomId/messages` deve retornar a mensagem persistida completa
- `PUT /api/rooms/:roomId/read` deve atualizar `last_read_message_id` e `last_read_at`
- `PUT /api/rooms/:roomId/presence` deve ser idempotente
- `GET /api/rooms/:roomId/stream` deve enviar `snapshot` logo ao conectar
- `POST /api/rooms/ensure-context` deve ser idempotente
- `POST /api/rooms/:roomId/jarvis/summary` deve devolver a mensagem de resumo persistida
- `POST /api/rooms/:roomId/jarvis/extract` deve devolver candidatos estruturados, nao criar briefing/tarefa automaticamente

## Contratos SSE

- enviar `keepalive` a cada 20-30s
- fechar stream silenciosamente em desconexao
- nunca travar a request principal por erro de fanout
- fanout inicial pode ser em memoria no processo; se depois houver multiplas replicas, trocar por broker

## ACL por escopo

- `global`, `team`, `studio`: membership lazy permitido
- `client`: exigir o mesmo acesso de `clients:read`
- `job`: exigir o mesmo acesso operacional do job
- `briefing`: exigir acesso ao briefing ou ao cliente relacionado
- `meeting`: exigir o mesmo acesso de `meetings:read`
- `direct`: membership explicito apenas
- `ensureContextRoom` deve gerar no maximo uma sala canonica por contexto

## Integracao com Jarvis

- `useJarvisPage()` deve receber `roomId`, `roomName`, `roomScope`, `roomContextType`, `roomContextId`
- incluir `screen: 'studio_rooms'`, `clientId` e `edroClientId` quando houver
- nao usar `conversationId` do Jarvis como id da sala
- nao salvar transcript de Room em `planning_conversations`
- se usuario pedir resumo, Jarvis pode ler ultimas mensagens da sala como contexto
- se usuario pedir extracao, Jarvis responde com candidatos de `decision`, `task`, `risk` e `briefing`

## Testes minimos

- tenant A nao ve sala do tenant B
- mensagem enviada aparece para dois usuarios da mesma sala
- unread zera ao marcar leitura
- presence expira apos TTL
- `ensureDefaultRooms()` e idempotente
- `ensureContextRoom()` e idempotente
- reconnect do SSE nao duplica mensagens ja renderizadas
- usuario sem acesso ao cliente nao entra no room contextual do cliente
- resumo do Jarvis vira mensagem `author_kind=jarvis`

## Falhas que o Claude nao pode cometer

- criar FK de `context_id` para uma tabela especifica
- depender de polling para mensagens em vez de SSE
- acoplar Rooms ao drawer do Jarvis como se fosse a mesma conversa
- colocar Room dentro de `notifications`
- usar `localStorage` como source of truth de mensagem
- assumir que `client_id` e sempre UUID
- fazer Jarvis criar tarefa, risco ou briefing sem confirmacao explicita do usuario
- resetar o design do Studio ou inventar UX paralela fora de `/studio/rooms`

## Rollback

- remover item de menu
- remover rota `rooms`
- manter tabelas sem uso ou arquivar migration em rollback manual
- nenhum outro modulo deve depender fortemente de Rooms na Fase 1
