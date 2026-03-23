# RIPD - Instagram Direct Messages

## Identificacao

- Nome do fluxo / processamento:
  Recepcao e processamento de mensagens diretas do Instagram
- Referencia ROPA:
  Fluxo 10 — ROPA_PRELIMINARY_2026-03-21.md
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

A plataforma Edro recebe mensagens diretas do Instagram dos seguidores/contatos dos clientes via webhook da Meta Graph API. As mensagens sao armazenadas no banco (tabela `instagram_messages`) com o payload bruto, processadas por IA (Google Gemini) para auto-criacao de briefings quando o conteudo e suficiente, e vinculadas ao tenant e cliente configurado pela page_id. O sender_id (identificador Instagram do remetente) e armazenado como chave de contexto.

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Atendimento e registro de demandas recebidas via Instagram | Art. 7, II — execucao de contrato | O cliente contratou a Edro para gerenciar suas comunicacoes no Instagram |
| Auto-criacao de briefing a partir de DMs | Art. 7, II e IX — contrato e legitimo interesse | Automatizacao do fluxo operacional da agencia; PENDENTE avaliacao juridica quanto ao tratamento da mensagem do remetente |
| Historico de comunicacao | Art. 7, II — execucao de contrato | Contexto operacional para o cliente |

**Ponto critico**: o remetente da DM (seguidor do cliente) nao tem relacao contratual com a Edro e provavelmente nao esta ciente de que sua mensagem sera processada por uma plataforma terceira. A base legal para esse tratamento precisa de avaliacao juridica.

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Volume estimado | Sensivel? |
| --- | --- | --- | --- |
| Identificador do remetente | sender_id do Instagram (PSID — Page-Scoped ID) | por mensagem | nao por si so, mas e um identificador pessoal |
| Conteudo de mensagem de texto | texto enviado pelo seguidor | por mensagem | possivel — conteudo livre |
| Midias enviadas | URL de imagem, audio, video, story_reply | por mensagem | possivel — imagem facial, audio de voz |
| Metadados | timestamp, tipo de mensagem, message_id (mid), instagram_thread_id | por mensagem | nao diretamente |
| raw_payload | payload completo do evento Meta (inclui todos os campos acima) | por mensagem | sim — dado pessoal bruto |
| Briefing auto-criado | titulo, objetivo, notas derivadas do conteudo da DM | por mensagem elegivel | possivel — derivado do conteudo |

### 1.4 Titulares

- Perfil dos titulares: seguidores e contatos das paginas do Instagram dos clientes da Edro — tipicamente consumidores finais do cliente
- Relacao de poder: os remetentes sao consumidores finais sem relacao contratual com a Edro, em posicao de maior vulnerabilidade
- Expectativa razoavel: o remetente espera que sua mensagem seja lida pela empresa dona do perfil; nao espera processamento automatico por plataforma terceira nem que sua mensagem alimente um briefing de agencia

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Recepcao do webhook | webhookInstagram | payload completo da mensagem | Meta |
| 2. Validacao de autenticidade | webhookSecurityService (HMAC) | headers de autenticacao | nao |
| 3. Resolucao de tenant | banco (connectors) | page_id → tenant_id | nao |
| 4. Verificacao de idempotencia | banco (instagram_messages) | message_id | nao |
| 5. Armazenamento | banco (instagram_messages) | conteudo + metadados + raw_payload | Railway |
| 6. Auto-briefing | Google Gemini | texto da mensagem | Google |
| 7. Armazenamento do briefing | banco (edro_briefings) | briefing derivado | Railway |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido — PENDENTE
- Evento que inicia a contagem: encerramento do contrato com o cliente ou solicitacao de exclusao do remetente
- Metodo de descarte: PENDENTE — raw_payload merece atencao especial

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Condicionalmente. O registro operacional para atendimento ao cliente e legitimo. O envio do conteudo a IA para auto-briefing requer avaliacao da base legal especifica para o remetente que nao e parte do contrato.

