# Copy Generation Pipeline — Spec de Implementação

> Documento gerado em 2026-04-15  
> Decisão arquitetural: toda geração de copy usa as 3 IAs (Gemini → GPT → Claude) + Simulador de Sucesso.  
> O usuário não escolhe pipeline. O sistema entrega sempre o melhor resultado.

---

## Princípio

```
Toda geração de copy no sistema segue o mesmo fluxo:

  Gemini → análise estratégica + variantes iniciais
  GPT-4  → expansão criativa (mais variantes, mais ousadia)
  Claude → curadoria + refinamento
     ↓
  Simulador de Sucesso avalia todas as variantes
     ↓
  Somente a vencedora é entregue
```

---

## Mapa de impacto — 11 pontos de geração

| Superfície | Arquivo | Função atual | Tem simulador? |
|---|---|---|---|
| Briefing copy (main) | `routes/edro.ts:1897` | `generateCopyWithValidation()` default | ❌ |
| Briefing bulk copy | `routes/edro.ts:1832` | `generateCopy()` | ❌ |
| Studio copy-chain | `routes/studioCreative.ts:1056` | `runAgentRedator()` | ❌ |
| Campaign behavioral copy | `routes/campaigns.ts:1286` | `generateBehavioralDraft()` | ❌ |
| Pauta inbox | `routes/pautaInbox.ts:43` | `generatePautaSuggestions()` | ❌ |
| Jarvis tool generate_copy | `services/ai/toolExecutor.ts` | chama rota /copy | ❌ |
| Worker: oportunidades | `jobs/autoBriefingFromOpportunityWorker.ts:164` | `generateBehavioralDraft()` | ✅ (parcial) |
| Worker: fadiga de conteúdo | `jobs/contentFatigueMonitorWorker.ts:17` | `generateBehavioralDraft()` | ❌ |

---

## Função central — `generateAndSelectBestCopy()`

**Arquivo:** `apps/backend/src/services/ai/copyService.ts`

Adicionar após as funções existentes:

```typescript
// ─── Helper: extrai opções do output colaborativo ────────────────────────────

function parseCollaborativeOptions(output: string): string[] {
  const blocks = output.split(/OPCA[OÃ]O\s+\d+[:\.\-]?\s*/i).filter(b => b.trim().length > 20);
  if (blocks.length >= 2) return blocks.map(b => b.trim()).filter(Boolean);
  const fallback = output.split(/\n{3,}/).filter(b => b.trim().length > 20);
  return fallback.length >= 2 ? fallback.map(b => b.trim()) : [output.trim()];
}

// ─── Pipeline padrão: 3 IAs + simulador ──────────────────────────────────────

export async function generateAndSelectBestCopy(params: {
  prompt: string;
  knowledgeBlock?: string;
  reporteiHint?: string;
  clientName?: string;
  instructions?: string;
  tenantId: string;
  clientId?: string | null;
  platform?: string | null;
  amd?: string | null;
  triggers?: string[] | null;
  usageContext?: UsageContext;
}): Promise<CopyPipelineResult & {
  simulation_id: string | null;
  winner_index: number;
  winner_resonance: number;
  prediction_confidence_label: string;
  predicted_save_rate: number | null;
  predicted_click_rate: number | null;
  total_variants_tested: number;
}> {
  // Etapa 1: Gemini → GPT → Claude (10 variantes)
  const collaborative = await generateCollaborativeCopy({
    prompt: params.prompt,
    count: 10,
    knowledgeBlock: params.knowledgeBlock,
    reporteiHint: params.reporteiHint,
    clientName: params.clientName,
    instructions: params.instructions,
    usageContext: params.usageContext,
  });

  // Etapa 2: Extrair as 10 opções
  const options = parseCollaborativeOptions(collaborative.output);

  // Etapa 3: Montar VariantInputs para o simulador
  const variantInputs = options.map((text, i) => ({
    index: i,
    text,
    amd: params.amd || undefined,
    triggers: params.triggers?.length ? params.triggers : undefined,
  }));

  // Etapa 4: Simulador de Sucesso
  let simReport: Awaited<ReturnType<typeof runSimulation>> | null = null;
  let winnerIndex = 0;

  try {
    const { runSimulation } = await import('../campaignSimulator/simulationReport');
    simReport = await runSimulation({
      tenantId: params.tenantId,
      clientId: params.clientId || undefined,
      platform: params.platform || undefined,
      variants: variantInputs,
    });
    winnerIndex = simReport.winner_index ?? 0;
  } catch (err: any) {
    // Fallback silencioso: usa variante 0 se simulador falhar
    console.warn('[generateAndSelectBestCopy] Simulator fallback:', err.message);
    winnerIndex = 0;
  }

  const winnerVariant = simReport?.variants?.[winnerIndex];
  const winnerText = options[winnerIndex] ?? options[0] ?? collaborative.output;

  return {
    output: winnerText,
    model: collaborative.model,
    payload: {
      ...(collaborative.payload || {}),
      pipeline: 'smart',
      total_variants_tested: options.length,
      simulation_id: simReport?.id ?? null,
      winner_index: winnerIndex,
      winner_resonance: simReport?.winner_resonance ?? null,
      prediction_confidence_label: simReport?.prediction_confidence_label ?? null,
      predicted_save_rate: winnerVariant?.predicted_save_rate ?? null,
      predicted_click_rate: winnerVariant?.predicted_click_rate ?? null,
      predicted_engagement_rate: winnerVariant?.predicted_engagement_rate ?? null,
      winner_risk_flags: winnerVariant?.risk_flags ?? [],
      winner_fatigue_days: winnerVariant?.fatigue_days ?? null,
      winner_top_cluster: winnerVariant?.top_cluster ?? null,
      all_resonance_scores: simReport?.variants?.map(v => ({
        index: v.index,
        resonance: v.aggregate_resonance,
        top_cluster: v.top_cluster,
      })) ?? [],
    },
    simulation_id: simReport?.id ?? null,
    winner_index: winnerIndex,
    winner_resonance: simReport?.winner_resonance ?? 0,
    prediction_confidence_label: simReport?.prediction_confidence_label ?? 'Sem dados',
    predicted_save_rate: winnerVariant?.predicted_save_rate ?? null,
    predicted_click_rate: winnerVariant?.predicted_click_rate ?? null,
    total_variants_tested: options.length,
  };
}
```

