'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconArrowUpRight,
  IconChecks,
  IconClockHour4,
  IconFileText,
  IconProgress,
  IconSparkles,
} from '@tabler/icons-react';
import OperationsShell from '@/components/operations/OperationsShell';
import { apiGet } from '@/lib/api';

type BriefingItem = {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
  current_stage?: string | null;
  created_at: string;
  due_at: string | null;
  traffic_owner?: string | null;
  source?: string | null;
};

type BriefingListResponse = {
  success: boolean;
  data: BriefingItem[];
  total: number;
};

type LaneDefinition = {
  key: 'copy_ia' | 'producao' | 'revisao' | 'aprovacao';
  label: string;
  subtitle: string;
  color: string;
  icon: ReactNode;
};

const LANES: LaneDefinition[] = [
  {
    key: 'copy_ia',
    label: 'Prontos para copy',
    subtitle: 'Briefings que já podem virar redação assistida.',
    color: '#5D87FF',
    icon: <IconSparkles size={16} />,
  },
  {
    key: 'producao',
    label: 'Em produção',
    subtitle: 'Itens já puxados para execução no Studio.',
    color: '#13DEB9',
    icon: <IconProgress size={16} />,
  },
  {
    key: 'revisao',
    label: 'Em revisão',
    subtitle: 'Copy ou peça esperando ajuste interno.',
    color: '#FFAE1F',
    icon: <IconClockHour4 size={16} />,
  },
  {
    key: 'aprovacao',
    label: 'Aguardando aprovação',
    subtitle: 'Pronto para cliente ou aprovação final.',
    color: '#E85219',
    icon: <IconChecks size={16} />,
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return 'Sem prazo';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem prazo';
  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatStageLabel(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Sem etapa';
  return normalized
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getDueState(value?: string | null) {
  if (!value) return { label: 'Sem prazo', tone: 'neutral' as const };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { label: 'Sem prazo', tone: 'neutral' as const };
  const diffMs = parsed.getTime() - Date.now();
  const diffHours = diffMs / 3600000;
  if (diffHours <= 0) return { label: 'Atrasado', tone: 'critical' as const };
  if (diffHours <= 24) return { label: 'Vence em 24h', tone: 'warning' as const };
  if (diffHours <= 72) return { label: 'Vence em 72h', tone: 'warning' as const };
  return { label: 'Controlado', tone: 'ok' as const };
}

function getPrimaryActionHref(briefing: BriefingItem) {
  if (briefing.status === 'aprovacao') return `/edro/${briefing.id}/aprovacao`;
  return `/studio/pipeline/${briefing.id}`;
}

function getPrimaryActionLabel(briefing: BriefingItem) {
  if (briefing.status === 'aprovacao') return 'Abrir aprovação';
  return 'Abrir Studio';
}

export default function OperationsIaClient() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lanes, setLanes] = useState<Record<LaneDefinition['key'], { items: BriefingItem[]; total: number }>>({
    copy_ia: { items: [], total: 0 },
    producao: { items: [], total: 0 },
    revisao: { items: [], total: 0 },
    aprovacao: { items: [], total: 0 },
  });

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all(
        LANES.map((lane) =>
          apiGet<BriefingListResponse>(`/edro/briefings?status=${lane.key}&limit=10`)
        )
      );

      setLanes({
        copy_ia: { items: responses[0]?.data || [], total: responses[0]?.total || 0 },
        producao: { items: responses[1]?.data || [], total: responses[1]?.total || 0 },
        revisao: { items: responses[2]?.data || [], total: responses[2]?.total || 0 },
        aprovacao: { items: responses[3]?.data || [], total: responses[3]?.total || 0 },
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar a bandeja de IA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const totalInFlow = useMemo(
    () => Object.values(lanes).reduce((acc, lane) => acc + lane.total, 0),
    [lanes]
  );

  const readyNow = lanes.copy_ia.total;
  const approvalNow = lanes.aprovacao.total;
  const overdueTotal = useMemo(
    () =>
      Object.values(lanes)
        .flatMap((lane) => lane.items)
        .filter((item) => getDueState(item.due_at).tone === 'critical').length,
    [lanes]
  );

  return (
    <OperationsShell
      section="ia"
      summary={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${totalInFlow} itens no fluxo`} size="small" />
          <Chip label={`${readyNow} prontos para copy`} size="small" color="primary" />
          <Chip label={`${approvalNow} aguardando aprovação`} size="small" color="warning" />
          <Chip label={`${overdueTotal} atrasados`} size="small" color={overdueTotal ? 'error' : 'default'} />
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            px: 2.5,
            py: 2.25,
            border: `1px solid ${alpha(theme.palette.primary.main, dark ? 0.24 : 0.14)}`,
            bgcolor: dark ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.primary.main, 0.03),
          }}
        >
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} justifyContent="space-between">
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, letterSpacing: '0.18em' }}>
                EXTRAÇÃO PARA IA
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.4 }}>
                A bandeja operacional da redação
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, mt: 0.8 }}>
                Essa área recupera a lógica da planilha antiga: o que já entrou, o que já foi puxado para copy,
                o que está em revisão e o que já depende de aprovação.
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <Button component={Link} href="/admin/solicitacoes" variant="outlined">
                Ver solicitações
              </Button>
              <Button component={Link} href="/edro?status=copy_ia" variant="contained">
                Abrir pipeline completo
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <>
            <Grid container spacing={2}>
              {LANES.map((lane) => (
                <Grid key={lane.key} size={{ xs: 12, sm: 6, xl: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      px: 2,
                      py: 1.75,
                      border: `1px solid ${alpha(lane.color, 0.22)}`,
                      bgcolor: dark ? alpha(lane.color, 0.08) : alpha(lane.color, 0.04),
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                      <Box>
                        <Stack direction="row" spacing={0.9} alignItems="center">
                          <Box sx={{ color: lane.color, display: 'inline-flex' }}>{lane.icon}</Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                            {lane.label}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
                          {lane.subtitle}
                        </Typography>
                      </Box>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: lane.color, lineHeight: 1 }}>
                        {lanes[lane.key].total}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              {LANES.map((lane) => (
                <Grid key={lane.key} size={{ xs: 12, xl: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      border: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.07)}`,
                      bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : '#fff',
                      minHeight: 420,
                    }}
                  >
                    <Stack spacing={1.5} sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                            {lane.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {lanes[lane.key].total} no fluxo
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={lanes[lane.key].total}
                          sx={{
                            bgcolor: alpha(lane.color, 0.12),
                            color: lane.color,
                            fontWeight: 900,
                          }}
                        />
                      </Stack>

                      <Stack spacing={1.2}>
                        {lanes[lane.key].items.length ? (
                          lanes[lane.key].items.map((briefing) => {
                            const due = getDueState(briefing.due_at);
                            return (
                              <Paper
                                key={briefing.id}
                                elevation={0}
                                sx={{
                                  borderRadius: 2,
                                  p: 1.5,
                                  border: `1px solid ${alpha(theme.palette.text.primary, dark ? 0.08 : 0.06)}`,
                                  bgcolor: dark ? alpha(theme.palette.common.white, 0.02) : alpha(theme.palette.common.black, 0.012),
                                }}
                              >
                                <Stack spacing={1.1}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                                        {briefing.client_name || 'Sem cliente'}
                                      </Typography>
                                      <Typography
                                        variant="subtitle2"
                                        sx={{
                                          fontWeight: 900,
                                          mt: 0.25,
                                          lineHeight: 1.35,
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {briefing.title}
                                      </Typography>
                                    </Box>
                                    <Chip
                                      size="small"
                                      label={due.label}
                                      sx={{
                                        height: 20,
                                        fontSize: '0.65rem',
                                        fontWeight: 900,
                                        bgcolor:
                                          due.tone === 'critical'
                                            ? alpha('#FA896B', 0.16)
                                            : due.tone === 'warning'
                                              ? alpha('#FFAE1F', 0.16)
                                              : alpha('#5D87FF', 0.12),
                                        color:
                                          due.tone === 'critical'
                                            ? '#d9485f'
                                            : due.tone === 'warning'
                                              ? '#d97706'
                                              : '#2563eb',
                                      }}
                                    />
                                  </Stack>

                                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                                    <Chip size="small" label={formatStageLabel(briefing.current_stage || briefing.status)} />
                                    {briefing.traffic_owner ? <Chip size="small" label={briefing.traffic_owner} variant="outlined" /> : null}
                                    {briefing.source ? <Chip size="small" label={briefing.source} variant="outlined" /> : null}
                                  </Stack>

                                  <Stack spacing={0.45}>
                                    <Typography variant="caption" color="text.secondary">
                                      Criado em {formatDateTime(briefing.created_at)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Prazo {formatDateTime(briefing.due_at)}
                                    </Typography>
                                  </Stack>

                                  <Stack direction="row" spacing={1}>
                                    <Button
                                      component={Link}
                                      href={getPrimaryActionHref(briefing)}
                                      variant="contained"
                                      size="small"
                                      endIcon={<IconArrowUpRight size={14} />}
                                    >
                                      {getPrimaryActionLabel(briefing)}
                                    </Button>
                                    <Button
                                      component={Link}
                                      href={`/edro/${briefing.id}`}
                                      variant="outlined"
                                      size="small"
                                      startIcon={<IconFileText size={14} />}
                                    >
                                      Briefing
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Paper>
                            );
                          })
                        ) : (
                          <Paper
                            elevation={0}
                            sx={{
                              borderRadius: 2,
                              p: 2,
                              border: `1px dashed ${alpha(theme.palette.text.primary, dark ? 0.12 : 0.1)}`,
                              bgcolor: 'transparent',
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Nada nessa etapa agora.
                            </Typography>
                          </Paper>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Stack>
    </OperationsShell>
  );
}
