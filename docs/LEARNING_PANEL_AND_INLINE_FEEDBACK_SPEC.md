# Spec: Painel de Aprendizado Transparente + Feedback Inline por Sentença

**Data:** 2026-04-15  
**Status:** Pronto para Codex  
**Impacto:** MEDIUM-HIGH — transparência do sistema + granularidade de sinal de aprendizado

---

## Gap 1 — Painel de Aprendizado no Studio (Learning Transparency)

### Contexto

O sistema **já computa e persiste** regras de aprendizado completas:
- `GET /clients/:clientId/learning-rules` → array de `LearningRule` com `effective_pattern`, `uplift_value`, `confidence_score`, `uplift_metric`
- `GET /clients/:clientId/directives` → boost/avoid permanentes
- Dois painéis já existem: `CampaignsClient.tsx` (linhas 1423-1494) e `ClientLearningClient.tsx`

**O que falta:** Um widget leve **dentro do Studio** (EditorClient) que mostre ao usuário o que o sistema sabe sobre o cliente **antes** de ele clicar "Gerar" — como contexto, não como relatório.

### Design do widget

Um `Accordion` colapsado por padrão no topo do `EditorClient`, com título "🧠 O que o sistema aprendeu sobre {cliente}" e badge de contagem de regras ativas.

Ao expandir:
- Regras agrupadas por tipo (AMD / Trigger / Plataforma)
- Apresentadas em linguagem natural simples (usar `effective_pattern` da API)
- Indicador visual de confiança (cor do chip: verde >0.7, amarelo >0.4, cinza ≤0.4)
- Link "Ver tudo" → abre `ClientLearningClient.tsx` em nova aba

---

### Implementação

#### A. Novo componente `StudioLearningPanel.tsx`

**Arquivo:** `apps/web/components/studio/StudioLearningPanel.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconBrain, IconChevronDown, IconExternalLink } from '@tabler/icons-react';

type LearningRule = {
  rule_name: string;
  effective_pattern: string;
  uplift_metric: string;
  uplift_value: number;
  confidence_score: number;
  sample_size: number;
  segment_definition: { type: 'amd' | 'trigger' | 'platform'; value: string };
};

type Props = {
  clientId: string;
  clientName?: string;
};

const SEGMENT_COLORS: Record<string, string> = {
  amd: '#7c3aed',
  trigger: '#0284c7',
  platform: '#059669',
};

const METRIC_LABELS: Record<string, string> = {
  save_rate: 'save rate',
  click_rate: 'cliques',
  eng_rate: 'engajamento',
  conversion_rate: 'conversão',
};

function confidenceColor(score: number) {
  if (score >= 0.7) return 'success';
  if (score >= 0.4) return 'warning';
  return 'default';
}

export default function StudioLearningPanel({ clientId, clientName }: Props) {
  const [rules, setRules] = useState<LearningRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchRules = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/learning-rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(Array.isArray(data.rules) ? data.rules.slice(0, 8) : []);
      }
    } catch {
      // silencioso — painel é opcional
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const handleChange = (_: unknown, isExpanded: boolean) => {
    setExpanded(isExpanded);
    if (isExpanded) fetchRules();
  };

  const byType = rules.reduce<Record<string, LearningRule[]>>((acc, r) => {
    const t = r.segment_definition?.type ?? 'platform';
    acc[t] = [...(acc[t] ?? []), r];
    return acc;
  }, {});

  const activeCount = rules.length;

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px !important',
        '&:before': { display: 'none' },
        mb: 2,
      }}
    >
      <AccordionSummary expandIcon={<IconChevronDown size={18} />}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconBrain size={18} color="#7c3aed" />
          <Typography variant="body2" fontWeight={600}>
            O que o sistema aprendeu
            {clientName ? ` sobre ${clientName}` : ''}
          </Typography>
          {activeCount > 0 && (
            <Chip
              size="small"
              label={`${activeCount} regra${activeCount !== 1 ? 's' : ''}`}
              sx={{ bgcolor: '#7c3aed15', color: '#7c3aed', fontWeight: 600, height: 20, fontSize: 11 }}
            />
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {loading && (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={36} />
            ))}
          </Stack>
        )}

        {!loading && rules.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Ainda não há dados suficientes para gerar regras. Continue aprovando e rejeitando copies.
          </Typography>
        )}

        {!loading && rules.length > 0 && (
          <Stack spacing={2}>
            {(['amd', 'trigger', 'platform'] as const)
              .filter((t) => byType[t]?.length > 0)
              .map((type) => (
                <Box key={type}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', color: SEGMENT_COLORS[type], letterSpacing: 0.5 }}
                  >
                    {type === 'amd' ? 'Momento de Decisão' : type === 'trigger' ? 'Gatilhos' : 'Plataforma'}
                  </Typography>
                  <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                    {byType[type].map((r) => (
                      <Tooltip
                        key={r.rule_name}
                        title={`Confiança: ${Math.round(r.confidence_score * 100)}% · Amostra: ${r.sample_size} briefings`}
                        placement="right"
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" sx={{ flex: 1, fontSize: 12.5 }}>
                            {r.effective_pattern}
                          </Typography>
                          <Chip
                            size="small"
                            label={`+${Math.round(r.uplift_value)}% ${METRIC_LABELS[r.uplift_metric] ?? r.uplift_metric}`}
                            color={confidenceColor(r.confidence_score) as any}
                            sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                          />
                        </Stack>
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              ))}

            <Box sx={{ textAlign: 'right' }}>
              <Chip
                size="small"
                icon={<IconExternalLink size={12} />}
                label="Ver análise completa"
                component="a"
                href={`/clients/${clientId}/inteligencia`}
                target="_blank"
                clickable
                sx={{ fontSize: 11 }}
              />
            </Box>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
```