> **Regra de fallback obrigatória:** se o simulador falhar por qualquer motivo (cliente sem clusters, timeout, erro de banco), o sistema entrega `options[0]` sem lançar exceção. Geração nunca quebra por falha do simulador.

---

## Superfície 1 — Briefing copy main

**Arquivo:** `apps/backend/src/routes/edro.ts` — handler `POST /edro/briefings/:id/copy`

**Mudança:** substituir o switch de pipelines pelo novo padrão.

```typescript
// REMOVER o switch/if-else de pipelines existente
// SUBSTITUIR por:

const { generateAndSelectBestCopy } = await import('../services/ai/copyService');

const amdFromBriefing: string | null =
  briefingPayload?.amd_type ||
  briefingPayload?.behavior_intent?.amd ||
  null;

const triggersFromBriefing: string[] | null =
  briefingPayload?.triggers ||
  briefingPayload?.behavior_intent?.triggers ||
  null;

const smartResult = await generateAndSelectBestCopy({
  prompt: finalPrompt,
  knowledgeBlock,
  reporteiHint,
  clientName: clientProfile?.name || '',
  instructions: body.instructions || '',
  tenantId,
  clientId: edroClientId || null,
  platform: briefingPayload?.platform || body.metadata?.platform || null,
  amd: amdFromBriefing,
  triggers: triggersFromBriefing,
  usageContext,
});

output = smartResult.output;
model = smartResult.model;
pipelinePayload = smartResult.payload;
```

> **Manter internamente** os pipelines `simple`, `premium`, `adversarial` como escape-hatch ativável por `body.force_pipeline` para uso interno/debugging. Nunca expor ao usuário final.

---

## Superfície 2 — Briefing bulk copy

**Arquivo:** `apps/backend/src/routes/edro.ts` — handler `POST /edro/briefings/bulk-copy` (linha ~1832)

**Mudança:** substituir `generateCopy()` por `generateAndSelectBestCopy()` em cada iteração.

```typescript
// Para cada briefingId no array:
const smartResult = await generateAndSelectBestCopy({
  prompt: buildBulkPrompt(briefing, clientProfile, knowledgeBlock),
  tenantId,
  clientId: edroClientId || null,
  platform: briefing.payload?.platform || null,
  amd: briefing.payload?.amd_type || null,
  triggers: briefing.payload?.triggers || null,
  usageContext,
});

// Persistir smartResult.output como o copy gerado
// smartResult.payload contém simulation_id e metadados do vencedor
```

> **Atenção:** bulk copy com 3 IAs por briefing aumenta o tempo total. Implementar com `Promise.allSettled()` em lotes de 3 briefings simultâneos (não sequencial) para manter performance.

