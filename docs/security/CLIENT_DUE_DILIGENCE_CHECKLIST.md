# Client Due Diligence Checklist - Edro Digital

## Objetivo

Preparar a Edro para responder rapidamente a questionarios de seguranca e privacidade de clientes enterprise, sem improviso e sem promessas nao sustentadas por evidencia.

## Regra mestra

Tudo o que for afirmado para cliente precisa ter uma destas bases:

- politica aprovada
- processo operacional em uso
- evidencia tecnica verificavel
- contrato ou anexo vigente

Sem isso, a resposta correta e "em implementacao", "nao aplicavel" ou "sob validacao". Nunca inventar maturidade.

## Pacote minimo para envio proativo

- resumo executivo de seguranca
- resumo executivo de privacidade
- politica de seguranca da informacao
- politica de resposta a incidente
- aviso de privacidade
- DPA padrao
- lista de subprocessadores
- resumo do modelo de acesso e MFA
- evidencia de backup e restore
- resumo de pentest ou status de execucao
- contato do encarregado e canal do titular

## Perguntas que cliente grande quase sempre faz

### Acesso e autenticacao

- Voces usam MFA para administradores?
- Como segregam acessos entre clientes?
- Como revogam acesso desligado?
- Como controlam privilegio minimo?

### Aplicacao e infraestrutura

- Como protegem APIs publicas?
- Como tratam vulnerabilidades e patches?
- Como armazenam e rotacionam segredos?
- Como evitam ambiente de teste falando com producao?

### Logs e resposta

- Quais eventos sao auditados?
- Como detectam acesso indevido?
- Qual o processo de incidente?
- Em quanto tempo notificam cliente e regulador quando aplicavel?

### Privacidade e LGPD

- Qual o papel da Edro no tratamento?
- Quais subprocessadores participam?
- Ha transferencia internacional?
- Como atendem direitos do titular?
- Como definem retencao e descarte?

## Evidencias minimas por tema

| Tema | Evidencia minima |
| --- | --- |
| MFA | politica, captura de configuracao, amostra de auditoria |
| RBAC | matriz de acesso, evidencia de permissao por role e recurso |
| Isolamento entre clientes | teste negativo, revisao tecnica, restricao de tenant |
| Webhooks e APIs publicas | documentacao de assinatura, rate limit e logs |
| Backup | relatorio de restore com data, tempo e owner |
| Incidente | playbook, tabela de severidade e registro de simulacao |
| Privacidade | inventario de dados, canal do titular, encarregado, subprocessadores |
| Transferencia internacional | mapeamento de fornecedor e base contratual |
| Pentest | carta de execucao, sumario executivo ou relatorio resumido |

## O que responder com cuidado

- "Somos certificados"
  So se existir certificacao vigente.
- "Somos LGPD compliant"
  Preferir "temos programa de privacidade e controles em implementacao/operacao" se ainda houver gaps.
- "Dados nunca saem do Brasil"
  So afirmar se todos os subprocessadores e fluxos foram validados.
- "Nao ha risco de vazamento"
  Nunca afirmar.
- "Temos seguranca enterprise"
  So com MFA, logs, restore, hardening e governanca minimamente implantados.

## SLA interno para atender due diligence

- `24h`
  confirmar recebimento e owner da resposta
- `48h`
  enviar pacote basico e respostas de primeira rodada
- `5 dias uteis`
  fechar pendencias tecnicas e contratuais mais comuns

## Kit de resposta que a Edro deve manter pronto

- versao atual do trust package
- questionario padrao preenchivel
- lista atualizada de subprocessadores
- DPA em formato comercial
- FAQ de seguranca
- matriz de acessos
- status do programa 30/60/90 dias

## Sinais de que ainda nao esta pronto para cliente muito grande

- cada area responde uma coisa diferente
- nao existe owner unico de seguranca
- nao existe owner unico de privacidade
- nao existe canal funcional do titular
- nao existe restore testado
- nao existe trilha de auditoria minima
- o questionario depende de descoberta manual a cada cliente

## Resultado esperado

Quando este checklist estiver operacional, a Edro deve conseguir:

- responder questionario de seguranca sem improviso
- sustentar reuniao tecnica com cliente enterprise
- provar que tem processo e nao apenas intencao
- separar claramente o que esta pronto do que ainda esta em roadmap
