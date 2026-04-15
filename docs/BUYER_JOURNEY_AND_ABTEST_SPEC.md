# Buyer Journey Routing + A/B Test UI — Spec de Implementação

> Documento gerado em 2026-04-15

---

# Parte 1 — Buyer Journey Routing

## Diagnóstico

O sistema já tem `momento_consciencia` (problema / solucao / decisao) no briefing e na UI.  
O `agentWriter` (campanhas) já o usa para calibrar o copy.  
**O `agentRedator` (studio copy-chain) e o pipeline colaborativo ignoram completamente o momento.**

Resultado: o sistema gera o mesmo copy para quem ainda não sabe que tem um problema e para quem já está prestes a comprar.

---

## O que muda por estágio

| Momento | Label UI | O que o copy deve fazer |
|---|---|---|
| `problema` | Descoberta | Nomear o problema sem julgamento. Não vender. Criar reconhecimento. |
| `solucao` | Avaliando | Mostrar o diferencial com dados e provas. Comparar. Eliminar dúvidas. |
| `decisao` | Pronto para agir | Eliminar objeções finais. Urgência genuína. Caso de sucesso. CTA direto. |

---

## Arquivos a modificar

- `apps/backend/src/services/ai/agentRedator.ts` — adicionar `momento` nos params e nos prompts dos plugins 2 e 3
- `apps/backend/src/services/ai/copyService.ts` — passar `momento` no `generateAndSelectBestCopy()`
- `apps/backend/src/routes/edro.ts` — extrair `momento_consciencia` do briefing e passar para o novo pipeline

---

## 1. Atualizar `agentRedator.ts`

### Adicionar `momento` no tipo `AgentRedatorParams`

```typescript
export type AgentRedatorParams = {
  briefing?: { title?: string; payload?: any } | null;
  clientProfile?: any;
  trigger?: string | null;
  tone?: string | null;
  amd?: string | null;
  momento?: 'problema' | 'solucao' | 'decisao' | null; // ← NOVO
  platform?: string | null;
  format?: string | null;
  taskType?: string | null;
  count?: number;
  brandVoiceOverride?: Partial<BrandVoiceContext>;
  strategyOverride?: Partial<HookStrategy>;
  appealsOverride?: Array<'dor' | 'logica' | 'prova_social'>;
};
```

### Adicionar constante de contexto por momento (junto às outras constantes do arquivo)

```typescript
const MOMENTO_COPY_DIRECTION: Record<string, string> = {
  problema: `
ESTÁGIO DE CONSCIÊNCIA: DESCOBERTA (problema)
A audiência ainda não sabe que tem esse problema ou está em negação.
REGRAS CRÍTICAS:
- NÃO mencione o produto/serviço diretamente
- NÃO use CTAs de venda (compre, contrate, agende)
- Use linguagem de empatia e reconhecimento ("Você provavelmente já sentiu...")
- Objetivo: fazer a pessoa dizer "isso é exatamente o que acontece comigo"
- Hook: situação cotidiana que revela o problema implicitamente
- CTA aceitável: "Descubra por que isso acontece" / "Veja se você se identifica"
`,
  solucao: `
ESTÁGIO DE CONSCIÊNCIA: AVALIANDO (solucao)
A audiência conhece o problema e está comparando soluções.
REGRAS CRÍTICAS:
- Compare explicitamente com o status quo ou alternativas genéricas
- Use dados, números e provas concretas
- Destaque o diferencial específico (não "somos melhores", mas "X% mais rápido")
- Responda objeções comuns implicitamente no copy
- CTA aceitável: "Veja como funciona" / "Compare os resultados" / "Baixe o caso de sucesso"
`,
  decisao: `
ESTÁGIO DE CONSCIÊNCIA: PRONTO PARA AGIR (decisao)
A audiência está entre 2-3 opções e buscando o último empurrão.
REGRAS CRÍTICAS:
- Elimine a última objeção (preço, tempo, confiança ou complexidade)
- Use prova social específica: nome de cliente, resultado mensurável, prazo real
- Crie urgência genuína (não fake): vagas limitadas reais, prazo real, bônus com data
- CTA direto e sem ambiguidade: "Comece hoje" / "Fale com especialista agora" / "Garanta sua vaga"
- Tom: confiança total, sem hesitação
`,
};
```

