# RIPD - Reunioes, Gravacoes e Transcricoes (Edro.Studio / Recall.ai)

## Identificacao

- Nome do fluxo / processamento:
  Bots de reuniao, gravacoes, transcricoes e resumos automatizados
- Referencia ROPA:
  Fluxo 6 — ROPA_PRELIMINARY_2026-03-21.md
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  operacoes
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A Edro envia bots (via Recall.ai) para reunioes no Google Meet, Microsoft Teams e Zoom. O bot entra na sala com identidade propria ("Edro.Studio"), captura audio e video, gera transcricao em tempo real e aciona IA para produzir resumo e action items. O resultado e armazenado no banco e exibido no portal interno.

Este fluxo e o de maior risco potencial porque:
- captura audio e video de todas as pessoas na sala, incluindo participantes que podem nao ter sido avisados da gravacao
- o conteudo pode incluir dado pessoal sensivel (saude, financas, relacoes trabalhistas) conforme o tipo de reuniao
- ha transferencia de audio/transcricao para Recall.ai (EUA) e para provedores de IA

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Registro de reunioes para contexto operacional | Art. 7, II — execucao de contrato | Necessario para alimentar briefings e contexto de producao |
| Resumo automatizado e action items | Art. 7, II — execucao de contrato | Automatiza parte do trabalho operacional |
| Armazenamento de transcricao | Art. 7, II e IX | Historico para revisao e defesa de direitos |
| Gravacao de audio/video | Art. 7, I — consentimento OU Art. 7, II — contrato | Requer aviso explicito aos participantes; consentimento dos participantes externos e necessario |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Sensivel? |
| --- | --- | --- |
| Identificacao de participantes | nome, email da conta Google/Teams/Zoom | nao |
| Audio | voz de todos os participantes durante a reuniao | nao por classificacao, mas dado biometrico em sentido amplo |
| Video | imagem de participantes (quando camera ligada) | nao por classificacao, mas imagem de pessoa natural |
| Transcricao | texto completo da fala de cada participante | possivel — depende do conteudo discutido |
| Metadados de reuniao | data, hora, duracao, plataforma, id da reuniao, participantes | nao |
| Resumo e action items gerados por IA | sintetizacao do conteudo da reuniao | possivel — derivado da transcricao |

### 1.4 Titulares

- **Organizador da reuniao:** geralmente colaborador interno ou representante do cliente — tem ciencia do bot
- **Participantes externos:** clientes, freelancers, parceiros — podem nao ter sido avisados explicitamente sobre a gravacao
- Ponto critico: participantes externos precisam receber aviso antes do inicio da gravacao. Sem isso, ha risco de violacao de privacidade e potencialmente da Lei 9.296/96 (interceptacao de comunicacoes)

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Agendamento do bot | Recall.ai API | link da reuniao, participantes, calendario | Recall.ai |
| 2. Captura de audio/video | Recall.ai (infraestrutura gerenciada) | audio, video, stream | Recall.ai |
| 3. Transcricao | Recall.ai + provedor de transcricao configurado | audio -> texto | Recall.ai + provedor de ASR |
| 4. Webhook de resultado | backend Edro | transcricao, metadados | nao |
| 5. Armazenamento | banco principal | transcricao, resumo, metadados | Railway |
| 6. Resumo por IA | OpenAI / Anthropic | transcricao (parcial ou total) | OpenAI / Anthropic |
| 7. Exibicao | portal interno | resumo, transcricao | nao |

### 1.6 Retencao e descarte

- Audio e video brutos: retencao na Recall.ai conforme politica do fornecedor — PENDENTE verificacao
- Transcricao e resumo: banco principal sem TTL definido — PENDENTE
- Evento que inicia a contagem: data da reuniao ou fim do contrato
- Metodo de descarte: PENDENTE

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Sim, com ressalva. O resumo e action items sao claramente uteis e proporcionais. A gravacao de video e audio completos e necessaria para gerar a transcricao, mas a retencao dos arquivos brutos apos a geracao da transcricao deve ser questionada — o objetivo pode ser atingido mantendo apenas a transcricao.

