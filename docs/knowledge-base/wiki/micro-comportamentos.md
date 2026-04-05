# Micro-comportamentos

As ações concretas que o Motor usa como proxy de mudança de comportamento real. Cada peça de conteúdo nasce com um `micro_behavior` alvo declarado.

---

## Catálogo de Micro-comportamentos

### save_post
**Sinal:** Persona achou valioso o suficiente para consumir depois.
**Implicação de dark funnel:** Alta correlação com interesse real — pessoa que salva frequentemente vira lead qualificado.
**Fase de campanha:** História, Prova.
**Facilitadores:** Conteúdo denso (lista, framework, checklist), promessa de utilidade futura.

---

### share_with_team
**Sinal:** Persona validou o conteúdo para o próprio grupo de decisão — o maior sinal B2B.
**Implicação de dark funnel:** Indica múltiplos stakeholders engajados sem aparecer em analytics.
**Fase de campanha:** Prova.
**Facilitadores:** Simplicity (fácil de repassar), social_proof de setor relevante ao time, framings como "vale compartilhar com quem cuida de X".

---

### click_to_read
**Sinal:** Interesse ativo no aprofundamento.
**Implicação de dark funnel:** Pico de tráfego direto ao site sem campanha ativa pode ser efeito retardado de share.
**Fase de campanha:** Prova, Convite.
**Facilitadores:** Especificidade no headline, curiosity gap, CTA com preview do que vão encontrar.

---

### reply_with_question
**Sinal:** Engajamento qualificado — persona tem dúvida real, não é like por reflexo.
**Implicação de dark funnel:** Perguntas nos comentários são oportunidades de venda disfarçadas.
**Fase de campanha:** História (pergunta sobre problema), Prova (pergunta sobre aplicação).
**Facilitadores:** Abrir com pergunta retórica, terminar com pergunta direta ao leitor.

---

### request_demo
**Sinal:** Intenção de compra declarada.
**Fase de campanha:** Convite.
**Facilitadores:** Fricção mínima no CTA, contexto claro do que esperar na demo, loss_aversion bem calibrado.

---

## Hierarquia de valor dos micro-comportamentos

```
request_demo           ← maior intenção
  share_with_team
    click_to_read
      reply_with_question
        save_post      ← menor intenção, maior volume
```

O Motor não trata todos como iguais. Uma campanha com muitos saves e poucos requests_demo está no topo do funil — precisa avançar fase.

---

## Matriz trigger × micro-behavior

| Trigger | save_post | share_with_team | click_to_read | reply_with_question | request_demo |
|---|---|---|---|---|---|
| loss_aversion | médio | baixo | alto | médio | alto |
| social_proof | baixo | alto | médio | médio | médio |
| specificity | alto | médio | alto | alto | médio |
| simplicity | baixo | alto | médio | baixo | baixo |
| identity | alto | médio | baixo | alto | baixo |

> Matriz com nível [hipótese] — preencher com dados de campanha real.

---

## Relacionado

[[triggers-comportamentais]] · [[fases-campanha]] · [[dark-funnel]] · [[padroes-por-canal]]