#### B. Integrar em `EditorClient.tsx`

**Arquivo:** `apps/web/app/studio/editor/EditorClient.tsx`

1. Importar:
```typescript
import StudioLearningPanel from '@/components/studio/StudioLearningPanel';
```

2. Extrair `clientId` do briefing (já disponível via `briefing.payload`):
```typescript
const studioClientId = (briefing?.payload as any)?.client_id ?? null;
```

3. Adicionar no JSX, antes do card de geração de copy:
```tsx
{studioClientId && (
  <StudioLearningPanel
    clientId={studioClientId}
    clientName={(briefing?.payload as any)?.clientName}
  />
)}
```

---

## Gap 2 — Feedback Inline por Sentença

### Contexto

**Zero infraestrutura existente.** Requer:
1. Nova tabela de banco (`copy_segment_feedback`)
2. Novo endpoint de API
3. Novo componente de seleção de texto + anotação inline

### Estimativa de esforço: ALTA

Dado o esforço, este gap é especificado para implementação futura.

---

### Implementação Completa

#### A. Migration `0338_copy_segment_feedback.sql`

```sql
CREATE TABLE IF NOT EXISTS copy_segment_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_id     UUID NOT NULL REFERENCES edro_copy_versions(id) ON DELETE CASCADE,
  briefing_id UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,

  -- Localização do trecho no texto
  segment_text   TEXT NOT NULL,          -- texto exato selecionado
  char_start     INTEGER NOT NULL,       -- offset inicial no output
  char_end       INTEGER NOT NULL,       -- offset final no output

  -- Feedback
  sentiment      TEXT NOT NULL CHECK (sentiment IN ('like', 'dislike', 'neutral')),
  note           TEXT,                   -- anotação livre do usuário
  suggested_fix  TEXT,                   -- "como melhorar este trecho"

  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csf_copy_id ON copy_segment_feedback(copy_id);
CREATE INDEX IF NOT EXISTS idx_csf_briefing_id ON copy_segment_feedback(briefing_id);
CREATE INDEX IF NOT EXISTS idx_csf_tenant ON copy_segment_feedback(tenant_id);
```

#### B. Endpoint `POST /edro/copies/:copyId/segments/feedback`

**Arquivo:** `apps/backend/src/routes/edro.ts`

```typescript
app.post('/edro/copies/:copyId/segments/feedback', async (request, reply) => {
  const paramsSchema = z.object({ copyId: z.string().uuid() });
  const bodySchema = z.object({
    segment_text: z.string().min(1).max(500),
    char_start: z.number().int().min(0),
    char_end: z.number().int().min(1),
    sentiment: z.enum(['like', 'dislike', 'neutral']),
    note: z.string().max(1000).optional(),
    suggested_fix: z.string().max(1000).optional(),
  });

  const { copyId } = paramsSchema.parse(request.params);
  const body = bodySchema.parse(request.body);
  const tenantId = (request.user as any).tenant_id as string;
  const user = resolveUser(request);

  // Buscar briefing_id via copy
  const copyRow = await query<{ briefing_id: string }>(
    'SELECT briefing_id FROM edro_copy_versions WHERE id = $1',
    [copyId]
  );
  if (!copyRow.rows[0]) {
    return reply.status(404).send({ success: false, error: 'Copy não encontrada' });
  }

  await query(
    `INSERT INTO copy_segment_feedback
       (copy_id, briefing_id, tenant_id, segment_text, char_start, char_end,
        sentiment, note, suggested_fix, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      copyId,
      copyRow.rows[0].briefing_id,
      tenantId,
      body.segment_text,
      body.char_start,
      body.char_end,
      body.sentiment,
      body.note ?? null,
      body.suggested_fix ?? null,
      user?.id ?? null,
    ]
  );

  return reply.send({ success: true });
});

