# Personas

Perfis comportamentais de audiências. Cada PersonaCard define quem queremos influenciar e como essa persona responde a conteúdo.

Este arquivo é um mapa de referência. PersonaCards completos de clientes específicos ficam em `raw/` (dados de cliente são privados).

---

## Arquétipos B2B recorrentes

### Decisor Conservador (ex: CFO, Jurídico, Compliance)

| Atributo | Valor típico |
|---|---|
| stage_of_change inicial | problem_aware ou solution_aware |
| language_style | formal, direto, avesso a hype |
| preferred_evidence | dados, regulatório, cases de pares |
| objection_patterns | medo de risco, medo de ser o primeiro, "já tentamos algo assim" |
| forbidden_terms | "revolucionário", "disruptivo", "game-changer" |
| micro_behavior mais receptivo | save_post, share_with_team |
| trigger mais eficaz | social_proof (pares do setor) + specificity |
| trigger a evitar | identity agressivo, urgência artificial |

**Nota de craft:** Nunca começar com o produto. Começar com o problema que o setor enfrenta. Usar linguagem do cargo, não da agência.

---

### Influenciador Interno (ex: Gerente, Analista Sênior)

| Atributo | Valor típico |
|---|---|
| stage_of_change inicial | pre_problem ou problem_aware |
| language_style | semi-formal, receptivo a frameworks |
| preferred_evidence | frameworks práticos, checklists, "como fazer" |
| objection_patterns | "não tenho orçamento", "preciso convencer meu chefe" |
| micro_behavior mais receptivo | share_with_team, click_to_read |
| trigger mais eficaz | simplicity + identity ("pessoas no seu cargo fazem X") |

**Nota de craft:** Este perfil compartilha quando sente que vai parecer competente ao encaminhar o conteúdo. Criar conteúdo que é "presente para o chefe".

---

### Founder / CEO de Empresa em Crescimento

| Atributo | Valor típico |
|---|---|
| stage_of_change inicial | solution_aware ou deciding |
| language_style | direto, orientado a resultado, tolerante a risco |
| preferred_evidence | cases de crescimento, ROI claro, velocidade |
| objection_patterns | "não tenho tempo", "já testei muita coisa" |
| micro_behavior mais receptivo | reply_with_question, request_demo |
| trigger mais eficaz | loss_aversion (custo de oportunidade) + specificity |

**Nota de craft:** Menos nurturing, mais prova direta. Este perfil toma decisão rápida se a evidência for clara.

---

## Como criar uma PersonaCard de cliente

Baseado na spec do Motor (`docs/MOTOR_INTERVENCAO_COMPORTAMENTAL_SPEC.md`), uma PersonaCard precisa de:

- `label` — nome descritivo ("Diretor Financeiro Conservador de Empresa Industrial")
- `role` — cargo real
- `company_archetype` — tipo de empresa
- `stage_of_change` — onde a persona começa
- `pain_points` — 3–5 dores em linguagem da persona (não da agência)
- `objection_patterns` — o que ela diria para não agir
- `language_style` — como ela fala
- `forbidden_terms` — o que nunca usar
- `preferred_evidence` — o que a convence

PersonaCards de clientes reais → salvar em `raw/personas/[cliente]-[persona].md`.

---

## Relacionado

[[triggers-comportamentais]] · [[fases-campanha]] · [[micro-comportamentos]] · [[padroes-por-canal]]
