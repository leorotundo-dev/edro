# Incident Tabletop Runbook

## Objetivo

Executar um exercicio de mesa de incidente para provar que a Edro consegue detectar, escalar, conter, decidir comunicacao e sair com acoes corretivas registradas.

Este runbook complementa o template em `templates/INCIDENT_PLAYBOOK_TEMPLATE.md`. O template define o playbook. Este documento define como simular.

## Quando rodar

- antes de onboarding de cliente enterprise sensivel
- apos mudanca estrutural grande em auth, webhook ou infra
- pelo menos uma vez por semestre
- apos incidente relevante, como licao aprendida

## Participantes minimos

- owner tecnico do incidente
- representante de backend/infra
- representante de produto/operacoes
- juridico/privacidade
- sponsor executivo
- facilitador do exercicio
- responsavel por ata/evidencia

## Pre-condicoes

- playbook base preenchido
- contatos e escalonamento atualizados
- cenarios escolhidos antes da sessao
- criterios de severidade alinhados

## Cenarios recomendados

### Cenario 1 - Comprometimento de conta privilegiada

- suspeita de takeover de admin sem MFA
- risco de alteracao de clientes, tokens e acessos

### Cenario 2 - Webhook publico forjado

- tentativa de acionar automacao por callback falso
- necessidade de validar contencao, auditoria e replay window

### Cenario 3 - Exposicao entre tenants

- usuario autenticado acessa recurso de outro cliente
- exige avaliacao de impacto, comunicacao e hotfix

### Cenario 4 - Vazamento por fornecedor/subprocessador

- alerta vindo de provedor terceirizado
- exige avaliacao de transferencia internacional e obrigacao contratual

## Agenda sugerida

### 1. Abertura - 10 min

- objetivo do tabletop
- participantes e papeis
- regra de simulacao: nao resolver no improviso sem registrar decisao

### 2. Injecao do cenario - 10 min

- facilitador apresenta o evento inicial
- registrar horario ficticio da deteccao
- classificar severidade inicial

### 3. Contencao e triagem - 20 min

- quem assume comando
- que logs e sinais seriam consultados
- quais acessos/segredos seriam revogados
- se o sistema precisaria de degradacao temporaria

### 4. Impacto e comunicacao - 20 min

- houve dado pessoal envolvido
- quais clientes seriam afetados
- ha gatilho contratual ou regulatorio
- quem fala com cliente, juridico e ANPD

### 5. Recuperacao e licoes - 20 min

- acao corretiva imediata
- acao estrutural
- backlog gerado
- evidencias faltantes descobertas no exercicio

## Evidencias a salvar

- data e duracao da sessao
- participantes
- cenario usado
- linha do tempo das decisoes
- gaps identificados
- owners e prazos das acoes corretivas

## Criterio de sucesso

- ownership claro em cada etapa
- prazo regulatorio e contratual entendido
- decisao de comunicacao nao depende de improviso
- pelo menos um backlog de melhoria gerado

## Saida obrigatoria

- ata do tabletop
- acoes corretivas abertas no tracker
- revisao do playbook base quando necessario
