# Canonical Retrieval Policy

## Objetivo

Padronizar como toda IA da Edro deve:

- identificar a intenção do pedido
- escolher a memória primária correta
- limitar o volume de contexto retornado
- separar teoria, referência, tendência, cliente e operação
- decidir quando pode executar uma ação

Esta política existe para evitar os cinco erros clássicos de retrieval:

1. não usar ferramenta nenhuma
2. usar a ferramenta errada
3. usar a ferramenta certa no índice errado
4. usar parâmetros errados
5. trazer contexto demais e degradar a resposta

---

## Princípios

### 1. Uma pergunta tem uma memória primária

Toda requisição deve começar por uma classe de conhecimento principal.

Memórias primárias possíveis:

- `canon_edro`
- `client_memory`
- `operations_memory`
- `reference_memory`
- `trend_memory`
- `performance_memory`

Fontes secundárias podem entrar, mas sempre subordinadas à memória primária.

### 2. Não existe busca “em tudo”

Nenhum agente pode consultar todas as memórias ao mesmo tempo por padrão.

Toda consulta deve declarar:

- `intent`
- `primary_memory`
- `secondary_memories`
- `retrieval_budget`
- `action_mode`

### 3. Camadas não podem ser confundidas

As seguintes classes precisam permanecer separadas:

- `Canon Edro`: teoria, fundamentos, história, estética, crítica
- `Client Memory`: reuniões, WhatsApp, aprovações, briefing, marca
- `Operations Memory`: jobs, Trello, SLA, fila, responsáveis
- `Reference Memory`: repertório visual aceito
- `Trend Memory`: padrões derivados do repertório e de fontes temporais
- `Performance Memory`: o que performou, o que falhou, o que gerou retrabalho

### 4. Trend nunca manda mais que canon + marca

Em qualquer fluxo criativo:

- `canon_edro` tem precedência sobre `trend_memory`
- `client_memory` tem precedência sobre `trend_memory`
- `trend_memory` entra como ajuste, nunca como fundamento

### 5. Ação exige contexto mínimo

Uma IA só pode executar quando houver contexto suficiente para não operar no escuro.

Se o contexto mínimo não existir, o agente deve:

- pedir informação faltante
- ou executar no modo `draft`
- ou responder com hipótese explicitamente marcada

---

## Contrato Canônico

Toda IA da Edro deve obedecer ao contrato:

`Intent -> Primary Memory -> Secondary Memories -> Retrieval Budget -> Labeled Output -> Action Decision`

---

## Intents Canônicos

| Intent | Memória primária | Secundárias permitidas | Tooling principal | Budget recomendado | Pode executar |
|---|---|---|---|---|---|
| `theory_lookup` | `canon_edro` | `reference_memory` | canon browser / semantic chunks | 3-8 chunks | não |
| `client_recall` | `client_memory` | `operations_memory` | reuniões, WhatsApp, briefing, aprovação | 3-5 evidências | não |
| `operations_control` | `operations_memory` | `client_memory`, `performance_memory` | jobs, Trello, SLA, fila | 10-20 itens estruturados | sim, com confirmação |
| `creative_strategy` | `canon_edro` | `client_memory`, `reference_memory`, `performance_memory`, `trend_memory` | DA engine + repertório | 1 bloco de canon + 1 de cliente + 3-5 refs + 2-3 trends | sim, em draft |
| `creative_execution` | `canon_edro` | `client_memory`, `reference_memory`, `performance_memory`, `trend_memory`, `operations_memory` | briefing/copy/DA/studio/action layer | mesmo budget de `creative_strategy` + contexto operacional mínimo | sim |
| `trend_audit` | `trend_memory` | `reference_memory`, `performance_memory` | trend snapshots / signals | 5-10 sinais | não |
| `reference_curation` | `reference_memory` | `canon_edro` | triagem e repertório visual | 5-20 refs | sim |
| `performance_review` | `performance_memory` | `client_memory`, `operations_memory`, `reference_memory` | métricas, aprovações, retrabalho | 5-15 evidências | não |
| `training_canon` | `canon_edro` | `reference_memory` | biblioteca teórica + moodboards | 1 tópico ou 1 módulo por vez | sim |

---

## Ferramentas por Classe de Memória

### Canon Edro

Uso:

- teoria
- direção de arte
- história
- tipografia
- crítica

Ferramentas:

- leitura estruturada de `canons`
- busca semântica em `canon_chunks`
- browser de tópicos

Nunca usar para:

