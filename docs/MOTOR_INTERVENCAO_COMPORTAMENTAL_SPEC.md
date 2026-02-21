# Motor de Intervenção Comportamental para Criação de Conteúdo
## Especificação Técnica de Implementação — Edro Social Engine

**Versão:** 1.0
**Data:** 20 de fevereiro de 2026
**Autor:** Leo Rotundo / Edro Digital

---

## 1. Visão Geral do Sistema

### 1.1. O que é

O Motor de Intervenção Comportamental é uma camada de inteligência que transforma geração de conteúdo (posts, anúncios, campanhas) de um processo criativo genérico para um **sistema de mudança de comportamento baseado em dados**.

Diferencial central: cada peça nasce com um objetivo comportamental explícito, gatilhos psicológicos definidos, e métricas de sucesso ligadas a microcomportamentos reais — não apenas vanity metrics.

### 1.2. Para que serve

- Garantir que todo conteúdo tenha **intenção comportamental clara** (salvar, compartilhar, clicar, responder, pedir proposta).
- Permitir **personalização em escala**: diferentes clusters de usuários recebem variações otimizadas com base em seus padrões históricos de comportamento.
- Criar um **loop de aprendizado**: o sistema mede o que funciona e reforça padrões vencedores automaticamente.
- Incorporar **ética e governança algorítmica**: evitar manipulação excessiva, exploração de vulnerabilidades e uso irresponsável de gatilhos emocionais.

### 1.3. Arquitetura em três camadas

- **Camada 1: Inteligência de Contexto** — PersonaCards, BehaviorIntents, UserBehaviorProfiles
- **Camada 2: Engine Criativa Comportamental** — Agentes especializados (Planner, Writer, Auditor, Tagger)
- **Camada 3: Loop de Medição e Aprendizado** — Métricas comportamentais, Dark Funnel, Policy Engine, LearningRules

---

## 2. Camada 1: Inteligência de Contexto

### 2.1. PersonaCard

Representa **quem** queremos influenciar.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| label | string | Ex.: "Diretor Financeiro Conservador" |
| role | string | Ex.: CFO, Gerente de Operações |
| company_archetype | string | Ex.: empresa B2B, alta regulação, capital intensivo |
| stage_of_change | enum | pre_problem, problem_aware, solution_aware, deciding, post_decision |
| pain_points | array[string] | Lista de frases curtas descrevendo dores |
| objection_patterns | array[string] | Ex.: "medo de risco regulatório", "medo de trocar fornecedor" |
| language_style | string | Ex.: "formal, direto, avesso a hype" |
| forbidden_terms | array[string] | Lista de termos proibidos |
| preferred_evidence | array[string] | Ex.: "dados", "cases", "citações técnicas" |

**Quando criar:** Para cada público-chave de um cliente (3–5 personas). Atualizar trimestralmente.

---

### 2.2. BehaviorIntent

Define o **para que** de cada peça de conteúdo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| persona_id | string | Link para PersonaCard |
| campaign_id | string | Link para campanha específica |
| behavior_stage_target | enum | keep_stage (manter) ou advance_one_level |
| behavior_type | enum | awareness, consideration, decision_support |
| micro_behavior | enum | save_post, share_with_team, click_to_read, reply_with_question, request_demo |
| primary_model | enum | fogg (motivação/habilidade/prompt), hook (trigger/action/reward/investment), generic |
| primary_triggers | array[string] | loss_aversion, social_proof, specificity, simplicity, identity |

**Quando criar:** Para cada campanha ou série de conteúdos. Uma campanha pode ter múltiplos BehaviorIntents (um por fase ou público).

---

### 2.3. UserBehaviorProfile

Representa **como** cada usuário (ou cluster) reage a conteúdo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| user_id | string | ID anônimo ou hash |
| like_rate | float | Likes por impressão (média histórica) |
| save_rate | float | Saves por impressão |
| click_rate | float | Cliques por impressão |
| share_rate | float | Compartilhamentos por impressão |
| preferred_format | string | texto_longo, carrossel, video_curto, infográfico |
| preferred_triggers | array[string] | Gatilhos que historicamente geram mais ação para esse perfil |
| last_updated_at | timestamp | Data da última atualização |

Início: todos os usuários começam com perfil neutro (taxas médias da plataforma). Atualizar semanalmente ou a cada 20 impressões.

Uso: agrupar em clusters ("Salvadores", "Clicadores", "Leitores silenciosos"). O Planner usa esses clusters para priorizar gatilhos e formatos.

---

## 3. Camada 2: Engine Criativa Comportamental

### 3.1. Fluxo de geração de conteúdo

