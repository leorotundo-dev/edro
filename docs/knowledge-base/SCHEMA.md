# Knowledge Base Schema — Motor de Intervenção Comportamental (Edro Digital)

## O que é este knowledge base

O cérebro de aprendizado da Edro. Aqui ficam os padrões que o Motor descobriu funcionarem — organizados por persona, canal, trigger e fase de campanha. Não é documentação de produto. É inteligência operacional acumulada.

Toda pergunta feita ao Motor sobre "o que tende a funcionar para X" deve ser respondida com base neste knowledge base antes de qualquer suposição genérica.

---

## Estrutura de pastas

```
knowledge-base/
  raw/       → material bruto: dados de performance, feedback de cliente, anotações, briefings antigos, exportações de ferramentas
  wiki/      → padrões organizados, mantidos pelo AI — nunca editar à mão
  outputs/   → respostas, relatórios e planos gerados pelo Motor com base no wiki
```

### Regras absolutas

- **raw/** nunca é modificado pelo AI. É dump livre. Pode ser .md, .txt, .csv, qualquer formato.
- **wiki/** é mantido exclusivamente pelo AI. Nunca editar arquivos do wiki manualmente.
- **outputs/** é onde o AI salva respostas a perguntas específicas. Nomear com data + tema: `2026-04-05-gaps-persona-cfo.md`.

---

## Como o AI deve organizar o wiki

### Estrutura de arquivos

- Um arquivo `.md` por tema no diretório raiz do `wiki/`
- Sempre começar cada arquivo com um parágrafo de resumo (máx. 3 linhas)
- Usar `[[nome-do-arquivo]]` para linkar temas relacionados dentro do wiki
- Manter `INDEX.md` atualizado com todos os artigos e uma linha de descrição cada

### Temas que devem existir no wiki (mínimo)

| Arquivo | Descrição |
|---|---|
| `INDEX.md` | Mapa de todo o wiki |
| `personas.md` | Perfis de personas por cliente/segmento com atributos comportamentais |
| `triggers-comportamentais.md` | Catálogo de gatilhos (loss aversion, social proof, etc.) com evidências de uso |
| `padroes-por-canal.md` | O que funciona por canal (LinkedIn, Instagram, WhatsApp, OOH, etc.) |
| `fases-campanha.md` | Padrões por fase (história / prova / convite) e stage_of_change |
| `micro-comportamentos.md` | Quais ações (save, share, reply, click) respondem a quais combinações |
| `dark-funnel.md` | Sinais indiretos e como interpretá-los por setor |
| `learning-rules.md` | Regras vivas: padrões confirmados com evidência mínima de 3 campanhas |
| `erros-e-anti-padroes.md` | O que não funcionar e por quê — tão importante quanto o que funciona |

---

## Convenção de evidência

Toda entrada no wiki deve ter nível de evidência explícito:

- `[hipótese]` — observação sem dado confirmado
- `[1 caso]` — visto em uma campanha
- `[padrão]` — visto em 3+ campanhas independentes
- `[regra]` — confirmado via loop de aprendizado formal, pode ser recomendado pelo Motor automaticamente

O Motor só deve usar entradas `[padrão]` ou `[regra]` como recomendações automáticas.

---

## Como alimentar o raw/

Pode entrar em raw/:

- Exportações de métricas (Reportei, Meta Ads, LinkedIn Analytics)
- Feedback de cliente em reuniões (anotações livres)
- Briefings de campanhas encerradas
- Resultados de AMD (Ação Mínima Desejada) por campanha
- Threads e artigos de referência sobre comportamento e conteúdo
- Anotações de estrategistas sobre o que surpreendeu ou decepcionou

Não precisa organizar. Não precisa renomear. Só jogar.

---

## Comando padrão para compilar o wiki

Quando houver material novo em `raw/`, dizer ao AI:

> "Leia tudo em `docs/knowledge-base/raw/`. Atualize o wiki em `docs/knowledge-base/wiki/` seguindo as regras do SCHEMA.md. Se um tema não tiver artigo, crie. Se já tiver, atualize com os novos dados. Mantenha o nível de evidência explícito. Atualize o INDEX.md."

---

## Health check mensal

Dizer ao AI:

> "Revise todo o `wiki/`. Aponte: (1) contradições entre artigos, (2) claims sem fonte em raw/, (3) temas mencionados mas sem artigo próprio, (4) 3 lacunas de conhecimento que nos fariam planejar melhor campanhas."

---

## Foco do conhecimento

Este knowledge base é especializado em:

1. **Mudança de comportamento** — o que move pessoas de um stage_of_change para o próximo
2. **Conteúdo B2B** — especialmente mercados conservadores (financeiro, industrial, jurídico, saúde)
3. **Dark funnel** — sinais indiretos de intenção que não aparecem em analytics padrão
4. **Craft criativo comportamental** — como formato, estrutura e tom afetam a resposta comportamental
5. **Loop de aprendizado** — como transformar dados de campanha em regras replicáveis
