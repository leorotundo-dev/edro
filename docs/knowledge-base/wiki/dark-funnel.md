# Dark Funnel

Sinais de intenção que não aparecem em analytics padrão mas indicam que o conteúdo está movendo comportamento real. A Edro mede isso porque CTR e alcance não contam a história completa.

---

## O que é o dark funnel

O caminho que o lead percorre antes de levantar a mão. Inclui:
- Leitura de conteúdo sem clicar em nada
- Compartilhamento interno via WhatsApp/Slack (invisível ao analytics)
- Busca direta pelo nome da marca após ver um post
- Pico de tráfego direto ao site sem campanha paga ativa
- Colega de um seguidor abrindo o perfil da empresa
- Menção em reunião interna ("vi um post que falava sobre isso")

---

## Sinais de dark funnel a monitorar

### Pico de tráfego direto
**O que é:** Aumento de sessões com fonte "direct" sem campanha nova ativa.
**Interpretação:** Alguém compartilhou o conteúdo internamente e o destinatário buscou a empresa.
**Como capturar:** Google Analytics / Plausible — filtro "direct" vs. período de publicação de conteúdo.
**Nível:** [padrão] — sinal amplamente documentado em marketing B2B.

---

### Pico de busca de marca
**O que é:** Aumento de volume no Google Search Console para termos de marca ("Edro Digital", nome do cliente).
**Interpretação:** Conteúdo gerou curiosidade suficiente para busca ativa.
**Como capturar:** Google Search Console → Queries → filtrar por marca.
**Nível:** [padrão]

---

### Leads dizendo "me mandaram esse post"
**O que é:** Na qualificação de lead, perguntar "como nos conheceu?" e registrar respostas qualitativas.
**Interpretação:** Prova direta de share_with_team funcionando.
**Como capturar:** Campo livre no formulário de contato + pergunta do SDR na primeira call.
**Nível:** [padrão] — dado qualitativo de alto valor que a maioria das agências ignora.

---

### Seguidores novos sem campanha de aquisição
**O que é:** Crescimento de seguidores em períodos sem paid media.
**Interpretação:** Conteúdo orgânico sendo compartilhado por quem já segue.
**Nível:** [1 caso] — observado, não sistematizado.

---

## Como conectar dark funnel ao conteúdo

1. **Taguear cada peça** com `campaign_id`, `phase`, `persona_id` no momento de publicação.
2. **Registrar data de publicação** junto com os sinais de dark funnel.
3. **Correlacionar** pico de sinal com peças publicadas 3–14 dias antes (latência típica de B2B).
4. **Hipótese de causalidade** quando: mesma semana de publicação + pico de sinal + conteúdo com `share_with_team` como micro_behavior alvo.

---

## O que o Motor faz com esses dados

- Associa sinal → campanha → trigger usado → persona alvo
- Atualiza nível de evidência do trigger envolvido
- Quando padrão se repete em 3+ campanhas: promove entry em [[learning-rules]]

---

## Relacionado

[[micro-comportamentos]] · [[learning-rules]] · [[padroes-por-canal]]