### 2.2 Os dados sao minimos para a finalidade?

| Dado | Necessario? | Alternativa menos invasiva? |
| --- | --- | --- |
| sender_id | Sim — identifica o remetente para contexto | Poderia ser hashed apos uso operacional |
| Conteudo de texto | Sim — para atendimento e briefing | Poderia ter TTL |
| raw_payload | Util para debug, mas excede o necessario | Deletar ou anonimizar apos 30 dias |
| URL de midia | Apenas se necessario para o atendimento | Deletar referencia apos uso |
| Briefing auto-criado | Sim — produto do fluxo | Manter vinculado ao cliente |

Recomendacao: definir TTL para raw_payload (30 dias), deletar ou anonimizar sender_id no registro antigo apos resolucao do atendimento.

### 2.3 Ha transferencia internacional?

- Paises de destino: EUA (Meta como origem/webhook; Google Gemini para auto-briefing; Railway como infraestrutura)
- Mecanismo de adequacao: clausulas contratuais padrao dos provedores
- DPA assinado: PENDENTE verificacao e formalizacao

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Remetente nao ciente do tratamento | Seguidor envia DM sem saber que vai para plataforma terceira | Alta | Media | AM | Nenhum controle preventivo |
| Conteudo sensivel em DM | Mensagem contem dado de saude, financas ou pessoal sensivel | Media | Alta | MA | Nenhum controle preventivo |
| raw_payload retido indefinidamente | Dado bruto com PII retido sem TTL | Alta | Media | AM | Nenhum — PENDENTE |
| Forja ou replay de webhook | Payload falso ou replayado | Baixa | Media | BM | Autenticacao HMAC implementada; idempotencia por mid |
| Transferencia do conteudo a IA sem base legal | Texto do remetente enviado ao Gemini sem DPA formal | Media | Media | MM | DPA PENDENTE |
| Identificacao indireta via sender_id | sender_id linkado a perfil publico do Instagram | Media | Media | MM | Nenhum controle preventivo |

### Risco residual geral

- Nivel: medio-alto
- Justificativa: o risco juridico de tratar mensagens de remetentes que nao consentiram e o principal ponto em aberto. Os controles tecnicos (HMAC, idempotencia) estao implementados. A lacuna e documental e juridica.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Avaliar juridicamente base legal para tratar mensagens de seguidores terceiros | Remetente nao ciente | Juridico | 2026-04-30 | PENDENTE — prioritario |
| Definir TTL para raw_payload (ex: 30 dias) | raw_payload retido indefinidamente | Engenharia + Juridico | 2026-05-15 | PENDENTE |
| Anonimizar sender_id apos resolucao do atendimento | Identificacao indireta | Engenharia | 2026-05-15 | PENDENTE |
| Formalizar DPAs com Meta e Google | Transferencia internacional | Juridico | 2026-05-01 | PENDENTE |
| Orientar clientes a incluir aviso de tratamento automatico no perfil do Instagram (bio ou mensagem automatica) | Remetente nao ciente | Juridico + Comercial | 2026-05-15 | PENDENTE |

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

- [x] Sim, com as medidas listadas na secao 4 implementadas — a avaliacao juridica da base legal para mensagens de terceiros e **pre-condicao** antes de expansao comercial

### Justificativa

Os controles tecnicos de seguranca (HMAC, idempotencia) estao implementados. O risco central e juridico: a base legal para tratar mensagens de seguidores que nao consentiram. A solucao mais comum em plataformas similares e a inclusao de aviso no perfil do cliente e clausula contratual que coloca a responsabilidade de informar os usuarios no cliente. Isso deve ser avaliado com o juridico.

### Consulta a ANPD necessaria?

- [x] Nao por enquanto — riscos medios, dado nao sensivel por padrao; reavaliar se a base legal nao for confirmada pelo juridico

---

## 7. Revisao e historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