---

## Superfície 3 — Studio copy-chain (agentRedator)

**Arquivo:** `apps/backend/src/routes/studioCreative.ts` — handler `POST /studio/creative/copy-chain` (linha ~1056)

**Estratégia:** manter o agentRedator (5-plugin chain com brand RAG e otimização de plataforma) e **adicionar o simulador após**, selecionando a melhor das 3 variantes que ele já gera.

```typescript
// Etapa 1: manter chamada existente
const agentResult = await runAgentRedator({
  briefing,
  clientProfile,
  trigger,
  tone,
  amd,
  platform,
  format,
  count: 3, // gera dor / logica / prova_social
});

// Etapa 2: passar as 3 variantes pelo simulador
const variantInputs = agentResult.variants.map((v, i) => ({
  index: i,
  text: v.audit.final_text || `${v.title}\n\n${v.body}\n\n${v.cta}`,
  amd: amd || undefined,
  triggers: trigger ? [trigger] : undefined,
}));

let winnerVariant = agentResult.variants[0];
let simulationMeta: Record<string, any> = {};

try {
  const { runSimulation } = await import('../services/campaignSimulator/simulationReport');
  const simReport = await runSimulation({
    tenantId,
    clientId: clientProfile?.edroClientId || null,
    platform: platform || undefined,
    variants: variantInputs,
  });
  winnerVariant = agentResult.variants[simReport.winner_index] ?? agentResult.variants[0];
  simulationMeta = {
    simulation_id: simReport.id,
    winner_index: simReport.winner_index,
    winner_resonance: simReport.winner_resonance,
    prediction_confidence_label: simReport.prediction_confidence_label,
    predicted_save_rate: simReport.variants[simReport.winner_index]?.predicted_save_rate ?? null,
  };
} catch (err: any) {
  console.warn('[copy-chain] Simulator fallback:', err.message);
}

// Retornar apenas o vencedor + metadados
return reply.send({
  variant: winnerVariant,
  brandVoice: agentResult.brandVoice,
  strategy: agentResult.strategy,
  simulation: simulationMeta,
});
```

---

## Superfície 4 — Campaign behavioral copy

**Arquivo:** `apps/backend/src/routes/campaigns.ts` — handler `POST /campaigns/:id/behavioral-copy` (linha ~1286)

**Estratégia:** gerar múltiplas combinações de AMD/triggers com agentWriter, auditar cada uma com agentAuditor (que já computa Fogg scores), passar todas pelo simulador com os Fogg scores reais, entregar a vencedora.

```typescript
// Etapa 1: Gerar 5 variantes com diferentes combinações de AMD/triggers
const AMD_VARIANTS = ['salvar', 'compartilhar', 'clicar', 'responder', 'pedir_proposta'];
const drafts: Array<{ draft: DraftContent; audit: AuditResult; amd: string }> = [];

await Promise.allSettled(
  AMD_VARIANTS.map(async (amdVariant) => {
    try {
      const draft = await generateBehavioralDraft({
        ...writerInput,
        behaviorIntent: { ...writerInput.behaviorIntent, amd: amdVariant },
      });
      const audit = await auditDraftContent({
        draft,
        persona,
        behaviorIntent: { ...behaviorIntent, amd: amdVariant },
        clientName,
      });
      if (audit.approval_status !== 'blocked') {
        drafts.push({ draft, audit, amd: amdVariant });
      }
    } catch { /* silencioso — AMD pode não ser adequado para esta plataforma */ }
  })
);

if (!drafts.length) {
  // Fallback: gerar pelo menos 1 com o AMD original
  const draft = await generateBehavioralDraft(writerInput);
  const audit = await auditDraftContent({ draft, persona, behaviorIntent, clientName });
  drafts.push({ draft, audit, amd: behaviorIntent.amd });
}

// Etapa 2: Montar VariantInputs com Fogg scores reais do auditor
const variantInputs = drafts.map((d, i) => ({
  index: i,
  text: `${d.draft.hook_text}\n\n${d.draft.content_text}\n\n${d.draft.cta_text}`,
  amd: d.amd,
  triggers: d.audit.behavior_tags?.triggers || [],
  fogg_motivation: d.audit.fogg_score?.motivation,
  fogg_ability: d.audit.fogg_score?.ability,
  fogg_prompt: d.audit.fogg_score?.prompt,
}));

// Etapa 3: Simular
let winnerDraft = drafts[0];
let simReport: SimulationReport | null = null;

try {
  const { runSimulation } = await import('../services/campaignSimulator/simulationReport');
  simReport = await runSimulation({
    tenantId,
    clientId,
    platform,
    variants: variantInputs,
  });
  winnerDraft = drafts[simReport.winner_index] ?? drafts[0];
} catch (err: any) {
  console.warn('[behavioral-copy] Simulator fallback:', err.message);
}

// Etapa 4: Persistir e retornar apenas o vencedor
// ... (manter lógica existente de INSERT em campaign_behavioral_copies)
// Adicionar ao payload: simulation_id, winner_resonance, fogg_score do vencedor
```

