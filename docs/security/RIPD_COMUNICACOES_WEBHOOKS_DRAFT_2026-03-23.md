# RIPD - Comunicacoes por WhatsApp, Email e Social

## Identificacao

- Nome do fluxo / processamento:
  Recepcao e envio de comunicacoes operacionais via WhatsApp, email e webhooks sociais
- Referencia ROPA:
  Fluxo 5 — ROPA_PRELIMINARY_2026-03-21.md
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  atendimento/operacoes
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE — enviar para revisao antes de aprovar
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A plataforma Edro recebe mensagens de clientes e seus contatos via WhatsApp (Cloud API e Evolution), Instagram Direct e Gmail, e envia comunicacoes transacionais (email, notificacoes). As mensagens recebidas sao armazenadas no banco, processadas por IA para auto-criacao de briefings quando pertinente, e vinculadas ao tenant do cliente configurado. Mensagens de email transacional sao enviadas via Resend ou SMTP.

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Atendimento ao cliente via canais de mensageria | Art. 7, II — execucao de contrato | Recepcao de demandas e comunicacao operacional fazem parte do servico contratado |
| Auto-criacao de briefing a partir de mensagens | Art. 7, II e IX — contrato e legitimo interesse | Automatizacao que serve o cliente; PENDENTE validacao juridica sobre uso de mensagens de terceiros |
| Envio de comunicacoes transacionais | Art. 7, II — execucao de contrato | Notificacoes de status, links de aprovacao, faturas |
| Armazenamento de historico de comunicacao | Art. 7, II e IX — contrato e legitimo interesse | Historico necessario para contexto operacional e defesa de direitos |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Volume estimado | Sensivel? |
| --- | --- | --- | --- |
| Identificadores de mensageria | numero de telefone (WhatsApp), sender_id (Instagram), email | por mensagem | nao |
| Conteudo de mensagens | texto, audio, imagem, video enviados pelo remetente | por mensagem | possivel — conteudo livre pode conter dado sensivel |
| Metadados de mensagem | timestamp, tipo (texto/audio/imagem), message_id, raw_payload | por mensagem | nao diretamente |
| Dados de email transacional | email de destino, nome quando disponivel, conteudo do email | por envio | nao |
| Audio e transcricao (WhatsApp audio/voice) | arquivo de audio, transcricao gerada por IA | por mensagem de audio | possivel — audio pode conter dado sensivel falado |

### 1.4 Titulares

- Perfil dos titulares: contatos dos clientes (consumidores finais ou funcionarios B2B) que enviam mensagens; equipe interna que recebe notificacoes
- Relacao de poder: os remetentes externos (contatos dos clientes) podem nao saber que suas mensagens sao processadas pela plataforma Edro
- Expectativa razoavel: contatos de WhatsApp/Instagram podem esperar apenas que a empresa dono do numero responda, nao que a mensagem seja processada por uma plataforma terceira

**Ponto critico**: o titular da mensagem (remetente) e o contato do cliente da Edro, nao o cliente em si. Esse terceiro pode nao ter dado consentimento explicito ao tratamento pela Edro. A base legal precisa ser avaliada juridicamente.

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Recepcao do webhook | backend (webhookWhatsApp / webhookInstagram / webhookEvolution) | payload completo da mensagem | Meta / Evolution |
| 2. Validacao de origem | webhookSecurityService | headers de autenticacao | nao |
| 3. Armazenamento | banco (whatsapp_messages / instagram_messages) | conteudo + metadados + raw_payload | Railway |
| 4. Transcricao de audio (quando audio) | IA (OpenAI Whisper ou equivalente) | arquivo de audio | OpenAI |
| 5. Auto-briefing (quando texto suficiente) | Gemini / copyOrchestrator | fragmento do texto | Google Gemini |
| 6. Envio de email transacional | Resend / SMTP | email de destino + conteudo | Resend |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido atualmente — PENDENTE definicao
- Evento que inicia a contagem: encerramento do contrato com o cliente ou solicitacao de exclusao
- Metodo de descarte: PENDENTE definicao de politica — raw_payload merece atencao especial por conter dado pessoal bruto

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Parcialmente. O atendimento e comunicacao sao legitimos e necessarios para o servico. O auto-briefing via IA e a transcricao de audio requerem avaliacao juridica mais detalhada, especialmente quanto ao remetente que pode nao estar ciente.

