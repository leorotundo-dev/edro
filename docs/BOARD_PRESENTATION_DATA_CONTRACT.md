# Board Presentation Data Contract

Este documento define a fonte de verdade dos dados usados no produto `Board Presentation`.

Regra-mãe:
- sem dado, sem deck
- `Reportei` é obrigatório para toda rede ativa suportada
- o deck não usa o PDF mensal antigo como fonte
- a IA só escreve narrativa sobre dados já fechados no `source_snapshot`

## Objetos canônicos

| Objeto | Fonte de verdade | Local |
| --- | --- | --- |
| Conta do cliente | `clients` | `apps/backend/src/services/boardPresentationService.ts` |
| Redes ativas | `connectors(provider='reportei').payload.platforms` | `apps/backend/src/providers/reportei/reporteiConnector.ts` |
| Performance digital | `reportei_metric_snapshots` | `apps/backend/src/services/boardPresentationService.ts` |
| Entregas do mês | `edro_briefings` | `apps/backend/src/services/boardPresentationService.ts` |
| Deck editado/aprovado | `client_board_presentations` | `apps/backend/src/db/migrations/0323_board_presentations.sql` |
| Relatório PDF mensal | legado, fora do source do Board | `apps/backend/src/db/migrations/0224_monthly_reports.sql` |

## Regras transversais

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `tenant_id` | cliente selecionado | `clients.tenant_id` | sim | inferência manual |
| `client_id` | cliente selecionado | `clients.id` | sim | nome do cliente |
| `period_month` | input do usuário | request + `boardPresentationService` | sim | mês corrente parcial |
| `period_closed` | função determinística | `isClosedMonth()` em `boardPresentationService` | sim | override manual |
| `active_platforms` | conector Reportei | `connectors.payload.platforms` | sim | suposição de canal ativo |
| `last_reportei_snapshot_at` | último snapshot válido | `reportei_metric_snapshots.synced_at` | sim | data inserida manualmente |
| `manual_inputs_complete` | inputs executivos | `client_board_presentations.manual_inputs` | sim para IA/export | texto inventado pela IA |

## Slide 1 — Capa

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `client_name` | nome do cliente | `clients.name` | sim | nome digitado manualmente |
| `segment_primary` | segmento principal | `clients.segment_primary` | não | qualquer taxonomia externa |
| `city` / `uf` | cadastro do cliente | `clients.city`, `clients.uf` | não | texto livre |
| `period_label` | derivado de `period_month` | `getMonthLabel()` | sim | label manual |
| `entregas_no_mes` | contagem de briefings do mês | `edro_briefings` | não | número manual |
| `seguidores_totais` | soma por plataforma | `reportei_metric_snapshots.metrics` | sim | input humano |

## Slide 2 — Contexto Executivo e Accountability

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `diretriz_da_ultima_reuniao` | input executivo | `client_board_presentations.manual_inputs` | sim | IA inferir reunião |
| `leitura_geral_do_mes` | input executivo | `client_board_presentations.manual_inputs` | sim | IA inferir síntese |
| `committed_priorities` | não estruturado na v1 | input manual | não na v1 | extrair de PDF legado |
| `delivered_vs_committed` | não estruturado na v1 | input manual + contexto do mês | não na v1 | inventar accountability |

Observação:
- na v1, esse slide é `manual-first`
- evolução recomendada: fonte canônica em `meetings` + `meeting_actions`

## Slide 3 — Status Geral do Mês

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `jobs_total` | total do mês | `edro_briefings` | não | número manual |
| `jobs_completed` | status concluído | `edro_briefings.status` | não | estimativa manual |
| `jobs_in_review` | status em aprovação/review | `edro_briefings.status` | não | usar outro status parecido |
| `jobs_overdue` | prazo vencido + não concluído | `edro_briefings.due_at`, `status` | não | percepção manual |
| `stage_summary` | agrupamento por status | `edro_briefings.status` | não | resumo narrativo sem base |
| `ponto_de_atencao_do_mes` | input executivo | `client_board_presentations.manual_inputs` | sim para IA | ignorar input |
| `overall_status` | leitura editorial baseada no snapshot | IA + regras de negócio | não na v1 | status sem base numérica |