> **Nota:** agentWriter com AMD forçado pode gerar copy de baixa qualidade para AMDs incompatíveis com a plataforma. O `if (audit.approval_status !== 'blocked')` filtra esses casos antes de entrar no simulador.

---

## Superfície 5 — Pauta inbox

**Arquivo:** `apps/backend/src/routes/pautaInbox.ts` — handler `POST /pauta-inbox/generate` (linha ~43)

**Estratégia:** atualmente usa apenas Gemini. Adicionar GPT e Claude para expandir e refinar as sugestões antes de simular.

```typescript
// DENTRO de generatePautaSuggestions() em pautaSuggestionService.ts
// (ou diretamente no handler — seguir o padrão existente)

// Etapa 1: Gemini gera análise estratégica (manter comportamento atual)
const geminiAnalysis = await generateWithProvider('gemini', {
  prompt: analysisPrompt,
  temperature: 0.4,
  maxTokens: 800,
});

// Etapa 2: GPT expande em abordagens criativas (NOVO)
const gptExpansion = await generateWithProvider('openai', {
  prompt: buildPautaExpansionPrompt(geminiAnalysis.output, clientContext),
  temperature: 0.7,
  maxTokens: 1200,
});

// Etapa 3: Claude seleciona e refina (NOVO)
const claudeRefinement = await generateWithProvider('claude', {
  prompt: buildPautaRefinementPrompt(geminiAnalysis.output, gptExpansion.output, brandVoice),
  temperature: 0.3,
  maxTokens: 1000,
});

// Etapa 4: Simular as abordagens A e B resultantes
const approachTexts = parsePautaApproaches(claudeRefinement.output); // extrai abordagem A e B
const variantInputs = approachTexts.map((text, i) => ({ index: i, text }));

let bestApproach = approachTexts[0];
try {
  const { runSimulation } = await import('../campaignSimulator/simulationReport');
  const simReport = await runSimulation({ tenantId, clientId, variants: variantInputs });
  bestApproach = approachTexts[simReport.winner_index] ?? approachTexts[0];
} catch { /* fallback silencioso */ }

// Retornar a melhor abordagem como sugestão principal
```

> `buildPautaExpansionPrompt()` e `buildPautaRefinementPrompt()` são funções auxiliares a criar em `pautaSuggestionService.ts`. Seguir o padrão de prompt dos outros serviços (tom curto, instrução direta, sem verbose).

---

## Superfície 6 — Worker: fadiga de conteúdo

**Arquivo:** `apps/backend/src/jobs/contentFatigueMonitorWorker.ts` (linha ~17)

**Mudança:** após `generateBehavioralDraft()`, adicionar simulação antes de persistir o draft.

```typescript
// Após gerar o draft de substituição:
const newDraft = await generateBehavioralDraft(writerInput);
const audit = await auditDraftContent({ draft: newDraft, persona, behaviorIntent });

// Simular antes de criar o briefing de substituição
try {
  const { runSimulation } = await import('../services/campaignSimulator/simulationReport');
  const simReport = await runSimulation({
    tenantId,
    clientId,
    platform,
    variants: [{
      index: 0,
      text: `${newDraft.hook_text}\n\n${newDraft.content_text}\n\n${newDraft.cta_text}`,
      fogg_motivation: audit.fogg_score?.motivation,
      fogg_ability: audit.fogg_score?.ability,
      fogg_prompt: audit.fogg_score?.prompt,
    }],
  });
  // Só criar o briefing de substituição se resonance >= 40 (threshold mínimo)
  if ((simReport.variants[0]?.aggregate_resonance ?? 100) < 40) {
    console.warn('[fatigue-worker] Draft gerado com resonance baixo, pulando.');
    return;
  }
} catch { /* continuar mesmo sem simulação */ }
```

---

## Superfície 7 — Worker: oportunidades (já tem simulador)

