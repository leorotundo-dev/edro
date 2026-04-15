# Spec: Regerar Copy com Instrução

**Data:** 2026-04-15  
**Status:** Pronto para Codex  
**Impacto:** HIGH — refinamento pós-geração, loop de aprendizado, redução de retrabalho manual

---

## Contexto e problema

O usuário não consegue dizer "tente de novo, mas mais curto" ou "muda o CTA para urgência" a partir da UI.

O fluxo atual após uma rejeição:
1. Usuário clica ❌ Rejeitar
2. `RejectionReasonPicker` coleta tags + motivo de texto livre
3. `handleRejectOption` faz `PATCH /edro/copies/:copyId/feedback`
4. A output é apagada (`setOutput('')`)
5. Usuário tem que clicar "Gerar" manualmente **sem contexto da instrução anterior**

A instrução é jogada fora. O sistema não aprende a iteração.

### O que já existe (não precisa criar)
- `preference_feedback.regeneration_instruction TEXT` — migration `0160` ✓
- `preference_feedback.regeneration_count INTEGER` ✓
- `PATCH /edro/copies/:copyId/feedback` aceita `regeneration_instruction` (linha 1726 de `edro.ts`) ✓
- `POST /edro/briefings/:id/copy` aceita `instructions` ✓
- `generateAndSelectBestCopy()` aceita `instructions` ✓
- `preferenceEngine.recordPreferenceFeedback()` salva o campo ✓

### O que falta
1. Frontend não coleta `regeneration_instruction` no `RejectionReasonPicker`
2. Frontend não envia o campo no `PATCH feedback`
3. Não existe botão "Regerar com instrução" separado do fluxo de rejeição
4. Não existe endpoint dedicado `POST /edro/copies/:copyId/regenerate`
5. Não existe fluxo de "Quick Refine" (refinar sem rejeitar — ex.: "deixa mais formal")

---

## Dois fluxos de UX

### Fluxo A — Rejection + Regenerate (substitui o fluxo atual de rejeição)

```
Usuário clica ❌ Rejeitar
  → RejectionReasonPicker abre (versão estendida)
  → Tags de problema (igual ao atual)
  → Motivo livre (igual ao atual)
  → [NOVO] Campo: "Como deve ser regenerada?" (placeholder: "ex.: mais curta, CTA direto, tom mais urgente")
  → Dois botões:
      [Só salvar feedback]  → comportamento atual (sem regenerar)
      [Regerar com instrução ↺]  → salva feedback + dispara regeneração imediata
```

### Fluxo B — Quick Refine (sem rejeitar, sem limpar copy)

```
Copy está visível no editor
  → Botão discreto na toolbar: ✏️ "Refinar"
  → Popover pequeno com TextField: "O que mudar?"
  → Usuário digita instrução → clica "Refinar"
  → Spinner sobre o card de copy (sem apagar)
  → Copy substituída pela versão refinada in-place
  → Toast: "Copy refinada" + botão "Desfazer" (restaura versão anterior por 10s)
```

---

## Implementação

### 1. Backend — Novo endpoint `POST /edro/copies/:copyId/regenerate`

**Arquivo:** `apps/backend/src/routes/edro.ts`

Adicionar após a rota `PATCH /edro/copies/:copyId/feedback` (linha ~1814):

