# RIPD - Comunicacoes por WhatsApp, Email e Social

## Identificacao

- Nome do fluxo / processamento:
  Comunicacoes e webhooks — WhatsApp, Instagram, Gmail e email transacional
- Referencia ROPA:
  Fluxo 5 — ROPA_PRELIMINARY_2026-03-21.md
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  atendimento / operacoes
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A plataforma recebe mensagens via webhooks de WhatsApp (Evolution API / Meta), Instagram Direct (Meta Graph API) e Gmail (Google OAuth), e envia comunicacoes transacionais via Resend/SMTP. Os dados pessoais surgem diretamente do conteudo das mensagens recebidas e dos metadados de envio.

Este fluxo e altamente sensivel porque:
- o remetente pode nao ser o contato direto do cliente — pode ser um consumidor final do cliente
- o conteudo e texto livre, podendo conter dado sensivel por natureza da conversa
- ha processamento por IA quando a mensagem e roteada para resumo ou resposta assistida

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Atendimento e comunicacao operacional com clientes | Art. 7, II — execucao de contrato | Necessario para execucao do servico de agencia |
| Envio de email transacional (notificacoes, aprovacoes) | Art. 7, II — execucao de contrato | Integra o fluxo operacional do portal |
| Armazenamento de historico de comunicacoes | Art. 7, II e IX — contrato e legitimo interesse | Historico necessario para resolucao de disputas e continuidade operacional |
| Processamento por IA para resumo e roteamento | Art. 7, II — execucao de contrato | Habilita automacao operacional; DPA com provedor de IA necessario |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Sensivel? |
| --- | --- | --- |
| Identificadores de comunicacao | numero de telefone, email, Instagram handle, JID WhatsApp | nao |
| Conteudo de mensagem | texto livre de WhatsApp, DM Instagram, email | possivel por entrada livre |
| Metadados de envio/recepcao | timestamp, status de leitura, tipo de midia, id de mensagem | nao |
| Dados de remetente de terceiros | consumidores finais do cliente que entram em contato via WhatsApp do cliente | nao classificado — depende do uso do cliente |
| Anexos e midias | imagens, audios, documentos enviados por WhatsApp ou email | possivel |

### 1.4 Titulares

- **Titulares diretos:** representantes do cliente (operadores da conta)
- **Titulares indiretos:** consumidores finais do cliente que enviam mensagens pelo WhatsApp ou Instagram gerenciado pela Edro
- Ponto critico: a Edro nao tem relacao direta com os consumidores finais — e operadora de dados nesse cenario, nao controladora

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Recepcao de webhook | Evolution API / Meta API / Gmail OAuth | id, conteudo, metadados | Meta / Google / Evolution |
| 2. Validacao e autenticacao do webhook | backend | assinatura HMAC, payload | nao |
| 3. Armazenamento | banco principal | mensagem, metadados, client_id | Railway |
| 4. Roteamento para IA (quando habilitado) | copyOrchestrator / agents | fragmento do conteudo | OpenAI / Anthropic / Gemini |
| 5. Envio de email transacional | Resend / SMTP | email destino, conteudo | Resend |
| 6. Exibicao no portal | portal interno | historico de mensagens | nao |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido atualmente — PENDENTE
- Evento que inicia a contagem: encerramento do contrato com o cliente
- Metodo de descarte: PENDENTE

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Sim. A comunicacao com clientes e necessaria para executar o servico. O armazenamento do historico e justificado por defesa de direitos e continuidade operacional.

### 2.2 Os dados sao minimos?

| Dado | Necessario? | Risco de excesso |
| --- | --- | --- |
| Numero de telefone e email | Sim | Baixo |
| Conteudo completo da mensagem | Necessario para contexto operacional | Medio — retencao indefinida e o problema |
| Metadados de terceiros (consumidores do cliente) | Depende do uso | Alto — esses titulares nao consentiram com a Edro |
| Historico completo de todas as mensagens | Parcialmente necessario | Medio — TTL ajudaria |

Recomendacao: definir TTL diferenciado por tipo de mensagem. Mensagens de consumidores finais do cliente merecem atencao especial — a Edro e operadora e nao controladora nesse sub-fluxo.

### 2.3 Ha transferencia internacional?

- Sim, em varios cenarios (Meta nos EUA, Google nos EUA, Resend nos EUA, Evolution conforme hospedagem, provedores de IA nos EUA)
- Mecanismo: clausulas contratuais padrao dos provedores
- DPAs: OpenAI formalizado por termos de API; Meta e Google cobertos por termos empresariais; Recall, Evolution e Resend — PENDENTE verificacao

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Interceptacao de webhook forjado | Atacante envia mensagem falsa como se fosse Meta/Google | Baixa | Alta | BA | Autenticacao HMAC implementada (SEC-105) |
| Dado sensivel em mensagem livre | Consumidor relata problema de saude, situacao financeira etc. | Media | Alta | MA | Nenhum controle preventivo |
| Acesso cruzado entre clientes | Mensagens de um cliente visiveis para outro | Baixa | Alta | BA | Authz por tenant + IDOR corrigido (SEC-104) |
| Retencao indefinida de mensagens de terceiros | Consumidores finais do cliente sem direito de acesso ao historico | Alta | Media | AM | Nenhum — PENDENTE TTL |
| Vazamento via IA | Conteudo de mensagem enviado a provedor sem minimizacao | Media | Media | MM | Parcialmente mitigado; DPAs PENDENTE |
| Replay de webhook | Mensagem ja processada reenviada e re-executada | Baixa | Media | BM | Idempotency keys parcialmente implementadas |

### Risco residual geral

- Nivel: medio/alto
- Justificativa: o risco mais critico e a retencao de dados de consumidores finais sem TTL definido e sem mecanismo de DSR para esses titulares. Como a Edro e operadora nesse sub-fluxo, a responsabilidade e do cliente controlador, mas a Edro precisa ter contrato de suboperacao claro.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Definir TTL de retencao para mensagens (ex: 12 meses apos encerramento de contrato) | Retencao indefinida | Juridico + Engenharia | 2026-05-15 | PENDENTE |
| Incluir clausula de suboperacao nos contratos com clientes que usam WhatsApp/Instagram gerenciado | Dados de consumidores de terceiros | Juridico | 2026-05-01 | PENDENTE |
| Formalizar DPAs com Resend e Evolution | Transferencia internacional | Juridico | 2026-05-15 | PENDENTE |
| Implementar TTL automatico no banco para mensagens apos encerramento de contrato | Retencao indefinida | Engenharia | 2026-06-01 | PENDENTE |
| Revisar minimizacao de payload enviado a IA (truncar mensagens longas) | Vazamento via IA | Engenharia | 2026-04-30 | PENDENTE |

---

## 5. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com as medidas listadas na secao 4 implementadas em paralelo

### Justificativa

O tratamento e central ao servico de agencia e tem base legal solida. Os controles tecnicos mais criticos (autenticacao de webhook, authz por tenant) ja estao implementados. O principal gap e juridico: TTL de retencao e clausula de suboperacao para dados de consumidores de terceiros.

### Consulta a ANPD necessaria?

- [ ] Nao — desde que as medidas de TTL e suboperacao sejam implementadas

---

## 6. Historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
