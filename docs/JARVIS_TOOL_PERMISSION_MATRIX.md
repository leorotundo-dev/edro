# Jarvis Tool Permission Matrix

## Contexto
Hoje o `Jarvis` entra pela rota [`/jarvis/chat`](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/routes/jarvis.ts) com `authGuard`, mas sem `requirePerm(...)` e sem `requireClientPerm(...)` centralizados por tool.

O que já existe:
- `authGuard` e MFA privilegiado em [`rbac.ts`](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/auth/rbac.ts)
- papéis do portal em [`portalClientPerms.ts`](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/auth/portalClientPerms.ts)
- governança por tool em [`jarvisPolicyService.ts`](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/services/jarvisPolicyService.ts)
- enforcement de governança em [`toolExecutor.ts`](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/services/ai/toolExecutor.ts)

## Leitura da matriz
- `Deve exigir`: o mínimo correto para a tool
- `Hoje`: o que de fato existe no código
- `Gap`: onde a implementação ainda está frouxa

Legenda:
- `auth`: autenticado via `authGuard`
- `gov:auto`: governança `auto`
- `gov:review`: governança `review`
- `gov:confirm`: governança `confirm`
- `handler:confirm`: o próprio handler exige `args.confirmed === true`
- `portal:request|approve`: capability real do portal

## Gaps críticos hoje
- `delete_briefing` e `archive_briefing` não têm política dedicada de destruição/cancelamento; caem no default `auto`.
- várias tools de escrita relevante ficam só em `gov:review`, sem RBAC real por domínio.
- a rota do Jarvis não amarra a execução a `clients:read`, `clients:write`, `admin:jobs`, `posts:review`, `calendars:write` por tool.
- `detectExplicitConfirmation()` existe, mas o enforcement real depende de `args.confirmed`.
- tools de operações fortes executam com governança, mas não com `requirePerm('admin:jobs')` no nível da tool.

## 1. Briefings e workflow

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `list_briefings` | `auth` + `clients:read` + escopo do cliente | `auth` + `gov:auto` | falta `clients:read`/escopo explícito |
| `get_briefing` | `auth` + `clients:read` + escopo do cliente | `auth` + `gov:auto` | falta `clients:read`/escopo explícito |
| `create_briefing` | `auth` + `clients:write` + escopo do cliente | `auth` + `gov:review` | falta `clients:write` real |
| `update_briefing_status` | `auth` + `clients:write`; `confirm` se cancelar | `auth` + `gov:review/confirm` | falta `clients:write` real |
| `generate_copy_for_briefing` | `auth` + `clients:read` | `auth` + `gov:auto` | aceitável, mas sem RBAC explícito |
| `delete_briefing` | `auth` + `clients:write` + `confirm` | `auth` + `gov:auto` | gap crítico |
| `archive_briefing` | `auth` + `clients:write` + `confirm` | `auth` + `gov:auto` | gap crítico |
| `generate_approval_link` | `auth` + `posts:review` ou `clients:write` | `auth` + `gov:auto` | deveria exigir perm de aprovação/review |
| `schedule_briefing` | `auth` + `calendars:write` ou `clients:write` + `confirm` | `auth` + `gov:auto` | faltam perm e confirmação |
| `update_task` | `auth` + `clients:write` | `auth` + `gov:auto` | deveria ser `review` |
| `generate_strategic_brief` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `compute_behavior_profiles` | `auth` + `clients:read/write` | `auth` + `gov:auto` | escreve/atualiza modelo derivado sem RBAC explícito |
| `compute_learning_rules` | `auth` + `clients:read/write` | `auth` + `gov:auto` | escreve/atualiza modelo derivado sem RBAC explícito |

## 2. Calendário, campanhas e biblioteca

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `list_upcoming_events` | `auth` + `calendars:read` | `auth` + `gov:auto` | falta perm explícita |
| `search_events` | `auth` + `events:read` | `auth` + `gov:auto` | falta perm explícita |
| `get_event_relevance` | `auth` + `events:read` | `auth` + `gov:auto` | falta perm explícita |
| `add_calendar_event` | `auth` + `calendars:write` + escopo do cliente | `auth` + `gov:review` | falta perm explícita |
| `create_campaign` | `auth` + `clients:write` | `auth` + `gov:review` | falta perm explícita |
| `generate_campaign_strategy` | `auth` + `clients:read` | `auth` + `gov:auto` | aceitável |
| `generate_behavioral_copy` | `auth` + `clients:read` | `auth` + `gov:auto` | aceitável |
| `add_library_note` | `auth` + `library:write` | `auth` + `gov:review` | falta `library:write` real |
| `add_library_url` | `auth` + `library:write` | `auth` + `gov:review` | falta `library:write` real |
| `search_library` | `auth` + `library:read` | `auth` + `gov:auto` | falta perm explícita |
| `list_library_items` | `auth` + `library:read` | `auth` + `gov:auto` | falta perm explícita |