```typescript
app.post('/edro/copies/:copyId/regenerate', async (request, reply) => {
  const paramsSchema = z.object({ copyId: z.string().uuid() });
  const bodySchema = z.object({
    instruction: z.string().min(1).max(1000),
    platform: z.string().optional(),
  });

  const { copyId } = paramsSchema.parse(request.params);
  const { instruction, platform } = bodySchema.parse(request.body);
  const tenantId = (request.user as any).tenant_id as string | undefined;

  // 1. Carregar a copy rejeitada para ter contexto (briefing_id, copy_text)
  const copyRow = await query<{
    briefing_id: string;
    copy_text: string;
    created_by: string | null;
  }>(
    `SELECT ec.briefing_id, ec.copy_text, ec.created_by
     FROM edro_copies ec
     WHERE ec.id = $1`,
    [copyId]
  );
  if (!copyRow.rows[0]) {
    return reply.status(404).send({ success: false, error: 'Copy não encontrada' });
  }
  const { briefing_id, copy_text: previousCopy } = copyRow.rows[0];

  // 2. Carregar briefing completo
  const briefing = await getBriefingById(briefing_id);
  if (!briefing) {
    return reply.status(404).send({ success: false, error: 'Briefing não encontrado' });
  }

  // 3. Registrar tentativa de regeneração na tabela de feedback
  //    (incrementa regeneration_count, salva a instrução para learning loop)
  await query(
    `INSERT INTO preference_feedback
       (copy_id, briefing_id, tenant_id, feedback_type, status,
        regeneration_instruction, regeneration_count)
     VALUES ($1, $2, $3, 'regeneration', 'regenerating', $4, 1)
     ON CONFLICT (copy_id, feedback_type)
     DO UPDATE SET
       regeneration_instruction = EXCLUDED.regeneration_instruction,
       regeneration_count = preference_feedback.regeneration_count + 1,
       updated_at = NOW()`,
    [copyId, briefing_id, tenantId, instruction]
  );

  // 4. Montar bloco de instrução para o gerador
  //    Prefixar com a copy anterior para dar contexto de "melhore isso"
  const refinementBlock = [
    `## Instrução de refinamento`,
    `O usuário rejeitou a copy anterior e pediu esta melhoria específica:`,
    `"${instruction}"`,
    ``,
    `## Copy anterior (NÃO reutilize, use apenas como contexto do que NÃO funcionou)`,
    previousCopy,
  ].join('\n');

  // 5. Carregar conhecimento do cliente
  const clientKnowledge = await loadClientKnowledge(tenantId, briefing);
  const selectedPlatform = platform ?? (briefing.payload as any)?.platform ?? null;
  const selectedClientId = (briefing.payload as any)?.client_id ?? null;
  const payloadMomento = (briefing.payload as any)?.momento_consciencia ?? null;

  // 6. Gerar nova copy com 3 AIs + simulador (mesmo pipeline universal)
  try {
    const result = await generateAndSelectBestCopy({
      prompt: buildCopyPrompt(briefing, clientKnowledge, 'pt'),
      instructions: refinementBlock,
      tenantId: tenantId ?? 'default',
      clientId: selectedClientId,
      platform: selectedPlatform,
      amd: clientKnowledge?.amd ?? null,
      triggers: clientKnowledge?.triggers ?? null,
      momento: payloadMomento,
      usageContext: {
        briefingId: briefing_id,
        clientId: selectedClientId,
        platform: selectedPlatform,
        formato: (briefing.payload as any)?.format ?? null,
      },
    });

    // 7. Persistir nova copy
    const newCopyId = randomUUID();
    await query(
      `INSERT INTO edro_copies
         (id, briefing_id, tenant_id, copy_text, pipeline, metadata, status, created_by)
       VALUES ($1, $2, $3, $4, 'regenerate', $5, 'pending', $6)`,
      [
        newCopyId,
        briefing_id,
        tenantId,
        result.winner,
        JSON.stringify({
          instruction,
          previous_copy_id: copyId,
          simulation_id: result.simulation_id,
          winner_resonance: result.winner_resonance,
          winner_index: result.winner_index,
        }),
        copyRow.rows[0].created_by,
      ]
    );

    return reply.send({
      success: true,
      copy_id: newCopyId,
      copy_text: result.winner,
      winner_resonance: result.winner_resonance,
      simulation_id: result.simulation_id,
    });
  } catch (err: any) {
    request.log.error({ err }, 'Falha ao regenerar copy');
    return reply.status(500).send({ success: false, error: 'Falha ao regenerar copy' });
  }
});
```

---

### 2. Frontend — `RejectionReasonPicker.tsx` (versão estendida)

**Arquivo:** `apps/web/components/studio/RejectionReasonPicker.tsx`

Mudanças:
- Adicionar `instruction: string` ao callback `onSubmit`
- Adicionar estado `instruction`
- Adicionar TextField "Como deve ser regenerada?"
- Adicionar segundo botão "Regerar com instrução" que passa `shouldRegenerate: true`
- Expor via callback separado `onRegenerate?: (tags, reason, instruction) => void`

```tsx
'use client';

import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

type Props = {
  open: boolean;
  type: 'copy' | 'pauta';
  loading?: boolean;
  onClose: () => void;
  /** Só salvar feedback (sem regenerar) */
  onSubmit: (tags: string[], reason: string, instruction: string) => Promise<void> | void;
  /** Salvar feedback E disparar regeneração imediata */
  onRegenerate?: (tags: string[], reason: string, instruction: string) => Promise<void> | void;
};

