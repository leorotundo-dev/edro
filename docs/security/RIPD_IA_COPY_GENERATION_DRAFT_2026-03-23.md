# RIPD - Geracao de Copy e Conteudo via IA

## Identificacao

- Nome do fluxo / processamento:
  Geracao autonoma de copy, conteudo e briefing via agentes de IA
- Referencia ROPA:
  Fluxo 9 — ROPA_PRELIMINARY_2026-03-21.md
- Data de elaboracao:
  2026-03-23
- Owner do processo:
  produto/conteudo
- Owner tecnico:
  engenharia
- Revisor juridico:
  PENDENTE — enviar para revisao antes de aprovar
- Status:
  rascunho

---

## 1. Descricao sistematica do tratamento

### 1.1 Natureza do tratamento

A plataforma Edro utiliza agentes de IA (agentWriter, agentPlanner, agentAuditor, agentRedator, agentDiretorArte) para gerar drafts de copy e campanha a partir de briefings fornecidos pelos usuarios internos da agencia. O processamento inclui:

- leitura do perfil completo do cliente (incluindo nome, tom de voz, segmento, regras aprendidas de campanhas anteriores)
- transmissao de um prompt contendo o briefing do job para provedores externos de IA (OpenAI, Anthropic, Google Gemini)
- recepcao e armazenamento do conteudo gerado em `campaign_behavioral_copies`
- uso do output para alimentar o learning engine com feedbacks de performance

### 1.2 Finalidade e base legal

| Finalidade | Base legal (LGPD art. 7) | Justificativa |
| --- | --- | --- |
| Geracao de copy de marketing para clientes da agencia | Art. 7, II — execucao de contrato | A geracao de conteudo e parte central do servico contratado pelo cliente |
| Melhoria continua via learning engine | Art. 7, IX — legitimo interesse | Permitir que a plataforma aprenda com resultados anteriores para melhorar o servico; PENDENTE validacao juridica |

### 1.3 Dados pessoais envolvidos

| Categoria | Exemplos | Volume estimado | Sensivel? |
| --- | --- | --- | --- |
| Dados identificadores do cliente | nome da empresa, nome do representante, segmento | por tenant/cliente | nao |
| Dados de briefing | contexto de campanha, produto, publico-alvo descrito | por job | possivel quando menciona saude, financas ou dados de criancas |
| Dados de audiencia derivados | clusters de comportamento, metricas agregadas | por campanha | nao — apenas agregados |
| Output de IA | texto de copy, roteiros, scripts | por job | nao diretamente, mas pode conter referencias a dados dos itens acima |

### 1.4 Titulares

- Perfil dos titulares: representantes de clientes da agencia; indiretamente, membros da audiencia cujas caracteristicas informam o briefing
- Relacao de poder: os titulares diretos (representantes de clientes) sao parte de uma relacao contratual B2B — menor vulnerabilidade
- Expectativa razoavel: o cliente contratante sabe que seu perfil e usado para gerar conteudo; a audiencia final nao tem expectativa sobre o uso de agregados anonimizados

### 1.5 Fluxo de dados

| Etapa | Sistema | Dado envolvido | Subprocessador? |
| --- | --- | --- | --- |
| 1. Montagem do prompt | backend (copyOrchestrator) | perfil do cliente + briefing do job | nao — interno |
| 2. Chamada de API de IA | OpenAI / Anthropic / Gemini | prompt completo (inclui dados do cliente) | sim — OpenAI, Anthropic, Google |
| 3. Recepcao do output | backend | texto gerado | nao — interno |
| 4. Armazenamento | banco (campaign_behavioral_copies) | prompt + output + metadados | nao — Railway como infraestrutura |
| 5. Feedback loop | learningLoopService | copy_feedback + metricas | nao — interno |

### 1.6 Retencao e descarte

- Prazo de retencao: indefinido atualmente — PENDENTE definicao
- Evento que inicia a contagem: fim do contrato ou obsolescencia operacional
- Metodo de descarte: PENDENTE definicao de politica

---

## 2. Necessidade e proporcionalidade

### 2.1 A finalidade e legitima?

Sim. A geracao de copy e o nucleo do servico da Edro. O uso de IA e um instrumento de execucao desse servico e e esperado pelo cliente contratante.

### 2.2 Os dados sao minimos para a finalidade?