## 3. Clipping, social e oportunidades

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `create_briefing_from_clipping` | `auth` + `clients:write` + `clipping:read` | `auth` + `gov:review` | falta perm explícita |
| `pin_clipping_item` | `auth` + `clipping:write` | `auth` + `gov:auto` | deveria ser `review`/perm explícita |
| `archive_clipping_item` | `auth` + `clipping:write` + `confirm` | `auth` + `gov:auto` | gap importante |
| `search_clipping` | `auth` + `clipping:read` | `auth` + `gov:auto` | falta perm explícita |
| `get_clipping_item` | `auth` + `clipping:read` | `auth` + `gov:auto` | falta perm explícita |
| `list_clipping_sources` | `auth` + `clipping:read` | `auth` + `gov:auto` | falta perm explícita |
| `list_social_trends` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `search_social_mentions` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `list_social_keywords` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `list_opportunities` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `action_opportunity` | `auth` + `clients:write` + `review` | `auth` + `gov:auto` | deveria subir para `review` |
| `add_clipping_source` | `auth` + `clipping:write` | `auth` + `gov:auto` | deveria ser `review` |
| `pause_clipping_source` | `auth` + `clipping:write` | `auth` + `gov:auto` | deveria ser `review` |
| `resume_clipping_source` | `auth` + `clipping:write` | `auth` + `gov:auto` | deveria ser `review` |

## 4. Inteligência, pesquisa e consulta

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `get_client_profile` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `get_intelligence_health` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `search_client_content` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `list_client_sources` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `get_client_insights` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `retrieve_client_evidence` | `auth` + `clients:read` + escopo do cliente | `auth` + `gov:auto` | falta escopo explícito |
| `web_search` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `web_extract` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `web_research` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `analyze_cognitive_load` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `consult_gemini` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `consult_openai` | `auth` + `clients:read` | `auth` + `gov:auto` | baixo risco |
| `search_whatsapp_messages` | `auth` + `clients:read` + permissão de dados sensíveis | `auth` + `gov:auto` | deveria ter escopo mais duro |
| `list_whatsapp_groups` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `get_whatsapp_insights` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `get_whatsapp_digests` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |

## 5. Pauta, aprovação e publicação

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `generate_pauta` | `auth` + `clients:read` | `auth` + `gov:auto` | aceitável |
| `list_pauta_inbox` | `auth` + `clients:read` | `auth` + `gov:auto` | falta perm explícita |
| `approve_pauta` | `auth` + `posts:review` | `auth` + `gov:auto` | deveria exigir perm específica |
| `reject_pauta` | `auth` + `posts:review` + `confirm` | `auth` + `gov:auto` | gap importante |
| `create_post_pipeline` | `auth` + `clients:write` | `auth` + `gov:review` | falta perm explícita |
| `prepare_post_approval` | `auth` + `posts:review` + `confirm` | `auth` + `gov:confirm` | falta perm explícita |
| `schedule_post_publication` | `auth` + `posts:review` + `confirm` | `auth` + `gov:confirm` + `handler:confirm` | ainda falta perm explícita |
| `publish_studio_post` | `auth` + `posts:review` + `confirm` + MFA privilegiado | `auth` + `gov:confirm` + `handler:confirm` | ainda falta perm explícita |

