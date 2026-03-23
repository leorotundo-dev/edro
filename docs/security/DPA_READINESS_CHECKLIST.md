# DPA Readiness Checklist - Edro Digital

## Objetivo

Organizar o minimo que a Edro precisa ter em maos para negociar um `DPA` ou anexo de tratamento de dados com cliente enterprise sem improviso e sem prometer maturidade nao evidenciada.

Este documento nao substitui revisao juridica. Ele serve para preparar insumo tecnico-operacional e acelerar a validacao contratual.

## Regra de uso

- marcar como `feito`, `parcial` ou `pendente`
- nao afirmar clausula ou posicao juridica sem validacao do juridico
- alinhar o `DPA` ao papel real da Edro em cada fluxo: `controladora`, `operadora` ou `controladora conjunta`, quando aplicavel

## Checklist minimo de prontidao

| Frente | O que precisa existir | Status em 2026-03-21 | Owner sugerido | Observacao |
| --- | --- | --- | --- | --- |
| Identificacao das partes | razao social, CNPJ, endereco e contato contratual da Edro | pendente | juridico/comercial | precisa versao comercial padrao |
| Papel no tratamento | definicao por fluxo principal se a Edro atua como controladora ou operadora | parcial | juridico + produto | `ROPA_PRELIMINARY_2026-03-21.md` ajuda, mas falta validacao juridica |
| Escopo do tratamento | descricao dos servicos, categorias de dados e categorias de titulares | parcial | produto + privacidade | insumo ja inferido no ROPA preliminar |
| Finalidade | finalidades contratuais claras por modulo/servico | parcial | produto + juridico | precisa bater com aviso e proposta comercial |
| Instrucoes do cliente | mecanismo para receber e registrar instrucoes do controlador, quando aplicavel | pendente | operacoes + juridico | precisa fluxo pratico e owner |
| Medidas de seguranca | anexo tecnico resumindo sessao, hardening, webhooks, segregacao e restore | parcial | seguranca | base tecnica existe; falta versao contratual curta |
| Subprocessadores | lista atualizada com servico, pais e categoria de dado | parcial | juridico + compras | existe registro preliminar, falta validacao viva |
| Transferencia internacional | base contratual e mecanismo por fornecedor externo | parcial | juridico | mapear fornecedores fora do Brasil e clausulas aplicadas |
| Direitos do titular | fluxo para receber, validar e executar pedidos | parcial | privacidade + operacoes | runbook existe, falta prova operacional recorrente |
| Incidente | regra de notificacao, prazo interno e pontos de contato | parcial | seguranca + juridico | playbook existe; tabletop e owner final ainda faltam |
| Retencao e descarte | tabela por categoria de dado e evento de contagem | pendente | privacidade + engenharia | ainda nao consolidado |
| Retorno/exclusao ao termino | processo de devolucao, exclusao ou anonimizacao | pendente | operacoes + engenharia | precisa capacidade operacional clara |
| Auditoria e evidencias | posicao da Edro sobre auditoria, questionario e evidencias substitutivas | pendente | juridico + seguranca | definir pacote padrao para evitar auditoria ad hoc sem limite |
| Responsabilidades reciprocas | limites, cooperacao e alocacao de deveres | pendente | juridico | depende da posicao contratual da Edro por fluxo |

## Clausulas que normalmente aparecem e como preparar resposta

### 1. Objeto e escopo

- descrever o servico contratado em linguagem comercial
- amarrar o tratamento ao servico de forma objetiva
- evitar escopo amplo demais

### 2. Papel das partes

- registrar quando o cliente e `controlador`
- registrar quando a Edro atua como `operadora`
- separar fluxos em que a Edro possa atuar como `controladora` por conta propria

### 3. Categorias de dados e titulares

- titulares: clientes finais, representantes do cliente, leads, usuarios internos, freelancers, participantes de reuniao
- dados: identificacao, contato, conteudo de briefing, mensagens, gravacoes/transcricoes, faturamento, logs

### 4. Medidas de seguranca

Material tecnico ja disponivel para sustentar uma clausula resumida:

- sessao `HttpOnly` e validacao server-side nos 3 portais
- autenticidade de webhooks criticos em producao
- headers de seguranca em backend e frontends
- branch protection e gates de seguranca no GitHub
- restore tecnico `schema-only` documentado

Material ainda em aberto e que nao deve ser prometido como concluido:

- `MFA` obrigatorio para admins
- `WAF` e protecao de borda
- `pentest` externo concluido
- `restore full` com `RTO/RPO` medidos

### 5. Subprocessadores

Preparar anexo com:

- nome do fornecedor
- servico prestado
- localizacao/pais
- categoria de dado
- base contratual de transferencia internacional, quando houver

### 6. Incidente

O contrato precisa prever:

- canal de notificacao
- conteudo minimo da notificacao
- cooperacao entre as partes
- fluxo para resposta ao titular e regulador

Observacao: a ANPD informa prazo de `3 dias uteis` para comunicacao pelo controlador de incidente com risco ou dano relevante, nos termos da Resolução CD/ANPD nº 15/2024. O prazo contratual interno da Edro deve ser mais curto.

### 7. Retencao, devolucao e descarte

Sem uma tabela de retencao pronta, evitar prometer prazos especificos em `DPA`. Primeiro consolidar:

- regra por categoria
- evento inicial de contagem
- excecoes legais/contratuais
- tratamento de backup

## Pacote minimo que deve acompanhar o DPA

- `ROPA_PRELIMINARY_2026-03-21.md`
- `SUBPROCESSOR_REGISTER_PRELIMINARY_2026-03-21.md`
- `LGPD_COMPLIANCE_OPERATING_MODEL.md`
- `DATA_SUBJECT_REQUEST_RUNBOOK.md`
- `PRODUCTION_HOMOLOGATION_REPORT_2026-03-21.md`
- `BACKUP_RESTORE_DRILL_2026-03-21.md`
- `TRUST_PACKAGE_STATUS_2026-03-21.md`

## Gaps que ainda bloqueiam um DPA forte

- ausencia de posicao juridica final por fluxo sobre `controladora` vs `operadora`
- ausencia de tabela final de retencao e descarte
- ausencia de template contratual efetivamente aprovado pelo juridico
- ausencia de inventario final de subprocessadores com clausulas confirmadas
- ausencia de `MFA` obrigatorio para admins

## Criterio de pronto

O `DPA` so deve ser tratado como realmente pronto quando existirem ao mesmo tempo:

- template juridico aprovado
- anexo de subprocessadores validado
- posicao documentada por fluxo principal
- canal do titular e encarregado definidos
- seguranca tecnica e incidente refletidos no texto sem prometer o que ainda esta em roadmap

## Fontes oficiais

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm
- ANPD sobre agentes de tratamento e encarregado: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-orientativo-sobre-agentes-de-tratamento-e-encarregado
- ANPD sobre incidente de seguranca: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis
- ANPD sobre transferencia internacional: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados
