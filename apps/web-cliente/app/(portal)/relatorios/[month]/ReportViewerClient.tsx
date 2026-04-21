'use client';

import { use, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  IconSparkles,
  IconAlertTriangle,
  IconBulb,
  IconCircleCheck,
} from '@tabler/icons-react';
import { apiGet, apiPost } from '@/lib/api';
import type { MonthlyReport, KPI, Channel, FeaturedDeliverable, Priority, Risk } from '@/types/monthly-report';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatPeriodShort(p: string) {
  const [y, m] = p.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

const STATUS_COLOR = {
  green:  { bg: '#16A34A', light: alpha('#16A34A', 0.06), label: 'Verde',    text: 'Operação em dia' },
  yellow: { bg: '#D97706', light: alpha('#D97706', 0.06), label: 'Amarelo',  text: 'Atenção necessária' },
  red:    { bg: '#DC2626', light: alpha('#DC2626', 0.06), label: 'Vermelho', text: 'Ação imediata' },
};

const TREND_COLOR = { up: '#16A34A', down: '#DC2626', stable: '#6B7280' };
const TREND_ARROW = { up: '↑', down: '↓', stable: '→' };

// ─── sub-components ──────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: KPI }) {
  const color = TREND_COLOR[kpi.trend];
  const arrow = TREND_ARROW[kpi.trend];

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}
    >
      <Typography variant="h4" fontWeight={900} sx={{ color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {kpi.value.toLocaleString('pt-BR')}
      </Typography>
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5} mt={0.5}>
        <Typography variant="caption" sx={{ color, fontWeight: 700 }}>
          {arrow}
        </Typography>
        {kpi.previous_value !== null && (
          <Typography variant="caption" color="text.disabled">
            ant. {kpi.previous_value.toLocaleString('pt-BR')}
          </Typography>
        )}
      </Stack>
      <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: 0.5, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.08em', color: 'text.secondary' }}>
        {kpi.label}
      </Typography>
      {kpi.context && (
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5, fontStyle: 'italic', fontSize: '0.65rem' }}>
          {kpi.context}
        </Typography>
      )}
    </Paper>
  );
}