**Arquivo:** `apps/backend/src/jobs/autoBriefingFromOpportunityWorker.ts`

**Status:** ✅ já usa `runSimulation()`. Apenas adicionar geração com 3 IAs antes da simulação.

```typescript
// Antes: generateBehavioralDraft() → runSimulation() com 1 variante
// Depois: usar generateAndSelectBestCopy() para gerar e simular em uma etapa

const { generateAndSelectBestCopy } = await import('../services/ai/copyService');
const smartResult = await generateAndSelectBestCopy({
  prompt: buildOpportunityPrompt(opportunity, clientProfile),
  tenantId,
  clientId,
  platform: opportunity.platform,
  amd: opportunity.suggested_amd,
  triggers: opportunity.triggers,
});

// Usar smartResult.output como copy do briefing gerado automaticamente
// smartResult.payload.simulation_id já referencia o resultado salvo
```

---

## Mudanças na toolDefinition do Jarvis

**Arquivo:** `apps/backend/src/services/ai/toolDefinitions.ts`

Localizar a tool `generate_copy_for_briefing` e **remover** o parâmetro `pipeline` da interface do usuário (ou torná-lo interno, não listado como parâmetro disponível).

```typescript
// REMOVER o parâmetro "pipeline" da tool generate_copy_for_briefing
// O Jarvis sempre usa o pipeline padrão (3 IAs + simulador)
// Sem exposição de opção de pipeline ao usuário

// Atualizar a descrição da tool:
"description": "Gera copy otimizado para um briefing usando 3 IAs em sequência (Gemini → GPT → Claude) e seleciona a variante com maior potencial de performance pelo Simulador de Sucesso. Retorna somente o melhor resultado."
```

**No toolExecutor**, onde a tool chama a rota de copy, garantir que passe sem `pipeline` (vai usar o novo default automaticamente).

---

## Resposta padrão ao usuário — o que muda no output

Toda resposta de geração de copy passa a incluir no `payload`:

```json
{
  "output": "[copy vencedor]",
  "model": "gpt-4o",
  "payload": {
    "pipeline": "smart",
    "total_variants_tested": 10,
    "simulation_id": "uuid",
    "winner_index": 3,
    "winner_resonance": 82,
    "prediction_confidence_label": "Alta (78%)",
    "predicted_save_rate": 0.0241,
    "predicted_click_rate": 0.0089,
    "winner_risk_flags": [],
    "winner_fatigue_days": 18,
    "winner_top_cluster": "salvadores"
  }
}
```

---

## O que NÃO muda

- `runAgentConceito()` — geração de conceitos criativos (não é copy)
- `generateAdCreative()` — geração de imagem (não é copy)
- `generateSequencePlan()` — planejamento de campanha sequencial (não é copy)
- A/B test infrastructure — permanece como está
- Tabelas de banco — nenhuma migration necessária
- UI de aprovação — nenhuma mudança (continua recebendo 1 resultado)

---

## Custo estimado por geração

| Superfície | Tokens médios | Modelos |
|---|---|---|
| Briefing copy | ~8.300 | Gemini Flash + GPT-4o mini + Claude Sonnet |
| Bulk copy (por briefing) | ~8.300 | idem |
| Studio copy-chain | ~3.500 (agentRedator) + ~100 (simulador) | Claude Sonnet (5 plugins) |
| Campaign behavioral | ~6.000 (5 drafts × 1.200) | Claude Sonnet (writer + auditor) |
| Pauta inbox | ~3.500 | Gemini + GPT + Claude |
| Workers | ~6.000–8.300 | idem behavioral |

> Simulador de Sucesso não consume tokens — é computação local (<500ms).

---

## Ordem de implementação recomendada para o Codex

1. `copyService.ts` — `parseCollaborativeOptions()` + `generateAndSelectBestCopy()` ← base de tudo
2. `edro.ts` — briefing copy main (superfície de maior volume)
3. `campaigns.ts` — behavioral copy (maior impacto qualitativo)
4. `studioCreative.ts` — copy-chain (adicionar simulador pós-agentRedator)
5. `edro.ts` — bulk copy (paralelismo com lote de 3)
6. `autoBriefingFromOpportunityWorker.ts` — trocar por generateAndSelectBestCopy
7. `contentFatigueMonitorWorker.ts` — adicionar threshold de resonance
8. `pautaSuggestionService.ts` — 3 IAs + simulador nas sugestões
9. `toolDefinitions.ts` + `toolExecutor.ts` — remover param pipeline do Jarvis