### Injetar no Plugin 2 (Strategist) — localizar o prompt do Plugin 2 e adicionar

```typescript
// No buildPlugin2Prompt() ou inline no Plugin 2:
const momentoDirection = params.momento ? MOMENTO_COPY_DIRECTION[params.momento] || '' : '';

// Adicionar ao sistema prompt do Plugin 2:
const plugin2SystemPrompt = `
[...]  // prompt existente
${momentoDirection}
[...]
`;
```

### Injetar no Plugin 3 (Variant Generator) — mesmo padrão

```typescript
// No buildPlugin3Prompt() ou inline no Plugin 3:
const momentoDirection = params.momento ? MOMENTO_COPY_DIRECTION[params.momento] || '' : '';

// Adicionar antes das instruções de variantes:
const plugin3SystemPrompt = `
[...]  // prompt existente
${momentoDirection}
Gere as variantes respeitando ESTRITAMENTE as regras do estágio de consciência acima.
`;
```

### Passar `momento` na chamada de `runAgentRedator()` em `studioCreative.ts`

```typescript
// Em POST /studio/creative/copy-chain, extrair momento do briefing:
const momentoFromBriefing = briefing?.payload?.momento_consciencia || null;

const agentResult = await runAgentRedator({
  briefing,
  clientProfile,
  trigger,
  tone,
  amd,
  momento: momentoFromBriefing, // ← NOVO
  platform,
  format,
  count: 3,
});
```

---

## 2. Atualizar `copyService.ts` — `generateAndSelectBestCopy()`

Adicionar `momento` nos params e injetar no prompt colaborativo:

```typescript
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
  momento?: 'problema' | 'solucao' | 'decisao' | null; // ← NOVO
  usageContext?: UsageContext;
}): Promise<...> {

  // Bloco de momento para injetar no prompt colaborativo
  const momentoBlock = params.momento ? `
ESTÁGIO DE CONSCIÊNCIA DO COPY: ${params.momento.toUpperCase()}
${MOMENTO_COPY_DIRECTION[params.momento] || ''}
` : '';

  const collaborative = await generateCollaborativeCopy({
    prompt: `${momentoBlock}\n\n${params.prompt}`,
    count: 10,
    knowledgeBlock: params.knowledgeBlock,
    reporteiHint: params.reporteiHint,
    clientName: params.clientName,
    instructions: params.instructions,
    usageContext: params.usageContext,
  });

  // [...resto sem mudança]
}
```

> **Nota:** `MOMENTO_COPY_DIRECTION` deve ser exportado de `agentRedator.ts` ou duplicado em `copyService.ts`. Preferir exportar.

---

## 3. Atualizar `edro.ts` — passar `momento` para o pipeline

```typescript
// Já existe:
const payloadMomento = briefingPayload.momento_consciencia ?? null;

// Adicionar na chamada de generateAndSelectBestCopy():
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
  momento: payloadMomento, // ← NOVO
  usageContext,
});
```

---

## Resultado esperado

| Antes | Depois |
|---|---|
| Copy idêntico para quem não sabe do problema e quem quer comprar | Copy calibrado para o momento exato da audiência |
| agentRedator ignora `momento_consciencia` | Plugin 2 e 3 adaptam estratégia e variantes ao estágio |
| Pipeline colaborativo ignora o funil | 10 variantes geradas já dentro do estágio correto |

---

---

# Parte 2 — A/B Test UI

## Diagnóstico

O backend tem tudo: serviço, 5 rotas, schema completo, integração com learning loop.  
A UI tem `ABTestNode.tsx` com sliders visuais mas **zero chamadas de API**.  
O botão "Confirmar Teste A/B" não faz nada no backend.

---

## O que precisa existir na UI

```
1. Criar teste       → selecionar 2 variantes + métrica → POST /edro/briefings/:id/ab-test
2. Ver progresso     → status do teste (running/completed) + resultados parciais
3. Registrar métrica → após o post ir ao ar, registrar impressões/clicks/engagement
4. Declarar vencedor → botão que chama POST /edro/ab-tests/:testId/declare-winner
5. Ver resultado     → qual variante ganhou e por quê
```