- recuperar fala de cliente
- olhar atraso de job
- justificar tendência como se fosse fundamento

### Client Memory

Uso:

- o que a cliente falou
- o que aprovou
- o que mudou de direção
- restrições da marca

Ferramentas:

- reuniões
- `meeting_chat`
- WhatsApp
- briefing
- aprovações
- perfil da marca

Nunca usar para:

- responder teoria geral
- definir sozinho canon da Edro

### Operations Memory

Uso:

- controlar prazo
- fila
- quem está com o quê
- gargalos
- SLA

Ferramentas:

- jobs
- Trello espelhado
- sinais operacionais
- estimativas
- capacidade

Nunca usar para:

- responder pergunta de teoria
- definir estilo por si só

### Reference Memory

Uso:

- repertório visual aceito
- exemplos
- linguagem de resolução

Ferramentas:

- referências aprovadas
- moodboards
- exemplares visuais

Nunca usar para:

- substituir canon
- virar verdade teórica

### Trend Memory

Uso:

- padrões emergentes
- saturação
- sinais visuais subindo

Ferramentas:

- trend snapshots
- clusters
- tags temporais

Nunca usar para:

- dar ordem ao motor acima de marca + canon

### Performance Memory

Uso:

- saber o que funcionou
- saber o que gerou retrabalho
- calibrar decisões

Ferramentas:

- eventos de feedback
- métricas
- aprovações
- rejeições
- tempo até aprovação

Nunca usar para:

- justificar sozinho uma linguagem errada para a marca

---

## Retrieval Budget

Para proteger contexto e custo, cada classe deve respeitar um teto.

### Texto

- teoria: `3-8` chunks
- memória do cliente: `3-5` evidências
- operações: `10-20` itens estruturados
- performance: `5-15` sinais

### Referências visuais

- triagem: `até 20`
- repertório para criação: `3-5`
- comparação A/B: `2`

### Tendências

- usar no máximo `2-3` sinais por geração criativa

### Regra geral

Se a recuperação ultrapassar o budget, o sistema deve:

- resumir
- ranquear
- deduplicar
- ou pedir refinamento

---

## Rotulagem de Saída

Toda resposta relevante deve manter separação explícita entre origem e interpretação.

Formato recomendado:

- `Canon Edro`
- `Memória do Cliente`
- `Repertório Visual`
- `Trend Radar`
- `Operação`
- `Performance`

Quando houver inferência, marcar como:

- `inferência`
- `hipótese`
- `recomendação`

Nunca apresentar inferência como fato bruto.

---

## Regra de Ação

### Pode agir sozinho

Quando:

- a intenção está clara
- há memória primária suficiente
- o risco é baixo ou reversível

Exemplos:

- gerar draft de post
- montar briefing
- priorizar fila de jobs
- resumir reunião

### Precisa de confirmação

Quando:

- muda responsável
- muda prazo
- aprova/rejeita
- publica
- altera algo sensível para cliente

### Não pode agir

Quando:

- a memória primária está ausente
- os dados são contraditórios
- há ambiguidade entre cliente, job ou direção

---

## Aplicação por Produto

### Jarvis

Jarvis deve começar por `intent routing`.

Exemplos:

- “o que a cliente falou na reunião?” -> `client_recall`
- “quem está atrasado em arte?” -> `operations_control`
- “cria um post pra mim” -> `creative_execution`

### Motor de DA

O motor deve obedecer a esta ordem:

1. `canon_edro`
2. `client_memory`
3. `reference_memory`
4. `performance_memory`
5. `trend_memory`

Nunca inverter essa hierarquia.

### Creative Ops

Pedidos de prazo, carga e redistribuição devem usar:

1. `operations_memory`
2. `performance_memory`
3. `client_memory` apenas como apoio

---

## Anti-padrões Proibidos

- usar `trend_memory` como base primária de criação
- buscar reunião em índice de referências
- consultar operação para responder teoria
- misturar cliente e canon no mesmo bloco sem rótulo
- devolver páginas inteiras de contexto sem filtragem
- agir sem memória primária suficiente

---

## Checklist de Implementação

Toda nova tool, memória ou agente deve responder:

1. Qual é o `intent`?
2. Qual é a `primary_memory`?
3. Quais são as `secondary_memories` permitidas?
4. Qual é o `retrieval_budget`?
5. O output vem rotulado por origem?
6. O agente pode agir sozinho, com confirmação, ou não pode agir?

Se uma nova feature não responde isso, ela ainda não está pronta para entrar na Edro.
