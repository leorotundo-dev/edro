# RIPD - Reunioes, Gravacoes e Transcricoes

## Identificacao

- Nome do fluxo / processamento:
  Bots de reuniao, gravacoes, transcricoes e resumos via Recall
- Referencia ROPA:
  Fluxo 6 — ROPA_PRELIMINARY_2026-03-21.md
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  operacoes
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE — enviar para revisao antes de aprovar — este fluxo e de ALTO RISCO
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A plataforma Edro integra o servico Recall.ai para ingressar automaticamente em reunioes do Google Meet, Microsoft Teams e Zoom como bot ("Edro.Studio"). O bot grava o audio e video da reuniao, gera transcricao e envia o resultado ao backend, onde um agente de IA produz um resumo operacional. Os dados sao armazenados no banco e linkados ao cliente relacionado.

Este e o fluxo de maior risco do portfolio da Edro porque:
- capta audio e video de participantes que podem nao ter sido informados
- envolve dados biometricos e de voz (potencialmente sensiveis por natureza)
- processa conteudo de reunioes que pode incluir dados de saude, financeiros, juridicos ou pessoais

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7 / art. 11) | Justificativa |
| --- | --- | --- |
| Registro operacional de reunioes com clientes | Art. 7, II — execucao de contrato | O cliente contratante autoriza o bot e o usa para registrar reunioes proprias |
| Transcricao e resumo para producao de conteudo | Art. 7, II — execucao de contrato | O resumo alimenta briefings e operacao da agencia |
| Armazenamento de historico de reunioes | Art. 7, II e IX — contrato e legitimo interesse | Historico necessario para contexto e defesa de direitos |

**Ponto critico**: a base legal acima cobre o titular cliente (que autorizou o bot). Participantes terceiros (funcionarios do cliente, convidados externos) precisam de base legal adicional — tipicamente consentimento ou interesse legitimo com aviso claro no inicio da reuniao.

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Volume estimado | Sensivel? |
| --- | --- | --- | --- |
| Dados de identificacao | nome exibido no Google/Meet/Zoom, email quando disponivel | por participante | nao |
| Audio da reuniao | voz de todos os participantes | por reuniao | sim — dado biometrico (voz) pode ser sensivel conforme art. 5, II LGPD |
| Video da reuniao | imagem de rosto e ambiente dos participantes | por reuniao | sim — dado biometrico (imagem facial) |
| Transcricao | texto integral do que foi dito por cada participante | por reuniao | possivel — conteudo pode incluir dado sensivel falado |
| Resumo gerado por IA | pontos principais, acoes, decisoes | por reuniao | possivel — derivado da transcricao |
| Metadados | data, duracao, plataforma, participantes, meeting_id | por reuniao | nao diretamente |

### 1.4 Titulares

- Perfil dos titulares: todos os participantes da reuniao — cliente, equipe interna, convidados externos (terceiros sem relacao contratual direta com a Edro)
- Relacao de poder: participantes convidados nao tem relacao contratual com a Edro e podem nao ter sido informados sobre o bot antes de entrar
- Expectativa razoavel: participantes podem esperar que a reuniao seja privada; a presenca de um bot deve ser comunicada explicitamente

**Impacto potencial**: captacao de audio e video sem ciencia dos participantes pode configurar violacao grave de privacidade e, em alguns contextos, ilicitude penal.

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Autorizacao e agendamento | Google Calendar / backend | dados da reuniao, email do organizador | Google |
| 2. Ingresso do bot | Recall.ai | audio e video da reuniao | Recall.ai (EUA) |
| 3. Transcricao | Recall.ai / OpenAI Whisper | audio completo | Recall.ai / OpenAI |
| 4. Armazenamento bruto | banco + storage | transcricao, recording_url, raw payload | Railway + storage |
| 5. Resumo | agente de IA (OpenAI/Claude/Gemini) | transcricao completa | OpenAI / Anthropic / Google |
| 6. Armazenamento do resumo | banco (meetings / edro_briefings) | resumo + metadados | Railway |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido atualmente — PENDENTE definicao
- Evento que inicia a contagem: data da reuniao ou fim do contrato
- Metodo de descarte: PENDENTE — especial atencao para arquivos de audio/video

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Sim para o cliente contratante que autoriza o bot. Condicionalmente para participantes terceiros — depende de consentimento ou aviso inequivoco no inicio da reuniao.

### 2.2 Os dados sao minimos para a finalidade?

