# Spec: Histórico de Versões + Campos Estruturados de Copy

**Data:** 2026-04-15  
**Status:** Pronto para Codex  
**Impacto:** HIGH — rastreabilidade + UX de revisão + parsing robusto

---

## Gap 1 — Histórico de Versões e Restauração

### Contexto

Todos os dados já existem. Cada geração de copy é armazenada em `edro_copy_versions` com `status` (draft/approved/rejected). O endpoint `GET /edro/briefings/:id` já retorna o array `copies` com todas as versões. O frontend tem o estado `copies: CopyVersion[]` em `EditorClient.tsx`.

**O que falta:** UI para exibir o histórico e restaurar uma versão anterior.

### O que NÃO fazer

- Não criar nova migration — schema suficiente.
- Não criar novo endpoint de backend — dados já chegam via `GET /edro/briefings/:id`.
- Não criar endpoint "select" — restaurar é apenas carregar o `output` de uma versão anterior no estado do editor.

---

### Implementação

#### A. Novo componente `CopyVersionDrawer.tsx`

**Arquivo:** `apps/web/components/studio/CopyVersionDrawer.tsx`

```tsx
'use client';

import { useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { IconX, IconClockHour4, IconRestore, IconCheck, IconX as IconClose } from '@tabler/icons-react';

export type CopyVersion = {
  id: string;
  output: string;
  status: 'draft' | 'approved' | 'rejected' | null;
  score: number | null;
  feedback: string | null;
  created_at: string;
  pipeline?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  versions: CopyVersion[];
  activeId: string | null;
  onRestore: (version: CopyVersion) => void;
};

const STATUS_COLORS: Record<string, 'success' | 'error' | 'default'> = {
  approved: 'success',
  rejected: 'error',
  draft: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  draft: 'Rascunho',
};

export default function CopyVersionDrawer({
  open,
  onClose,
  versions,
  activeId,
  onRestore,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 400 } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconClockHour4 size={18} />
          <Typography variant="subtitle1" fontWeight={600}>
            Histórico de versões
          </Typography>
          <Chip size="small" label={versions.length} />
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <IconX size={18} />
        </IconButton>
      </Box>
      <Divider />

      <Stack spacing={0} sx={{ overflow: 'auto', flex: 1 }}>
        {versions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            Nenhuma versão gerada ainda.
          </Typography>
        )}
        {versions.map((v, idx) => {
          const isActive = v.id === activeId;
          const isExpanded = expandedId === v.id;
          const date = new Date(v.created_at);
          const label = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          const preview = v.output?.slice(0, 120) + (v.output?.length > 120 ? '…' : '');

          return (
            <Box
              key={v.id}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: isActive ? 'primary.50' : 'transparent',
                cursor: 'pointer',
                '&:hover': { bgcolor: isActive ? 'primary.50' : 'action.hover' },
              }}
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                <Box flex={1} minWidth={0}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      #{versions.length - idx} · {label}
                    </Typography>
                    {v.status && (
                      <Chip
                        size="small"
                        label={STATUS_LABELS[v.status] ?? v.status}
                        color={STATUS_COLORS[v.status] ?? 'default'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    )}
                    {isActive && (
                      <Chip
                        size="small"
                        label="Atual"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    )}
                    {v.score != null && (
                      <Typography variant="caption" color="text.secondary">
                        score {v.score}
                      </Typography>
                    )}
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
                      overflow: 'hidden',
                    }}
                  >
                    {isExpanded ? v.output : preview}
                  </Typography>
                  {v.feedback && isExpanded && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                      Feedback: {v.feedback}
                    </Typography>
                  )}
                </Box>

                {!isActive && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconRestore size={14} />}
                    sx={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(v);
                    }}
                  >
                    Restaurar
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Drawer>
  );
}
```

#### B. Integrar em `EditorClient.tsx`

**Arquivo:** `apps/web/app/studio/editor/EditorClient.tsx`