### 2.2 Os dados sao minimos?

| Dado | Necessario? | Alternativa |
| --- | --- | --- |
| Audio | Sim — para transcricao | Descartar apos transcricao |
| Video | Depende — necessario se houver analise de imagem | Desabilitar captura de video se apenas transcricao e necessaria |
| Transcricao completa | Sim | Minimizar antes de enviar a IA (enviar trechos, nao a reuniao inteira) |
| Metadados | Sim | Baixo risco |

### 2.3 Ha transferencia internacional?

- Recall.ai: EUA — DPA PENDENTE (a solicitar por email)
- Provedor de ASR (transcricao): depende da configuracao — PENDENTE verificar qual provedor esta ativo
- OpenAI / Anthropic: EUA — DPA formalizado por termos de API

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Gravacao sem aviso aos participantes | Bot entra na sala sem que todos saibam que estao sendo gravados | Media | Alto | MA | Nenhum controle preventivo — operacional |
| Captura de dado sensivel em reuniao | Participante menciona saude, dados financeiros pessoais, relacao trabalhista | Media | Alto | MA | Nenhum controle preventivo |
| Retencao indefinida de audio/transcricao | Arquivos sem TTL, incluindo de participantes externos | Alta | Medio | AM | Nenhum — PENDENTE |
| Vazamento via Recall.ai | Incidente de seguranca no fornecedor expoe gravacoes | Baixa | Alto | BA | Dependente de controles do fornecedor; DPA PENDENTE |
| Transcricao enviada integralmente a IA | Toda a reuniao, incluindo dado sensivel, enviada ao provedor de IA | Media | Medio | MM | Nenhum controle de minimizacao |
| Acesso indevido ao portal por ex-colaborador | Ex-funcionario acessa resumos de reunioes apos desligamento | Baixa | Alto | BA | Revogacao de sessao implementada; processo operacional PENDENTE |

### Risco residual geral

- Nivel: **alto**
- Justificativa: a combinacao de audio/video de terceiros sem aviso explicito, retencao indefinida e ausencia de DPA com Recall.ai coloca este fluxo no nivel mais alto de risco do programa. Requer RIPD completo e possivelmente consulta juridica antes de expandir o uso.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Implementar aviso automatico no inicio da reuniao ("Esta reuniao esta sendo gravada pelo Edro.Studio") | Gravacao sem aviso | Produto + Engenharia | 2026-04-15 | PENDENTE — CRITICO |
| Solicitar DPA ao Recall.ai (privacy@recall.ai) | Transferencia sem contrato | Juridico / Leonardo | 2026-04-01 | PENDENTE — CRITICO |
| Definir TTL para transcricoes e resumos (ex: 24 meses) e descartar audio bruto apos transcricao | Retencao indefinida | Engenharia + Juridico | 2026-05-15 | PENDENTE |
| Minimizar transcricao antes de enviar a IA (segmentar por topico, nao enviar reuniao inteira) | Vazamento via IA | Engenharia | 2026-05-15 | PENDENTE |
| Desabilitar captura de video se apenas transcricao for necessaria | Minimizacao | Produto | 2026-04-30 | PENDENTE |
| Processo formal de revogacao de acesso a reunioes no desligamento | Acesso pos-desligamento | RH + Operacoes | 2026-04-30 | PENDENTE |

---

## 5. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com restricao — o aviso de gravacao e a solicitacao do DPA com Recall.ai sao pre-requisitos antes de expandir o uso para novos clientes

### Justificativa

A funcionalidade entrega valor operacional claro. Os riscos sao mitigaveis, mas dois itens sao criticos antes de escalar: (1) aviso explicito de gravacao para todos os participantes, (2) DPA com Recall.ai. Sem esses, a base legal para processamento de audio de terceiros fica fragilizada.

### Consulta a ANPD necessaria?

- [ ] Nao necessariamente — mas recomenda-se completar as medidas criticas antes de expandir o uso

---

## 6. Historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