## Slide 4 — Entregas-Chave

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `highlights` | briefings mais relevantes do mês | `edro_briefings` | não | lista manual sem vínculo |
| `title` | título do briefing | `edro_briefings.title` | não | resumo inventado |
| `status` | status do briefing | `edro_briefings.status` | não | traduzir sem mapear |
| `due_at` | prazo da demanda | `edro_briefings.due_at` | não | data manual |
| `platform/channel` | canal da demanda | `edro_briefings.payload` | não | inferência da IA |

Observação:
- na v1, a seleção é por atualização recente
- evolução recomendada: score de relevância por impacto

## Slide 5 — Impacto no Negócio

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `visibilidade_agregada` | soma das métricas de visibilidade | `reportei_metric_snapshots` via adapter | sim | número manual |
| `delta_followers_abs` | delta do mês | `reportei_metric_snapshots` | sim | estimativa |
| `delta_followers_pct` | delta percentual do mês | `reportei_metric_snapshots` | sim | arredondamento manual |
| `linked_deliveries` | ainda não estruturado na v1 | indireto via `edro_briefings` | não na v1 | associação inventada |
| `impact_narrative` | leitura editorial sobre dados válidos | IA + inputs + snapshot | não | texto solto sem fonte |

Observação:
- esse slide hoje prova `o que mudou`
- ainda não prova bem `qual entrega causou a mudança`

## Slide 6 — Performance e Presença Digital

Esse é o slide com contrato mais rígido.

### Por plataforma ativa

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `followers_total` | snapshot atual | `reportei_metric_snapshots.metrics` | sim | valor manual |
| `followers_delta_abs` | métrica delta ou comparação com mês anterior | `reportei_metric_snapshots.metrics` | sim | cálculo sem snapshot anterior |
| `followers_delta_pct` | comparação percentual | `reportei_metric_snapshots.metrics` | sim | percentual manual |
| `visibility_metric` | adapter por plataforma | `boardPresentationService.PLATFORM_DEFINITIONS` | sim | qualquer métrica não mapeada |
| `engagement_metric` | adapter por plataforma | `boardPresentationService.PLATFORM_DEFINITIONS` | sim | qualquer métrica não mapeada |
| `snapshot_period_end` | snapshot do mês | `reportei_metric_snapshots.period_end` | sim | data manual |
| `snapshot_date` | sync do snapshot | `reportei_metric_snapshots.synced_at` | sim | data fictícia |

### Métricas aceitas hoje

| Plataforma | Seguidores | Visibilidade | Engajamento |
| --- | --- | --- | --- |
| Instagram | `ig:followers_count` | `ig:reach` ou `ig:impressions` | `ig:feed_engagement_rate` ou `ig:feed_engagement` |
| LinkedIn | `li:followers_count` | `li:unique_impressions` ou `li:impressions` | `li:engagement_rate` ou `li:engagement` |

### Gráficos didáticos

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `followers_trend` | série histórica de snapshots | `reportei_metric_snapshots` | sim | linha inventada |
| `reach_comparison` | snapshot atual por plataforma | `reportei_metric_snapshots` | sim | barra manual |
| `engagement_comparison` | snapshot atual por plataforma | `reportei_metric_snapshots` | sim | barra manual |

## Slide 7 — Riscos e Gargalos

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `jobs_overdue` | atrasos do mês | `edro_briefings` | não | número manual |
| `snapshot_risk` | freshness dos snapshots | `reportei_metric_snapshots.synced_at` | sim se faltar snapshot | “dados parecem ok” |
| `ponto_de_atencao_do_mes` | input executivo | `client_board_presentations.manual_inputs` | sim para IA | IA inventar gargalo |
| `risk_narrative` | leitura editorial sobre atraso, aprovação e dados | IA + input + snapshot | não | texto genérico sem base |

Evolução recomendada:
- enriquecer com `jobs`
- enriquecer com `project_cards`
- enriquecer com dados de `approval`

## Slide 8 — Prioridades do Próximo Mês

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `proximos_passos_para_o_board` | input executivo | `client_board_presentations.manual_inputs` | sim | IA decidir sozinha |
| `next_cycle_label` | derivado de mês | `getNextMonth()` | não | label manual |
| `top_platform` | plataforma com snapshot válido | `reportei_metric_snapshots` | não | plataforma arbitrária |
| `priority_rationale` | leitura editorial apoiada em dados do mês | IA + input + snapshot | não | texto sem base |

Observação:
- esse slide é `manual-first` na v1
- evolução ideal: objeto canônico de prioridades mensais

## Slide 9 — Fechamento

| Campo | Fonte de verdade | Tabela/serviço | Bloqueia? | Fallback proibido |
| --- | --- | --- | --- | --- |
| `month_synthesis` | input executivo | `client_board_presentations.manual_inputs.leitura_geral_do_mes` | sim | IA sintetizar sozinha |
| `board_message` | leitura editorial final | IA + input manual | não | texto genérico sem snapshot |
| `next_step_summary` | input executivo | `client_board_presentations.manual_inputs.proximos_passos_para_o_board` | sim | IA propor próximos passos sem direção |
| `supporting_visibility` | dado agregado do mês | `reportei_metric_snapshots` | não | número manual |

## O que bloqueia oficialmente a geração/exportação

| Regra | Status |
| --- | --- |
| mês corrente ou futuro | bloqueia |
| cliente sem conector Reportei | bloqueia |
| conector sem token | bloqueia |
| nenhuma rede ativa suportada | bloqueia |
| plataforma ativa ainda não suportada na v1 | bloqueia |
| ausência de snapshot `30d` compatível com o mês | bloqueia |
| ausência de seguidores totais | bloqueia |
| ausência de delta de seguidores | bloqueia |
| ausência de visibilidade | bloqueia |
| ausência de engajamento | bloqueia |
| snapshot desatualizado | bloqueia |
| inputs manuais incompletos | bloqueia geração IA |
| readiness diferente de `ready` | bloqueia exportação |

## Fallbacks proibidos globalmente

- usar `client_monthly_reports` como source do deck
- usar `learned_insights` como substituto de Reportei
- digitar seguidores, alcance ou engajamento manualmente
- marcar rede como ativa sem conector ou snapshot válido
- usar narrativa da IA para preencher lacunas de métrica

## Gaps conhecidos da v1

| Tema | Estado atual | Evolução recomendada |
| --- | --- | --- |
| Accountability estruturado | manual-first | `meetings` + `meeting_actions` |
| Causalidade entre entrega e resultado | indireta | vínculo explícito entrega -> impacto |
| Aprovação como dado de Board | resumida | usar `briefing_artworks` e fluxo de revisão |
| Prioridades futuras | manual-first | objeto mensal próprio |
| Financeiro no deck Board | fora da v1 | decidir se entra em versão futura |

## Referências de código

- Serviço principal: [apps/backend/src/services/boardPresentationService.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/services/boardPresentationService.ts)
- Conector Reportei: [apps/backend/src/providers/reportei/reporteiConnector.ts](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/providers/reportei/reporteiConnector.ts)
- Tabela de deck: [apps/backend/src/db/migrations/0323_board_presentations.sql](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/db/migrations/0323_board_presentations.sql)
- Relatório PDF legado: [apps/backend/src/db/migrations/0224_monthly_reports.sql](/C:/Users/leoro/Documents/Edro.Digital__deploy_main_current/apps/backend/src/db/migrations/0224_monthly_reports.sql)
