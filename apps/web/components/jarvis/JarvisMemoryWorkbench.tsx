'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { apiGet, apiPost } from '@/lib/api';

type MemoryFact = {
  fact_type: 'directive' | 'evidence' | 'commitment';
  fingerprint?: string;
  title: string;
  summary: string | null;
  source_type: string | null;
  related_at: string | null;
  confidence_score: number;
};

type MemoryConflict = {
  conflict_key: string;
  severity: 'medium' | 'high';
  reason: string;
  primary: { fingerprint: string; title: string };
  conflicting: { fingerprint: string; title: string };
};

type MemoryGovernance = {
  summary: {
    governance_pressure: 'low' | 'medium' | 'high';
    active_conflicts: number;
    stale_facts: number;
    archive_candidates: number;
    replace_candidates: number;
  };
};

export default function JarvisMemoryWorkbench({ clientId }: { clientId: string | null }) {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [conflicts, setConflicts] = useState<MemoryConflict[]>([]);
  const [governance, setGovernance] = useState<MemoryGovernance | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [factsRes, conflictsRes, governanceRes] = await Promise.all([
        apiGet<{ facts?: MemoryFact[] }>(`/clients/${clientId}/memory/facts?limit=12`),
        apiGet<{ conflicts?: MemoryConflict[] }>(`/clients/${clientId}/memory/conflicts?status=active`),
        apiGet<{ governance?: MemoryGovernance }>(`/clients/${clientId}/memory/governance`),
      ]);
      setFacts(factsRes?.facts || []);
      setConflicts(conflictsRes?.conflicts || []);
      setGovernance(governanceRes?.governance || null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const archiveFact = useCallback(async (fingerprint?: string) => {
    if (!clientId || !fingerprint) return;
    await apiPost(`/clients/${clientId}/memory/facts/${fingerprint}/archive`, { reason: 'arquivado pelo workbench do Jarvis' }).catch(() => null);
    await refresh();
  }, [clientId, refresh]);

  const promoteFact = useCallback(async (fingerprint?: string, directiveType: 'boost' | 'avoid' = 'boost') => {
    if (!clientId || !fingerprint) return;
    await apiPost(`/clients/${clientId}/memory/facts/${fingerprint}/promote-directive`, {
      directive_type: directiveType,
      archive_original: true,
      reason: 'promovido a diretiva pelo workbench do Jarvis',
    }).catch(() => null);
    await refresh();
  }, [clientId, refresh]);

  const resolveConflict = useCallback(async (conflictKey: string, resolution: 'keep_primary' | 'keep_conflicting' | 'dismiss') => {
    if (!clientId) return;
    await apiPost(`/clients/${clientId}/memory/conflicts/${encodeURIComponent(conflictKey)}/resolve`, {
      resolution,
      note: 'resolvido pelo workbench do Jarvis',
    }).catch(() => null);
    await refresh();
  }, [clientId, refresh]);

  if (!clientId) return null;

  return (
    <Paper variant="outlined" sx={{ mx: { xs: 2, md: 3 }, mt: 2, p: 2, borderRadius: 3 }}>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Memory Workbench</Typography>
        <Chip size="small" label={`Pressão ${governance?.summary.governance_pressure || 'n/a'}`} />
        <Chip size="small" label={`${governance?.summary.active_conflicts || 0} conflitos`} variant="outlined" />
        <Chip size="small" label={`${governance?.summary.stale_facts || 0} fatos velhos`} variant="outlined" />
        <Button size="small" onClick={() => void refresh()} disabled={loading}>Atualizar</Button>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} divider={<Divider flexItem orientation="vertical" />}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Fatos vivos</Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {facts.slice(0, 6).map((fact) => (
              <Box key={fact.fingerprint || fact.title} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <Chip size="small" label={fact.fact_type} />
                  {fact.source_type ? <Chip size="small" label={fact.source_type} variant="outlined" /> : null}
                  <Chip size="small" label={`score ${Number(fact.confidence_score || 0).toFixed(2)}`} variant="outlined" />
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 700 }}>{fact.title}</Typography>
                {fact.summary ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{fact.summary}</Typography> : null}
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => void archiveFact(fact.fingerprint)}>Arquivar</Button>
                  {fact.fact_type !== 'directive' ? <Button size="small" onClick={() => void promoteFact(fact.fingerprint, 'boost')}>Virar boost</Button> : null}
                  {fact.fact_type !== 'directive' ? <Button size="small" onClick={() => void promoteFact(fact.fingerprint, 'avoid')}>Virar avoid</Button> : null}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Conflitos ativos</Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {conflicts.length ? conflicts.slice(0, 4).map((conflict) => (
              <Box key={conflict.conflict_key} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  <Chip size="small" label={conflict.severity} color={conflict.severity === 'high' ? 'error' : 'warning'} />
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.75 }}>{conflict.reason}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Primário: {conflict.primary.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Conflitante: {conflict.conflicting.title}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" onClick={() => void resolveConflict(conflict.conflict_key, 'keep_primary')}>Manter primário</Button>
                  <Button size="small" onClick={() => void resolveConflict(conflict.conflict_key, 'keep_conflicting')}>Manter conflitante</Button>
                  <Button size="small" onClick={() => void resolveConflict(conflict.conflict_key, 'dismiss')}>Dispensar</Button>
                </Stack>
              </Box>
            )) : (
              <Typography variant="caption" color="text.secondary">Sem conflitos ativos.</Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
