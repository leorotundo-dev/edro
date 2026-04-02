'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBriefingDrawer } from '@/contexts/BriefingDrawerContext';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Link from 'next/link';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  IconAlertTriangle,
  IconBrain,
  IconCalendar,
  IconClipboard,
  IconDatabase,
  IconRefresh,
  IconSparkles,
  IconTrendingUp,
} from '@tabler/icons-react';

import { useJarvis } from '@/contexts/JarvisContext';
import type { IntelligenceStats } from './components/ContextPanel';
import type { HealthData, SourceHealth } from './components/HealthMonitor';
import OutputsList, { Briefing, Copy } from './components/OutputsList';

type PlanningClientProps = {
  clientId: string;
};

export default function PlanningClient({ clientId }: PlanningClientProps) {
  const router = useRouter();
  const { open: openBriefing } = useBriefingDrawer();
  const { open: openJarvis } = useJarvis();

  // Intelligence Context
  const [intelligenceStats, setIntelligenceStats] = useState<IntelligenceStats | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');

  // Health Monitor
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Outputs (briefings & copies)
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [copies, setCopies] = useState<Copy[]>([]);
  const [outputsLoading, setOutputsLoading] = useState(false);

  // Intelligence Score
  const [intelligenceScore, setIntelligenceScore] = useState<number | null>(null);

  // Load Intelligence Context (30s timeout)
  const loadContext = useCallback(async () => {
    setContextLoading(true);
    setContextError('');
    try {
      const res = await Promise.race([
        apiPost<{ data?: { stats?: IntelligenceStats; partial?: boolean; warning?: string } }>(
          `/clients/${clientId}/planning/context`,
          {}
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
      ]);
      if (res?.data?.stats) setIntelligenceStats(res.data.stats);
      if (res?.data?.partial) setContextError(res.data.warning || 'Contexto carregado parcialmente.');
    } catch (err: any) {
      setContextError(
        err?.message === 'timeout'
          ? 'Contexto demorou demais. Clique Refresh para tentar novamente.'
          : err?.message || 'Falha ao carregar contexto.'
      );
    } finally {
      setContextLoading(false);
    }
  }, [clientId]);

  // Load Health (15s timeout)
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await Promise.race([
        apiPost<{ data?: HealthData }>(`/clients/${clientId}/planning/health`, {}),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
      ]);
      if (res?.data) setHealthData(res.data);
    } catch {
      // silent
    } finally {
      setHealthLoading(false);
    }
  }, [clientId]);

  // Load Outputs (briefings + copies)
  const loadOutputs = useCallback(async () => {
    setOutputsLoading(true);
    try {
      const [briefingsRes, copiesRes] = await Promise.allSettled([
        apiGet<{ briefings?: Briefing[] }>(`/clients/${clientId}/briefings`),
        apiGet<{ copies?: Copy[] }>(`/clients/${clientId}/copies`),
      ]);
      if (briefingsRes.status === 'fulfilled')
        setBriefings(Array.isArray(briefingsRes.value?.briefings) ? briefingsRes.value.briefings : []);
      if (copiesRes.status === 'fulfilled')
        setCopies(Array.isArray(copiesRes.value?.copies) ? copiesRes.value.copies : []);
    } finally {
      setOutputsLoading(false);
    }
  }, [clientId]);

  // Bootstrap + initial load
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await apiPost(`/clients/${clientId}/planning/bootstrap`, {});
      } catch {
        // bootstrap is best-effort
      }
      if (cancelled) return;
      loadContext();
      loadHealth();
      loadOutputs();
      apiGet<{ intelligence_score?: number }>(`/clients/${clientId}/suggestions`)
        .then((res) => { if (!cancelled) setIntelligenceScore(Number(res?.intelligence_score || 0)); })
        .catch(() => {});
    }
    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const sources = healthData?.sources as Record<string, SourceHealth> | undefined;

  const contextItems = intelligenceStats
    ? [
        { key: 'library', label: 'Biblioteca', value: intelligenceStats.library?.totalItems ?? 0, icon: <IconDatabase size={13} /> },
        { key: 'clipping', label: 'Clipping', value: intelligenceStats.clipping?.totalMatches ?? 0, icon: <IconClipboard size={13} /> },
        { key: 'social', label: 'Social', value: intelligenceStats.social?.totalMentions ?? 0, icon: <IconTrendingUp size={13} /> },
        { key: 'calendar', label: 'Calendário', value: intelligenceStats.calendar?.next14Days ?? 0, icon: <IconCalendar size={13} /> },
        { key: 'opportunities', label: 'Oportunidades', value: intelligenceStats.opportunities?.active ?? 0, icon: <IconBrain size={13} /> },
      ]
    : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>

      {/* Context strip */}
      <Card sx={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: 'none' }}>
        <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
          {/* Intelligence score bar */}
          {intelligenceScore !== null && (
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: intelligenceStats ? 1 : 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap', minWidth: 110 }}>
                IA Readiness
              </Typography>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={intelligenceScore}
                  sx={{
                    height: 7,
                    borderRadius: 4,
                    bgcolor: 'grey.100',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor:
                        intelligenceScore >= 85
                          ? 'success.main'
                          : intelligenceScore >= 60
                            ? 'info.dark'
                            : intelligenceScore >= 30
                              ? 'warning.main'
                              : 'error.main',
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 32, textAlign: 'right' }}>
                {intelligenceScore}%
              </Typography>
              {intelligenceScore < 60 && (
                <Tooltip title="Preencha o perfil do cliente para melhorar a qualidade da IA" arrow>
                  <Typography
                    variant="caption"
                    component={Link}
                    href={`/clients/${clientId}/identidade`}
                    sx={{ color: 'warning.main', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', '&:hover': { textDecoration: 'underline' } }}
                  >
                    Melhorar DNA →
                  </Typography>
                </Tooltip>
              )}
            </Stack>
          )}

          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap rowGap={0.75}>
            {contextItems.length > 0 ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {contextItems.map((item) => {
                  const health = sources?.[item.key];
                  const hasIssue = health && health.status !== 'healthy';
                  return (
                    <Tooltip key={item.key} title={hasIssue ? health.message : `${item.label}: ${item.value}`} arrow>
                      <Chip
                        size="small"
                        icon={hasIssue ? <IconAlertTriangle size={13} /> : item.icon}
                        label={`${item.label}: ${item.value}`}
                        color={hasIssue ? (health.status === 'error' ? 'error' : 'warning') : 'default'}
                        variant={hasIssue ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '0.68rem' }}
                      />
                    </Tooltip>
                  );
                })}
                {(intelligenceStats?.opportunities?.urgent ?? 0) > 0 && (
                  <Chip
                    size="small"
                    color="error"
                    label={`${intelligenceStats!.opportunities!.urgent} urgente`}
                    sx={{ fontWeight: 700, cursor: 'default' }}
                  />
                )}
              </Stack>
            ) : (
              !contextLoading && (
                <Typography variant="caption" color="text.secondary">
                  Clique Refresh para carregar o contexto de inteligência.
                </Typography>
              )
            )}

            <Stack direction="row" spacing={0.5} alignItems="center">
              {(contextLoading || healthLoading) && <CircularProgress size={12} />}
              <Button
                size="small"
                variant="outlined"
                onClick={() => { loadContext(); loadHealth(); }}
                disabled={contextLoading}
                sx={{ fontSize: '0.72rem', py: 0.25 }}
              >
                <IconRefresh size={13} style={{ marginRight: 4 }} /> Refresh
              </Button>
            </Stack>
          </Stack>

          {contextError && (
            <Alert severity="warning" sx={{ mt: 1, py: 0.25, fontSize: '0.72rem' }}>
              {contextError}
            </Alert>
          )}

          {(contextLoading || healthLoading) && (
            <LinearProgress sx={{ mt: 1, height: 2, borderRadius: 1 }} />
          )}
        </CardContent>
      </Card>

      {/* Jarvis CTA */}
      <Card
        sx={{
          borderRadius: '12px',
          border: '1px dashed',
          borderColor: '#E8521940',
          bgcolor: '#E852190A',
          boxShadow: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': { borderColor: '#E85219', bgcolor: '#E852191A' },
        }}
        onClick={() => openJarvis(clientId)}
      >
        <CardContent sx={{ py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', bgcolor: '#E85219', flexShrink: 0 }}>
            <IconBrain size={22} color="#fff" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
              Abrir Jarvis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Crie briefings, gere pautas, analise clipping e controle a plataforma por chat.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconSparkles size={14} />}
            sx={{ bgcolor: '#E85219', '&:hover': { bgcolor: '#c94215' }, flexShrink: 0 }}
            onClick={(e) => { e.stopPropagation(); openJarvis(clientId); }}
          >
            Conversar
          </Button>
        </CardContent>
      </Card>

      {/* Outputs — briefings & copies below chat */}
      <OutputsList
        briefings={briefings}
        copies={copies}
        loading={outputsLoading}
        onViewBriefing={(id) => openBriefing(id)}
        onDeleteBriefing={async (id) => {
          try {
            await apiDelete(`/clients/${clientId}/briefings/${id}`);
            setBriefings((prev) => prev.filter((b) => b.id !== id));
          } catch {
            // ignore
          }
        }}
        onArchiveBriefing={async (id) => {
          try {
            await apiPatch(`/clients/${clientId}/briefings/${id}/archive`);
            setBriefings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'archived' } : b)));
          } catch {
            // ignore
          }
        }}
      />
    </Box>
  );
}
