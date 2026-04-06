# Learning Rules

Regras vivas do Motor. Cada entrada aqui foi confirmada em 3+ campanhas independentes e pode ser usada como recomendação automática pelo Motor no próximo planejamento.

Regras com nível [hipótese] ou [1 caso] ficam em [[triggers-comportamentais]] e [[padroes-por-canal]] até terem evidência suficiente.

---

## Como uma regra entra aqui

1. Padrão observado em campanha → registrado em `raw/`
2. AI atualiza artigo relevante no wiki com nível [1 caso]
3. Padrão se repete em 2ª campanha independente → nível [padrão]
4. Padrão confirmado em 3ª campanha → entry criada aqui com nível [regra]
5. Health check mensal valida se regra ainda se sustenta com dados mais recentes

---

## Regras ativas

> Nenhuma regra confirmada ainda. Knowledge base iniciado em 2026-04-05.
> Primeiras regras esperadas após 3 ciclos de campanha com dados registrados.

---

## Pipeline de padrões (a confirmar)

Padrões que estão sendo rastreados e precisam de mais evidência:

| Hipótese | Origem | Evidência atual | Próximo passo |
|---|---|---|---|
| social_proof de setor específico gera share_with_team em B2B conservador | Spec do Motor | [hipótese] | Testar em 1ª campanha real |
| loss_aversion em fase Convite aumenta request_demo vs. CTA genérico | Spec do Motor | [hipótese] | A/B test na próxima campanha |
| Conteúdo com specificity em headline aumenta click_to_read em persona técnica | Spec do Motor | [hipótese] | Monitorar CTR por tipo de headline |

---

## Mecanismo automático de filing (implementado 2026-04-06)

A partir desta versão, o JARVIS arquiva automaticamente insights de cada output gerado:

- **jarvisKbFilingService**: toda vez que o JARVIS gera copy, briefing, proposta de campanha ou resposta, os gatilhos usados, persona e AMD são arquivados como `evidence_level='hypothesis'` em `jarvis_kb_entries`.
- **Upgrade automático**: ao acumular performance real (MetaSync → LearningEngine → jarvisKbWorker), entradas hypothesis sobem para `one_case → pattern → rule`.
- **Health check mensal** (jarvisKbHealthWorker): detecta contradições, afirmações sem fonte, lacunas e sugere 3 novos artigos por cliente.
- **Ferramenta de IA** `search_jarvis_kb`: o JARVIS pode consultar o próprio KB durante geração de copy, fechando o loop de aprendizado.

O pipeline completo:
```
Output gerado → fileOutputToKb (hypothesis)
      ↓
Performance real (Meta/reportei)
      ↓
LearningEngine → learningRules
      ↓
jarvisKbWorker → synthesizeClientKb (one_case/pattern/rule)
      ↓
promoteToAgencyKb (padrões em 3+ clientes)
      ↓
JARVIS usa KB em próximos outputs via buildKbContext + search_jarvis_kb
```

---

## Como usar este arquivo no planejamento

Antes de definir triggers de uma nova campanha, o Motor deve:

1. Checar se a persona tem entradas em [regra] aqui
2. Priorizar triggers com evidência confirmada para o cluster persona+canal+fase
3. Reservar 20% do mix para testar triggers com nível [hipótese] — alimentar o pipeline

---

## Relacionado

[[triggers-comportamentais]] · [[padroes-por-canal]] · [[micro-comportamentos]] · [[dark-funnel]]