1. **AgentPlanner** — Recebe PersonaCard + BehaviorIntent + plataforma → gera ContentPlan
2. **AgentWriter** — Recebe ContentPlan → gera DraftContent
3. **AgentAuditor** — Valida DraftContent → aprova ou pede revisão → gera FinalContent
4. **AgentTagger** — Enriquece FinalContent com metadata comportamental

---

### 3.2. AgentPlanner (Planejador Comportamental)

**Input:** PersonaCard + BehaviorIntent + platform + UserBehaviorProfile clusters (opcional)

**Processo:**
- Se `primary_model = "fogg"`: define `motivational_focus` (increase/sustain) e `ability_strategy` (simplify_action, add_step_by_step, remove_friction)
- Se `primary_model = "hook"`: define `hook_cycle_step` (trigger, action, reward, investment)

**Output: ContentPlan**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| persona_id | string | Link para persona |
| platform | string | linkedin, instagram, etc. |
| headline_strategy | string | Ex.: "contraintuitivo", "dados chocantes", "história curta" |
| structure | string | Ex.: "hook forte + 3 provas + CTA leve" |
| psychological_strategy | text | Por que essa peça deve funcionar |

---

### 3.3. AgentWriter (Redator por Plataforma)

**Input:** ContentPlan + PersonaCard + BehaviorIntent

**Regras por plataforma:**

- **LinkedIn:** 3–5 linhas antes do "Ver mais", autoridade, dados, white space, bullets, tom formal
- **Instagram:** imagem limpa, hook forte na primeira linha, parágrafos curtos, palavras-chave para Social Search
- **TikTok/Reels:** hook em 1–1,5s, payoff em 3–5s, CTA leve, edição rítmica

**Output: DraftContent**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| content_text | text | Corpo do conteúdo |
| media_type | enum | image, video, carousel, text_only |
| hook_text | string | Primeira linha/frase de impacto |
| cta_text | string | Call to action |
| platform | string | linkedin, instagram, etc. |
| tags | array[string] | Tags semânticas iniciais |

---

### 3.4. AgentAuditor (Auditor de Risco e Clareza)

**Input:** DraftContent + PersonaCard + BehaviorIntent

**Checagens obrigatórias:**

Conformidade com Modelo Fogg:
- Motivação: O texto aumenta desejo/urgência de forma clara?
- Habilidade: A ação pedida é simples o suficiente para o público?
- Prompt: O CTA é claro, específico e oportuno?

Estética e linguagem:
- Não usa `forbidden_terms` do PersonaCard
- Tom consistente com `language_style`
- Ausência de clichês de IA ("mergulhe fundo", "revolucionar", "game changer", etc.)

Risco cognitivo:
- Não promete resultados irreais
- Não conflita com objeções centrais de forma agressiva
- Não usa urgência extrema sem justificativa concreta

**Output: FinalContent**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| approved_text | text | Texto aprovado |
| platform | string | linkedin, instagram, etc. |
| media_specs | text | Instruções para design/vídeo |
| behavior_tags | object | Metadados comportamentais (stage, model, triggers, micro_behavior) |
| approval_status | enum | approved, needs_revision |
| revision_notes | text | Notas de revisão (se aplicável) |

---

### 3.5. AgentTagger (Tagger Comportamental)

**Input:** FinalContent

**Output (metadata adicional):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| semantic_topics | array[string] | Ex.: ["regulação", "risco", "eficiência operacional"] |
| emotional_tone | string | Ex.: "alerta", "esperança", "curiosidade" |
| dark_social_potential | enum | low, medium, high (baseado em quotability e formato) |
| complexity_level | enum | simple, moderate, complex |

---

## 4. Camada 3: Loop de Medição e Aprendizado

### 4.1. ContentPerformance (Métricas Hard)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| content_id | string | Link para FinalContent |
| platform | string | linkedin, instagram, etc. |
| published_at | timestamp | Data/hora de publicação |
| impressions | integer | Impressões totais |
| clicks | integer | Cliques |
| ctr | float | Click-through rate |
| likes | integer | Curtidas |
| comments | integer | Comentários |
| shares_public | integer | Compartilhamentos públicos |
| saves | integer | Salvamentos |
| video_watch_time_avg | float | Tempo médio de visualização (se vídeo) |

Coleta: APIs de plataformas (LinkedIn, Instagram, Meta Ads). Atualização diária ou semanal.

---

### 4.2. DarkFunnelEvent (Sinais Invisíveis)