### 2.2 Os dados sao minimos para a finalidade?

| Dado | Necessario? | Alternativa menos invasiva? |
| --- | --- | --- |
| Numero de telefone / sender_id | Sim — identifica o remetente | Nao ha alternativa para identificar o contato |
| Conteudo da mensagem (texto) | Sim — para processar a demanda | Poderia ter TTL de retencao apos resolucao |
| raw_payload completo | Util para debug, mas contem mais dados que o necessario | Poderia ser removido ou anonimizado apos 30 dias |
| Audio completo | Necessario para transcricao | Poderia ser deletado apos transcricao confirmada |
| Transcricao de audio | Sim — para processamento operacional | Poderia ter TTL menor |

Recomendacao: definir TTL para raw_payload (ex: 30 dias) e para arquivos de audio apos transcricao confirmada.

### 2.3 Ha transferencia internacional?

- Paises de destino: EUA (Meta para recepcao; OpenAI para audio; Google Gemini para auto-briefing; Resend para email)
- Mecanismo de adequacao: clausulas contratuais padrao dos provedores
- DPA assinado: PENDENTE verificacao e formalizacao

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Remetente nao ciente do tratamento | Contato do cliente nao sabe que sua mensagem vai para plataforma terceira | Alta | Media | AM | Nenhum controle preventivo; questao juridica aberta |
| Conteudo sensivel em mensagem livre | Audio ou texto com dado de saude, financeiro ou judicial | Media | Alta | MA | Nenhum controle preventivo |
| raw_payload retido indefinidamente | Dado bruto com PII retido sem TTL | Alta | Media | AM | Nenhum — PENDENTE politica |
| Replay de webhook | Mensagem reprocessada por replay de payload | Baixa | Media | BM | Idempotencia por message_id implementada |
| Forja de webhook | Payload falso injetado por terceiro | Baixa | Alta | BA | Autenticacao HMAC implementada (SEC-105) |
| Audio com dado sensivel enviado a IA | Audio transcrito por provedor externo sem consentimento do falante | Media | Alta | MA | Nenhum — DPA PENDENTE |

### Risco residual geral

- Nivel: alto
- Justificativa: o risco de tratamento de mensagens de terceiros sem base legal clara para o remetente e o ponto mais critico. E uma questao juridica que requer avaliacao pelo juridico/privacidade antes de escalar o uso desse fluxo para mais clientes.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Avaliar juridicamente a base legal para tratar mensagens de remetentes terceiros | Remetente nao ciente | Juridico | 2026-04-30 | PENDENTE — prioritario |
| Definir TTL para raw_payload (ex: 30 dias apos processamento) | raw_payload retido indefinidamente | Engenharia + Juridico | 2026-05-15 | PENDENTE |
| Deletar arquivo de audio apos transcricao confirmada | Audio com dado sensivel | Engenharia | 2026-05-01 | PENDENTE |
| Formalizar DPAs com Meta, Google, OpenAI e Resend | Transferencia internacional | Juridico | 2026-05-01 | PENDENTE |
| Avaliar avisar o cliente sobre o tratamento automatico de mensagens recebidas | Remetente nao ciente | Juridico + Produto | 2026-05-15 | PENDENTE |

---

## 5. Consultores e stakeholders consultados

| Papel | Nome | Data |
| --- | --- | --- |
| Elaboracao inicial (tecnica) | Engenharia/Produto | 2026-03-23 |
| Juridico/privacidade | PENDENTE — prioritario para este fluxo | — |
| Operacoes | PENDENTE | — |

---

## 6. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com as medidas listadas na secao 4 implementadas — mas a avaliacao juridica da base legal para mensagens de terceiros e **prioritaria** antes de qualquer expansao comercial deste fluxo

### Justificativa

O risco mais relevante — tratamento de mensagens de remetentes que podem nao ter dado consentimento explicito — e uma questao juridica que precisa ser resolvida antes de escalar. Os controles tecnicos (autenticacao HMAC, idempotencia) estao implementados. A lacuna e documental e juridica.

### Consulta a ANPD necessaria?

- [ ] A avaliar — o tratamento de mensagens de terceiros sem base legal clara pode justificar consulta preventiva; a definir com o juridico

---

## 7. Revisao e historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
