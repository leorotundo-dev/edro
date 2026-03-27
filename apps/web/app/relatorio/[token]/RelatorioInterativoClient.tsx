'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// ── Public theme ─────────────────────────────────────────────────────────────

const publicTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#ff6600' },
    background: { default: '#f5f6fa', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
});

// ── MetricsPanel ─────────────────────────────────────────────────────────────

function MetricsPanel({ metrics }: { metrics: ReportData['metrics'] }) {
  if (metrics.length === 0) {
    return <Typography color="text.secondary" fontSize="0.875rem">Nenhuma métrica disponível para este período.</Typography>;
  }

  return (
    <Grid container spacing={2}>
      {metrics.map((m, i) => {
        const p = m.payload || {};
        // Try to extract common metric fields from Reportei payload
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RelatorioInterativoClient({ token }: { token: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
    const url = base.endsWith('/') ? `${base}relatorio/${token}` : `${base}/relatorio/${token}`;
    fetch(url)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        const json = await res.json();
        setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const jobsDone = data?.jobs.filter((j) => ['done', 'published', 'approved'].includes(j.status)).length ?? 0;
  const jobsTotal = data?.jobs.length ?? 0;
  const totalInvoiced = data?.invoices.reduce((s, i) => s + parseFloat(i.amount_brl), 0) ?? 0;
  const totalPaid = data?.invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount_brl), 0) ?? 0;

  return (
    <ThemeProvider theme={publicTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" minHeight="100vh">
            <CircularProgress sx={{ color: '#ff6600' }} />
          </Stack>
        ) : notFound || !data ? (
          <Stack alignItems="center" justifyContent="center" minHeight="100vh" spacing={2} px={3}>
            <Typography variant="h4" fontWeight={800} color="text.secondary">Relatório não encontrado</Typography>
            <Typography color="text.secondary" textAlign="center">
              O link pode ter expirado ou ser inválido. Entre em contato com a sua agência.
            </Typography>
          </Stack>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ bgcolor: '#ff6600', color: '#fff', py: 4, px: { xs: 3, md: 6 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                <Stack>
                  <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em' }}>
                    {data.client.name}
                  </Typography>
                  {data.client.segment && (
                    <Typography sx={{ opacity: 0.85, fontSize: '1rem' }}>{data.client.segment}</Typography>
                  )}
                  {(data.client.city || data.client.uf) && (
                    <Typography sx={{ opacity: 0.7, fontSize: '0.875rem' }}>
                      {[data.client.city, data.client.uf].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                </Stack>
                <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                  <Typography sx={{ opacity: 0.7, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Relatório de desempenho
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                    {formatPeriod(data.period_month)}
                  </Typography>
                  <Typography sx={{ opacity: 0.6, fontSize: '0.75rem' }}>Edro.Digital</Typography>
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
              {/* Summary KPIs */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
                {[
                  { label: 'Jobs realizados', value: `${jobsDone}/${jobsTotal}`, color: '#ff6600' },
                  { label: 'Taxa de conclusão', value: jobsTotal > 0 ? `${Math.round((jobsDone / jobsTotal) * 100)}%` : '—', color: '#13DEB9' },
                  { label: 'Faturado no mês', value: totalInvoiced > 0 ? fmt(totalInvoiced) : '—', color: '#5D87FF' },
                  { label: 'Saúde da conta', value: data.health ? `${data.health.score}/100` : '—', color: data.health && data.health.score >= 70 ? '#13DEB9' : data.health && data.health.score >= 50 ? '#FFAE1F' : '#FA896B' },
                ].map((k) => (
                  <Paper key={k.label} elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: k.color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                      {k.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.08em', display: 'block', mt: 0.5 }}>
                      {k.label}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              {/* Health bar */}
              {data.health && (
                <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography fontWeight={700}>Índice de Saúde da Conta</Typography>
                    <Typography fontWeight={900} color={data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B'}>
                      {data.health.score}/100
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={data.health.score}
                    sx={{
                      height: 10, borderRadius: 5,
                      bgcolor: alpha(data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B', 0.15),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: data.health.score >= 70 ? '#13DEB9' : data.health.score >= 50 ? '#FFAE1F' : '#FA896B',
                        borderRadius: 5,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                    Tendência: {data.health.trend === 'up' ? '↑ Subindo' : data.health.trend === 'down' ? '↓ Caindo' : '→ Estável'}
                  </Typography>
                </Paper>
              )}

              {/* Tabs */}
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Tab label={`Jobs (${jobsTotal})`} />
                <Tab label="Métricas" />
                {data.invoices.length > 0 && <Tab label="Financeiro" />}
                {data.media_budgets.length > 0 && <Tab label="Mídia" />}
              </Tabs>

              {/* Jobs tab */}
              {activeTab === 0 && (
                <Stack spacing={1}>
                  {data.jobs.length === 0 ? (
                    <Typography color="text.secondary">Nenhum job no período.</Typography>
                  ) : (
                    data.jobs.map((j, i) => {
                      const cfg = STATUS_LABELS[j.status] || { label: j.status, color: 'default' as const };
                      return (
                        <Paper key={i} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography fontWeight={600} fontSize="0.9rem" flex={1}>{j.title}</Typography>
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

              {/* Metrics tab */}
              {activeTab === 1 && <MetricsPanel metrics={data.metrics} />}

              {/* Invoices tab */}
              {activeTab === 2 && data.invoices.length > 0 && (
                <Stack spacing={1}>
                  {data.invoices.map((inv, i) => (
                    <Paper key={i} elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={600} fontSize="0.9rem">{inv.description}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={800}>{fmt(inv.amount_brl)}</Typography>
                          <Chip size="small" label={inv.status === 'paid' ? 'Pago' : inv.status === 'overdue' ? 'Atrasado' : 'Pendente'} color={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'default'} />
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}

              {/* Media tab */}
              {activeTab === 3 && data.media_budgets.length > 0 && (
                <Grid container spacing={2}>
                  {data.media_budgets.map((m, i) => {
                    const pct = parseFloat(m.planned_brl) > 0 ? Math.round((parseFloat(m.realized_brl) / parseFloat(m.planned_brl)) * 100) : 0;
                    return (
                      <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <Typography fontWeight={700} mb={1.5}>{m.platform}</Typography>
                          <Stack spacing={0.75}>
                            <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Planejado</Typography><Typography variant="caption" fontWeight={700}>{fmt(m.planned_brl)}</Typography></Stack>
                            <Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">Realizado</Typography><Typography variant="caption" fontWeight={700}>{fmt(m.realized_brl)}</Typography></Stack>
                            <LinearProgress variant="determinate" value={Math.min(pct, 100)} sx={{ height: 6, borderRadius: 3, mt: 0.5, bgcolor: alpha('#ff6600', 0.15), '& .MuiLinearProgress-bar': { bgcolor: '#ff6600', borderRadius: 3 } }} />
                            <Typography variant="caption" textAlign="right" fontWeight={700} color={pct >= 80 ? 'success.main' : 'warning.main'}>{pct}% executado</Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              )}

              {/* Footer */}
              <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography variant="caption" color="text.disabled">
                  Relatório gerado pela Edro.Digital · {formatPeriod(data.period_month)}
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
}
