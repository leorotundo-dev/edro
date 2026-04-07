'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { IconArrowLeft } from '@tabler/icons-react';
import { apiGet } from '@/lib/api';

type ReportData = {
  client: { name: string; segment: string | null; city: string | null; uf: string | null };
  period_month: string;
  jobs: Array<{ title: string; status: string; due_at: string | null; updated_at: string }>;
  invoices: Array<{ description: string; amount_brl: string; status: string; due_date: string | null; paid_at: string | null }>;
  media_budgets: Array<{ platform: string; planned_brl: string; realized_brl: string }>;
  health: { score: number; trend: string; factors: Record<string, any> } | null;
  metrics: Array<{ platform: string; time_window: string; payload: any }>;
};

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  done: { label: 'Entregue', color: 'success' },
  published: { label: 'Publicado', color: 'success' },
  approved: { label: 'Aprovado', color: 'success' },
  in_review: { label: 'Em Revisão', color: 'warning' },
  awaiting_approval: { label: 'Aguardando', color: 'warning' },
  in_progress: { label: 'Em Produção', color: 'primary' },
  blocked: { label: 'Bloqueado', color: 'error' },
  intake: { label: 'Entrada', color: 'default' },
};

function fmt(v: string | number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(Number(v));
}

function formatPeriod(p: string) {
  const [y, m] = p.split('-');
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function MetricsPanel({ metrics }: { metrics: ReportData['metrics'] }) {
  if (metrics.length === 0) {
    return <Typography color="text.secondary" fontSize="0.875rem">Nenhuma métrica disponível para este período.</Typography>;
  }
  return (
    <Grid container spacing={2}>
      {metrics.map((m, i) => {
        const p = m.payload || {};
        const reach = p.reach ?? p.total_reach ?? null;
        const impressions = p.impressions ?? p.total_impressions ?? null;
        const engagement = p.engagement_rate ?? p.engagementRate ?? null;
        const followers = p.followers ?? p.follower_count ?? null;
        return (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Typography fontWeight={700} fontSize="0.875rem" mb={1}>{m.platform}</Typography>
              <Stack spacing={0.5}>
                {reach !== null && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Alcance</Typography><Typography variant="caption" fontWeight={700}>{Number(reach).toLocaleString('pt-BR')}</Typography></Stack>}
                {impressions !== null && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Impressões</Typography><Typography variant="caption" fontWeight={700}>{Number(impressions).toLocaleString('pt-BR')}</Typography></Stack>}
                {engagement !== null && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Engajamento</Typography><Typography variant="caption" fontWeight={700}>{typeof engagement === 'number' ? `${engagement.toFixed(2)}%` : engagement}</Typography></Stack>}
                {followers !== null && <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Seguidores</Typography><Typography variant="caption" fontWeight={700}>{Number(followers).toLocaleString('pt-BR')}</Typography></Stack>}
                {reach === null && impressions === null && engagement === null && followers === null && (
                  <Typography variant="caption" color="text.disabled">Dados processados internamente.</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}

export default function RelatorioMensalPage() {
  const params = useParams<{ month: string }>();
  const router = useRouter();
  const month = params.month;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    apiGet<ReportData>(`/portal/client/reports/${month}/data`)
      .then((d) => setData(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [month]);

  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" py={8}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (notFound || !data) {
    return (
      <Stack spacing={2} py={4}>
        <IconButton onClick={() => router.back()} sx={{ alignSelf: 'flex-start' }}>
          <IconArrowLeft size={20} />
        </IconButton>
        <Typography variant="h5" fontWeight={700} color="text.secondary">Relatório não encontrado</Typography>
        <Typography color="text.secondary">Não há dados disponíveis para este período.</Typography>
      </Stack>
    );
  }

  const jobsDone = data.jobs.filter((j) => ['done', 'published', 'approved'].includes(j.status)).length;
  const jobsTotal = data.jobs.length;
  const totalInvoiced = data.invoices.reduce((s, i) => s + parseFloat(i.amount_brl), 0);

  const ACCENT = '#ff6600';

  return (
    <Stack spacing={3}>
      {/* Back */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton size="small" onClick={() => router.back()}>
          <IconArrowLeft size={18} />
        </IconButton>
        <Typography variant="body2" color="text.secondary">Resultados</Typography>
      </Stack>

      {/* Header card */}
      <Card sx={{ borderRadius: 3, bgcolor: ACCENT, color: '#fff' }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={1.5}>
            <Box>
              <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>{data.client.name}</Typography>
              {data.client.segment && <Typography sx={{ opacity: 0.85, fontSize: '0.9rem', mt: 0.25 }}>{data.client.segment}</Typography>}
              {(data.client.city || data.client.uf) && (
                <Typography sx={{ opacity: 0.7, fontSize: '0.8rem' }}>{[data.client.city, data.client.uf].filter(Boolean).join(', ')}</Typography>
              )}
            </Box>
            <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
              <Typography sx={{ opacity: 0.7, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Relatório de desempenho</Typography>
              <Typography variant="h6" fontWeight={700}>{formatPeriod(data.period_month)}</Typography>
              <Typography sx={{ opacity: 0.6, fontSize: '0.7rem' }}>Edro.Digital</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* KPIs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
        {[
          { label: 'Jobs realizados', value: `${jobsDone}/${jobsTotal}`, color: ACCENT },
          { label: 'Taxa de conclusão', value: jobsTotal > 0 ? `${Math.round((jobsDone / jobsTotal) * 100)}%` : '—', color: '#13DEB9' },
          { label: 'Faturado no mês', value: totalInvoiced > 0 ? fmt(totalInvoiced) : '—', color: '#5D87FF' },
          {
            label: 'Saúde da conta',
            value: data.health ? `${data.health.score}/100` : '—',
            color: data.health ? (data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B') : '#9ca3af',
          },
        ].map((k) => (
          <Paper key={k.label} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.08em', display: 'block', mt: 0.5 }}>
              {k.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Health bar */}
      {data.health && (
        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography fontWeight={700} variant="body2">Índice de Saúde da Conta</Typography>
            <Typography fontWeight={900} fontSize="0.9rem"
              color={data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B'}>
              {data.health.score}/100
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={data.health.score}
            sx={{
              height: 8, borderRadius: 4,
              bgcolor: alpha(data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B', 0.15),
              '& .MuiLinearProgress-bar': {
                bgcolor: data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B',
                borderRadius: 4,
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            Tendência: {data.health.trend === 'up' ? '↑ Subindo' : data.health.trend === 'down' ? '↓ Caindo' : '→ Estável'}
          </Typography>
        </Paper>
      )}

      {/* Tabs */}
      <Box>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab label={`Jobs (${jobsTotal})`} />
          <Tab label="Métricas" />
          {data.invoices.length > 0 && <Tab label="Financeiro" />}
          {data.media_budgets.length > 0 && <Tab label="Mídia" />}
        </Tabs>

        {/* Jobs */}
        {activeTab === 0 && (
          <Stack spacing={1}>
            {data.jobs.length === 0 ? (
              <Typography color="text.secondary" fontSize="0.875rem">Nenhum job no período.</Typography>
            ) : (
              data.jobs.map((j, i) => {
                const cfg = STATUS_LABELS[j.status] || { label: j.status, color: 'default' as const };
                return (
                  <Paper key={i} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Typography fontWeight={600} fontSize="0.875rem" flex={1}>{j.title}</Typography>
                      <Chip size="small" label={cfg.label} color={cfg.color} />
                    </Stack>
                    {j.due_at && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        Prazo: {new Date(j.due_at).toLocaleDateString('pt-BR')}
                      </Typography>
                    )}
                  </Paper>
                );
              })
            )}
          </Stack>
        )}

        {/* Metrics */}
        {activeTab === 1 && <MetricsPanel metrics={data.metrics} />}

        {/* Invoices */}
        {activeTab === 2 && data.invoices.length > 0 && (
          <Stack spacing={1} divider={<Divider />}>
            {data.invoices.map((inv, i) => (
              <Paper key={i} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Typography fontWeight={600} fontSize="0.875rem">{inv.description}</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={800} fontSize="0.9rem">{fmt(inv.amount_brl)}</Typography>
                    <Chip size="small"
                      label={inv.status === 'paid' ? 'Pago' : inv.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                      color={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'default'}
                    />
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        {/* Media */}
        {activeTab === 3 && data.media_budgets.length > 0 && (
          <Grid container spacing={2}>
            {data.media_budgets.map((m, i) => {
              const pct = parseFloat(m.planned_brl) > 0 ? Math.round((parseFloat(m.realized_brl) / parseFloat(m.planned_brl)) * 100) : 0;
              return (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography fontWeight={700} mb={1.5} fontSize="0.9rem">{m.platform}</Typography>
                    <Stack spacing={0.75}>
                      <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Planejado</Typography><Typography variant="caption" fontWeight={700}>{fmt(m.planned_brl)}</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Realizado</Typography><Typography variant="caption" fontWeight={700}>{fmt(m.realized_brl)}</Typography></Stack>
                      <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: alpha(ACCENT, 0.15), '& .MuiLinearProgress-bar': { bgcolor: ACCENT, borderRadius: 3 } }} />
                      <Typography variant="caption" textAlign="right" fontWeight={700} color={pct >= 80 ? 'success.main' : 'warning.main'}>{pct}% executado</Typography>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Stack>
  );
}
