# Spec: Limpeza do Sync Trello + Edição Inline de Datas nos Cards

**Data:** 2026-04-15  
**Status:** Pronto para Codex  
**Impacto:** CRÍTICO — bloqueador de lançamento da operação

---

## Problema 1 — Filtros do Sync Trello

### Root cause

`trelloSyncService.ts` importa todos os cards abertos sem filtrar:
- Listas de "concluído" (Feito, Done, Publicado, Entregue, Arquivo)
- Cards com `dueComplete: true`
- Cards sem atividade há mais de 90 dias (`dateLastActivity`)

### Fixes

#### A. Filtro de listas a ignorar

**Arquivo:** `apps/backend/src/services/trelloSyncService.ts`

Adicionar constante configurável (pode vir de env ou de coluna `trello_connectors.ignored_list_names`):

```typescript
const IGNORED_LIST_NAMES_DEFAULT = [
  'feito', 'done', 'concluído', 'concluido',
  'entregue', 'publicado', 'arquivo', 'arquivado',
  'encerrado', 'cancelado', 'faturado',
];

function isIgnoredList(listName: string, customIgnored: string[] = []): boolean {
  const normalized = listName.toLowerCase().trim();
  return [...IGNORED_LIST_NAMES_DEFAULT, ...customIgnored].some(
    (ignored) => normalized.includes(ignored)
  );
}
```

No loop de sync, antes de importar cards de uma lista:

```typescript
// ANTES do loop de cards por lista:
for (const list of lists) {
  // [NOVO] pular listas de arquivo/concluído
  if (isIgnoredList(list.name, connector.ignored_list_names ?? [])) {
    request.log.info({ listName: list.name }, 'Skipping ignored Trello list');
    continue;
  }
  // ... resto do sync
}
```

#### B. Filtro de cards com due date concluída

No processamento de cada card:

```typescript
// Após buscar os cards da lista:
const activeCards = cards.filter((card) => {
  // pular cards com due date marcada como concluída
  if (card.dueComplete === true) return false;
  return true;
});
```

Se `dueComplete: true`, importar como job com `status = 'done'` e `is_archived = true` (não como ativo):

```typescript
// Alternativa mais segura: importar como arquivado, não ignorar completamente
// (preserva histórico sem poluir a fila ativa)
const jobStatus = card.dueComplete ? 'done' : mapListToJobStatus(list.name);
const isArchived = card.dueComplete;
```

#### C. Filtro de cards antigos (sem atividade)

```typescript
const STALE_THRESHOLD_DAYS = 90;

function isStaleCard(dateLastActivity: string | null): boolean {
  if (!dateLastActivity) return true;
  const lastActivity = new Date(dateLastActivity);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_THRESHOLD_DAYS);
  return lastActivity < cutoff;
}

// No processamento de cada card:
if (isStaleCard(card.dateLastActivity)) {
  // Importar como arquivado (não ativo)
  await upsertJobFromTrelloCard(card, { is_archived: true, status: 'done' });
  continue;
}
```

#### D. Coluna `ignored_list_names` na tabela de conectores

**Arquivo:** `apps/backend/src/db/migrations/0339_trello_connector_filters.sql`

```sql
ALTER TABLE trello_connectors
  ADD COLUMN IF NOT EXISTS ignored_list_names TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stale_threshold_days INTEGER DEFAULT 90;
```

#### E. UI para configurar filtros

**Arquivo:** `apps/web/app/clients/[id]/operacao/page.tsx` ou componente de configuração do Trello

Adicionar seção "Filtros de sincronização" no painel de configuração do Trello:

```tsx
{/* Listas a ignorar */}
<TextField
  label="Listas a ignorar (separadas por vírgula)"
  placeholder="Feito, Done, Arquivo, Publicado"
  helperText="Cards nestas listas não serão importados como demandas ativas"
  value={ignoredLists.join(', ')}
  onChange={(e) => setIgnoredLists(e.target.value.split(',').map(s => s.trim()))}
/>

{/* Threshold de inatividade */}
<TextField
  label="Ignorar cards sem atividade há mais de (dias)"
  type="number"
  value={staleThresholdDays}
  onChange={(e) => setStaleThresholdDays(Number(e.target.value))}
  InputProps={{ inputProps: { min: 30, max: 365 } }}
/>
```

#### F. Botão "Limpar sujeira existente" (one-time cleanup)

**Arquivo:** `apps/backend/src/routes/trello.ts`