// Endpoint para listar feedbacks de uma copy (para highlights)
app.get('/edro/copies/:copyId/segments/feedback', async (request, reply) => {
  const { copyId } = z.object({ copyId: z.string().uuid() }).parse(request.params);
  const tenantId = (request.user as any).tenant_id as string;

  const res = await query(
    `SELECT id, segment_text, char_start, char_end, sentiment, note, suggested_fix, created_at
     FROM copy_segment_feedback
     WHERE copy_id = $1 AND tenant_id = $2
     ORDER BY char_start ASC`,
    [copyId, tenantId]
  );

  return reply.send({ success: true, segments: res.rows });
});
```

#### C. Componente `InlineTextFeedback.tsx`

**Arquivo:** `apps/web/components/studio/InlineTextFeedback.tsx`

Behavior:
1. O texto da copy é renderizado em um `<div contentEditable={false}>`
2. O usuário seleciona texto com o mouse
3. Um popover aparece sobre a seleção com 3 botões: 👍 / 👎 / 💬
4. Se clicar em 💬, abre campo de nota + "suggested_fix"
5. Envia `POST /edro/copies/:copyId/segments/feedback`
6. O trecho anotado fica com highlight sutil (verde/vermelho)

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { IconThumbUp, IconThumbDown, IconMessage } from '@tabler/icons-react';

type SegmentFeedback = {
  id?: string;
  segment_text: string;
  char_start: number;
  char_end: number;
  sentiment: 'like' | 'dislike' | 'neutral';
  note?: string;
  suggested_fix?: string;
};

type Props = {
  copyId: string;
  text: string;
  onFeedbackSaved?: (segment: SegmentFeedback) => void;
};

export default function InlineTextFeedback({ copyId, text, onFeedbackSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [suggestedFix, setSuggestedFix] = useState('');
  const [segments, setSegments] = useState<SegmentFeedback[]>([]);
  const [saving, setSaving] = useState(false);

  // Carregar highlights existentes ao montar
  useEffect(() => {
    if (!copyId) return;
    fetch(`/api/edro/copies/${copyId}/segments/feedback`)
      .then((r) => r.ok ? r.json() : { segments: [] })
      .then((d) => setSegments(d.segments ?? []))
      .catch(() => {});
  }, [copyId]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;

    const range = sel.getRangeAt(0);
    // Calcular offsets relativos ao início do texto
    const preRange = document.createRange();
    preRange.setStart(containerRef.current, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const charStart = preRange.toString().length;
    const selectedText = sel.toString();
    const charEnd = charStart + selectedText.length;

    if (charEnd <= charStart) return;

    setSelection({ start: charStart, end: charEnd, text: selectedText });

    // Posicionar anchor no centro da seleção para o popover
    const rect = range.getBoundingClientRect();
    const fakeEl = document.createElement('div');
    fakeEl.style.position = 'fixed';
    fakeEl.style.top = `${rect.top}px`;
    fakeEl.style.left = `${rect.left + rect.width / 2}px`;
    fakeEl.style.width = '1px';
    fakeEl.style.height = `${rect.height}px`;
    document.body.appendChild(fakeEl);
    setAnchorEl(fakeEl);
    // cleanup deferred
    setTimeout(() => document.body.removeChild(fakeEl), 100);
  }, []);

  const saveFeedback = async (sentiment: 'like' | 'dislike' | 'neutral') => {
    if (!selection) return;
    setSaving(true);
    try {
      await fetch(`/api/edro/copies/${copyId}/segments/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment_text: selection.text,
          char_start: selection.start,
          char_end: selection.end,
          sentiment,
          note: note.trim() || undefined,
          suggested_fix: suggestedFix.trim() || undefined,
        }),
      });
      const newSeg: SegmentFeedback = {
        segment_text: selection.text,
        char_start: selection.start,
        char_end: selection.end,
        sentiment,
        note: note.trim() || undefined,
        suggested_fix: suggestedFix.trim() || undefined,
      };
      setSegments((prev) => [...prev, newSeg]);
      onFeedbackSaved?.(newSeg);
    } finally {
      setSaving(false);
      closePopover();
    }
  };

  const closePopover = () => {
    setAnchorEl(null);
    setSelection(null);
    setShowNoteInput(false);
    setNote('');
    setSuggestedFix('');
    window.getSelection()?.removeAllRanges();
  };

  // Renderizar texto com highlights
  const renderHighlightedText = () => {
    if (segments.length === 0) return text;

    // Ordenar segmentos por char_start
    const sorted = [...segments].sort((a, b) => a.char_start - b.char_start);
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    sorted.forEach((seg, i) => {
      if (seg.char_start > cursor) {
        parts.push(text.slice(cursor, seg.char_start));
      }
      parts.push(
        <Tooltip key={i} title={seg.note ?? seg.sentiment} placement="top">
          <Box
            component="span"
            sx={{
              bgcolor: seg.sentiment === 'like' ? 'success.50' : seg.sentiment === 'dislike' ? 'error.50' : 'grey.100',
              borderBottom: `2px solid`,
              borderColor: seg.sentiment === 'like' ? 'success.main' : seg.sentiment === 'dislike' ? 'error.main' : 'grey.400',
              cursor: 'help',
            }}
          >
            {seg.segment_text}
          </Box>
        </Tooltip>
      );
      cursor = seg.char_end;
    });

    if (cursor < text.length) {
      parts.push(text.slice(cursor));
    }
    return parts;
  };

  return (
    <>
      <Box
        ref={containerRef}
        onMouseUp={handleMouseUp}
        sx={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.7,
          userSelect: 'text',
          cursor: 'text',
          p: 0,
        }}
      >
        {renderHighlightedText()}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        elevation={4}
      >
        <Paper sx={{ p: 1 }}>
          {!showNoteInput ? (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Gostei deste trecho">
                <IconButton size="small" color="success" onClick={() => saveFeedback('like')} disabled={saving}>
                  <IconThumbUp size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Não gostei">
                <IconButton size="small" color="error" onClick={() => saveFeedback('dislike')} disabled={saving}>
                  <IconThumbDown size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar nota">
                <IconButton size="small" onClick={() => setShowNoteInput(true)} disabled={saving}>
                  <IconMessage size={18} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack spacing={1} sx={{ p: 0.5, minWidth: 260 }}>
              <Typography variant="caption" fontWeight={600}>
                "{selection?.text?.slice(0, 40)}{(selection?.text?.length ?? 0) > 40 ? '…' : ''}"
              </Typography>
              <TextField
                size="small"
                label="O que está errado?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                multiline
                minRows={2}
                autoFocus
              />
              <TextField
                size="small"
                label="Como melhorar (opcional)"
                value={suggestedFix}
                onChange={(e) => setSuggestedFix(e.target.value)}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <IconButton size="small" color="success" onClick={() => saveFeedback('like')} disabled={saving}>
                  <IconThumbUp size={16} />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => saveFeedback('dislike')} disabled={saving}>
                  <IconThumbDown size={16} />
                </IconButton>
              </Stack>
            </Stack>
          )}
        </Paper>
      </Popover>
    </>
  );
}
```

#### D. Integrar em `EditorClient.tsx`

**Arquivo:** `apps/web/app/studio/editor/EditorClient.tsx`

Substituir o `<Typography>` que renderiza o texto da copy pelo componente:

```typescript
import InlineTextFeedback from '@/components/studio/InlineTextFeedback';
```

```tsx
{/* ANTES: */}
<Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
  {output}