| Dado | Necessario? | Alternativa menos invasiva? |
| --- | --- | --- |
| Nome e descricao do cliente no briefing | Sim — necessario para contexto | Poderia usar codigo interno ao inves do nome real em ambientes de desenvolvimento |
| Tom de voz e regras de marca | Sim — define a qualidade do output | Nao ha alternativa sem perda de qualidade |
| Clusters de audiencia (agregados) | Sim — personaliza o angulo criativo | Dados ja sao agregados e nao identificam individuos |
| Metricas historicas de performance | Sim — alimenta o learning engine | Poderiam ser pseudonimizadas por job_id sem client_id nos logs do learning engine |

Recomendacao: avaliar se o nome real do cliente pode ser substituido por identificador no prompt enviado a IA quando o nome nao for necessario para a qualidade do output.

### 2.3 Ha transferencia internacional?

- Paises de destino: EUA (OpenAI, Anthropic, Google)
- Mecanismo de adequacao: clausulas contratuais padrao dos provedores (termos de servico / DPA de cada provedor)
- DPA assinado com subprocessadores internacionais: PENDENTE verificacao formal — OpenAI tem DPA disponivel; Anthropic e Google tambem; necessario assinar ou aceitar formalmente e arquivar evidencia

---

## 3. Avaliacao de riscos

| Risco | Descricao | Probabilidade | Impacto | Nivel | Controle existente |
| --- | --- | --- | --- | --- | --- |
| Acesso indevido interno | Colaborador acessa copias de outro tenant | Baixa | Alta | BA | RBAC + authz por tenant + audit_log |
| Vazamento para provedor de IA | Dado do briefing retido pelo provedor para treino de modelos | Media | Alta | MA | Clausulas de uso nos termos de cada provedor; OpenAI Enterprise desativa treino por padrao |
| Desvio de finalidade | Output de IA reutilizado para finalidade diferente da contratada | Baixa | Media | BM | Armazenamento isolado por client_id |
| Retencao excessiva | campaign_behavioral_copies sem politica de retencao | Alta | Media | AM | Nenhum — PENDENTE definicao de politica |
| Dado sensivel em briefing | Cliente inclui dados de saude ou financeiros no briefing livre | Media | Alta | MA | Alerta de brand safety via agentAuditor; sem controle preventivo para dados do titular |

### Risco residual geral

- Nivel: medio-alto
- Justificativa: o principal risco pendente e a ausencia de DPAs formais com provedores de IA e a falta de politica de retencao. Ambos sao mitigaveis com acao administrativa, sem necessidade de mudanca tecnica significativa.

---

## 4. Medidas para mitigar os riscos

| Medida | Risco mitigado | Owner | Prazo | Status |
| --- | --- | --- | --- | --- |
| Assinar/aceitar formalmente DPAs com OpenAI, Anthropic e Google | Vazamento para provedor | Juridico | 2026-05-01 | PENDENTE |
| Definir e implementar politica de retencao para campaign_behavioral_copies | Retencao excessiva | Engenharia + Juridico | 2026-05-15 | PENDENTE |
| Avaliar substituicao de nome do cliente por ID no prompt quando possivel | Minimizacao | Engenharia | 2026-06-01 | PENDENTE |
| Documentar que provedores utilizados nao usam dados para treino de modelos | Vazamento para provedor | Juridico | 2026-05-01 | PENDENTE — verificar DPA de cada provedor |
| Alertar operadores quando briefing contem termos indicativos de dado sensivel | Dado sensivel | Engenharia | 2026-06-15 | PENDENTE |

---

## 5. Consultores e stakeholders consultados

| Papel | Nome | Data |
| --- | --- | --- |
| Elaboracao inicial (tecnica) | Engenharia/Produto | 2026-03-23 |
| Juridico/privacidade | PENDENTE | — |
| Operacoes | PENDENTE | — |

---

## 6. Conclusao

### O tratamento pode prosseguir?

- [x] Sim, com as medidas listadas na secao 4 implementadas

### Justificativa

O tratamento tem base legal defensavel (execucao de contrato) e os riscos identificados sao mitigaveis com acoes administrativas e tecnicas de complexidade baixa a media. O ponto critico e a formalizacao dos DPAs com provedores de IA e a definicao de politica de retencao, ambos sem dependencia tecnica bloqueante.

O tratamento nao deve ser descontinuado, mas a formalizacao dos DPAs deve ocorrer antes de qualquer expansao do servico para clientes enterprise que exijam due diligence de privacidade.

### Consulta a ANPD necessaria?

- [x] Nao — riscos residuais medios com controles em implementacao, dado nao sensivel por padrao

---

## 7. Revisao e historico

| Data | Versao | Alteracao | Autor |
| --- | --- | --- | --- |
| 2026-03-23 | 0.1 | Versao inicial (rascunho tecnico, pendente revisao juridica) | Engenharia |