```typescript
app.post('/trello/cleanup', async (request, reply) => {
  const tenantId = (request.user as any).tenant_id;
  const bodySchema = z.object({
    ignored_list_names: z.array(z.string()).optional(),
    stale_threshold_days: z.number().int().min(30).max(365).default(90),
    dry_run: z.boolean().default(true), // default safe: só mostra o que seria arquivado
  });
  const body = bodySchema.parse(request.body);

  // Buscar todos os jobs do tenant que vieram do Trello
  const jobs = await query(
    `SELECT j.id, j.title, j.status, j.metadata, j.updated_at
     FROM ops_jobs j
     WHERE j.tenant_id = $1
       AND j.metadata->>'trello_card_id' IS NOT NULL
       AND j.is_archived = false`,
    [tenantId]
  );

  const toArchive: string[] = [];

  for (const job of jobs.rows) {
    const listName = job.metadata?.trello_list_name ?? '';
    const lastActivity = job.metadata?.trello_date_last_activity ?? null;
    const dueComplete = job.metadata?.trello_due_complete ?? false;

    const shouldArchive =
      isIgnoredList(listName, body.ignored_list_names) ||
      dueComplete ||
      isStaleCard(lastActivity, body.stale_threshold_days);

    if (shouldArchive) toArchive.push(job.id);
  }

  if (!body.dry_run && toArchive.length > 0) {
    await query(
      `UPDATE ops_jobs SET is_archived = true, status = 'done', updated_at = NOW()
       WHERE id = ANY($1)`,
      [toArchive]
    );
  }

  return reply.send({
    success: true,
    dry_run: body.dry_run,
    to_archive_count: toArchive.length,
    archived_ids: body.dry_run ? toArchive : [],
  });
});
```

**UI:** Botão "Limpar demandas antigas" com preview (dry_run primeiro, depois confirmar):

```tsx
const handleCleanup = async () => {
  // 1. Dry run — mostra preview
  const preview = await apiPost('/trello/cleanup', {
    ignored_list_names: ignoredLists,
    stale_threshold_days: staleThresholdDays,
    dry_run: true,
  });
  
  if (preview.to_archive_count === 0) {
    toast.success('Nenhuma demanda a arquivar.');
    return;
  }
  
  // 2. Confirmar com o usuário
  const confirmed = await confirm(
    `${preview.to_archive_count} demandas antigas serão arquivadas. Continuar?`
  );
  
  if (confirmed) {
    await apiPost('/trello/cleanup', {
      ignored_list_names: ignoredLists,
      stale_threshold_days: staleThresholdDays,
      dry_run: false,
    });
    toast.success(`${preview.to_archive_count} demandas arquivadas.`);
    refetch();
  }
};
```

---

## Problema 2 — Edição Inline de Data nos Cards

### Root cause

A API aceita `PATCH /jobs/:jobId` com `deadline_at`. O JobWorkbenchDrawer tem o campo. Mas no **card do kanban** não há como alterar a data diretamente — é preciso abrir o drawer completo.

### Fix: DateChip com popover inline

#### A. Novo componente `InlineDateChip.tsx`

**Arquivo:** `apps/web/components/operations/InlineDateChip.tsx`

```tsx
'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { IconCalendar } from '@tabler/icons-react';

type Props = {
  jobId: string;
  deadline: string | null;
  onUpdated?: (newDeadline: string | null) => void;
  readOnly?: boolean;
};

function formatDeadline(dateStr: string | null): string {
  if (!dateStr) return 'Sem prazo';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Atrasado ${Math.abs(diff)}d`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
}

function deadlineColor(dateStr: string | null): 'error' | 'warning' | 'default' {
  if (!dateStr) return 'default';
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000*60*60*24));
  if (diff < 0) return 'error';
  if (diff <= 1) return 'warning';
  return 'default';
}

export default function InlineDateChip({ jobId, deadline, onUpdated, readOnly }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [value, setValue] = useState(
    deadline ? deadline.slice(0, 16) : '' // datetime-local format
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline_at: value ? new Date(value).toISOString() : null }),
      });
      onUpdated?.(value ? new Date(value).toISOString() : null);
      setAnchorEl(null);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline_at: null }),
      });
      setValue('');
      onUpdated?.(null);
      setAnchorEl(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Chip
        size="small"
        icon={<IconCalendar size={12} />}
        label={formatDeadline(deadline)}
        color={deadlineColor(deadline)}
        onClick={readOnly ? undefined : (e) => setAnchorEl(e.currentTarget)}
        clickable={!readOnly}
        sx={{ fontSize: 11, height: 22, cursor: readOnly ? 'default' : 'pointer' }}
      />

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 240 }}>
          <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 1 }}>
            Alterar prazo
          </Typography>
          <TextField
            fullWidth
            type="datetime-local"
            size="small"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="flex-end">
            <Button size="small" color="error" onClick={handleClear} disabled={saving || !value}>
              Remover
            </Button>
            <Button size="small" variant="contained" onClick={handleSave} disabled={saving || !value}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