---

## Arquivos a modificar / criar

| Arquivo | O que muda |
|---|---|
| `apps/web/components/pipeline/nodes/ABTestNode.tsx` | Wiring com API — criar + status |
| `apps/web/components/studio/ABTestResultPanel.tsx` | **Novo** — registrar métricas + declarar vencedor |
| `apps/web/app/studio/editor/EditorClient.tsx` | Mostrar badge de teste ativo |

---

## 1. Wiring do `ABTestNode.tsx`

### Estado atual
O componente mantém estado local (splits), tem botão "Confirmar Teste A/B" que apenas seta `confirmed = true`. Nenhuma chamada de API.

### O que adicionar

```typescript
// Adicionar ao componente ABTestNode:

const [testId, setTestId] = useState<string | null>(null);
const [isCreating, setIsCreating] = useState(false);
const [testError, setTestError] = useState<string | null>(null);

// Substituir o handler do botão "Confirmar Teste A/B":
const handleConfirmTest = async () => {
  if (variants.length < 2) return;

  setIsCreating(true);
  setTestError(null);

  try {
    const res = await fetch(`/api/edro/briefings/${briefingId}/ab-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_a_id: variants[0].id,
        variant_b_id: variants[1].id,
        metric: selectedMetric, // 'engagement' | 'clicks' | 'conversions' | 'score'
      }),
    });

    if (!res.ok) throw new Error('Erro ao criar teste');
    const data = await res.json();
    setTestId(data.id);
    setConfirmed(true);
  } catch (err: any) {
    setTestError(err.message);
  } finally {
    setIsCreating(false);
  }
};

// Adicionar selector de métrica antes do botão de confirmar:
const METRIC_OPTIONS = [
  { value: 'engagement', label: 'Engajamento' },
  { value: 'clicks', label: 'Cliques' },
  { value: 'conversions', label: 'Conversões' },
  { value: 'score', label: 'Score' },
];
const [selectedMetric, setSelectedMetric] = useState('engagement');
```

### UI additions ao ABTestNode

```tsx
{/* Selector de métrica — exibir antes do botão de confirmar */}
{!confirmed && (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary">Métrica do teste</Typography>
    <ToggleButtonGroup
      value={selectedMetric}
      exclusive
      onChange={(_, v) => v && setSelectedMetric(v)}
      size="small"
      sx={{ mt: 0.5 }}
    >
      {METRIC_OPTIONS.map(opt => (
        <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
      ))}
    </ToggleButtonGroup>
  </Box>
)}

{/* Badge de teste criado */}
{confirmed && testId && (
  <Chip
    size="small"
    label={`Teste ativo · ID ${testId.slice(0, 8)}`}
    color="success"
    sx={{ mt: 1 }}
  />
)}

{testError && (
  <Alert severity="error" sx={{ mt: 1 }}>{testError}</Alert>
)}
```

---

## 2. Novo componente `ABTestResultPanel.tsx`

**Localização:** `apps/web/components/studio/ABTestResultPanel.tsx`

Este painel aparece no EditorClient quando há um teste ativo para o briefing.  
Permite registrar métricas manualmente e declarar o vencedor.

```tsx
'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';

type ABTestResult = {
  variant_id: string;
  impressions: number;
  clicks: number;
  engagement: number;
  conversions: number;
  score?: number;
};

type Props = {
  briefingId: string;
  testId: string;
  variantAId: string;
  variantBId: string;
  metric: string;
  onWinnerDeclared?: (winnerId: string) => void;
};