## 6. Operações

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `list_operations_jobs` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_operations_job` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_operations_overview` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_operations_risks` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_operations_signals` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_operations_team` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_creative_ops_workload` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_da_capacity` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `suggest_job_allocation` | `auth` + `admin:jobs` | `auth` + `gov:auto` | deveria ser pelo menos `review` |
| `suggest_creative_redistribution` | `auth` + `admin:jobs` | `auth` + `gov:auto` | deveria ser pelo menos `review` |
| `get_creative_ops_risk_report` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_creative_ops_quality` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `get_creative_ops_bottlenecks` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `apply_job_allocation_recommendation` | `auth` + `admin:jobs` + `confirm` | `auth` + `gov:confirm` | falta `admin:jobs` |
| `apply_creative_redistribution` | `auth` + `admin:jobs` + `confirm` | `auth` + `gov:confirm` | falta `admin:jobs` |
| `get_operations_lookups` | `auth` + `admin:jobs` | `auth` + `gov:auto` | falta `admin:jobs` |
| `create_operations_job` | `auth` + `admin:jobs` + `review` | `auth` + `gov:review` | falta `admin:jobs` |
| `update_operations_job` | `auth` + `admin:jobs` + `review` | `auth` + `gov:review` | falta `admin:jobs` |
| `change_job_status` | `auth` + `admin:jobs`; `confirm` se destrutivo | `auth` + `gov:review/confirm` | falta `admin:jobs` |
| `assign_job_owner` | `auth` + `admin:jobs` + `confirm` | `auth` + `gov:confirm` | falta `admin:jobs` |
| `resolve_operations_signal` | `auth` + `admin:jobs` + `review` | `auth` + `gov:auto` | deveria ser `review` |
| `snooze_operations_signal` | `auth` + `admin:jobs` + `review` | `auth` + `gov:auto` | deveria ser `review` |
| `manage_job_allocation` | `auth` + `admin:jobs` + `confirm` | `auth` + `gov:confirm` | falta `admin:jobs` |

## 7. Job briefings e drafts criativos

| Tool | Deve exigir | Hoje | Gap |
|---|---|---|---|
| `get_job_briefing` | `auth` + `clients:read` ou `admin:jobs` | `auth` + `gov:auto` | falta perm explícita |
| `fill_job_briefing` | `auth` + `clients:write` ou `admin:jobs` | `auth` + `gov:review` | falta perm explícita |
| `submit_job_briefing` | `auth` + `clients:write` ou `admin:jobs` | `auth` + `gov:review` | falta perm explícita |
| `approve_job_briefing` | `auth` + `posts:review` ou capability `approve` | `auth` + `gov:review` | deveria ter perm explícita de aprovação |
| `get_job_creative_drafts` | `auth` + `clients:read` ou `admin:jobs` | `auth` + `gov:auto` | falta perm explícita |
| `approve_creative_draft` | `auth` + `posts:review` ou capability `approve` | `auth` + `gov:review` | deveria ter perm explícita de aprovação |
| `regenerate_creative_draft` | `auth` + `clients:write` ou `posts:review` | `auth` + `gov:auto` | deveria subir para `review` |

## 8. Portal do cliente

Essas capabilities já existem fora do Jarvis em [`portalClientPerms.ts`](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/auth/portalClientPerms.ts):

| Capability | Já temos |
|---|---|
| `read` | `viewer`, `requester`, `approver`, `admin` |
| `request` | `requester`, `admin` |
| `approve` | `approver`, `admin` |

Se o Jarvis for exposto dentro do portal do cliente, as tools abaixo devem respeitar isso:
- `viewer`: apenas `read`
- `requester`: `create_briefing`, `fill_job_briefing`, `submit_job_briefing`
- `approver`: `approve_job_briefing`, `approve_creative_draft`, `generate_approval_link`
- `admin`: todos os fluxos do portal

## Recomendações práticas
1. Adicionar um registry de permissão por tool ao lado de `toolPolicyDraft()`.
2. Na rota do Jarvis, resolver `role` e `client scope` antes de liberar a tool.
3. Fazer `executeTool()` e `executeOperationsTool()` validarem:
   - `requirePerm` equivalente
   - `requireClientPerm` quando houver `clientId`
   - `requirePortalCapability` no portal
4. Promover para `confirm` algumas tools hoje frouxas:
   - `delete_briefing`
   - `archive_briefing`
   - `archive_clipping_item`
   - `reject_pauta`
5. Promover para `review` algumas tools hoje automáticas:
   - `pin_clipping_item`
   - `action_opportunity`
   - `add_clipping_source`
   - `pause_clipping_source`
   - `resume_clipping_source`
   - `resolve_operations_signal`
   - `snooze_operations_signal`
   - `regenerate_creative_draft`