const COPY_TAGS = [
  'tom_inadequado',
  'cta_fraco',
  'sem_clareza',
  'muito_longo',
  'nao_parece_marca',
  'erro_factual',
];

const PAUTA_TAGS = [
  'fora_de_contexto',
  'sem_relevancia',
  'timing_ruim',
  'duplicada',
  'alto_risco',
  'nao_prioritario',
];

export default function RejectionReasonPicker({
  open,
  type,
  loading = false,
  onClose,
  onSubmit,
  onRegenerate,
}: Props) {
  const [reason, setReason] = useState('');
  const [instruction, setInstruction] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tags = useMemo(() => (type === 'copy' ? COPY_TAGS : PAUTA_TAGS), [type]);

  const resetState = () => {
    setReason('');
    setInstruction('');
    setSelectedTags([]);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    await onSubmit(selectedTags, reason.trim(), instruction.trim());
    resetState();
  };

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    await onRegenerate(selectedTags, reason.trim(), instruction.trim());
    resetState();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Motivo da rejeição</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          {type === 'copy'
            ? 'O que estava errado nesta copy?'
            : 'Por que esta pauta não deve seguir?'}
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              size="small"
              clickable
              label={tag}
              color={selectedTags.includes(tag) ? 'primary' : 'default'}
              onClick={() => toggleTag(tag)}
            />
          ))}
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Contexto adicional (opcional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* [NOVO] Campo de instrução de regeneração — apenas para copy */}
        {type === 'copy' && onRegenerate && (
          <>
            <Divider sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Instrução para a próxima versão
              </Typography>
            </Divider>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label='Como deve ser regenerada? (opcional)'
              placeholder='ex.: mais curta, CTA direto, tom mais urgente, remover jargão técnico'
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ gap: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="outlined"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Só salvar feedback'}
        </Button>
        {type === 'copy' && onRegenerate && (
          <Button
            variant="contained"
            onClick={handleRegenerate}
            disabled={loading || !instruction.trim()}
            color="primary"
          >
            {loading ? 'Regerando...' : '↺ Regerar com instrução'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

> **Nota:** Botão "↺ Regerar com instrução" fica **desabilitado** se `instruction` estiver vazio — força o usuário a dar contexto para a regeneração ter qualidade.

---

### 3. Frontend — `EditorClient.tsx` — wiring completo

**Arquivo:** `apps/web/app/studio/editor/EditorClient.tsx`

#### 3a. Atualizar assinatura de `handleRejectOption`

```typescript
// ANTES
const handleRejectOption = async (tags: string[], reason: string) => {

// DEPOIS
const handleRejectOption = async (tags: string[], reason: string, instruction: string) => {
  const copyId = resolveActiveCopyId();
  if (!copyId) {
    setError('Selecione uma versão de copy antes de rejeitar.');
    return;
  }
  setFeedbackLoading(true);
  try {
    await apiPatch(`/edro/copies/${copyId}/feedback`, {
      status: 'rejected',
      rejected_text: optionToText(selectedOptionData),
      rejection_tags: tags,
      rejection_reason: reason || undefined,
      feedback: reason || 'Rejeitada no Creative Studio',
      // [NOVO] envia instrução para learning loop
      regeneration_instruction: instruction || undefined,
    });
    setRejectOpen(false);
    setRegenerationCount((prev) => prev + 1);
    setOptions([]);
    setOutput('');
    setComparisonMode(true);
    hasAutoGeneratedRef.current = false;
  } catch (err: any) {
    setError(err?.message || 'Falha ao salvar rejeição.');
  } finally {
    setFeedbackLoading(false);
  }
};
```

#### 3b. Nova função `handleRegenerateWithInstruction`

Adicionar logo após `handleRejectOption`:

```typescript
const handleRegenerateWithInstruction = async (
  tags: string[],
  reason: string,
  instruction: string
) => {
  const copyId = resolveActiveCopyId();
  if (!copyId) {
    setError('Selecione uma versão de copy antes de regenerar.');
    return;
  }
  setFeedbackLoading(true);
  setRejectOpen(false);
  try {
    // 1. Salvar feedback primeiro
    await apiPatch(`/edro/copies/${copyId}/feedback`, {
      status: 'rejected',
      rejected_text: optionToText(selectedOptionData),
      rejection_tags: tags,
      rejection_reason: reason || undefined,
      feedback: reason || 'Rejeitada — regerando com instrução',
      regeneration_instruction: instruction,
    });

    // 2. Apagar copy atual imediatamente (UX responsiva)
    setOptions([]);
    setOutput('');
    setRegenerationCount((prev) => prev + 1);

    // 3. Chamar endpoint de regeneração
    setGenerating(true); // reutiliza estado de loading de geração
    const platform = (briefing?.payload as any)?.platform ?? null;
    const res = await apiPost<{
      success: boolean;
      copy_id: string;
      copy_text: string;
      winner_resonance: number;
    }>(`/edro/copies/${copyId}/regenerate`, {
      instruction,
      platform,
    });

    if (res.success && res.copy_text) {
      // 4. Injetar nova copy como se tivesse sido gerada normalmente
      setOutput(res.copy_text);
      setOptions([{ id: res.copy_id, text: res.copy_text, score: res.winner_resonance }]);
      setSelectedOption(0);
      setComparisonMode(false);
    }
  } catch (err: any) {
    setError(err?.message || 'Falha ao regenerar copy.');
    // Fallback: limpa e permite nova geração manual
    setOptions([]);
    setOutput('');
    setComparisonMode(true);
    hasAutoGeneratedRef.current = false;
  } finally {
    setFeedbackLoading(false);
    setGenerating(false);
  }
};
```

#### 3c. Atualizar JSX do `RejectionReasonPicker` no render

```tsx
<RejectionReasonPicker
  open={rejectOpen}
  type="copy"
  loading={feedbackLoading}
  onClose={() => setRejectOpen(false)}
  onSubmit={handleRejectOption}
  onRegenerate={handleRegenerateWithInstruction}  // [NOVO]
/>
```

#### 3d. Botão "Quick Refine" na toolbar do copy output

Adicionar botão discreto na seção de ações da copy output, junto com "Aprovar" e "Rejeitar":

```tsx
{/* Exibir apenas quando há copy gerada */}
{output && !comparisonMode && (
  <Tooltip title="Refinar sem rejeitar">
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      startIcon={<IconPencil size={15} />}
      onClick={() => setQuickRefineOpen(true)}
      sx={{ fontSize: 12 }}
    >
      Refinar
    </Button>
  </Tooltip>
)}
```

#### 3e. Novo estado e dialog de Quick Refine

Adicionar estados:

```typescript
const [quickRefineOpen, setQuickRefineOpen] = useState(false);
const [quickRefineInstruction, setQuickRefineInstruction] = useState('');
const [quickRefineLoading, setQuickRefineLoading] = useState(false);
const [previousOutput, setPreviousOutput] = useState<string | null>(null); // para "Desfazer"
```

Adicionar handler:

```typescript
const handleQuickRefine = async () => {
  const copyId = resolveActiveCopyId();
  if (!copyId || !quickRefineInstruction.trim()) return;

  setQuickRefineLoading(true);
  setPreviousOutput(output); // salva para desfazer
  try {
    const platform = (briefing?.payload as any)?.platform ?? null;
    const res = await apiPost<{
      success: boolean;
      copy_id: string;
      copy_text: string;
      winner_resonance: number;
    }>(`/edro/copies/${copyId}/regenerate`, {
      instruction: quickRefineInstruction.trim(),
      platform,
    });

    if (res.success && res.copy_text) {
      setOutput(res.copy_text);
      setOptions([{ id: res.copy_id, text: res.copy_text, score: res.winner_resonance }]);
      setSelectedOption(0);
      setQuickRefineOpen(false);
      setQuickRefineInstruction('');
      // Toast com "Desfazer" por 10s
      setToast({ message: 'Copy refinada', action: 'undo', duration: 10000 });
    }
  } catch (err: any) {
    setError(err?.message || 'Falha ao refinar copy.');
    setPreviousOutput(null);
  } finally {
    setQuickRefineLoading(false);
  }
};

const handleUndoRefine = () => {
  if (previousOutput) {
    setOutput(previousOutput);
    setPreviousOutput(null);
  }
};
```

Adicionar Dialog de Quick Refine (JSX):

```tsx
<Dialog
  open={quickRefineOpen}
  onClose={() => !quickRefineLoading && setQuickRefineOpen(false)}
  fullWidth
  maxWidth="xs"
>
  <DialogTitle sx={{ pb: 1 }}>Refinar copy</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      fullWidth
      multiline
      minRows={2}
      label="O que mudar?"
      placeholder="ex.: mais curta, CTA de urgência, remover emojis, tom mais informal"
      value={quickRefineInstruction}
      onChange={(e) => setQuickRefineInstruction(e.target.value)}
      disabled={quickRefineLoading}
    />
  </DialogContent>
  <DialogActions>
    <Button
      onClick={() => setQuickRefineOpen(false)}
      disabled={quickRefineLoading}
    >
      Cancelar
    </Button>
    <Button
      variant="contained"
      onClick={handleQuickRefine}
      disabled={quickRefineLoading || !quickRefineInstruction.trim()}
    >
      {quickRefineLoading ? 'Refinando...' : '↺ Refinar'}
    </Button>
  </DialogActions>
</Dialog>
```

---

### 4. Learning Loop — `learningLoopService.ts`

O campo `regeneration_instruction` já está sendo salvo no banco via `preference_feedback`.

O learning loop deve incluir as instruções mais frequentes como regras de preferência do cliente.

**Arquivo:** `apps/backend/src/services/learningLoopService.ts`

Adicionar na função `rebuildClientPreferences()` (ou criar função auxiliar chamada de lá):

```typescript
async function aggregateRegenerationPatterns(tenantId: string, clientId: string) {
  const res = await query<{
    instruction: string;
    count: number;
  }>(
    `SELECT
       pf.regeneration_instruction AS instruction,
       COUNT(*) AS count
     FROM preference_feedback pf
     JOIN edro_briefings eb ON eb.id = pf.briefing_id
     WHERE eb.tenant_id = $1
       AND (eb.payload->>'client_id') = $2
       AND pf.regeneration_instruction IS NOT NULL
       AND pf.regeneration_instruction != ''
       AND pf.created_at > NOW() - INTERVAL '90 days'
     GROUP BY pf.regeneration_instruction
     ORDER BY count DESC
     LIMIT 10`,
    [tenantId, clientId]
  );

  // Retornar lista de padrões frequentes para incluir no knowledge block
  return res.rows.map((r) => r.instruction);
}
```

Incluir no bloco `rulesBlock` que vai para o `agentRedator` / `generateAndSelectBestCopy`:

```typescript
const regenPatterns = await aggregateRegenerationPatterns(tenantId, clientId);
if (regenPatterns.length > 0) {
  rulesBlock += `\n## Ajustes que o cliente frequentemente pede após ver a copy\n`;
  rulesBlock += regenPatterns.map((p) => `- "${p}"`).join('\n');
}
```

Isso fecha o loop: as instruções de refinamento viram regras de geração proativa para o próximo briefing.

---

## Resumo de arquivos a alterar

| Arquivo | Tipo | O que muda |
|---------|------|------------|
| `apps/backend/src/routes/edro.ts` | Backend | Novo endpoint `POST /edro/copies/:copyId/regenerate` |
| `apps/web/components/studio/RejectionReasonPicker.tsx` | Frontend | Campo `instruction` + botão "↺ Regerar com instrução" |
| `apps/web/app/studio/editor/EditorClient.tsx` | Frontend | `handleRejectOption` atualizado + `handleRegenerateWithInstruction` + `handleQuickRefine` + Dialog Quick Refine + botão "Refinar" na toolbar |
| `apps/backend/src/services/learningLoopService.ts` | Backend | `aggregateRegenerationPatterns()` + inclusão no `rulesBlock` |

**Sem novas migrations** — schema já existe em `0160_preference_feedback.sql`.

---

## Checklist de validação para Codex

- [ ] `POST /edro/copies/:copyId/regenerate` retorna `{ success, copy_id, copy_text, winner_resonance }`
- [ ] `preference_feedback.regeneration_instruction` é salvo tanto no PATCH feedback quanto no POST regenerate
- [ ] `preference_feedback.regeneration_count` incrementa a cada regeneração
- [ ] Dialog de rejeição: botão "↺ Regerar" fica **desabilitado** se campo instrução estiver vazio
- [ ] Quick Refine: copy anterior é preservada em `previousOutput` para "Desfazer" por 10s
- [ ] Após regeneração via Fluxo A: `comparisonMode = false`, nova copy visível, estado limpo
- [ ] Após regeneração via Fluxo B: copy existente substituída in-place, sem reload
- [ ] `learningLoopService` lê padrões de `regeneration_instruction` e inclui no `rulesBlock`
- [ ] TypeScript sem erros: `onSubmit` e `onRegenerate` com assinaturas `(tags, reason, instruction)`