</Typography>

{/* DEPOIS: */}
{resolveActiveCopyId() ? (
  <InlineTextFeedback
    copyId={resolveActiveCopyId()!}
    text={output}
    onFeedbackSaved={(seg) => {
      // opcional: toast de confirmação
    }}
  />
) : (
  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
    {output}
  </Typography>
)}
```

#### E. Learning Loop — usar feedbacks por sentença

**Arquivo:** `apps/backend/src/services/learningLoopService.ts`

Adicionar na função `rebuildClientPreferences()`:

```typescript
async function aggregateSegmentPatterns(tenantId: string, clientId: string) {
  // Frases que o cliente consistentemente marca como "dislike" → evitar padrões
  const dislikes = await query<{ segment_text: string; count: number }>(
    `SELECT csf.segment_text, COUNT(*) as count
     FROM copy_segment_feedback csf
     JOIN edro_briefings eb ON eb.id = csf.briefing_id
     WHERE csf.tenant_id = $1
       AND (eb.payload->>'client_id') = $2
       AND csf.sentiment = 'dislike'
       AND csf.created_at > NOW() - INTERVAL '90 days'
     GROUP BY csf.segment_text
     HAVING COUNT(*) >= 2
     ORDER BY count DESC
     LIMIT 10`,
    [tenantId, clientId]
  );

  // Frases que o cliente marca como "like" → reforçar padrões similares
  const likes = await query<{ segment_text: string; count: number }>(
    `SELECT csf.segment_text, COUNT(*) as count
     FROM copy_segment_feedback csf
     JOIN edro_briefings eb ON eb.id = csf.briefing_id
     WHERE csf.tenant_id = $1
       AND (eb.payload->>'client_id') = $2
       AND csf.sentiment = 'like'
       AND csf.created_at > NOW() - INTERVAL '90 days'
     GROUP BY csf.segment_text
     HAVING COUNT(*) >= 2
     ORDER BY count DESC
     LIMIT 10`,
    [tenantId, clientId]
  );

  return { dislikes: dislikes.rows, likes: likes.rows };
}
```

Incluir no `rulesBlock` gerado para o `agentRedator`:
```typescript
const { dislikes, likes } = await aggregateSegmentPatterns(tenantId, clientId);
if (dislikes.length > 0) {
  rulesBlock += `\n## Padrões de linguagem que este cliente rejeita (evitar)\n`;
  rulesBlock += dislikes.map((d) => `- "${d.segment_text}"`).join('\n');
}
if (likes.length > 0) {
  rulesBlock += `\n## Padrões de linguagem que este cliente aprova (reforçar)\n`;
  rulesBlock += likes.map((l) => `- "${l.segment_text}"`).join('\n');
}
```

---

## Resumo de arquivos a alterar

### Gap 1 — Learning Transparency Panel

| Arquivo | O que muda |
|---------|------------|
| `apps/web/components/studio/StudioLearningPanel.tsx` | **[CRIAR]** Accordion com regras em linguagem natural |
| `apps/web/app/studio/editor/EditorClient.tsx` | Importar + renderizar `StudioLearningPanel` quando `client_id` disponível |

**Sem migration, sem novo endpoint** — usa `GET /clients/:clientId/learning-rules` existente.

### Gap 2 — Inline Feedback por Sentença

| Arquivo | O que muda |
|---------|------------|
| `apps/backend/src/db/migrations/0338_copy_segment_feedback.sql` | **[CRIAR]** Tabela `copy_segment_feedback` |
| `apps/backend/src/routes/edro.ts` | POST + GET `/edro/copies/:copyId/segments/feedback` |
| `apps/web/components/studio/InlineTextFeedback.tsx` | **[CRIAR]** Seleção de texto + popover + highlights |
| `apps/web/app/studio/editor/EditorClient.tsx` | Substituir Typography por `InlineTextFeedback` |
| `apps/backend/src/services/learningLoopService.ts` | `aggregateSegmentPatterns()` + inclusão no `rulesBlock` |

---

## Checklist de validação para Codex

### Gap 1
- [ ] `StudioLearningPanel` renderiza colapsado por padrão
- [ ] Ao expandir: chama `GET /clients/:clientId/learning-rules` (lazy load)
- [ ] Regras agrupadas por tipo (AMD / Trigger / Plataforma)
- [ ] Chip de uplift verde (≥0.7), amarelo (≥0.4), cinza (≤0.4)
- [ ] "Ver análise completa" abre `/clients/:clientId/inteligencia` em nova aba
- [ ] Painel renderiza no `EditorClient` apenas quando `briefing.payload.client_id` existe
- [ ] TypeScript sem erros

### Gap 2
- [ ] Migration `0338` cria tabela com índices corretos
- [ ] `POST /edro/copies/:copyId/segments/feedback` valida `char_start < char_end`
- [ ] `GET` retorna segments ordenados por `char_start ASC`
- [ ] `InlineTextFeedback` carrega highlights existentes ao montar
- [ ] Seleção de texto exibe popover com 3 ações (👍 👎 💬)
- [ ] Clique em 💬 abre campos `note` + `suggestedFix`
- [ ] Highlights visíveis com cores corretas (verde/vermelho/cinza) após salvar
- [ ] Integração com `learningLoopService`: `aggregateSegmentPatterns()` alimenta `rulesBlock`
- [ ] Fallback: se `copyId` não resolvido, renderiza Typography simples (sem quebrar)
