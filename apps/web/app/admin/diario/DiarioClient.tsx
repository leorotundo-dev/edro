'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import AppShell from '@/components/AppShell';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  IconCalendarEvent,
  IconChartBar,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
  IconSend,
  IconLock,
  IconClock,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type DailyContent = {
  jobs_due_today: Array<{ id: string; title: string; client_name: string; status: string; due_at: string | null }>;
  jobs_blocked: Array<{ id: string; title: string; client_name: string; blocked_since: string | null }>;
  jobs_delivered_yesterday: Array<{ id: string; title: string; client_name: string }>;
  clients_at_risk: Array<{ id: string; name: string; health_score: number | null; risk_reason: string }>;
  signals_critical: Array<{ title: string; summary: string | null; client_name: string | null }>;
  active_jobs_total: number;
  top_action: string | null;
};

type WeeklyContent = {
  jobs_delivered: number;
  jobs_opened: number;
  jobs_blocked_eow: number;
  sla_hit_rate: string;
  avg_health_score: number | null;
  top_clients: Array<{ name: string; jobs_delivered: number; health_score: number | null }>;
  top_blockers: Array<{ title: string; client_name: string; days_blocked: number }>;
  highlight: string | null;
};

type Digest = {
  id: string;
  type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  content: DailyContent | WeeklyContent;
  narrative_text: string | null;
  sent_at: string | null;
  created_at: string;
};

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
    done: { label: 'Concluído', color: 'success' },
    published: { label: 'Publicado', color: 'success' },
    blocked: { label: 'Bloqueado', color: 'error' },
    in_progress: { label: 'Em Produção', color: 'primary' },
    in_review: { label: 'Em Revisão', color: 'warning' },
    awaiting_approval: { label: 'Aguardando', color: 'warning' },
  };
  const cfg = map[status] || { label: status, color: 'default' as const };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
}

