'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import AdminSubmenu from '@/components/admin/AdminSubmenu';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import {
  IconBrain, IconRefresh, IconAlertTriangle, IconTrendingUp, IconChevronRight,
  IconBolt, IconTarget, IconArrowUpRight, IconCircleCheck, IconAlertCircle,
  IconBrandWhatsapp, IconCheck, IconX, IconMessageCircle,
  IconSparkles, IconRobot, IconChartBar, IconTrendingUp2, IconExternalLink,
} from '@tabler/icons-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

type Alert_t = {
  id: string;
  client_id: string;
  client_name: string;
  alert_type: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  body: string;
  recommended_action: string;
  health_score: number | null;
  roi_score: number | null;
  status: string;
  computed_at: string;
};

type PendingInsight = {
  id: string;
  insight_type: string;
  summary: string;
  urgency: 'urgent' | 'normal' | 'low';
  sentiment: string;
  confidence: number | null;
  created_at: string;
  client_id: string;
  client_name: string;
  pending_count: number;
};

type RoiRow = {
  id: string;
  client_id: string;
  client_name: string;
  roi_score: number;
  roi_label: string;
  roi_pct: number | null;
  avg_ctr: number | null;
  avg_roas: number | null;
  fogg_composite: number;
  total_impressions: number;
  total_clicks: number;
  summary: string;
  computed_at: string;
};

type AutoBriefing = {
  id: string;
  title: string;
  source: 'auto_opportunity' | 'fatigue_substitution';
  status: string;
  created_at: string;
  client_id: string;
  client_name: string;
  drop_pct: number | null;
  opportunity_confidence: number | null;
};

type Opportunity = {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  confidence: number;
  suggested_action: string;
  trending_up: boolean;
  created_at: string;
  client_id: string;
  client_name: string;
};

type SimulationStats = {
  total_simulations: number;
  simulations_this_week: number;
  avg_accuracy_pct: number | null;
  outcome_count: number;
};

type CompetitorStats = {
  total_profiles: number;
  analyzed_today: number;
  clients_with_competitors: number;
};

type IntelData = {
  alerts:            Alert_t[];
  top_roi:           RoiRow[];
  workers:           { meta_last_sync: string | null; meta_connectors: number };
  pending_insights:  PendingInsight[];
  auto_briefings:    AutoBriefing[];
  simulation_stats:  SimulationStats;
  competitor_stats:  CompetitorStats;
  opportunities:     Opportunity[];
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'error', high: 'warning', medium: 'info', low: 'default',
};

const ALERT_TYPE_LABEL: Record<string, string> = {
  churn_risk:        '🚨 Risco de Churn',
  upsell:            '📈 Upsell',
  expand_services:   '🚀 Expandir Serviços',
  positive_momentum: '⚡ Momentum Positivo',
  payment_risk:      '💸 Risco de Pagamento',
  engagement_drop:   '📉 Queda de Engajamento',
  opportunity:       '🎯 Oportunidade',
};

const ROI_LABEL_COLOR: Record<string, string> = {
  excellent: '#13DEB9',
  good:      '#5D87FF',
  average:   '#F8A800',
  poor:      '#E85219',
  no_data:   '#888',
};

