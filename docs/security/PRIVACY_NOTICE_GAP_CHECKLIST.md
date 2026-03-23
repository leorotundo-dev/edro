# Privacy Notice Gap Checklist - Edro Digital

## Objetivo

Comparar o que um `aviso de privacidade` da Edro precisa conter para sustentar cliente enterprise e LGPD com o que ja esta operacionalmente provado dentro do pacote atual.

Este documento nao substitui redacao juridica final. Ele serve para evitar que o aviso publique informacoes sem lastro operacional.

## Regra mestra

- o aviso precisa refletir o tratamento real
- o aviso nao pode inventar base legal, prazo de retencao ou ausencia de transferencia internacional
- sempre que um item depender de confirmacao juridica ou operacional, marcar `parcial` ou `pendente`

## Checklist de gap

| Tema | O que o aviso precisa cobrir | Status em 2026-03-21 | Base interna hoje | Gap principal |
| --- | --- | --- | --- | --- |
| Identificacao do agente | nome empresarial, contato e canais da Edro | parcial | material comercial e operacional disperso | consolidar identificacao oficial e contatos publicos |
| Encarregado / canal de privacidade | contato funcional para titular e autoridade | parcial | modelo operacional e runbook existem | falta prova publica unica e SLA oficial |
| Categorias de titulares | clientes, leads, representantes, freelancers, usuarios internos, participantes de reunioes | parcial | `ROPA_PRELIMINARY_2026-03-21.md` | transformar em texto publico claro |
| Categorias de dados | identificacao, contato, briefing, mensagens, gravacoes, faturamento, logs | parcial | ROPA preliminar | consolidar por fluxo e remover ambiguidade |
| Finalidades | autenticacao, execucao do servico, comunicacao, analytics, suporte, faturamento, logs | parcial | ROPA preliminar | alinhar finalidade por modulo e proposta comercial |
| Papel da Edro | quando a Edro atua como controladora ou operadora | pendente | modelo operacional aponta necessidade | falta validacao juridica por fluxo |
| Base legal | base legal por tratamento principal | pendente | ainda nao formalizada | depende de revisao juridica do ROPA |
| Compartilhamento | fornecedores e parceiros que recebem dados | parcial | subprocessadores preliminares | falta versao validada e viva |
| Transferencia internacional | quando ocorre e por qual fundamento | parcial | mapeamento preliminar de fornecedores externos | falta amarracao juridica por fornecedor |
| Direitos do titular | lista de direitos e como exercelos | parcial | `DATA_SUBJECT_REQUEST_RUNBOOK.md` | falta transformar em canal e texto publico |
| Confirmacao de existencia e acesso | procedimento e prazo interno | parcial | runbook de titular | falta ticketing/evidencia operacional recorrente |
| Correcao, eliminacao e oposicao | limites, excecoes e canal | parcial | runbook de titular | falta aprovar linguagem final com juridico |
| Revogacao de consentimento | quando aplicavel e como solicitar | pendente | sem texto consolidado | depende de base legal por fluxo |
| Cookies e tecnologias similares | o que os portais usam e como informar | pendente | nao consolidado neste pacote | mapear com frontend e juridico |
| Retencao e descarte | prazo ou criterio por categoria | pendente | ainda nao formalizado | precisa matriz de retencao |
| Seguranca da informacao | resumo honesto dos controles tecnicos | parcial | homologacao de producao e hardening tecnico | falta texto publico curto, sem superpromessa |
| Incidente | canal e postura de resposta | parcial | playbook e homologacao | falta owner publico e criterio de comunicacao no aviso |
| Atualizacoes do aviso | data de vigencia e forma de atualizacao | pendente | sem evidencia | incluir governanca minima de revisao |

## O que ja pode ser sustentado com evidencia

- os 3 portais usam sessao por cookie `HttpOnly` com validacao server-side
- webhooks criticos estao autenticados em producao
- backend e frontends respondem com headers de seguranca
- existe runbook para direitos do titular
- existe registro preliminar de subprocessadores
- existe drill tecnico de restore em modo `schema-only`

## O que ainda nao deve ser afirmado no aviso como fechado

- `MFA` obrigatorio para admins
- ausencia de transferencia internacional
- base legal final por fluxo
- prazo final de retencao por categoria
- `pentest` externo concluido
- `restore full` executado com `RTO/RPO`

## Checklist de publicacao

Antes de publicar ou revisar o aviso:

1. validar com juridico o papel da Edro por fluxo principal
2. fechar base legal por macroprocesso
3. alinhar a lista de subprocessadores e paises
4. confirmar canal publico do titular e do encarregado
5. aprovar linguagem de retencao, descarte e incidentes
6. definir owner de revisao periodica do aviso

## Saida minima esperada

O aviso final precisa cobrir, no minimo:

- quem trata os dados e como contatar a Edro
- quais dados sao tratados
- para quais finalidades
- com quem os dados podem ser compartilhados
- se existe transferencia internacional
- quais direitos o titular pode exercer
- como solicitar atendimento
- como a Edro trata seguranca, retencao e atualizacoes do aviso

## Fontes oficiais

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/L13709.htm
- ANPD sobre direitos dos titulares: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares
- ANPD sobre encarregado: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-guia-orientativo-sobre-agentes-de-tratamento-e-encarregado
- ANPD sobre transferencia internacional: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados
