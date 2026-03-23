# LGPD Evidence Matrix - 2026-03-21

## Objetivo

Mapear o que precisa existir para a Edro sustentar uma conversa seria de LGPD com cliente enterprise, auditoria ou juridico.

## Status

Legenda:

- `feito`
- `parcial`
- `pendente`

## Matriz

| Frente | Evidencia exigida | Status em 2026-03-21 | Owner sugerido | Observacao |
| --- | --- | --- | --- | --- |
| Governanca | responsavel executivo formal do programa | parcial | diretoria | papel existe na pratica, precisa formalizacao documental |
| Governanca | encarregado/DPO definido e canal funcional | parcial | juridico/privacidade | precisa prova publica e SLA interno |
| Inventario | ROPA completo por fluxo | pendente | privacidade + produto | template existe em `templates/ROPA_TEMPLATE.md` |
| Papel no tratamento | definicao por fluxo de controlador/operador | pendente | juridico | precisa refletir em contrato e aviso |
| Base legal | base legal por operacao principal | pendente | juridico | depende do ROPA |
| Titular | canal oficial do titular | parcial | operacoes + privacidade | processo descrito, falta evidencia operacional consolidada |
| Titular | workflow de atendimento com SLA e registro | pendente | operacoes | precisa ticketing e historico |
| Avisos | aviso de privacidade atualizado | parcial | juridico | existe gap checklist em `PRIVACY_NOTICE_GAP_CHECKLIST.md` e template base em `templates/PRIVACY_NOTICE_TEMPLATE.md`, falta fechamento juridico-operacional |
| Contratos | DPA padrao | parcial | juridico/comercial | existe prontidao em `DPA_READINESS_CHECKLIST.md` e template base em `templates/DPA_TEMPLATE.md`, falta template juridico aprovado |
| Subprocessadores | registro vivo de subprocessadores | parcial | juridico + compras | existe registro preliminar em `SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md`, falta validacao viva |
| Transferencia internacional | mapeamento por fornecedor e base contratual | parcial | juridico | depende da validacao final do registro de subprocessadores |
| Retencao | matriz de retencao e descarte | pendente | privacidade + engenharia | precisa tabela por categoria |
| Incidente | playbook formal | parcial | seguranca + juridico | template existe em `templates/INCIDENT_PLAYBOOK_TEMPLATE.md` |
| Incidente | tabletop ou simulacao registrada | pendente | seguranca | ainda nao executado |
| RIPD | RIPD para fluxos de maior risco | pendente | privacidade | especialmente IA, reunioes, analytics e integracoes |
| Seguranca tecnica | sessao segura e auth server-side | feito | engenharia | homologado em producao |
| Seguranca tecnica | webhooks autenticados | feito | engenharia | homologado em producao |
| Seguranca tecnica | segregacao entre tenants | parcial | engenharia | base forte implementada, falta suite negativa formal compartilhavel |
| Resiliencia | restore testado | parcial | infra | drill schema-only concluido; falta restore full |
| Evidencia comercial | trust package consolidado | parcial | seguranca + comercial | pacote existe, inclusive resposta padrao de questionario, mas falta completar bloco LGPD final e pentest |

## Evidencias ja disponiveis

- `LGPD_COMPLIANCE_OPERATING_MODEL.md`
- `CLIENT_DUE_DILIGENCE_CHECKLIST.md`
- `templates/ROPA_TEMPLATE.md`
- `templates/SUBPROCESSOR_REGISTER_TEMPLATE.md`
- `templates/INCIDENT_PLAYBOOK_TEMPLATE.md`
- `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md`
- `BACKUP_RESTORE_DRILL_2026-03-21.md`
- `DPA_READINESS_CHECKLIST.md`
- `PRIVACY_NOTICE_GAP_CHECKLIST.md`
- `STANDARD_SECURITY_QUESTIONNAIRE_RESPONSE.md`

## Ordem recomendada de fechamento

1. preencher ROPA
2. definir papel e base legal por fluxo
3. fechar subprocessadores e transferencia internacional
4. implantar workflow do titular
5. fechar DPA e aviso de privacidade
6. executar tabletop de incidente
7. produzir RIPD dos fluxos de maior risco

## Criterio minimo para afirmar maturidade LGPD perante cliente grande

- encarregado e canal do titular ativos
- ROPA dos fluxos principais pronto
- subprocessadores mapeados
- DPA padrao pronto
- incidente e notificacao com owner claro
- retencao minimamente definida