Representa tudo que acontece **fora** dos cliques rastreáveis.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| timestamp | timestamp | Quando o sinal foi capturado |
| source_type | enum | form_field, sales_call_note, crm_custom_field, email_reply |
| raw_text | text | Ex.: "vi num grupo de WhatsApp" |
| parsed_channel | string | whatsapp, slack, teams, email_forward, unknown_group |
| confidence_score | float | 0–1 (confiança no parsing) |
| related_content_ids | array[string] | Conteúdos relacionados |
| journey_stage | enum | first_touch_dark, middle_touch_dark, last_touch_dark |

**Como coletar:**
1. Formulários de lead: campo "Como você chegou até nós?"
2. Script comercial: pergunta padrão em toda reunião de qualificação
3. CRM: campo customizado para origem não-rastreável
4. E-mail replies: parsing automático de menções a "grupo", "me mandaram"

---

### 4.3. BehaviorSignals (Proxies de Dark Social)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| content_id | string | Link para FinalContent |
| direct_traffic_spike | float | Variação % de tráfego direto pós-publicação |
| brand_search_uplift | float | Variação em buscas de marca/termo associado |
| lead_mentions | integer | Número de leads que mencionaram o conteúdo |
| measurement_window | string | Ex.: "7 dias pós-publicação" |

---

### 4.4. PolicyEngine (Governança Ética)

```yaml
policies:
  - id: policy_001
    name: "Evitar exploração de vulnerabilidades financeiras"
    condition:
      sensitive_contexts: ["dívida", "falência", "desemprego"]
      emotional_arousal: "high"
      emotional_valence: "negative"
    action: "flag_for_review"
    guidance: "Para temas financeiros sensíveis, evitar linguagem de desespero; sempre oferecer perspectiva de saída/ação prática."

  - id: policy_002
    name: "Limitar urgência extrema"
    condition:
      urgency_level: "extreme"
      frequency: "> 3 vezes em 30 dias para mesma persona"
    action: "block"
    guidance: "Reduzir frequência de mensagens de urgência extrema para evitar fadiga e desconfiança."

  - id: policy_003
    name: "Proibir combinação medo + culpa"
    condition:
      emotional_triggers: ["fear", "guilt"]
    action: "flag_for_revision"
    guidance: "Evitar mensagens que combinam medo com culpabilização. Reescrever com foco em empoderamento."
```

**Implementação:**
1. **EmotionTagger:** Modelo de classificação de sentimento/valência + detecção de temas sensíveis
2. **PolicyChecker:** Script que lê FinalContent, aplica regras YAML, retorna `approved`, `flagged` ou `blocked`
3. **EthicsLog:** Registra políticas avaliadas, status final e racional

**Output: EthicsLog**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| content_id | string | Link para FinalContent |
| policies_evaluated | array[string] | IDs das políticas aplicadas |
| status | enum | approved, flagged, blocked |
| rationale | text | Explicação do resultado |
| reviewed_by | string | ID do revisor (humano ou automático) |
| reviewed_at | timestamp | Data/hora da revisão |

---

### 4.5. LearningEngine (Aprendizado Automático)

**Processo:**

1. **Agregação:** Agrupa FinalContent + ContentPerformance + BehaviorSignals por: persona_id, platform, stage_of_change_target, micro_behavior
2. **Análise:** Calcula taxas de saves, clicks, shares por impressão + uplift em dark funnel
3. **Identificação de padrões:** Compara combinações de primary_triggers, hook_cycle_step, media_type, emotional_tone
4. **Geração de regras:** Cria LearningRules com padrões vencedores

**Output: LearningRule**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único |
| segment_definition | JSON | Filtros: persona, plataforma, estágio, micro_behavior |
| effective_pattern | text | Descrição do padrão (gatilhos, formato, tom) |
| uplift_metric | string | Métrica que melhora (ex.: "save_rate") |
| uplift_value | float | Percentual de melhoria vs média |
| confidence_score | float | 0–1 (confiança estatística) |
| sample_size | integer | Número de conteúdos analisados |
| created_at | timestamp | Data de criação da regra |

AgentPlanner lê LearningRules ativas e prioriza padrões com maior `uplift_value` e `confidence_score`. Revisão humana trimestral.

---

## 5. Implementação Progressiva

| Fase | Período | Objetivo | Entregável |
|------|---------|----------|------------|
| 1 — Fundação | Meses 1–2 | Estrutura básica de dados e workflow manual | PersonaCards, BehaviorIntents, primeiras 20–30 peças |
| 2 — Medição | Meses 3–4 | Coletar métricas comportamentais | ContentPerformance via APIs, DarkFunnelEvents, dashboard básico |
| 3 — Personalização | Meses 5–6 | UserBehaviorProfile e clustering | Clusters comportamentais, primeiros A/B tests |
| 4 — Governança | Meses 7–8 | PolicyEngine e ética algorítmica | EmotionTagger, PolicyChecker, EthicsLog |
| 5 — Aprendizado | Meses 9–12 | LearningEngine e loop fechado | 10–20 LearningRules ativas, evidência de melhoria contínua |