1. Importar o componente:
```typescript
import CopyVersionDrawer, { CopyVersion as DrawerCopyVersion } from '@/components/studio/CopyVersionDrawer';
```

2. Adicionar estado:
```typescript
const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
```

3. Adicionar botão na toolbar do editor (junto com "Aprovar" / "Rejeitar"):
```tsx
{copies && copies.length > 1 && (
  <Tooltip title="Histórico de versões">
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      startIcon={<IconClockHour4 size={15} />}
      onClick={() => setVersionDrawerOpen(true)}
      sx={{ fontSize: 12 }}
    >
      {copies.length} versões
    </Button>
  </Tooltip>
)}
```

4. Handler de restauração:
```typescript
const handleRestoreVersion = (version: DrawerCopyVersion) => {
  setOutput(version.output);
  // Reconstruir options a partir da versão restaurada
  setOptions([{
    id: version.id,
    text: version.output,
    score: version.score ?? 0,
  }]);
  setSelectedOption(0);
  setComparisonMode(false);
  setVersionDrawerOpen(false);
};
```

5. Adicionar no JSX do return:
```tsx
<CopyVersionDrawer
  open={versionDrawerOpen}
  onClose={() => setVersionDrawerOpen(false)}
  versions={copies ?? []}
  activeId={resolveActiveCopyId()}
  onRestore={handleRestoreVersion}
/>
```

---

## Gap 2 — Campos Estruturados Persistidos no Backend

### Contexto

O frontend já faz parsing client-side de `output` em `parseOptions()` → `ParsedOption { title, body, cta, legenda, hashtags }`. Isso funciona mas é frágil: regex sobre texto livre, falha silenciosa se o formato da IA mudar.

O `agentRedator.ts` já produz `CopyVariant { title, body, cta, legenda, hashtags }` internamente — mas esse dado estruturado é perdido antes de salvar no banco.

A solução é persistir a estrutura no campo `payload` de `edro_copy_versions` (já é JSONB) e retornar isso no endpoint — sem nova migration.

### O que NÃO fazer

- Não adicionar colunas novas — usar `payload JSONB` existente.
- Não alterar o parsing do frontend — continua como fallback.

---

### Implementação

#### A. `agentRedator.ts` — expor estrutura no resultado

**Arquivo:** `apps/backend/src/services/ai/agentRedator.ts`

No retorno da função principal `runAgentRedator()`, incluir os campos estruturados do último variant:

```typescript
// No final de runAgentRedator(), antes do return:
const lastVariant = variants[0]; // variant selecionado (melhor score)

return {
  final_text: lastVariant.audit.final_text ?? lastVariant.body,
  structured: {
    title: lastVariant.title,
    body: lastVariant.body,
    cta: lastVariant.cta,
    legenda: lastVariant.legenda,
    hashtags: lastVariant.hashtags,
  },
  score: lastVariant.audit.score,
  issues: lastVariant.audit.issues,
  variants,
};
```

Atualizar o tipo de retorno `AgentRedatorResult`:
```typescript
export type AgentRedatorResult = {
  final_text: string;
  structured: {
    title: string;
    body: string;
    cta: string;
    legenda: string;
    hashtags: string[];
  };
  score: number;
  issues: string[];
  variants: CopyVariant[];
};
```

#### B. `copyService.ts` — persistir structured no payload

**Arquivo:** `apps/backend/src/services/ai/copyService.ts`

Na função `generateAndSelectBestCopy()`, quando chamar `createCopyVersion()`, incluir `structured` no payload:

```typescript
// Dentro de generateAndSelectBestCopy(), onde a copy vencedora é salva:
const copyId = await createCopyVersion({
  briefingId: params.briefingId,
  tenantId: params.tenantId,
  output: winnerText,
  payload: {
    provider: 'multi',
    pipeline: 'smart',
    simulation_id: simulationResult.id,
    winner_index: winnerIndex,
    winner_resonance: winnerResonance,
    // [NOVO] estrutura parseada
    structured: winnerStructured ?? null,
  },
});
```