export function ABTestResultPanel({
  briefingId, testId, variantAId, variantBId, metric, onWinnerDeclared
}: Props) {
  const [results, setResults] = useState<Record<string, Partial<ABTestResult>>>({
    [variantAId]: { impressions: 0, clicks: 0, engagement: 0, conversions: 0 },
    [variantBId]: { impressions: 0, clicks: 0, engagement: 0, conversions: 0 },
  });
  const [winner, setWinner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRecordResult = async (variantId: string) => {
    setSaving(true);
    setError(null);
    try {
      await fetch(`/api/edro/ab-tests/${testId}/result`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_id: variantId, ...results[variantId] }),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeclareWinner = async () => {
    setDeclaring(true);
    setError(null);
    try {
      const res = await fetch(`/api/edro/ab-tests/${testId}/declare-winner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erro ao declarar vencedor');
      const data = await res.json();
      setWinner(data.winner_id);
      onWinnerDeclared?.(data.winner_id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeclaring(false);
    }
  };

  const variantLabels: Record<string, string> = {
    [variantAId]: 'Variante A',
    [variantBId]: 'Variante B',
  };

  if (winner) {
    return (
      <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light' }}>
        <Typography variant="subtitle2" fontWeight={700}>
          ✓ Vencedor declarado
        </Typography>
        <Typography variant="body2">
          {variantLabels[winner] || winner.slice(0, 8)} ganhou por {metric}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          O resultado foi enviado para o loop de aprendizado do cliente.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
        Resultado do Teste A/B · métrica: {metric}
      </Typography>

      {[variantAId, variantBId].map(variantId => (
        <Box key={variantId} sx={{ mb: 3 }}>
          <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
            {variantLabels[variantId]}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
            {['impressions', 'clicks', 'engagement', 'conversions'].map(field => (
              <TextField
                key={field}
                label={field}
                type="number"
                size="small"
                value={(results[variantId] as any)[field] || 0}
                onChange={e => setResults(prev => ({
                  ...prev,
                  [variantId]: { ...prev[variantId], [field]: Number(e.target.value) }
                }))}
              />
            ))}
          </Box>

          <Button
            size="small"
            variant="outlined"
            disabled={saving}
            onClick={() => handleRecordResult(variantId)}
          >
            Salvar resultado
          </Button>
        </Box>
      ))}

      <Divider sx={{ my: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        variant="contained"
        color="primary"
        fullWidth
        disabled={declaring}
        onClick={handleDeclareWinner}
      >
        {declaring ? 'Declarando...' : 'Declarar vencedor'}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        O vencedor alimenta automaticamente o loop de aprendizado e eleva o score da cópia ganhadora.
      </Typography>
    </Box>
  );
}
```

---

## 3. Integrar no `EditorClient.tsx`

Carregar o teste ativo do briefing e mostrar o painel quando existir:

```typescript
// No useEffect de carregamento do briefing, adicionar:
const fetchActiveTest = async (briefingId: string) => {
  try {
    const res = await fetch(`/api/edro/briefings/${briefingId}/ab-tests`);
    if (!res.ok) return;
    const tests = await res.json();
    const running = tests.find((t: any) => t.status === 'running');
    if (running) setActiveAbTest(running);
  } catch { /* silencioso */ }
};

// Estado:
const [activeAbTest, setActiveAbTest] = useState<any>(null);

// Na seção de cópia do editor, após a lista de variantes:
{activeAbTest && (
  <ABTestResultPanel
    briefingId={briefingId}
    testId={activeAbTest.id}
    variantAId={activeAbTest.variant_a_id}
    variantBId={activeAbTest.variant_b_id}
    metric={activeAbTest.metric}
    onWinnerDeclared={() => setActiveAbTest(null)}
  />
)}
```

---

## Resultado esperado

| Antes | Depois |
|---|---|
| Botão "Confirmar Teste A/B" não faz nada | Cria teste real no backend com métrica selecionada |
| Não há como registrar resultados | Painel de resultado com campos por variante |
| Não há como declarar vencedor | Botão que chama backend + integra learning loop |
| Infraestrutura de A/B 100% invisível | Fluxo completo: criar → medir → declarar → aprender |

---

## Ordem de implementação para o Codex

### Buyer Journey Routing
1. Exportar `MOMENTO_COPY_DIRECTION` de `agentRedator.ts`
2. Adicionar `momento` em `AgentRedatorParams`
3. Injetar nos prompts dos plugins 2 e 3
4. Atualizar `generateAndSelectBestCopy()` em `copyService.ts`
5. Passar `momento` na chamada em `edro.ts` e `studioCreative.ts`

### A/B Test UI
1. Atualizar `ABTestNode.tsx` — adicionar selector de métrica + chamada de API
2. Criar `ABTestResultPanel.tsx`
3. Integrar painel no `EditorClient.tsx`
