# Arquitetura Edro

## Componentes
- Edro Web (Next.js) - painel interno.
- Edro API (Fastify) - regras, dados e IA.
- Postgres - dados do fluxo.
- Power Automate - orquestracao externa.
- iClips - tarefas e projetos.
- ChatGPT API - geracao criativa de copys.
- Gemini API - validacao, checklist e formatacao.
- Ad Creative - geracao visual.
- WhatsApp provider - notificacoes.
- Google Workspace - email.

## Fluxo principal
Edro Web -> Edro API -> DB
Edro API -> ChatGPT
Edro API -> Email/WhatsApp
Edro API -> iClips (entrada/entrega)
Power Automate -> ChatGPT/Ad Creative/iClips (quando usado como orquestrador)

## Modelo de dados
- edro_users (email, role, status)
- edro_login_codes (email, code_hash, expires_at)
- edro_clients
- edro_briefings (status atual)
- edro_briefing_stages (kanban e bloqueios)
- edro_copy_versions
- edro_copy_versions.payload guarda JSON + texto formatado da validacao Gemini
- edro_tasks
- edro_notifications

## Endpoints principais
- POST /api/auth/request
- POST /api/auth/verify
- GET /api/edro/workflow
- GET /api/edro/briefings
- POST /api/edro/briefings
- GET /api/edro/briefings/:id
- PATCH /api/edro/briefings/:id/stages/:stage
- POST /api/edro/briefings/:id/copy
- POST /api/edro/briefings/:id/assign-da

## Regras de acesso
- Dominio permitido por EDRO_ALLOWED_DOMAINS.
- Aprovacao exige role gestor.

## Observabilidade
- Logs estruturados por etapa e notificacao.
- Status de notificacao armazenado em edro_notifications.
