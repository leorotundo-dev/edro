# Standard Security Questionnaire Response - Edro Digital

## Objetivo

Ter uma resposta padrao para questionarios de seguranca e privacidade de clientes enterprise, separando claramente o que esta `implementado`, `parcialmente implementado` e `ainda em roadmap`.

Nao usar este documento como promessa comercial automatica. Cada resposta enviada a cliente precisa ser revisada conforme o escopo do contrato e o ambiente coberto.

## Regra de preenchimento

- `Sim`
  somente quando houver evidencia tecnica, politica aprovada ou processo operacional real
- `Parcial`
  quando houver base tecnica/processual, mas ainda faltar cobertura completa, formalizacao ou validacao externa
- `Nao`
  quando o controle nao estiver implantado
- `Validar`
  quando depender de juridico, contrato ou confirmacao de fornecedor

## Respostas padrao de alto valor

| Tema | Resposta padrao em 2026-03-21 | Observacao curta | Evidencia interna |
| --- | --- | --- | --- |
| Sessao segura nos portais | Sim | os 3 portais usam cookie `HttpOnly` com validacao server-side | `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md` |
| Token sensivel exposto no browser | Nao | fluxo legado foi removido dos portais cobertos | `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md` |
| Webhooks criticos autenticados | Sim | `Evolution`, `Recall` e `Meta/WhatsApp` validados em producao | `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md` |
| Headers de seguranca em producao | Sim | backend e 3 portais respondem com baseline de headers | `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md` |
| Branch protection e gates de seguranca | Sim | checks obrigatorios e protecao da `main` estao ativos no GitHub | `GITHUB_HARDENING_BASELINE.md` |
| Segregacao entre tenants | Parcial | base tecnica foi reforcada, mas a suite negativa compartilhavel ainda precisa evoluir | `PORTAL_SECURITY_MATRIX.md`, `SECURITY_PROGRAM_TRACKER.md` |
| RBAC por recurso sensivel | Parcial | blocos criticos foram endurecidos, mantendo revisao continua | `PORTAL_SECURITY_MATRIX.md`, `SECURITY_PROGRAM_TRACKER.md` |
| MFA obrigatorio para admins | Parcial | fluxo entrou em codigo e login, mas ainda depende de rollout/homologacao de producao | `SECURITY_PROGRAM_TRACKER.md` |
| WAF ou protecao de borda | Nao | continua como prioridade aberta `SEC-108` | `SECURITY_PROGRAM_TRACKER.md` |
| Monitoramento centralizado e trilha de auditoria madura | Parcial | existe material tecnico e logs relevantes, mas a centralizacao enterprise ainda e backlog | `SECURITY_PROGRAM_TRACKER.md` |
| Backup testado | Parcial | drill `schema-only` executado; falta `restore full` com `RTO/RPO` | `BACKUP_RESTORE_DRILL_2026-03-21.md`, `FULL_RESTORE_RUNBOOK.md` |
| Pentest externo concluido | Nao | pacote de prontidao foi montado, execucao ainda pendente | `PENTEST_READINESS_PACKAGE_2026-03-21.md` |
| ISO 27001 certificada | Nao | existe roadmap e gap assessment previsto, sem certificacao vigente | `ENTERPRISE_SECURITY_MASTER_PLAN.md` |
| SOC 2 Type II | Nao | nao afirmar sem auditoria/certificacao formal | `ENTERPRISE_SECURITY_MASTER_PLAN.md` |
| DPA padrao pronto | Parcial | prontidao mapeada; template juridico final ainda falta | `DPA_READINESS_CHECKLIST.md` |
| Registro de subprocessadores | Parcial | registro preliminar existe; validacao viva contratual ainda falta | `SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md` |
| Transferencia internacional mapeada | Parcial | fornecedores externos foram inferidos; base contratual final ainda precisa fechamento | `SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md`, `LGPD_EVIDENCE_MATRIX_2026-03-21.md` |
| Canal do titular e processo de atendimento | Parcial | runbook existe, falta consolidacao operacional e prova publica | `DATA_SUBJECT_REQUEST_RUNBOOK.md`, `LGPD_EVIDENCE_MATRIX_2026-03-21.md` |
| Encarregado / DPO formalizado | Parcial | papel precisa formalizacao documental e divulgacao consistente | `LGPD_EVIDENCE_MATRIX_2026-03-21.md` |
| Aviso de privacidade alinhado ao tratamento real | Parcial | precisa fechamento juridico-operacional final | `PRIVACY_NOTICE_GAP_CHECKLIST.md` |
| Processo de incidente | Parcial | playbook existe, tabletop ainda pendente | `LGPD_COMPLIANCE_OPERATING_MODEL.md`, `LGPD_EVIDENCE_MATRIX_2026-03-21.md` |

## Respostas curtas prontas para perguntas comuns

### Voces usam MFA para administradores?

Resposta sugerida:

`O fluxo de MFA obrigatorio para admins ja foi implementado no codigo e validado localmente. A afirmacao como controle plenamente ativo depende do rollout e da homologacao em producao.`

### Como protegem sessao e autenticacao dos portais?

Resposta sugerida:

`Os portais Edro, cliente e freelancer usam sessao por cookie HttpOnly com validacao server-side. O modelo com bearer sensivel no browser foi removido do escopo homologado em producao.`

### Como protegem webhooks e integracoes publicas?

Resposta sugerida:

`Os webhooks criticos em producao validam autenticidade/origem e foram homologados com respostas de rejeicao a requests sem assinatura valida.`

### Voces ja fizeram restore de backup?

Resposta sugerida:

`Foi executado um restore drill tecnico em modo schema-only em 21 de marco de 2026. O exercicio full restore com medicao formal de RTO/RPO permanece como proximo passo operacional.`

### Voces ja realizaram pentest externo?

Resposta sugerida:

`O pacote de prontidao para contratacao do pentest ja esta montado, mas a execucao externa ainda nao foi concluida.`

### Voces sao LGPD compliant?

Resposta sugerida:

`A Edro possui um programa de seguranca e privacidade em operacao e evidencias tecnicas importantes ja homologadas. O bloco final de LGPD operacional ainda inclui fechamento de DPA, aviso de privacidade final, subprocessadores validados e workflow completo do titular.`

## Respostas que nao devem ser usadas sem validacao adicional

- `Sim, todos os dados ficam no Brasil`
- `Sim, temos certificacao ISO 27001`
- `Sim, temos SOC 2`
- `Sim, todo admin usa MFA`
- `Sim, toda a trilha LGPD esta concluida`
- `Nao existe risco de vazamento`

## Pacote que deve acompanhar as respostas

- `TRUST_PACKAGE_STATUS_2026-03-21.md`
- `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md`
- `BACKUP_RESTORE_DRILL_2026-03-21.md`
- `LGPD_EVIDENCE_MATRIX_2026-03-21.md`
- `DPA_READINESS_CHECKLIST.md`
- `PRIVACY_NOTICE_GAP_CHECKLIST.md`
- `SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md`

## Criterio de uso externo

Antes de enviar este material para cliente:

1. revisar respostas `Parcial` com juridico, seguranca e comercial
2. retirar qualquer afirmacao nao sustentada por evidencia do ambiente contratado
3. anexar somente as evidencias realmente aplicaveis ao escopo negociado
