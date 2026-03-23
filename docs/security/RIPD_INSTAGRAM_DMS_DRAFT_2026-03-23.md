# RIPD - Instagram Direct Messages (DMs de clientes via API Meta)

## Identificacao

- Nome do fluxo / processamento:
  Recepcao e processamento de mensagens diretas do Instagram via Meta Graph API
- Referencia ROPA:
  Fluxo 10 — complementa Fluxo 5 (ROPA_PRELIMINARY_2026-03-21.md)
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  atendimento / social media
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A plataforma recebe mensagens diretas do Instagram dos clientes gerenciados pela Edro via webhook da Meta Graph API. Esses DMs podem vir de seguidores/consumidores dos clientes que mandam mensagem para o perfil do cliente no Instagram. A Edro processa, armazena e exibe essas mensagens no portal interno para fins de atendimento e social listening.

Ponto especifico deste fluxo em relacao ao Fluxo 5: as DMs do Instagram tem maior probabilidade de envolver consumidores finais nao identificados (seguidores da marca), que nao tem relacao contratual com a Edro.

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Atendimento ao seguidor/consumidor do cliente | Art. 7, II — execucao de contrato (contrato com o cliente) | A Edro e operadora; o cliente e o controlador da relacao com o seguidor |
| Social listening e analise de sentimento | Art. 7, IX — legitimo interesse do cliente | Deve ser delimitado; exige avaliacao de proporcionalidade |
| Armazenamento para historico de atendimento | Art. 7, II — contrato com o cliente | Necessario para continuidade e defesa de direitos |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Sensivel? |
| --- | --- | --- |
| Identificadores de conta Instagram | Instagram user ID (IGSID), username, nome de exibicao | nao |
| Conteudo da DM | texto da mensagem enviada pelo seguidor | possivel — texto livre |
| Metadados | timestamp, id da mensagem, id da conversa, tipo de midia | nao |
| Midia enviada | imagem, audio, sticker, arquivo | possivel |
| Dados contextuais (quando habilitado) | bio do perfil publico, numero de seguidores | nao sensivel |

### 1.4 Titulares

- **Titulares diretos:** seguidores/consumidores do cliente que mandam DM para o perfil gerenciado
- Relacao: os titulares nao tem relacao direta com a Edro — a relacao e com o cliente (marca)
- Papel da Edro: **operadora** neste fluxo — o cliente e o controlador
- Implicacao: o cliente deve ter base legal para o tratamento; a Edro deve ter contrato de suboperacao com o cliente

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Recepcao via webhook | Meta Graph API | id, conteudo, timestamp | Meta |
| 2. Validacao do webhook | backend | assinatura HMAC da Meta | nao |
| 3. Armazenamento | banco principal | mensagem + metadados + client_id | Railway |
| 4. Exibicao no portal | portal interno | historico de DMs | nao |
| 5. Processamento por IA (quando habilitado) | agents / copyOrchestrator | conteudo da mensagem | OpenAI / Anthropic |
| 6. Resposta (quando automatizada) | Meta API | texto de resposta | Meta |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido — PENDENTE
- Evento que inicia a contagem: encerramento do contrato com o cliente
- Metodo de descarte: PENDENTE

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Sim para atendimento. Condicional para social listening — depende de base legal clara do cliente (controlador) e de clausula de suboperacao.

### 2.2 Os dados sao minimos?

| Dado | Necessario? | Risco |
| --- | --- | --- |
| IGSID e conteudo da mensagem | Sim — necessario para atendimento | Baixo se com TTL |
| Metadados de midia | Necessario se ha suporte a midia | Medio |
| Bio e dados publicos do perfil | Depende — opcional para social listening | Medio — coletado sem interacao ativa do titular |
| Historico completo sem TTL | Excessivo | Alto |

### 2.3 Ha transferencia internacional?

- Meta (EUA): dados passam pela infraestrutura da Meta antes de chegar ao backend — coberto pelos termos da Meta Business Platform
- Railway (EUA): armazenamento
- OpenAI / Anthropic (EUA): quando IA e habilitada para processar DMs

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Titulares sem ciencia do tratamento | Seguidor manda DM sem saber que uma agencia terceira processa e armazena | Alta | Medio | AM | Nenhum — depende de disclosure pelo cliente |
| Ausencia de contrato de suboperacao | Edro processa dados de terceiros sem clausula formal com o cliente | Alta | Alto | AA | Nenhum — PENDENTE critico |
| Retencao indefinida de DMs de consumidores | Mensagens sem TTL, mesmo apos encerramento do contrato | Alta | Medio | AM | Nenhum |
| Acesso cruzado entre tenants | DMs de seguidores do cliente A visiveis para cliente B | Baixa | Alto | BA | Authz por tenant (SEC-104) |
| Uso de DMs em IA sem minimizacao | Conteudo sensivel enviado integralmente a provedor | Media | Medio | MM | Nenhum |
| Resposta automatizada gerando dado incorreto | IA responde ao seguidor com informacao errada sobre o cliente | Baixa | Medio | BM | Gate de aprovacao no fluxo — validar |

### Risco residual geral

- Nivel: **medio/alto**
- Justificativa: o principal risco e a ausencia de contrato de suboperacao e a retencao indefinida de DMs de titulares que nao tem ciencia do tratamento pela Edro. Esses sao riscos juridicos, nao tecnicos.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Incluir clausula de suboperacao para DMs nos contratos com clientes | Ausencia de base legal | Juridico | 2026-05-01 | PENDENTE — CRITICO |
| Definir TTL de retencao para DMs (ex: 12 meses apos encerramento do contrato) | Retencao indefinida | Engenharia + Juridico | 2026-05-15 | PENDENTE |
| Orientar clientes a publicar aviso de privacidade no perfil do Instagram informando uso de ferramenta de gestao | Titulares sem ciencia | Atendimento / CS | 2026-04-30 | PENDENTE |
| Minimizar payload enviado a IA (resumir, nao enviar DM completa) | Vazamento via IA | Engenharia | 2026-05-15 | PENDENTE |
| Confirmar que gate de aprovacao existe antes de respostas automatizadas | Resposta incorreta por IA | Produto | 2026-04-15 | PENDENTE |

---

## 5. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com restricao — a clausula de suboperacao nos contratos com clientes e pre-requisito para escalar o uso com novos clientes

### Justificativa

O fluxo e operacional e ja esta ativo. O risco tecnico e controlado. O risco juridico — ausencia de base formal para processar dados de seguidores de terceiros — e o ponto critico e deve ser endereçado pelo juridico via contrato de servico.

### Consulta a ANPD necessaria?

- [ ] Nao necessariamente, desde que as medidas de suboperacao e TTL sejam implementadas

---

## 6. Historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