---

## 6. Stack Tecnológico

- **Backend:** Node.js + Fastify (já em uso)
- **Banco de dados:** PostgreSQL + Redis
- **IA criativa:** OpenAI GPT-4 / Anthropic Claude (Planner, Writer, Auditor)
- **IA classificação:** Modelos menores (EmotionTagger, PolicyChecker)
- **Embeddings:** OpenAI embeddings para análise semântica
- **Integrações:** LinkedIn API, Instagram Graph API, Meta Ads API, Google Analytics API, CRM API
- **Frontend:** Next.js 15 (já em uso)
- **Jobs assíncronos:** BullMQ (coleta de métricas, processamento de aprendizado)

---

## 7. Exemplo Prático: Campanha Simpar 70 Anos

### PersonaCards

**Colaborador Orgulhoso:** stage_of_change=problem_aware, language_style="simples, direto, emocionalmente autêntico", preferred_evidence=histórias reais e depoimentos

**Investidor Institucional:** stage_of_change=solution_aware, language_style="técnico, baseado em dados, conservador", preferred_evidence=números, governança, ESG

**Stakeholder Regulatório/Comunidade:** stage_of_change=pre_problem, language_style="institucional, transparente, orientado a impacto", preferred_evidence=casos ESG, certificações

### BehaviorIntents por fase

| Fase | Behavior type | Micro behavior | Triggers | Modelo |
|------|--------------|----------------|----------|--------|
| 1 — Reconhecimento (Sem. 1–2) | awareness | share_with_team, save_post | identity, social_proof | generic |
| 2 — Impacto (Sem. 3–4) | consideration | click_to_read, comment | specificity, social_proof | fogg |
| 3 — Futuro (Sem. 5–6) | decision_support | request_info, engage_with_manifesto | confidence, forward_looking | hook |

### Exemplo de peça (LinkedIn, Fase 1, Investidores)

ContentPlan: headline_strategy="dados chocantes", structure="hook com número + linha do tempo + CTA leve", psychological_strategy="especificidade + prova social para reforçar perenidade"

```
70 anos. 150 mil colaboradores. 12 países. 1 propósito.

Em 1956, o Sr. Julio Simões começou com um caminhão em Mogi das Cruzes.
Hoje, a Simpar conecta a logística de metade do Brasil e lidera a transição
para mobilidade sustentável na América Latina.

O que 70 anos nos ensinam? Que continuidade exige mais que tamanho.
Exige governança, visão e compromisso.

→ Acesse nosso Relatório Integrado 2025 [link]

#Simpar70Anos #LogísticaDoBrasil
```

behavior_tags: stage=solution_aware, micro_behavior=[save_post, click_to_read], triggers=[specificity, social_proof]

---

## 8. Próximos Passos Imediatos

1. **Clientes piloto:** 2–3 clientes com múltiplos públicos, histórico de métricas e disposição para testar abordagem comportamental
2. **PersonaCards e BehaviorIntents:** 3–5 personas + 5–10 intents por cliente piloto
3. **Workflow manual v1.0:** Planner → Writer → Auditor → Tagger em planilha/Notion antes de automatizar
4. **Banco de dados:** Schemas SQL para todas as tabelas + APIs REST
5. **Medição:** APIs de plataformas + DarkFunnelEvent em formulários

---

## 9. Referências

[1] Fogg, B.J. (2009). A Behavior Model for Persuasive Design. *Persuasive Technology Conference.*
[2] Eyal, N. (2014). *Hooked: How to Build Habit-Forming Products.* Portfolio/Penguin.
[3] Prochaska, J.O., & DiClemente, C.C. (1983). Stages and Processes of Self-Change. *Journal of Consulting and Clinical Psychology.*
[4] Thaler, R.H., & Sunstein, C.R. (2008). *Nudge.* Yale University Press.
[5] Kahneman, D. (2011). *Thinking, Fast and Slow.* Farrar, Straus and Giroux.
[6] Dark Social Research (2025). *The Invisible 80%: Understanding Private Sharing in 2025.*
[7] Behavioral Design Lab, Stanford University. *Resources on Fogg Behavior Model.*
[8] Cornell Content Marketing (2025). *The Stages of Change Model: A Behavioral Psychology Framework.*
