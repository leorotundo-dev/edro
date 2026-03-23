# Data Subject Request Runbook

## Objetivo

Operacionalizar o atendimento aos direitos do titular sem improviso, com trilha de decisao, dono claro e registro de evidencia.

## Escopo

Pedidos relacionados a:

- confirmacao de tratamento
- acesso
- correcao
- anonimização, bloqueio ou exclusao quando cabivel
- portabilidade quando aplicavel
- informacao sobre compartilhamento
- revogacao de consentimento quando aplicavel
- oposicao ou revisao de tratamento especifico quando aplicavel

## Donos minimos

- owner operacional do ticket
- owner juridico/privacidade
- owner tecnico para discovery e execucao
- owner executivo para casos sensiveis

## Canais aceitos

- canal oficial do titular
- email oficial definido pela Edro
- abertura via cliente enterprise quando contratualmente previsto

## Etapa 1 - Recebimento

Registrar no ticket:

- data e hora
- canal de entrada
- nome do solicitante
- relacao com a Edro:
  - cliente
  - usuario do cliente
  - freelancer
  - colaborador
  - outro
- tipo de pedido

## Etapa 2 - Verificacao de identidade

### Regra

Nao executar alteracao, exclusao ou exportacao sem verificacao minima de identidade.

### Evidencias aceitas

- resposta pelo email ja cadastrado
- validacao por portal autenticado
- validacao contratual via ponto de contato oficial do cliente
- dupla confirmacao quando houver pedido sensivel

Se a identidade nao puder ser validada:

- responder solicitando complemento
- colocar ticket em `aguardando validacao`

## Etapa 3 - Classificacao

Classificar o pedido como:

- `DSR-ACCESS`
- `DSR-CORRECTION`
- `DSR-DELETION`
- `DSR-EXPORT`
- `DSR-SHARING`
- `DSR-CONSENT`
- `DSR-OTHER`

Tambem registrar:

- sistemas potencialmente impactados
- risco juridico
- necessidade de escalacao

## Etapa 4 - Discovery

Usar como chaves de busca conforme o caso:

- email
- telefone
- client_id
- freelancer_id
- person_id
- meeting id
- message id
- portal token id

Sistemas a verificar no minimo:

- autenticacao e membership
- portal cliente
- portal freelancer
- briefings, jobs e producao
- comunicacoes e webhooks
- reunioes, gravacoes e transcricoes
- financeiro
- logs e auditoria
- storage e anexos

## Etapa 5 - Decisao

### Acesso

- consolidar os sistemas onde ha dado
- exportar apenas o que for devido e proporcional
- revisar se ha dado de terceiro misturado

### Correcao

- corrigir na origem principal
- propagar quando houver replicas ou espelhos relevantes

### Exclusao / anonimização

- verificar obrigacoes legais, contratuais e de defesa
- executar exclusao ou anonimização quando cabivel
- quando nao for cabivel, responder com fundamento e limite

### Compartilhamento

- listar subprocessadores e terceiros pertinentes ao fluxo

## Etapa 6 - Resposta

A resposta deve incluir:

- confirmacao do tipo de pedido processado
- o que foi feito
- o que nao foi possivel fazer e por que
- data de conclusao
- ponto de contato para contestacao

## SLA interno recomendado

- confirmacao de recebimento:
  `24h`
- triagem e validacao de identidade:
  `2 dias uteis`
- resposta inicial consolidada:
  `ate 7 dias uteis`

Se o caso for complexo, registrar justificativa e escalacao.

## Evidencias a guardar

- ticket
- prova de identidade
- consultas realizadas
- sistemas afetados
- aprovacao juridica quando houver excecao
- resposta enviada
- data de encerramento

## Sinais de escalacao imediata

- pedido envolve exclusao de grande volume
- pedido afeta cliente enterprise
- pedido envolve reunioes, transcricoes ou IA
- pedido cita ANPD, processo ou incidente
- pedido tem conflito com retencao legal/contratual

## Checklist operacional

- [ ] identidade validada
- [ ] tipo do pedido classificado
- [ ] sistemas impactados identificados
- [ ] juridico acionado quando necessario
- [ ] resposta enviada
- [ ] evidencia arquivada