function RoiBar({ score }: { score: number }) {
  const color = score >= 70 ? '#13DEB9' : score >= 50 ? '#5D87FF' : score >= 30 ? '#F8A800' : '#E85219';
  return (
    <Box sx={{ width: 80 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(score, 100)}
        sx={{ height: 6, borderRadius: 3, bgcolor: '#1e1e1e', '& .MuiLinearProgress-bar': { bgcolor: color } }}
      />
      <Typography sx={{ fontSize: '0.65rem', color, mt: 0.25 }}>{score.toFixed(0)}/100</Typography>
    </Box>
  );
}

export default function AdminIntelligencePage() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [actioningInsight, setActioningInsight] = useState<string | null>(null);
  const [approvingBriefing, setApprovingBriefing] = useState<string | null>(null);
  const [approvedBriefings, setApprovedBriefings] = useState<Record<string, string>>({});

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGet<IntelData>('/admin/intelligence');
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados de inteligência.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (alertId: string, action: 'actioned' | 'dismissed') => {
    setActioning(alertId);
    try {
      // Find client_id from the alert
      const alert = data?.alerts.find((a) => a.id === alertId);
      if (!alert) return;
      await apiPatch(`/clients/${alert.client_id}/account-manager/alerts/${alertId}`, { action });
      setData((prev) => prev ? {
        ...prev,
        alerts: prev.alerts.filter((a) => a.id !== alertId),
      } : prev);
    } catch { /* silent */ } finally {
      setActioning(null);
    }
  };

  const handleApproveAndSchedule = async (briefingId: string) => {
    setApprovingBriefing(briefingId);
    try {
      const res = await apiPost<{ data: { scheduled_at: string; platform: string } }>(
        `/edro/briefings/${briefingId}/approve-and-schedule`,
        {},
      );
      const scheduledAt = res.data?.scheduled_at
        ? new Date(res.data.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '';
      setApprovedBriefings(prev => ({ ...prev, [briefingId]: scheduledAt }));
    } catch {
      // silent — user can still open the brief manually
    } finally {
      setApprovingBriefing(null);
    }
  };

  const handleInsightAction = async (insightId: string, action: 'confirm' | 'discard') => {
    setActioningInsight(insightId);
    try {
      await apiPatch(`/whatsapp-groups/insights/${insightId}/${action}`, {});
      setData((prev) => prev ? {
        ...prev,
        pending_insights: prev.pending_insights.filter((i) => i.id !== insightId),
      } : prev);
    } catch { /* silent */ } finally {
      setActioningInsight(null);
    }
  };

  const urgentCount  = data?.alerts.filter((a) => a.priority === 'urgent').length ?? 0;
  const churnCount   = data?.alerts.filter((a) => a.alert_type === 'churn_risk').length ?? 0;
  const upsellCount  = data?.alerts.filter((a) => a.alert_type === 'upsell' || a.alert_type === 'expand_services').length ?? 0;
  const topRoiScore  = data?.top_roi[0]?.roi_score ?? 0;
  const pendingInsightCount = data?.pending_insights.length ?? 0;

  // Group pending insights by client
  const insightsByClient = data?.pending_insights.reduce((acc, ins) => {
    if (!acc[ins.client_id]) acc[ins.client_id] = { client_name: ins.client_name, items: [] };
    acc[ins.client_id].items.push(ins);
    return acc;
  }, {} as Record<string, { client_name: string; items: PendingInsight[] }>) ?? {};

  return (
    <AppShell title="Inteligência IA">
      <AdminSubmenu value="intelligence" />

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconBrain size={28} color="#A855F7" />
          <Box>
            <Typography variant="h5" fontWeight={700}>Inteligência IA</Typography>
            <Typography variant="caption" color="text.secondary">
              Account Manager alerts · Copy ROI · Insights WhatsApp — todos os clientes em um lugar
            </Typography>
          </Box>
        </Stack>
        <Button
          variant="outlined" size="small"
          startIcon={loading ? <CircularProgress size={14} /> : <IconRefresh size={14} />}
          onClick={fetchData}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Summary stats */}
      {data && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderColor: urgentCount > 0 ? 'error.main' : undefined }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="error.main">{urgentCount}</Typography>
                <Typography variant="caption" color="text.secondary">Alertas Urgentes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="warning.main">{churnCount}</Typography>
                <Typography variant="caption" color="text.secondary">Riscos de Churn</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="success.main">{upsellCount}</Typography>
                <Typography variant="caption" color="text.secondary">Oportunidades Upsell</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} color="#A855F7">{topRoiScore.toFixed(0)}</Typography>
                <Typography variant="caption" color="text.secondary">Melhor ROI de Copy</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card variant="outlined" sx={{ borderColor: pendingInsightCount > 0 ? '#25D366' : undefined }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: '#25D366' }}>{pendingInsightCount}</Typography>
                <Typography variant="caption" color="text.secondary">Insights Pendentes</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {data && (
        <>

        {/* ── Pipeline Autônomo ── */}
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <IconRobot size={18} color="#A855F7" />
              <Typography variant="h6">Pipeline Autônomo</Typography>
              <Chip size="small" label="últimas 48h" sx={{ height: 18, fontSize: '0.6rem' }} />
            </Stack>

            <Grid container spacing={2} sx={{ mb: data.auto_briefings.length > 0 ? 2 : 0 }}>
              {/* Briefings auto-gerados */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                    <IconBolt size={14} color="#A855F7" />
                    <Typography sx={{ fontSize: '0.68rem', color: '#A855F7', fontWeight: 600 }}>Briefings gerados</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>
                    {data.auto_briefings.filter(b => b.source === 'auto_opportunity').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">de oportunidades</Typography>
                </Box>
              </Grid>
              {/* Substitutas de fadiga */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(248,168,0,0.06)', border: '1px solid rgba(248,168,0,0.15)' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                    <IconBolt size={14} color="#F8A800" />
                    <Typography sx={{ fontSize: '0.68rem', color: '#F8A800', fontWeight: 600 }}>Substitutas geradas</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>
                    {data.auto_briefings.filter(b => b.source === 'fatigue_substitution').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">fadiga detectada</Typography>
                </Box>
              </Grid>
              {/* Simulações */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(19,222,185,0.06)', border: '1px solid rgba(19,222,185,0.15)' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                    <IconSparkles size={14} color="#13DEB9" />
                    <Typography sx={{ fontSize: '0.68rem', color: '#13DEB9', fontWeight: 600 }}>Simulações esta semana</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>
                    {data.simulation_stats?.simulations_this_week ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.simulation_stats?.avg_accuracy_pct != null
                      ? `acurácia média ${data.simulation_stats.avg_accuracy_pct}%`
                      : 'sem dados de acurácia ainda'}
                  </Typography>
                </Box>
              </Grid>
              {/* Concorrentes */}
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(93,135,255,0.06)', border: '1px solid rgba(93,135,255,0.15)' }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
                    <IconChartBar size={14} color="#5D87FF" />
                    <Typography sx={{ fontSize: '0.68rem', color: '#5D87FF', fontWeight: 600 }}>Concorrentes monitorados</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight={700}>
                    {data.competitor_stats?.total_profiles ?? 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.competitor_stats?.clients_with_competitors ?? 0} cliente(s)
                    {(data.competitor_stats?.analyzed_today ?? 0) > 0 && ` · ${data.competitor_stats.analyzed_today} analisado(s) hoje`}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Auto-briefing list */}
            {data.auto_briefings.length > 0 && (
              <Stack spacing={0.75}>
                {data.auto_briefings.map(b => (
                  <Stack
                    key={b.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'action.hover' }}
                  >
                    <Box sx={{ flexShrink: 0 }}>
                      {b.source === 'fatigue_substitution'
                        ? <IconBolt size={14} color="#F8A800" />
                        : <IconSparkles size={14} color="#A855F7" />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        component={Link}
                        href={`/studio/brief?id=${b.id}`}
                        sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary',
                          textDecoration: 'none', '&:hover': { color: 'primary.main' },
                          display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {b.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {b.client_name}
                        {b.drop_pct != null && ` · queda de ${b.drop_pct}%`}
                        {b.opportunity_confidence != null && ` · confiança ${b.opportunity_confidence}%`}
                        {' · '}{new Date(b.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </Typography>
                    </Box>
                    {approvedBriefings[b.id] ? (
                      <Chip
                        size="small"
                        label={`Agendado ${approvedBriefings[b.id]}`}
                        sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0, bgcolor: 'rgba(19,222,185,0.12)', color: '#13DEB9' }}
                      />
                    ) : b.status === 'draft' ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={approvingBriefing === b.id}
                        onClick={() => handleApproveAndSchedule(b.id)}
                        startIcon={approvingBriefing === b.id ? <CircularProgress size={10} /> : <IconCheck size={11} />}
                        sx={{ fontSize: '0.6rem', height: 22, px: 1, flexShrink: 0, bgcolor: '#13DEB9', '&:hover': { bgcolor: '#0bbfa3' } }}
                      >
                        Aprovar e Agendar
                      </Button>
                    ) : (
                      <Chip
                        size="small"
                        label={b.status}
                        sx={{ height: 18, fontSize: '0.6rem', flexShrink: 0, bgcolor: 'rgba(19,222,185,0.12)', color: '#13DEB9' }}
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
            )}

            {data.auto_briefings.length === 0 && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1.5, color: 'text.disabled' }}>
                <IconCircleCheck size={16} />
                <Typography variant="caption">Nenhum briefing autônomo nas últimas 48h.</Typography>
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* ── Oportunidades Detectadas ── */}
        {(data.opportunities?.length ?? 0) > 0 && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <IconTrendingUp2 size={18} color="#13DEB9" />
                <Typography variant="h6">Oportunidades Detectadas</Typography>
                <Chip size="small" label={`${data.opportunities.length} novas`}
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(19,222,185,0.12)', color: '#13DEB9' }} />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  últimas 72h · confiança ≥ 60%
                </Typography>
              </Stack>
              <Stack spacing={0.75}>
                {data.opportunities.map(opp => (
                  <Box key={opp.id} sx={{
                    p: 1.25, borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: opp.priority === 'urgent' ? 'rgba(239,68,68,0.3)'
                      : opp.trending_up ? 'rgba(19,222,185,0.25)'
                      : 'divider',
                    bgcolor: opp.priority === 'urgent' ? 'rgba(239,68,68,0.04)'
                      : opp.trending_up ? 'rgba(19,222,185,0.03)'
                      : 'transparent',
                  }}>
                    <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                      <Box sx={{ flexShrink: 0, mt: 0.25 }}>
                        {opp.trending_up
                          ? <IconTrendingUp size={15} color="#13DEB9" />
                          : <IconTarget size={15} color="#5D87FF" />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" mb={0.25}>
                          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, mr: 0.5 }}>
                            {opp.title}
                          </Typography>
                          <Chip size="small" label={opp.client_name}
                            sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'rgba(93,135,255,0.1)', color: '#5D87FF' }} />
                          <Chip size="small" label={opp.source}
                            sx={{ height: 16, fontSize: '0.55rem' }} />
                          <Chip size="small" label={`${opp.confidence}%`}
                            sx={{ height: 16, fontSize: '0.55rem',
                              bgcolor: opp.confidence >= 80 ? 'rgba(19,222,185,0.1)' : 'transparent',
                              color: opp.confidence >= 80 ? '#13DEB9' : 'text.secondary' }} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          {opp.description.slice(0, 160)}{opp.description.length > 160 ? '…' : ''}
                        </Typography>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <IconTarget size={11} color="#A855F7" />
                          <Typography sx={{ fontSize: '0.67rem', color: '#A855F7', fontStyle: 'italic' }}>
                            {opp.suggested_action}
                          </Typography>
                        </Stack>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<IconExternalLink size={11} />}
                        component={Link}
                        href={`/clients/${opp.client_id}/planning`}
                        sx={{ fontSize: '0.6rem', height: 22, px: 1, flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        Ver cliente
                      </Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Grid container spacing={3}>
          {/* ── Account Manager Alerts ── */}
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconAlertTriangle size={18} color="#F8A800" />
                    <Typography variant="h6">Account Manager Alerts</Typography>
                    <Chip size="small" label={data.alerts.length} color="warning" />
                  </Stack>
                </Stack>

                {data.alerts.length === 0 ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 4, justifyContent: 'center' }}>
                    <IconCircleCheck size={20} color="#13DEB9" />
                    <Typography color="text.secondary">Nenhum alerta ativo — todos os clientes OK</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    {data.alerts.map((alert) => (
                      <Box key={alert.id}
                        sx={{
                          p: 1.5, borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: alert.priority === 'urgent' ? 'error.main'
                            : alert.priority === 'high' ? 'warning.main'
                            : 'divider',
                          bgcolor: alert.priority === 'urgent' ? 'rgba(239,68,68,0.04)'
                            : alert.priority === 'high' ? 'rgba(248,168,0,0.04)'
                            : 'transparent',
                        }}
                      >
                        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
                          <Box sx={{ flexShrink: 0, mt: 0.25 }}>
                            {alert.priority === 'urgent' ? <IconAlertCircle size={16} color="#EF4444" />
                              : alert.priority === 'high' ? <IconAlertTriangle size={16} color="#F8A800" />
                              : <IconBolt size={16} color="#5D87FF" />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                              <Chip size="small" label={ALERT_TYPE_LABEL[alert.alert_type] || alert.alert_type}
                                color={PRIORITY_COLOR[alert.priority] as any} variant="outlined"
                                sx={{ height: 20, fontSize: '0.65rem' }} />
                              <Typography
                                component={Link}
                                href={`/clients/${alert.client_id}/overview`}
                                sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'primary.main', textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' } }}
                              >
                                {alert.client_name}
                              </Typography>
                              {alert.health_score != null && (
                                <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                                  Health: {alert.health_score}
                                </Typography>
                              )}
                            </Stack>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.78rem', mb: 0.25 }}>
                              {alert.title}
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 0.75, lineHeight: 1.4 }}>
                              {alert.body}
                            </Typography>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
                              <IconTarget size={12} color="#A855F7" />
                              <Typography sx={{ fontSize: '0.68rem', color: '#A855F7', fontStyle: 'italic' }}>
                                {alert.recommended_action}
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75}>
                              <Button size="small" variant="contained" color="success"
                                disabled={actioning === alert.id}
                                onClick={() => handleAction(alert.id, 'actioned')}
                                startIcon={<IconCircleCheck size={12} />}
                                sx={{ fontSize: '0.62rem', textTransform: 'none', py: 0.25 }}>
                                Acionei
                              </Button>
                              <Button size="small" variant="outlined" color="inherit"
                                disabled={actioning === alert.id}
                                onClick={() => handleAction(alert.id, 'dismissed')}
                                sx={{ fontSize: '0.62rem', textTransform: 'none', py: 0.25, color: 'text.disabled', borderColor: 'divider' }}>
                                Dispensar
                              </Button>
                              <Button size="small" variant="text"
                                component={Link}
                                href={`/clients/${alert.client_id}/overview`}
                                endIcon={<IconChevronRight size={12} />}
                                sx={{ fontSize: '0.62rem', textTransform: 'none', py: 0.25, ml: 'auto !important' }}>
                                Ver cliente
                              </Button>
                            </Stack>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Copy ROI Leaderboard ── */}
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <IconTrendingUp size={18} color="#13DEB9" />
                  <Typography variant="h6">Top Copy ROI</Typography>
                  <Chip size="small" label={`Top ${data.top_roi.length}`} sx={{ height: 20, fontSize: '0.65rem' }} />
                </Stack>

                {data.top_roi.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ py: 4, textAlign: 'center' }}>
                    Nenhum score calculado ainda. O worker roda automaticamente após o Meta sync diário.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.68rem' }}>Cliente</TableCell>
                        <TableCell sx={{ fontSize: '0.68rem' }}>ROI</TableCell>
                        <TableCell sx={{ fontSize: '0.68rem' }}>CTR</TableCell>
                        <TableCell sx={{ fontSize: '0.68rem' }}>ROAS</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.top_roi.map((row, i) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700, width: 16 }}>
                                {i + 1}
                              </Typography>
                              <Box>
                                <Typography
                                  component={Link}
                                  href={`/clients/${row.client_id}/reports`}
                                  sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'text.primary',
                                    textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                                >
                                  {row.client_name}
                                </Typography>
                                <Chip size="small" label={row.roi_label}
                                  sx={{ height: 16, fontSize: '0.55rem', ml: 0.5,
                                    bgcolor: `${ROI_LABEL_COLOR[row.roi_label] || '#888'}22`,
                                    color: ROI_LABEL_COLOR[row.roi_label] || '#888' }} />
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell><RoiBar score={row.roi_score} /></TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.7rem' }}>
                              {row.avg_ctr != null ? `${(row.avg_ctr * 100).toFixed(2)}%` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: '0.7rem', color: (row.avg_roas ?? 0) > 1 ? 'success.main' : 'text.secondary' }}>
                              {row.avg_roas != null ? `${row.avg_roas.toFixed(1)}×` : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Worker status footer */}
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconArrowUpRight size={14} color="#555" />
                  <Typography variant="caption" color="text.disabled">
                    {data.workers.meta_connectors} conector(es) Meta ativos
                    {data.workers.meta_last_sync
                      ? ` · Último sync: ${new Date(data.workers.meta_last_sync).toLocaleString('pt-BR')}`
                      : ' · Nenhum sync ainda'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ── Pending WhatsApp Insights ── */}
        {data.pending_insights.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconBrandWhatsapp size={18} color="#25D366" />
                    <Typography variant="h6">Insights WhatsApp Pendentes</Typography>
                    <Chip size="small" label={data.pending_insights.length}
                      sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'rgba(37,211,102,0.12)', color: '#25D366' }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Confirmar → vira regra permanente do cliente · Descartar → remove do radar
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  {Object.entries(insightsByClient).map(([clientId, group]) => (
                    <Box key={clientId}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <IconMessageCircle size={14} color="#25D366" />
                        <Typography
                          component={Link}
                          href={`/clients/${clientId}/whatsapp`}
                          sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.primary',
                            textDecoration: 'none', '&:hover': { color: 'primary.main' } }}
                        >
                          {group.client_name}
                        </Typography>
                        <Chip size="small" label={`${group.items.length} pendente${group.items.length !== 1 ? 's' : ''}`}
                          sx={{ height: 18, fontSize: '0.62rem' }} />
                      </Stack>

                      <Stack spacing={0.75} sx={{ pl: 2.5 }}>
                        {group.items.map((ins) => (
                          <Box key={ins.id}
                            sx={{
                              p: 1.25, borderRadius: 1.5, border: '1px solid',
                              borderColor: ins.urgency === 'urgent' ? 'rgba(37,211,102,0.4)' : 'divider',
                              bgcolor: ins.urgency === 'urgent' ? 'rgba(37,211,102,0.04)' : 'transparent',
                            }}
                          >
                            <Stack direction="row" alignItems="flex-start" spacing={1}>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                                  {ins.urgency === 'urgent' && (
                                    <Chip size="small" label="urgente"
                                      sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'rgba(37,211,102,0.15)', color: '#25D366' }} />
                                  )}
                                  <Chip size="small" label={ins.insight_type}
                                    sx={{ height: 16, fontSize: '0.55rem', bgcolor: 'rgba(93,135,255,0.12)', color: '#5D87FF' }} />
                                  {ins.confidence != null && (
                                    <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>
                                      {(ins.confidence * 100).toFixed(0)}% conf.
                                    </Typography>
                                  )}
                                </Stack>
                                <Typography sx={{ fontSize: '0.76rem', lineHeight: 1.4 }}>{ins.summary}</Typography>
                              </Box>
                              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                <Button size="small" variant="contained"
                                  disabled={actioningInsight === ins.id}
                                  onClick={() => handleInsightAction(ins.id, 'confirm')}
                                  startIcon={<IconCheck size={11} />}
                                  sx={{ fontSize: '0.6rem', textTransform: 'none', py: 0.25, px: 0.75,
                                    bgcolor: '#25D366', '&:hover': { bgcolor: '#1da851' } }}>
                                  Confirmar
                                </Button>
                                <Button size="small" variant="outlined"
                                  disabled={actioningInsight === ins.id}
                                  onClick={() => handleInsightAction(ins.id, 'discard')}
                                  startIcon={<IconX size={11} />}
                                  sx={{ fontSize: '0.6rem', textTransform: 'none', py: 0.25, px: 0.75,
                                    color: 'text.disabled', borderColor: 'divider' }}>
                                  Descartar
                                </Button>
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>

                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {data.pending_insights.length === 0 && !loading && (
          <Box sx={{ mt: 3 }}>
            <Card variant="outlined" sx={{ borderColor: '#25D36633' }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconBrandWhatsapp size={18} color="#25D366" />
                  <Typography variant="h6">Insights WhatsApp Pendentes</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, justifyContent: 'center', py: 2 }}>
                  <IconCircleCheck size={20} color="#25D366" />
                  <Typography color="text.secondary">Nenhum insight pendente — tudo revisado</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}
        </>
      )}
    </AppShell>
  );
}