```

#### B. Integrar nos cards do Kanban

**Arquivo:** `apps/web/app/clients/[id]/demandas/ClientDemandasClient.tsx`  
**Arquivo:** `apps/web/app/admin/operacoes/jobs/` (cards do pool/fila)

Substituir qualquer exibição estática de prazo pelo componente:

```tsx
// ANTES (exemplo):
<Typography variant="caption" color="text.secondary">
  {job.deadline_at ? new Date(job.deadline_at).toLocaleDateString('pt-BR') : 'Sem prazo'}
</Typography>

// DEPOIS:
<InlineDateChip
  jobId={job.id}
  deadline={job.deadline_at}
  onUpdated={(newDate) => {
    // Atualizar estado local do card sem refetch
    setJobs((prev) =>
      prev.map((j) => j.id === job.id ? { ...j, deadline_at: newDate } : j)
    );
  }}
/>
```

#### C. Outras edições inline — mesma abordagem

Seguindo o mesmo padrão do `InlineDateChip`, criar:

**`InlineAssigneeChip.tsx`** — clica no avatar do responsável → popover com busca de usuários/freelas → `PATCH /jobs/:jobId` com `assignee_ids`

**`InlinePriorityBadge.tsx`** — clica no badge T1/T2/T3 → popover com 5 opções → `PATCH /jobs/:jobId` com `job_type`

Esses dois resolvem os outros casos de edição rápida mais comuns no Trello.

---

## Resumo de arquivos a alterar

### Problema 1 — Trello Cleanup

| Arquivo | O que muda |
|---------|------------|
| `apps/backend/src/db/migrations/0339_trello_connector_filters.sql` | **[CRIAR]** Colunas `ignored_list_names`, `stale_threshold_days` |
| `apps/backend/src/services/trelloSyncService.ts` | Funções `isIgnoredList()`, `isStaleCard()` + filtros no loop de sync |
| `apps/backend/src/routes/trello.ts` | Endpoint `POST /trello/cleanup` (dry_run + confirm) |
| `apps/web/app/clients/[id]/operacao/page.tsx` | Campos de configuração de filtros + botão "Limpar demandas antigas" |

### Problema 2 — Edição Inline

| Arquivo | O que muda |
|---------|------------|
| `apps/web/components/operations/InlineDateChip.tsx` | **[CRIAR]** Chip de data com popover de edição |
| `apps/web/components/operations/InlineAssigneeChip.tsx` | **[CRIAR]** Chip de responsável com popover |
| `apps/web/components/operations/InlinePriorityBadge.tsx` | **[CRIAR]** Badge de tipo/prioridade com popover |
| `apps/web/app/clients/[id]/demandas/ClientDemandasClient.tsx` | Substituir exibições estáticas pelos novos chips |
| `apps/web/app/admin/operacoes/jobs/` | Mesma substituição nos cards admin |

---

## Checklist de validação para Codex

### Trello Cleanup
- [ ] `isIgnoredList()` é case-insensitive e faz `includes()` (não exact match) — "Feito 2024" também é ignorado
- [ ] `isStaleCard()` usa threshold configurável (padrão 90 dias)
- [ ] `POST /trello/cleanup` com `dry_run: true` retorna contagem sem alterar dados
- [ ] Botão "Limpar" mostra preview com contagem antes de confirmar
- [ ] Novos syncs respeitam os filtros automaticamente após configuração
- [ ] Cards arquivados pelo cleanup têm `is_archived = true` e `status = 'done'` — não são deletados

### Edição Inline
- [ ] `InlineDateChip` — clicar no chip abre popover com datetime-local
- [ ] Salvar chama `PATCH /jobs/:jobId` com `deadline_at` em ISO 8601
- [ ] Estado local do card atualiza sem refetch da página
- [ ] Botão "Remover" limpa o prazo (`deadline_at: null`)
- [ ] Chip muda de cor: cinza (prazo ok) → amarelo (≤1 dia) → vermelho (atrasado)
- [ ] `readOnly` prop desabilita clique (para perfis sem permissão de edição)
- [ ] TypeScript sem erros em todos os componentes

---

## Próximos passos de lançamento (após este spec)

Com esses dois fixes, os bloqueadores críticos para liberar a operação são:

1. ✅ Sujeira do Trello → resolvida pelo cleanup + novos filtros
2. ✅ Edição de datas → resolvida pelos chips inline
3. ⏳ Notificações do Bedel → para onde vão os alertas? (WhatsApp? Email?)
4. ⏳ Pauta Inbox → página de cliente ainda não existe
5. ⏳ Onboarding dos freelas → como um DA recebe acesso ao portal?