| Dado | Necessario? | Alternativa menos invasiva? |
| --- | --- | --- |
| Audio da reuniao | Necessario para transcricao | Deletar apos transcricao confirmada |
| Video da reuniao | Apenas se necessario para o servico; transcricao nao requer video | Avaliar desabilitar captacao de video se nao houver uso operacional |
| Transcricao completa | Necessario para resumo e briefing | Poderia ser deletada apos geracao do resumo |
| Resumo por IA | Sim — produto final do fluxo | Manter; e o dado de menor sensibilidade |
| Recording_url (video armazenado no Recall) | Apenas se necessario | Avaliar deletar da plataforma Recall apos download ou transcricao |

Recomendacao: deletar audio e video apos transcricao confirmada. Avaliar desabilitar captacao de video. Definir TTL para transcricao apos geracao do resumo.

### 2.3 Ha transferencia internacional?

- Paises de destino: EUA (Recall.ai — audio e video; OpenAI ou Google Gemini — transcricao e resumo; Railway como infraestrutura)
- Mecanismo de adequacao: clausulas contratuais padrao dos provedores
- DPA assinado: PENDENTE verificacao com Recall.ai e demais provedores — **prioritario**

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Participante nao informado sobre gravacao | Convidado entra sem saber que e gravado e transcrito | Alta | Alta | AA | Depende do cliente comunicar; sem controle tecnico preventivo |
| Audio/video com dado sensivel | Participante menciona dado de saude, financas ou judicial | Alta | Alta | AA | Nenhum controle preventivo |
| Transferencia de audio a provedor sem DPA | Recall.ai e IA recebem audio sem DPA formal | Media | Alta | MA | Nenhum — DPA PENDENTE |
| Retencao de audio/video indefinida | Arquivo de audio/video retido sem TTL | Alta | Alta | AA | Nenhum — PENDENTE |
| Acesso indevido ao historico de reunioes | Colaborador acessa gravacao de reuniao de outro cliente | Baixa | Alta | BA | RBAC por tenant implementado |
| Vazamento de transcricao com dado sensivel | Transcricao exposta a IA sem minimizacao | Media | Alta | MA | Nenhum controle preventivo |

### Risco residual geral

- Nivel: **alto — o mais alto de todos os fluxos**
- Justificativa: audio e video de participantes sem consentimento explicito e o risco mais grave. A ausencia de TTL para gravacoes e a transferencia a provedores externos sem DPA formal agrava o quadro.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Exigir que o cliente informe participantes antes de ativar o bot (contratual) | Participante nao informado | Juridico + Comercial | 2026-04-30 | PENDENTE — **prioritario** |
| O bot deve anunciar sua presenca ao entrar na sala (mensagem no chat) | Participante nao informado | Engenharia | 2026-04-30 | PENDENTE |
| Deletar arquivo de audio/video apos transcricao confirmada | Retencao de audio/video + dado sensivel | Engenharia | 2026-05-01 | PENDENTE |
| Avaliar desabilitar captacao de video se nao houver uso operacional | Minimizacao de dado biometrico | Engenharia + Produto | 2026-04-30 | PENDENTE |
| Definir TTL para transcricoes (ex: 90 dias ou fim do contrato) | Retencao indefinida | Juridico + Engenharia | 2026-05-15 | PENDENTE |
| Formalizar DPA com Recall.ai, OpenAI e Google | Transferencia internacional | Juridico | 2026-04-30 | PENDENTE — **prioritario** |
| Incluir clausula contratual autorizando gravacao e tratamento | Participante nao informado | Juridico | 2026-05-01 | PENDENTE |

---

## 5. Consultores e stakeholders consultados

| Papel | Nome | Data |
| --- | --- | --- |
| Elaboracao inicial (tecnica) | Engenharia/Produto | 2026-03-23 |
| Juridico/privacidade | PENDENTE — **prioritario e urgente para este fluxo** | — |
| Operacoes | PENDENTE | — |

---

## 6. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com as medidas listadas na secao 4 implementadas — mas as medidas de anuncio do bot e clausula contratual sao **pre-condicao** antes de qualquer expansao comercial

### Justificativa

Este e o fluxo de maior risco da Edro em termos de privacidade. A captacao de audio e video de participantes sem consentimento explicito e o risco central. As medidas tecnicas (deletar audio apos transcricao, bot anunciar presenca) e juridicas (clausula contratual, DPAs) devem ser implementadas antes de onboarding de novos clientes que usem este recurso.

O fluxo pode continuar com clientes atuais ja informados, mas nao deve ser expandido sem as mitigacoes implementadas.

### Consulta a ANPD necessaria?

- [x] A avaliar — dado biometrico (audio/video) pode se enquadrar em dado sensivel conforme interpretacao do art. 5, II LGPD; recomenda-se consulta ao juridico sobre necessidade de RIPD notificavel

---

## 7. Revisao e historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