Onde `winnerStructured` é o objeto `{ title, body, cta, legenda, hashtags }` extraído do variant vencedor (disponível quando o gerador for `agentRedator` com retorno estruturado).

#### C. `edroBriefingRepository.ts` — retornar structured no listCopyVersions

**Arquivo:** `apps/backend/src/repositories/edroBriefingRepository.ts`

Função `listCopyVersions()` já retorna `payload`. No frontend, acessar:

```typescript
// Em EditorClient.tsx, no tipo CopyVersion:
type CopyVersion = {
  id: string;
  output: string;
  status: 'draft' | 'approved' | 'rejected' | null;
  score: number | null;
  feedback: string | null;
  created_at: string;
  payload?: {
    structured?: {
      title: string;
      body: string;
      cta: string;
      legenda: string;
      hashtags: string[];
    } | null;
    pipeline?: string;
    winner_resonance?: number;
  } | null;
};
```

#### D. Frontend — usar structured quando disponível (fallback para parsing)

**Arquivo:** `apps/web/app/studio/editor/EditorClient.tsx`

Na função `parseOptions()` (ou onde as copies são carregadas), verificar se `payload.structured` existe antes de rodar regex:

```typescript
function copyToOption(copy: CopyVersion): ParsedOption {
  // Preferir structured do banco se disponível
  if (copy.payload?.structured) {
    const s = copy.payload.structured;
    return {
      title: s.title,
      body: s.body,
      cta: s.cta,
      legenda: s.legenda,
      hashtags: s.hashtags?.join(' ') ?? '',
      raw: copy.output,
    };
  }
  // Fallback: parsing client-side existente
  return parseOptionChunk(copy.output);
}
```

Usar `copyToOption()` ao carregar `copies` do briefing:
```typescript
// Quando briefing é carregado e copies estão disponíveis:
const structuredCopies = (briefingData.copies ?? []).map(copyToOption);
setOptions(structuredCopies);
```

---

## Resumo de arquivos a alterar

### Gap 1 — Histórico de Versões

| Arquivo | O que muda |
|---------|------------|
| `apps/web/components/studio/CopyVersionDrawer.tsx` | **[CRIAR]** Drawer com lista de versões + botão restaurar |
| `apps/web/app/studio/editor/EditorClient.tsx` | Importar drawer, estado `versionDrawerOpen`, botão "X versões", `handleRestoreVersion()` |

### Gap 2 — Campos Estruturados

| Arquivo | O que muda |
|---------|------------|
| `apps/backend/src/services/ai/agentRedator.ts` | Expor `structured` no `AgentRedatorResult` |
| `apps/backend/src/services/ai/copyService.ts` | Persistir `structured` no `payload` ao salvar copy vencedora |
| `apps/web/app/studio/editor/EditorClient.tsx` | Função `copyToOption()` com fallback inteligente |

**Sem novas migrations** — `payload JSONB` já existe em `edro_copy_versions`.

---

## Checklist de validação para Codex

### Gap 1
- [ ] `CopyVersionDrawer` renderiza lista de versões ordenada por data DESC (mais nova no topo)
- [ ] Versão atualmente exibida no editor tem badge "Atual"
- [ ] Clicar em uma versão expande o texto completo
- [ ] Botão "Restaurar" aparece em todas as versões exceto a atual
- [ ] Após restaurar: output atualizado, drawer fechado, `resolveActiveCopyId()` retorna o id restaurado
- [ ] Botão "X versões" na toolbar só aparece quando `copies.length > 1`

### Gap 2
- [ ] `AgentRedatorResult` tem campo `structured: { title, body, cta, legenda, hashtags }`
- [ ] `createCopyVersion()` recebe `structured` no payload quando disponível
- [ ] `copyToOption()` prioriza `payload.structured` sobre regex parsing
- [ ] Fallback para `parseOptionChunk()` quando `structured` é null/undefined (cópias antigas)
- [ ] TypeScript sem erros: `CopyVersion.payload.structured` opcional em todos os lugares
