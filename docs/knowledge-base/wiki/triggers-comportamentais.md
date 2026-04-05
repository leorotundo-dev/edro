# Triggers Comportamentais

Os gatilhos psicológicos que o Motor usa para definir a abordagem de cada peça. Cada trigger tem um efeito esperado sobre o `micro_behavior` alvo e um contexto de uso adequado.

---

## Catálogo de Triggers

### loss_aversion (Aversão à Perda)

**Efeito:** Alta ativação para `save_post` e `request_demo` em personas no stage `deciding`.
**Mecanismo:** Enquadrar o custo de não agir, não o benefício de agir.
**Exemplo de aplicação:** "Cada mês sem X custa Y" vs. "Com X você ganha Y".
**Restrição:** Evitar em personas `pre_problem` — rejeição alta quando a dor ainda não é consciente.
**Nível:** [hipótese] — extraído do spec do Motor, sem dados de campanha ainda.

---

### social_proof (Prova Social)

**Efeito:** Reduz objeção em personas com `objection_pattern` "medo de ser o primeiro".
**Mecanismo:** Validação por pares ou autoridade do setor.
**Formatos que amplificam:** Cases com números específicos, citações de cargo real, volume ("17 CFOs de empresas do setor X já...").
**Nível:** [hipótese] — extraído do spec do Motor.

---

### specificity (Especificidade)

**Efeito:** Aumenta `click_to_read` e `reply_with_question` em personas B2B com `language_style` formal/técnico.
**Mecanismo:** Números e detalhes concretos eliminam ceticismo e sinalizam credibilidade.
**Restrição:** Não inventar especificidade — dado falso destrói confiança irreversivelmente.
**Nível:** [hipótese] — extraído do spec do Motor.

---

### simplicity (Simplicidade)

**Efeito:** Aumenta `share_with_team` — conteúdo fácil de repassar tem taxa de share maior.
**Mecanismo:** Redução de carga cognitiva. Persona encaminha quando sente que o destinatário vai entender sem esforço.
**Formatos que amplificam:** Listas curtas, frameworks nomeados, analogias.
**Nível:** [hipótese] — extraído do spec do Motor.

---

### identity (Identidade)

**Efeito:** Alto `save_post` e `reply_with_question` quando o conteúdo reflete a identidade profissional da persona.
**Mecanismo:** "Pessoas como eu fazem X / pensam Y / valorizam Z."
**Restrição:** Altamente específico por persona — o que ressoa com CFO conservador rejeita persona de founder early-stage.
**Nível:** [hipótese] — extraído do spec do Motor.

---

## Combinações de alta performance (a validar)

| Persona | Stage | Trigger primário | Trigger secundário | Micro-behavior esperado |
|---|---|---|---|---|
| B2B conservador | deciding | loss_aversion | social_proof | request_demo |
| B2B técnico | solution_aware | specificity | identity | click_to_read |
| B2B influenciador interno | problem_aware | simplicity | social_proof | share_with_team |

> Tabela com nível [hipótese] — preencher com dados reais de campanha.

---

## Relacionado

[[personas]] · [[micro-comportamentos]] · [[fases-campanha]] · [[modelos-comportamentais]]