function ChannelSection({ channel }: { channel: Channel }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        {channel.label || channel.platform}
      </Typography>
      <Grid container spacing={1.5}>
        {channel.kpis.map((kpi) => (
          <Grid key={kpi.key} size={{ xs: 6, md: 3 }}>
            <KpiCard kpi={kpi} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function DeliverableCard({ item }: { item: FeaturedDeliverable }) {
  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      {item.image_url && (
        <Box
          sx={{
            height: 140,
            bgcolor: 'grey.100',
            backgroundImage: `url(${item.image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {!item.image_url && (
        <Box sx={{ height: 140, bgcolor: 'grey.100', borderRadius: 0 }} />
      )}
      <Box sx={{ p: 2 }}>
        <Chip
          label={item.category}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mb: 1, fontWeight: 700, fontSize: '0.65rem' }}
        />
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {item.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
          {item.description}
        </Typography>
      </Box>
    </Paper>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type Props =
  | { mode: 'portal'; params: Promise<{ month: string }>; report?: never; token?: never }
  | { mode: 'public'; report: MonthlyReport; params?: never; token?: never };

export default function ReportViewerClient(props: Props) {
  const [report, setReport] = useState<MonthlyReport | null>(props.mode === 'public' ? props.report : null);
  const [loading, setLoading] = useState(props.mode === 'portal');
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  // resolve params in portal mode
  const resolvedParams = props.mode === 'portal' ? use(props.params) : null;
  const month = resolvedParams?.month ?? null;

  useEffect(() => {
    if (props.mode !== 'portal' || !month) return;
    apiGet<MonthlyReport>(`/monthly-reports/mine/${month}`)
      .then(setReport)
      .catch(() => setError('Não foi possível carregar o relatório.'))
      .finally(() => setLoading(false));
  }, [props.mode, month]);

  async function handleApprove() {
    if (!report) return;
    setApproving(true);
    try {
      await apiPost(`/monthly-reports/mine/${report.id}/approve`);
      setApproved(true);
      setReport((prev) => prev ? { ...prev, status: 'approved' } : prev);
    } catch {
      setError('Erro ao aprovar. Tente novamente.');
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" py={10}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (error && !report) {
    return (
      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (!report) {
    return (
      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
        <Alert severity="info" sx={{ borderRadius: 2 }}>Relatório não encontrado.</Alert>
      </Box>
    );
  }

  const { sections } = report;
  const statusCfg = STATUS_COLOR[sections.status.color];
  const isPending = report.status === 'pending_approval' && props.mode === 'portal';

  return (
    <Box sx={{ bgcolor: 'background.paper', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 5 } }}>
        <Stack spacing={5}>

          {/* ── Portal approval banner ── */}
          {isPending && !approved && (
            <Alert
              severity="warning"
              sx={{ borderRadius: 2 }}
              action={
                <Button
                  color="warning"
                  variant="contained"
                  size="small"
                  disabled={approving}
                  startIcon={approving ? <CircularProgress size={14} color="inherit" /> : <IconCircleCheck size={16} />}
                  onClick={handleApprove}
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Aprovar relatório
                </Button>
              }
            >
              Este relatório aguarda sua aprovação antes de ir para a diretoria.
            </Alert>
          )}

          {approved && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Relatório aprovado com sucesso!
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
          )}

          {/* ── Hero ── */}
          <Box>
            <Typography
              variant="overline"
              color="text.disabled"
              sx={{ letterSpacing: '0.12em', fontSize: '0.65rem' }}
            >
              RELATÓRIO DE COMUNICAÇÃO · {formatPeriodShort(report.period_month)}
            </Typography>
            <Typography variant="h3" fontWeight={900} sx={{ mt: 0.5, letterSpacing: '-0.02em' }}>
              {report.client_name}
            </Typography>

            {/* Status row */}
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 2 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  bgcolor: statusCfg.bg,
                  flexShrink: 0,
                  boxShadow: `0 0 0 4px ${alpha(statusCfg.bg, 0.18)}`,
                }}
              />
              <Typography variant="body1" color="text.secondary">
                Status:{' '}
                <Box component="span" sx={{ fontWeight: 700, color: statusCfg.bg }}>
                  {statusCfg.label}
                </Box>{' '}
                — {statusCfg.text}
              </Typography>
            </Stack>

            <Divider sx={{ mt: 2.5 }} />
          </Box>

          {/* ── Bloco 1: O mês em uma frase ── */}
          <Box
            sx={{
              bgcolor: statusCfg.light,
              borderRadius: 3,
              p: { xs: 3, md: 4 },
              textAlign: 'center',
            }}
          >
            <Typography
              variant="overline"
              color="text.disabled"
              sx={{ letterSpacing: '0.12em', fontSize: '0.65rem' }}
            >
              SÍNTESE DO MÊS
            </Typography>
            <Box sx={{ my: 1.5, display: 'flex', justifyContent: 'center' }}>
              <IconSparkles size={36} color={statusCfg.bg} />
            </Box>
            <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary' }}>
              {sections.status.headline}
            </Typography>
          </Box>

          {/* ── Bloco 2: Entregas em destaque ── */}
          <Box>
            <Typography
              variant="overline"
              color="text.disabled"
              sx={{ letterSpacing: '0.12em', fontSize: '0.65rem', mb: 2, display: 'block' }}
            >
              O QUE FOI ENTREGUE
            </Typography>

            {sections.deliverables.featured.length > 0 ? (
              <Grid container spacing={2}>
                {sections.deliverables.featured.map((item, i) => (
                  <Grid key={item.job_id ?? i} size={{ xs: 12, sm: 6 }}>
                    <DeliverableCard item={item} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma entrega em destaque registrada.
              </Typography>
            )}

            {sections.deliverables.total_count > sections.deliverables.featured.length && (
              <Typography
                variant="caption"
                color="text.disabled"
                display="block"
                sx={{ mt: 2, fontStyle: 'italic' }}
              >
                Além desses destaques,{' '}
                {sections.deliverables.total_count - sections.deliverables.featured.length} outros itens foram concluídos no mês.
              </Typography>
            )}
          </Box>

          {/* ── Bloco 3: Performance de canal ── */}
          <Box>
            <Typography
              variant="overline"
              color="text.disabled"
              sx={{ letterSpacing: '0.12em', fontSize: '0.65rem', mb: 2, display: 'block' }}
            >
              PERFORMANCE DE CANAL
            </Typography>

            {sections.metrics.channels.length > 0 ? (
              <Stack spacing={3}>
                {sections.metrics.channels.map((channel, i) => (
                  <ChannelSection key={channel.platform + i} channel={channel} />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhuma métrica de canal disponível para este período.
              </Typography>
            )}

            {sections.metrics.insight && (
              <Paper
                elevation={0}
                sx={{
                  mt: 2.5,
                  p: 2,
                  border: '1px solid',
                  borderColor: 'primary.light',
                  borderRadius: 2,
                  bgcolor: alpha('#5D87FF', 0.04),
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                }}
              >
                <Box sx={{ color: 'primary.main', flexShrink: 0, mt: 0.25 }}>
                  <IconBulb size={18} />
                </Box>
                <Typography variant="body2" color="text.primary">
                  {sections.metrics.insight}
                </Typography>
              </Paper>
            )}
          </Box>

          {/* ── Bloco 4: Próximos 30 dias ── */}
          <Box>
            <Typography
              variant="overline"
              color="text.disabled"
              sx={{ letterSpacing: '0.12em', fontSize: '0.65rem', mb: 2, display: 'block' }}
            >
              PRÓXIMOS 30 DIAS
            </Typography>

            {/* Prioridades */}
            {sections.next_steps.priorities.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Prioridades
                </Typography>
                <Stack spacing={1.5}>
                  {sections.next_steps.priorities.map((p: Priority, i: number) => (
                    <Stack key={i} direction="row" spacing={2} alignItems="flex-start">
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: '1.1rem',
                          color: 'primary.main',
                          minWidth: 28,
                          lineHeight: 1.3,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </Typography>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>{p.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{p.description}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Riscos */}
            {sections.next_steps.risks.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Riscos
                </Typography>
                <Stack spacing={1}>
                  {sections.next_steps.risks.map((r: Risk, i: number) => (
                    <Paper
                      key={i}
                      elevation={0}
                      sx={{ p: 1.5, border: '1px solid', borderColor: 'error.light', borderRadius: 2 }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box sx={{ color: 'error.main', flexShrink: 0, mt: 0.2 }}>
                          <IconAlertTriangle size={16} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">{r.description}</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              size="small"
                              label={`Responsável: ${r.owner}`}
                              variant="outlined"
                              sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Ação do diretor */}
            {sections.next_steps.director_action && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  bgcolor: alpha('#5D87FF', 0.03),
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ fontSize: '0.6rem', letterSpacing: '0.12em', color: 'primary.main', display: 'block', mb: 0.75 }}
                >
                  AÇÃO DO DIRETOR
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {sections.next_steps.director_action}
                </Typography>
              </Paper>
            )}
          </Box>

          {/* ── Rodapé ── */}
          <Box>
            <Divider sx={{ mb: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.5}>
              <Typography variant="caption" color="text.disabled">
                Relatório elaborado por Edro Studio · {formatPeriod(report.period_month)}
              </Typography>
              {report.published_at && (
                <Typography variant="caption" color="text.disabled">
                  Publicado em {formatDate(report.published_at)}
                </Typography>
              )}
            </Stack>
          </Box>

        </Stack>
      </Box>
    </Box>
  );
}
