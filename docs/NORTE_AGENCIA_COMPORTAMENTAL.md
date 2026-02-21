# Edro Digital — Norte Estratégico: A Agência do Futuro

**Versão:** 1.0
**Data:** 20 de fevereiro de 2026
**Status:** Documento de referência permanente — toda decisão de produto deve ser avaliada contra essa visão.

---

## O que estamos construindo

Não uma ferramenta de geração de conteúdo.
Uma **máquina de mudança de comportamento** que opera como agência.

O Motor de Intervenção Comportamental é o cérebro de tudo. Cada feature, endpoint, tela e agente de IA deve servir a um dos quatro andares abaixo.

---

## Os Quatro Andares

### 1. Negócio — Como vendemos

A Edro não vende posts, filmes ou tráfego.
Vende **programas de mudança de comportamento**:

- "Programa de orgulho e retenção de colaboradores."
- "Programa de confiança para mercado financeiro."
- "Programa de geração de demanda qualificada."

Cada proposta inclui: mapa de públicos, comportamentos-alvo, horizonte de tempo, hipóteses comportamentais (gatilhos que serão testados) e visão de métricas além de mídia (dark funnel, sinais qualitativos).

A conversa comercial muda de:
> "20 posts, 1 vídeo e 5 mil de mídia."

Para:
> "Durante 6 meses vamos trabalhar para aumentar em X% a taxa de leads que chegam por indicação interna."

---

### 2. Estratégia — Como nasce uma campanha

**Input mínimo:**
Nome da marca, objetivo, públicos e dores, canais, verba.

**O Motor faz automaticamente:**
- Traduz em brief comportamental: personas, estágios de jornada, comportamentos mínimos desejados por público e fase, gatilhos sugeridos.
- Monta esqueleto de campanha: fases (história / prova / convite), mix de peças por canal, decisão de onde investir craft vs automação.
- Calcula plano de verba simplificado: hero vs derivadas, onde concentrar spend, margem para teste criativo.

O estrategista não parte da tela em branco. Parte de um plano coerente, ajusta e negocia com cliente.

---

### 3. Criação — Como as ideias aparecem

**O time recebe do sistema:**
3–5 territórios criativos por campanha, cada um com insight humano, gatilhos principais, exemplo de linha/conceito e peça hero.

Eles escolhem, combinam, reescrevem, jogam fora — mas sempre em cima de algo que já tem coerência comportamental.

**Quando território é aprovado, o Motor gera:**
Rascunhos de posts por canal, linhas de anúncio, ideia de OOH, estrutura de roteiro de filme — tudo respeitando tom, canal e comportamento-alvo da fase.

**A criação vira curadoria, melhoria, craft — não digitação do zero.**

Antes de ir ao cliente: Checker de Coerência + Policy Engine aponta desvios de tom, inconsistências com o brief comportamental e riscos éticos. O time decide se ajusta ou banca conscientemente.

---

### 4. Performance — Como aprendemos

**Métricas que importam:**
Além de CTR e alcance: microcomportamentos (saves, shares, respostas, marcações), sinais de dark funnel (picos de tráfego direto, aumento de buscas de marca, leads dizendo "me mandaram esse post").

Tudo conectado a: público + fase da campanha + gatilhos usados.

**Aprendizado em loop:**
O Motor agrupa por segmento (persona + canal + comportamento-alvo), identifica padrões ("para público X, gatilho A + formato B converte melhor"), e transforma em regras vivas que o próximo planner e o próximo criativo já veem como recomendações.

**A Edro acumula um acervo de padrões — não só um histórico de jobs.**

---

## Arquitetura: O que isso implica em produto

### Entidade central que ainda não existe: Campaign

Hoje operamos no nível de peça (briefing → copy).
A visão opera no nível de programa (campanha → fases → assets).

Sem Campaign no centro, os andares não se conectam:
- Performance não sabe de qual fase a peça veio.
- Estratégia não mostra evolução de comportamento no tempo.
- Criação não sabe qual território está servindo.

**Campaign é a próxima grande mudança arquitetural.**

### Objetos que Campaign conecta

```
Campaign
  ├── Audience[]          (personas + estágios por público)
  ├── BehaviorIntent[]    (micro_behavior + triggers + modelo por fase)
  ├── CreativeConcept[]   (territórios aprovados)
  └── CreativeAsset[]     (peças por canal, vinculadas a intent + conceito)
        └── Performance   (métricas + sinais comportamentais)
```

### O que já existe hoje (mapeamento)

| Objeto do Norte | Implementado | Onde |
|---|---|---|
| Persona (simplificada) | ✅ | `clients.profile.personas[]` |
| AMD / micro_behavior | ✅ | `edro_briefings.payload.amd` |
| Stage of change (3 níveis) | ✅ | `momento_consciencia` |
| AMD Result tracking | ✅ | `preference_feedback.amd_achieved` |
| Learning loop (AMD) | ✅ | `aggregateAmdPerformance` + tab "O que funcionou" |
| PersonaBlock + AMDBlock no prompt | ✅ | `personaPrompt.ts` + `edro.ts` |
| Campaign | ❌ | Net new |
| BehaviorIntent (completo) | ❌ | Parcial via AMD |
| CreativeConcept | ❌ | Net new |
| AgentPlanner | ❌ | Net new |
| AgentTagger | ❌ | Net new |
| ContentPerformance (APIs externas) | ❌ | Net new |
| DarkFunnelEvent | ❌ | Net new |
| PolicyEngine | ❌ | Net new |
| LearningRules (formais) | ❌ | Parcial via directives |

---

## Princípio de design para toda feature nova

Antes de construir qualquer coisa, perguntar:

1. **Em qual andar isso vive?** (Negócio / Estratégia / Criação / Performance)
2. **Serve ao Campaign como entidade central?**
3. **Alimenta o loop de aprendizado?**
4. **Pode ser medido em microcomportamentos reais?**

Se a resposta for não para todos os quatro, questionar se a feature precisa existir agora.

---

## Referências

- Spec técnica completa: `docs/MOTOR_INTERVENCAO_COMPORTAMENTAL_SPEC.md` (Fogg Model, Hook Model, UserBehaviorProfile, PolicyEngine YAML, LearningEngine)
- Implementação atual: `apps/backend/src/services/personaPrompt.ts`, `preferenceEngine.ts`, `learningLoopService.ts`
- Commit de base: `dec4e5f` — Motor de Mudança de Comportamento (Persona + AMD + Learning Loop)