function DailyView({ content }: { content: DailyContent }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const kpis = [
    { value: content.active_jobs_total, label: 'Jobs ativos', color: theme.palette.primary.main },
    { value: content.jobs_due_today.length, label: 'Vencem hoje', color: theme.palette.warning.main, pulse: content.jobs_due_today.length > 0 },
    { value: content.jobs_blocked.length, label: 'Bloqueados', color: theme.palette.error.main, pulse: content.jobs_blocked.length > 0 },
    { value: content.jobs_delivered_yesterday.length, label: 'Entregues ontem', color: theme.palette.success.main },
    { value: content.clients_at_risk.length, label: 'Clientes em risco', color: '#FA896B', pulse: content.clients_at_risk.length > 0 },
    { value: content.signals_critical.length, label: 'Alertas críticos', color: '#FF0000', pulse: content.signals_critical.length > 0 },
  ];

  return (
    <Stack spacing={3}>
      {/* KPI Strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.5 }}>
        {kpis.map((k) => (
          <Paper key={k.label} elevation={0} sx={{
            p: 2, textAlign: 'center', borderRadius: 2,
            border: `1px solid ${k.value > 0 ? alpha(k.color, 0.25) : dark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
            bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
          }}>
            <Typography sx={{ fontWeight: 900, fontSize: '2rem', lineHeight: 1, color: k.value > 0 ? k.color : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
              {k.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Top action */}
      {content.top_action && (
        <Alert severity="info" icon={<IconAlertTriangle size={18} />} sx={{ fontWeight: 600 }}>
          Prioridade: {content.top_action}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Due Today */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <IconClock size={18} color={theme.palette.warning.main} />
                <Typography fontWeight={700}>Vencem hoje ({content.jobs_due_today.length})</Typography>
              </Stack>
              {content.jobs_due_today.length === 0 ? (
                <Typography color="text.secondary" fontSize="0.875rem">Nenhum job vence hoje.</Typography>
              ) : (
                <List dense disablePadding>
                  {content.jobs_due_today.map((j, i) => (
                    <ListItem key={j.id || i} disableGutters divider={i < content.jobs_due_today.length - 1}>
                      <ListItemText
                        primary={j.title}
                        secondary={j.client_name || '—'}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                      <StatusBadge status={j.status} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Blocked */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${content.jobs_blocked.length > 0 ? alpha(theme.palette.error.main, 0.25) : dark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <IconLock size={18} color={theme.palette.error.main} />
                <Typography fontWeight={700}>Bloqueados ({content.jobs_blocked.length})</Typography>
              </Stack>
              {content.jobs_blocked.length === 0 ? (
                <Typography color="text.secondary" fontSize="0.875rem">Nenhum job bloqueado.</Typography>
              ) : (
                <List dense disablePadding>
                  {content.jobs_blocked.map((j, i) => (
                    <ListItem key={j.id || i} disableGutters divider={i < content.jobs_blocked.length - 1}>
                      <ListItemText
                        primary={j.title}
                        secondary={j.client_name || '—'}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Delivered yesterday */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <IconCheck size={18} color={theme.palette.success.main} />
                <Typography fontWeight={700}>Entregues ontem ({content.jobs_delivered_yesterday.length})</Typography>
              </Stack>
              {content.jobs_delivered_yesterday.length === 0 ? (
                <Typography color="text.secondary" fontSize="0.875rem">Nenhuma entrega ontem.</Typography>
              ) : (
                <List dense disablePadding>
                  {content.jobs_delivered_yesterday.map((j, i) => (
                    <ListItem key={j.id || i} disableGutters divider={i < content.jobs_delivered_yesterday.length - 1}>
                      <ListItemText primary={j.title} secondary={j.client_name || '—'}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }} />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Clients at risk */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${content.clients_at_risk.length > 0 ? alpha('#FA896B', 0.3) : dark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <IconAlertTriangle size={18} color="#FA896B" />
                <Typography fontWeight={700}>Clientes em risco ({content.clients_at_risk.length})</Typography>
              </Stack>
              {content.clients_at_risk.length === 0 ? (
                <Typography color="text.secondary" fontSize="0.875rem">Todos os clientes estão saudáveis.</Typography>
              ) : (
                <List dense disablePadding>
                  {content.clients_at_risk.map((cl, i) => (
                    <ListItem key={cl.id || i} disableGutters divider={i < content.clients_at_risk.length - 1}>
                      <ListItemText primary={cl.name} secondary={cl.risk_reason}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }} />
                      <Typography variant="caption" fontWeight={700} color="error.main">
                        {cl.health_score ?? '—'}/100
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function WeeklyView({ content }: { content: WeeklyContent }) {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const kpis = [
    { value: content.jobs_delivered, label: 'Entregues', color: theme.palette.success.main },
    { value: content.jobs_opened, label: 'Abertos', color: theme.palette.primary.main },
    { value: content.jobs_blocked_eow, label: 'Bloqueados', color: theme.palette.error.main },
    { value: content.sla_hit_rate, label: 'SLA', color: '#5D87FF' },
    { value: content.avg_health_score !== null ? `${content.avg_health_score}/100` : '—', label: 'Saúde média', color: '#13DEB9' },
  ];

  return (
    <Stack spacing={3}>
      {content.highlight && (
        <Alert severity="success" icon={<IconChartBar size={18} />} sx={{ fontWeight: 600 }}>
          {content.highlight}
        </Alert>
      )}

      {/* KPI Strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1.5 }}>
        {kpis.map((k) => (
          <Paper key={k.label} elevation={0} sx={{
            p: 2, textAlign: 'center', borderRadius: 2,
            border: `1px solid ${dark ? alpha('#fff', 0.06) : alpha('#000', 0.06)}`,
            bgcolor: dark ? alpha('#fff', 0.02) : '#fff',
          }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', lineHeight: 1, color: k.color, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.1em' }}>
              {k.label}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${dark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={700} mb={1.5}>Top Clientes da Semana</Typography>
              {content.top_clients.length === 0 ? (
                <Typography color="text.secondary" fontSize="0.875rem">Nenhum dado disponível.</Typography>
              ) : (
                <List dense disablePadding>
                  {content.top_clients.map((cl, i) => (
                    <ListItem key={i} disableGutters divider={i < content.top_clients.length - 1}>
                      <ListItemText primary={cl.name} secondary={`${cl.jobs_delivered} job${cl.jobs_delivered !== 1 ? 's' : ''} entregue${cl.jobs_delivered !== 1 ? 's' : ''}`}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }} />
                      {cl.health_score !== null && (
                        <Typography variant="caption" fontWeight={700} color={cl.health_score >= 70 ? 'success.main' : 'warning.main'}>
                          {cl.health_score}/100
                        </Typography>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: `1px solid ${content.top_blockers.length > 0 ? alpha(theme.palette.error.main, 0.2) : dark ? alpha('#fff', 0.08) : alpha('#000', 0.08)}`, height: '100%' }}>
            <CardContent>
              <Typography fontWeight={700} mb={1.5}>Maiores Gargalos</Typography>
              {content.top_blockers.length === 0 ? (
                <Typography color="text.secondary" fontSize="0.875rem">Nenhum gargalo registrado.</Typography>
              ) : (
                <List dense disablePadding>
                  {content.top_blockers.map((b, i) => (
                    <ListItem key={i} disableGutters divider={i < content.top_blockers.length - 1}>
                      <ListItemText primary={b.title} secondary={b.client_name}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }} />
                      <Chip size="small" label={`${b.days_blocked}d`} color="error" />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DiarioClient() {
  const theme = useTheme();
  const [latestDaily, setLatestDaily] = useState<Digest | null>(null);
  const [latestWeekly, setLatestWeekly] = useState<Digest | null>(null);
  const [history, setHistory] = useState<Omit<Digest, 'content'>[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [latestRes, histRes] = await Promise.all([
        apiGet<{ daily: Digest | null; weekly: Digest | null }>('/admin/diario/latest'),
        apiGet<{ digests: Omit<Digest, 'content'>[] }>('/admin/diario'),
      ]);
      setLatestDaily(latestRes?.daily ?? null);
      setLatestWeekly(latestRes?.weekly ?? null);
      setHistory(histRes?.digests ?? []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async (type: 'daily' | 'weekly') => {
    setGenerating(true);
    try {
      await apiPost('/admin/diario/generate', { type });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar digest');
    } finally {
      setGenerating(false);
    }
  };

  const currentDigest = activeTab === 0 ? latestDaily : activeTab === 1 ? latestWeekly : null;

  return (
    <AppShell>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
          <Stack>
            <Typography variant="h5" fontWeight={800}>Diário da Agência</Typography>
            <Typography variant="body2" color="text.secondary">
              Resumo diário (seg–sex) e retrospectiva semanal (sábado) gerados automaticamente.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<IconRefresh size={16} />} onClick={load} disabled={loading}>
              Atualizar
            </Button>
            <Button variant="outlined" size="small" startIcon={<IconSend size={16} />} onClick={() => handleGenerate('daily')} disabled={generating}>
              Gerar hoje
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={8}><CircularProgress /></Stack>
        ) : (
          <>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Tab label={`Hoje${latestDaily ? ` — ${fmtDate(latestDaily.period_start)}` : ''}`} icon={<IconCalendarEvent size={16} />} iconPosition="start" />
              <Tab label={`Semana${latestWeekly ? ` — ${fmtDate(latestWeekly.period_start)}` : ''}`} icon={<IconChartBar size={16} />} iconPosition="start" />
              <Tab label="Histórico" />
            </Tabs>

            {activeTab === 2 ? (
              <Stack spacing={1}>
                {history.length === 0 ? (
                  <Typography color="text.secondary">Nenhum digest gerado ainda.</Typography>
                ) : (
                  history.map((d) => (
                    <Paper key={d.id} elevation={0} sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Chip size="small" label={d.type === 'daily' ? 'Diário' : 'Semanal'} color={d.type === 'daily' ? 'primary' : 'secondary'} />
                        <Typography fontWeight={600} fontSize="0.875rem">{fmtDate(d.period_start)}</Typography>
                        {d.narrative_text && (
                          <Typography color="text.secondary" fontSize="0.8rem" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.narrative_text}
                          </Typography>
                        )}
                        {d.sent_at && <Chip size="small" label="Enviado" color="success" variant="outlined" />}
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            ) : currentDigest ? (
              <Stack spacing={2}>
                {/* Narrative */}
                {currentDigest.narrative_text && (
                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
                    <Typography fontSize="1rem" lineHeight={1.7} fontStyle="italic" color="text.primary">
                      "{currentDigest.narrative_text}"
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Gerado em {new Date(currentDigest.created_at).toLocaleString('pt-BR')}
                      {currentDigest.sent_at && ` · Enviado em ${new Date(currentDigest.sent_at).toLocaleString('pt-BR')}`}
                    </Typography>
                  </Paper>
                )}

                {activeTab === 0 ? (
                  <DailyView content={currentDigest.content as DailyContent} />
                ) : (
                  <WeeklyView content={currentDigest.content as WeeklyContent} />
                )}
              </Stack>
            ) : (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                <Typography color="text.secondary" mb={2}>
                  Nenhum digest {activeTab === 0 ? 'diário' : 'semanal'} disponível ainda.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => handleGenerate(activeTab === 0 ? 'daily' : 'weekly')}
                  disabled={generating}
                >
                  Gerar agora
                </Button>
              </Paper>
            )}
          </>
        )}
      </Box>
    </AppShell>
  );
}
